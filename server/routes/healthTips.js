const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');

const router = express.Router();

// Get daily health tip
router.get('/daily', optionalAuth, async (req, res) => {
  try {
    let userContext = {};
    
    if (req.user) {
      userContext = {
        age: req.user.dateOfBirth ? calculateAge(req.user.dateOfBirth) : null,
        gender: req.user.gender,
        lifestyle: req.user.healthProfile ? 'Available' : 'Not specified'
      };
    }

    const healthTip = await aiService.generateHealthTip(userContext);
    
    res.json({
      tip: healthTip,
      date: new Date().toISOString(),
      personalized: !!req.user
    });

  } catch (error) {
    console.error('Health tip generation error:', error);
    // Fallback tip
    res.json({
      tip: 'Stay hydrated and aim for 7-9 hours of quality sleep each night for optimal health.',
      date: new Date().toISOString(),
      personalized: false
    });
  }
});

// Get curated health tips (static for now, could be AI-generated)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const tips = [
      {
        id: 1,
        category: 'nutrition',
        title: 'Stay Hydrated',
        content: 'Drink at least 8 glasses of water daily. Dehydration can cause fatigue, headaches, and poor concentration.',
        tags: ['hydration', 'wellness', 'daily']
      },
      {
        id: 2,
        category: 'exercise',
        title: 'Move More',
        content: 'Aim for at least 150 minutes of moderate exercise per week. Even short walks can improve your mood and energy.',
        tags: ['exercise', 'fitness', 'wellness']
      },
      {
        id: 3,
        category: 'sleep',
        title: 'Quality Sleep',
        content: 'Maintain a consistent sleep schedule. Avoid screens 1 hour before bed and create a relaxing bedtime routine.',
        tags: ['sleep', 'wellness', 'routine']
      },
      {
        id: 4,
        category: 'mental-health',
        title: 'Stress Management',
        content: 'Practice deep breathing exercises and mindfulness. Take regular breaks during work to reduce stress levels.',
        tags: ['mental-health', 'stress', 'wellness']
      },
      {
        id: 5,
        category: 'prevention',
        title: 'Regular Check-ups',
        content: 'Schedule annual health check-ups and screenings. Early detection of health issues leads to better outcomes.',
        tags: ['prevention', 'healthcare', 'wellness']
      }
    ];

    res.json({ tips });

  } catch (error) {
    console.error('Health tips fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch health tips' });
  }
});

// Get health tip by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const tipId = parseInt(req.params.id);
    const tips = [
      {
        id: 1,
        category: 'nutrition',
        title: 'Stay Hydrated',
        content: 'Drink at least 8 glasses of water daily. Dehydration can cause fatigue, headaches, and poor concentration.',
        tags: ['hydration', 'wellness', 'daily'],
        author: 'AI Health Assistant',
        publishedAt: new Date().toISOString()
      },
      {
        id: 2,
        category: 'exercise',
        title: 'Move More',
        content: 'Aim for at least 150 minutes of moderate exercise per week. Even short walks can improve your mood and energy.',
        tags: ['exercise', 'fitness', 'wellness'],
        author: 'AI Health Assistant',
        publishedAt: new Date().toISOString()
      },
      {
        id: 3,
        category: 'sleep',
        title: 'Quality Sleep',
        content: 'Maintain a consistent sleep schedule. Avoid screens 1 hour before bed and create a relaxing bedtime routine.',
        tags: ['sleep', 'wellness', 'routine'],
        author: 'AI Health Assistant',
        publishedAt: new Date().toISOString()
      },
      {
        id: 4,
        category: 'mental-health',
        title: 'Stress Management',
        content: 'Practice deep breathing exercises and mindfulness. Take regular breaks during work to reduce stress levels.',
        tags: ['mental-health', 'stress', 'wellness'],
        author: 'AI Health Assistant',
        publishedAt: new Date().toISOString()
      },
      {
        id: 5,
        category: 'prevention',
        title: 'Regular Check-ups',
        content: 'Schedule annual health check-ups and screenings. Early detection of health issues leads to better outcomes.',
        tags: ['prevention', 'healthcare', 'wellness'],
        author: 'AI Health Assistant',
        publishedAt: new Date().toISOString()
      }
    ];

    const tip = tips.find(t => t.id === tipId);
    
    if (!tip) {
      return res.status(404).json({ error: 'Health tip not found' });
    }

    res.json({ tip });

  } catch (error) {
    console.error('Health tip fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch health tip' });
  }
});

// Get health tips by category
router.get('/category/:category', optionalAuth, async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const allTips = [
      {
        id: 1,
        category: 'nutrition',
        title: 'Stay Hydrated',
        content: 'Drink at least 8 glasses of water daily. Dehydration can cause fatigue, headaches, and poor concentration.',
        tags: ['hydration', 'wellness', 'daily']
      },
      {
        id: 2,
        category: 'exercise',
        title: 'Move More',
        content: 'Aim for at least 150 minutes of moderate exercise per week. Even short walks can improve your mood and energy.',
        tags: ['exercise', 'fitness', 'wellness']
      },
      {
        id: 3,
        category: 'sleep',
        title: 'Quality Sleep',
        content: 'Maintain a consistent sleep schedule. Avoid screens 1 hour before bed and create a relaxing bedtime routine.',
        tags: ['sleep', 'wellness', 'routine']
      },
      {
        id: 4,
        category: 'mental-health',
        title: 'Stress Management',
        content: 'Practice deep breathing exercises and mindfulness. Take regular breaks during work to reduce stress levels.',
        tags: ['mental-health', 'stress', 'wellness']
      },
      {
        id: 5,
        category: 'prevention',
        title: 'Regular Check-ups',
        content: 'Schedule annual health check-ups and screenings. Early detection of health issues leads to better outcomes.',
        tags: ['prevention', 'healthcare', 'wellness']
      }
    ];

    const filteredTips = allTips.filter(tip => 
      tip.category.toLowerCase() === category.toLowerCase()
    );

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTips = filteredTips.slice(startIndex, endIndex);

    res.json({
      tips: paginatedTips,
      pagination: {
        currentPage: page * 1,
        totalPages: Math.ceil(filteredTips.length / limit),
        totalItems: filteredTips.length,
        hasNext: endIndex < filteredTips.length,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Health tips by category error:', error);
    res.status(500).json({ error: 'Failed to fetch health tips by category' });
  }
});

// Search health tips
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, category, tags, page = 1, limit = 10 } = req.query;

    const allTips = [
      {
        id: 1,
        category: 'nutrition',
        title: 'Stay Hydrated',
        content: 'Drink at least 8 glasses of water daily. Dehydration can cause fatigue, headaches, and poor concentration.',
        tags: ['hydration', 'wellness', 'daily']
      },
      {
        id: 2,
        category: 'exercise',
        title: 'Move More',
        content: 'Aim for at least 150 minutes of moderate exercise per week. Even short walks can improve your mood and energy.',
        tags: ['exercise', 'fitness', 'wellness']
      },
      {
        id: 3,
        category: 'sleep',
        title: 'Quality Sleep',
        content: 'Maintain a consistent sleep schedule. Avoid screens 1 hour before bed and create a relaxing bedtime routine.',
        tags: ['sleep', 'wellness', 'routine']
      },
      {
        id: 4,
        category: 'mental-health',
        title: 'Stress Management',
        content: 'Practice deep breathing exercises and mindfulness. Take regular breaks during work to reduce stress levels.',
        tags: ['mental-health', 'stress', 'wellness']
      },
      {
        id: 5,
        category: 'prevention',
        title: 'Regular Check-ups',
        content: 'Schedule annual health check-ups and screenings. Early detection of health issues leads to better outcomes.',
        tags: ['prevention', 'healthcare', 'wellness']
      }
    ];

    let filteredTips = allTips;

    // Filter by search query
    if (q) {
      filteredTips = filteredTips.filter(tip =>
        tip.title.toLowerCase().includes(q.toLowerCase()) ||
        tip.content.toLowerCase().includes(q.toLowerCase())
      );
    }

    // Filter by category
    if (category) {
      filteredTips = filteredTips.filter(tip =>
        tip.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      filteredTips = filteredTips.filter(tip =>
        tagArray.some(tag => tip.tags.includes(tag))
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTips = filteredTips.slice(startIndex, endIndex);

    res.json({
      tips: paginatedTips,
      pagination: {
        currentPage: page * 1,
        totalPages: Math.ceil(filteredTips.length / limit),
        totalItems: filteredTips.length,
        hasNext: endIndex < filteredTips.length,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Health tips search error:', error);
    res.status(500).json({ error: 'Failed to search health tips' });
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


