const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, userActionLimiter } = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');
const aiService = require('../services/aiService');

const router = express.Router();

// Rate limiting for chat messages (max 20 per minute)
const chatMessageLimiter = userActionLimiter(20, 60 * 1000);

// Start a new chat session
router.post('/start', auth, [
  body('category').optional().isIn(['general', 'symptoms', 'medication', 'lifestyle', 'emergency', 'appointment']).withMessage('Invalid chat category'),
  body('title').optional().trim().isLength({ max: 100 }).withMessage('Title must be less than 100 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category = 'general', title } = req.body;
    const userId = req.user._id;

    // Get user context for better AI responses
    const user = await User.findById(userId);
    const userContext = {
      age: user.dateOfBirth ? calculateAge(user.dateOfBirth) : null,
      gender: user.gender,
      healthProfile: user.healthProfile ? 'Available' : 'Not specified',
      existingConditions: user.healthProfile?.chronicConditions?.map(c => c.name) || [],
      medications: user.healthProfile?.currentMedications?.map(m => m.name) || [],
      allergies: user.healthProfile?.allergies?.map(a => a.name) || []
    };

    // Create new chat session
    const chat = new Chat({
      userId,
      category,
      title: title || `Health Consultation - ${new Date().toLocaleDateString()}`,
      context: {
        userProfile: {
          age: userContext.age,
          gender: userContext.gender,
          existingConditions: userContext.existingConditions,
          medications: userContext.medications,
          allergies: userContext.allergies
        }
      }
    });

    await chat.save();

    res.status(201).json({
      message: 'Chat session started successfully',
      chat: chat.getSummary()
    });

  } catch (error) {
    console.error('Chat start error:', error);
    res.status(500).json({ error: 'Failed to start chat session' });
  }
});

// Send a message in a chat session
router.post('/:sessionId/message', auth, chatMessageLimiter, [
  body('content').trim().notEmpty().withMessage('Message content is required'),
  body('content').isLength({ max: 1000 }).withMessage('Message too long (max 1000 characters)')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Find chat session
    const chat = await Chat.findOne({
      sessionId,
      userId,
      status: { $in: ['active', 'paused'] }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat session not found or inactive' });
    }

    // Add user message
    await chat.addMessage('user', content);

    // Handle maker/author questions with a friendly fixed response
    const text = String(content || '').toLowerCase();
    const asksWhoMade = (
      text.includes('who made') ||
      text.includes('who built') ||
      text.includes('who created') ||
      (text.includes('developer') && (text.includes('site') || text.includes('app') || text.includes('application') || text.includes('website')))
    );
    if (asksWhoMade) {
      const makerAnswer = 'This application was made by Tesfahun Kere (programmer).';
      await chat.addMessage('assistant', makerAnswer);
      await updateChatInsights(chat);
      return res.json({
        message: 'Message sent successfully',
        response: makerAnswer,
        chat: chat.getSummary()
      });
    }

    // Get user context for AI response
    const user = await User.findById(userId);
    const userContext = {
      age: user.dateOfBirth ? calculateAge(user.dateOfBirth) : null,
      gender: user.gender,
      healthProfile: user.healthProfile ? 'Available' : 'Not specified'
    };

    // Get AI response
    const aiResponse = await aiService.chatResponse(
      content,
      chat.messages.map(m => ({ role: m.role, content: m.content })),
      userContext
    );

    // Validate AI response for safety
    const validation = aiService.validateResponse(aiResponse);
    const finalResponse = validation.isValid ? aiResponse : validation.sanitizedResponse;

    // Add AI response
    await chat.addMessage('assistant', finalResponse);

    // Update chat context and insights
    await updateChatInsights(chat);

    res.json({
      message: 'Message sent successfully',
      response: finalResponse,
      chat: chat.getSummary()
    });

  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get chat session with messages
router.get('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      sessionId,
      userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({ chat });

  } catch (error) {
    console.error('Chat fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch chat session' });
  }
});

// Get user's chat history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, status } = req.query;
    const userId = req.user._id;

    const query = { userId };
    if (category) query.category = category;
    if (status) query.status = status;

    const chats = await Chat.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-messages -__v');

    const total = await Chat.countDocuments(query);

    res.json({
      chats: chats.map(c => c.getSummary()),
      pagination: {
        currentPage: page * 1,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * 1 < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Update chat session (pause, resume, complete)
router.put('/:sessionId', auth, [
  body('status').isIn(['active', 'paused', 'completed', 'archived']).withMessage('Invalid status'),
  body('title').optional().trim().isLength({ max: 100 }).withMessage('Title must be less than 100 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.params;
    const { status, title } = req.body;
    const userId = req.user._id;

    const updates = {};
    if (status) updates.status = status;
    if (title) updates.title = title;

    const chat = await Chat.findOneAndUpdate(
      {
        sessionId,
        userId
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!chat) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({
      message: 'Chat session updated successfully',
      chat: chat.getSummary()
    });

  } catch (error) {
    console.error('Chat update error:', error);
    res.status(500).json({ error: 'Failed to update chat session' });
  }
});

// Delete chat session
router.delete('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOneAndDelete({
      sessionId,
      userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({ message: 'Chat session deleted successfully' });

  } catch (error) {
    console.error('Chat deletion error:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

// Get chat statistics for dashboard
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await Chat.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalChats: { $sum: 1 },
          activeChats: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completedChats: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalMessages: { $sum: { $size: '$messages' } }
        }
      }
    ]);

    const recentChats = await Chat.countDocuments({
      userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const categoryBreakdown = await Chat.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: stats[0]?.totalChats || 0,
      active: stats[0]?.activeChats || 0,
      completed: stats[0]?.completedChats || 0,
      totalMessages: stats[0]?.totalMessages || 0,
      recent: recentChats,
      categoryBreakdown: categoryBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    res.json(result);

  } catch (error) {
    console.error('Chat stats error:', error);
    res.status(500).json({ error: 'Failed to fetch chat statistics' });
  }
});

// Search chats by content or title
router.get('/search', auth, async (req, res) => {
  try {
    const { q, category, status, page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const query = { userId };

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { 'messages.content': { $regex: q, $options: 'i' } }
      ];
    }

    if (category) query.category = category;
    if (status) query.status = status;

    const chats = await Chat.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-messages -__v');

    const total = await Chat.countDocuments(query);

    res.json({
      chats: chats.map(c => c.getSummary()),
      pagination: {
        currentPage: page * 1,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * 1 < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Chat search error:', error);
    res.status(500).json({ error: 'Failed to search chats' });
  }
});

// Helper function to calculate age
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Helper function to update chat insights
async function updateChatInsights(chat) {
  try {
    if (chat.messages.length < 2) return;

    const userMessages = chat.messages.filter(m => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];

    // Simple keyword analysis for insights
    const keywords = {
      pain: ['pain', 'hurt', 'ache', 'sore', 'discomfort'],
      emergency: ['emergency', 'urgent', 'immediate', 'severe', 'critical'],
      medication: ['medicine', 'pill', 'drug', 'prescription', 'dosage'],
      lifestyle: ['diet', 'exercise', 'sleep', 'stress', 'workout']
    };

    let primaryConcern = 'general';
    let urgencyLevel = 'low';

    // Check for emergency keywords
    if (keywords.emergency.some(word => 
      lastUserMessage.content.toLowerCase().includes(word)
    )) {
      urgencyLevel = 'high';
      primaryConcern = 'emergency';
    } else if (keywords.pain.some(word => 
      lastUserMessage.content.toLowerCase().includes(word)
    )) {
      urgencyLevel = 'medium';
      primaryConcern = 'symptoms';
    }

    // Update chat insights
    chat.aiInsights = {
      ...chat.aiInsights,
      primaryConcern,
      riskAssessment: {
        ...chat.aiInsights.riskAssessment,
        level: urgencyLevel
      }
    };

    await chat.save();
  } catch (error) {
    console.error('Error updating chat insights:', error);
  }
}

module.exports = router;


