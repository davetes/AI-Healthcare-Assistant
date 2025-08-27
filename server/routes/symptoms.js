const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, userActionLimiter } = require('../middleware/auth');
const Symptom = require('../models/Symptom');
const User = require('../models/User');
const aiService = require('../services/aiService');

const router = express.Router();

// Rate limiting for symptom checks (max 5 per hour)
const symptomCheckLimiter = userActionLimiter(5, 60 * 60 * 1000);

// Submit symptoms for AI analysis
router.post('/check', auth, symptomCheckLimiter, [
  body('symptoms').isArray({ min: 1 }).withMessage('At least one symptom is required'),
  body('symptoms.*.name').notEmpty().withMessage('Symptom name is required'),
  body('symptoms.*.severity').isIn(['mild', 'moderate', 'severe']).withMessage('Valid severity levels are: mild, moderate, severe'),
  body('symptoms.*.duration.value').optional().isNumeric().withMessage('Duration value must be a number'),
  body('symptoms.*.duration.unit').optional().isIn(['hours', 'days', 'weeks', 'months']).withMessage('Valid duration units are: hours, days, weeks, months'),
  body('additionalInfo.age').optional().isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),
  body('additionalInfo.gender').optional().isIn(['male', 'female', 'other']).withMessage('Valid gender values are: male, female, other')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { symptoms, additionalInfo } = req.body;
    const userId = req.user._id;

    // Get user context for better AI analysis
    const user = await User.findById(userId);
    const userContext = {
      age: user.healthProfile?.height ? calculateAge(user.dateOfBirth) : additionalInfo?.age,
      gender: user.gender || additionalInfo?.gender,
      existingConditions: user.healthProfile?.chronicConditions?.map(c => c.name) || [],
      medications: user.healthProfile?.currentMedications?.map(m => m.name) || [],
      allergies: user.healthProfile?.allergies?.map(a => a.name) || []
    };

    // Analyze symptoms using AI
    const aiAssessment = await aiService.analyzeSymptoms(symptoms, userContext);

    // Validate AI response for safety
    const validation = aiService.validateResponse(aiAssessment.generalAdvice);
    if (!validation.isValid) {
      aiAssessment.generalAdvice = validation.sanitizedResponse;
    }

    // Create symptom record
    const symptomRecord = new Symptom({
      userId,
      symptoms,
      additionalInfo: {
        ...additionalInfo,
        age: userContext.age,
        gender: userContext.gender,
        existingConditions: userContext.existingConditions,
        medications: userContext.medications,
        familyHistory: user.healthProfile?.familyHistory?.map(f => f.condition) || []
      },
      aiAssessment,
      tags: symptoms.map(s => s.name.toLowerCase())
    });

    await symptomRecord.save();

    res.status(201).json({
      message: 'Symptoms analyzed successfully',
      assessment: aiAssessment,
      symptomId: symptomRecord._id
    });

  } catch (error) {
    console.error('Symptom check error:', error);
    if (error.message.includes('Unable to analyze symptoms')) {
      res.status(503).json({ error: 'AI service is temporarily unavailable. Please try again later.' });
    } else {
      res.status(500).json({ error: 'Failed to analyze symptoms. Please try again.' });
    }
  }
});

// Get user's symptom history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const query = { userId: req.user._id };
    if (status) query.status = status;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const symptoms = await Symptom.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Symptom.countDocuments(query);

    res.json({
      symptoms: symptoms.map(s => s.getSummary()),
      pagination: {
        currentPage: page * 1,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * 1 < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Symptom history error:', error);
    res.status(500).json({ error: 'Failed to fetch symptom history' });
  }
});

// Get specific symptom record
router.get('/:id', auth, async (req, res) => {
  try {
    const symptom = await Symptom.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!symptom) {
      return res.status(404).json({ error: 'Symptom record not found' });
    }

    res.json({ symptom });

  } catch (error) {
    console.error('Symptom fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch symptom record' });
  }
});

// Update symptom record (e.g., mark as resolved, add feedback)
router.put('/:id', auth, [
  body('status').optional().isIn(['active', 'resolved', 'monitoring', 'escalated']).withMessage('Invalid status'),
  body('userFeedback.accuracy').optional().isInt({ min: 1, max: 5 }).withMessage('Accuracy rating must be 1-5'),
  body('userFeedback.helpfulness').optional().isInt({ min: 1, max: 5 }).withMessage('Helpfulness rating must be 1-5'),
  body('userFeedback.comments').optional().trim(),
  body('userFeedback.followUpActions').optional().isArray()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = req.body;
    const allowedUpdates = ['status', 'userFeedback', 'tags'];

    // Filter out non-allowed updates
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    const symptom = await Symptom.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id
      },
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    );

    if (!symptom) {
      return res.status(404).json({ error: 'Symptom record not found' });
    }

    res.json({
      message: 'Symptom record updated successfully',
      symptom
    });

  } catch (error) {
    console.error('Symptom update error:', error);
    res.status(500).json({ error: 'Failed to update symptom record' });
  }
});

// Delete symptom record
router.delete('/:id', auth, async (req, res) => {
  try {
    const symptom = await Symptom.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!symptom) {
      return res.status(404).json({ error: 'Symptom record not found' });
    }

    res.json({ message: 'Symptom record deleted successfully' });

  } catch (error) {
    console.error('Symptom deletion error:', error);
    res.status(500).json({ error: 'Failed to delete symptom record' });
  }
});

// Get symptom statistics for dashboard
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await Symptom.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalSymptoms: { $sum: 1 },
          activeSymptoms: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          resolvedSymptoms: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          highUrgencySymptoms: {
            $sum: {
              $cond: [
                { $in: ['$aiAssessment.possibleConditions.riskLevel', ['high', 'critical']] },
                1, 0
              ]
            }
          }
        }
      }
    ]);

    const recentSymptoms = await Symptom.countDocuments({
      userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const severityBreakdown = await Symptom.aggregate([
      { $match: { userId } },
      { $unwind: '$symptoms' },
      {
        $group: {
          _id: '$symptoms.severity',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: stats[0]?.totalSymptoms || 0,
      active: stats[0]?.activeSymptoms || 0,
      resolved: stats[0]?.resolvedSymptoms || 0,
      highUrgency: stats[0]?.highUrgencySymptoms || 0,
      recent: recentSymptoms,
      severityBreakdown: severityBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    res.json(result);

  } catch (error) {
    console.error('Symptom stats error:', error);
    res.status(500).json({ error: 'Failed to fetch symptom statistics' });
  }
});

// Search symptoms by tags or keywords
router.get('/search', auth, async (req, res) => {
  try {
    const { q, status, severity, page = 1, limit = 10 } = req.query;
    
    const query = { userId: req.user._id };
    
    if (q) {
      query.$or = [
        { 'symptoms.name': { $regex: q, $options: 'i' } },
        { 'symptoms.description': { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }
    
    if (status) query.status = status;
    if (severity) query['symptoms.severity'] = severity;

    const symptoms = await Symptom.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Symptom.countDocuments(query);

    res.json({
      symptoms: symptoms.map(s => s.getSummary()),
      pagination: {
        currentPage: page * 1,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * 1 < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Symptom search error:', error);
    res.status(500).json({ error: 'Failed to search symptoms' });
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

module.exports = router;


