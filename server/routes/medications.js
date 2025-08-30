const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user's medications
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user._id;

    // Get medications from user's health profile
    const user = await User.findById(userId).select('healthProfile.currentMedications');
    const medications = user.healthProfile?.currentMedications || [];

    // Filter by status if provided
    let filteredMedications = medications;
    if (status === 'active') {
      filteredMedications = medications.filter(med => 
        !med.endDate || new Date(med.endDate) > new Date()
      );
    } else if (status === 'completed') {
      filteredMedications = medications.filter(med => 
        med.endDate && new Date(med.endDate) <= new Date()
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMedications = filteredMedications.slice(startIndex, endIndex);

    res.json({
      medications: paginatedMedications,
      pagination: {
        currentPage: page * 1,
        totalPages: Math.ceil(filteredMedications.length / limit),
        totalItems: filteredMedications.length,
        hasNext: endIndex < filteredMedications.length,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Medications fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch medications' });
  }
});

// Add new medication
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Medication name is required'),
  body('dosage').trim().notEmpty().withMessage('Dosage is required'),
  body('frequency').trim().notEmpty().withMessage('Frequency is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, dosage, frequency, startDate, endDate, notes } = req.body;
    const userId = req.user._id;

    // Validate dates
    if (endDate && new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const newMedication = {
      name,
      dosage,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      notes: notes || ''
    };

    // Add medication to user's health profile
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { 'healthProfile.currentMedications': newMedication } },
      { new: true, runValidators: true }
    ).select('healthProfile.currentMedications');

    const addedMedication = user.healthProfile.currentMedications[user.healthProfile.currentMedications.length - 1];

    res.status(201).json({
      message: 'Medication added successfully',
      medication: addedMedication
    });

  } catch (error) {
    console.error('Medication creation error:', error);
    res.status(500).json({ error: 'Failed to add medication' });
  }
});

// Update medication
router.put('/:id', auth, [
  body('name').optional().trim().notEmpty().withMessage('Medication name cannot be empty'),
  body('dosage').optional().trim().notEmpty().withMessage('Dosage cannot be empty'),
  body('frequency').optional().trim().notEmpty().withMessage('Frequency cannot be empty'),
  body('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;
    const userId = req.user._id;

    // Validate dates if both are provided
    if (updates.startDate && updates.endDate) {
      if (new Date(updates.endDate) <= new Date(updates.startDate)) {
        return res.status(400).json({ error: 'End date must be after start date' });
      }
    }

    // Update medication in user's health profile
    const updateQuery = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateQuery[`healthProfile.currentMedications.$.${key}`] = updates[key];
      }
    });

    const user = await User.findOneAndUpdate(
      {
        _id: userId,
        'healthProfile.currentMedications._id': id
      },
      { $set: updateQuery },
      { new: true, runValidators: true }
    ).select('healthProfile.currentMedications');

    if (!user) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    const updatedMedication = user.healthProfile.currentMedications.find(
      med => med._id.toString() === id
    );

    res.json({
      message: 'Medication updated successfully',
      medication: updatedMedication
    });

  } catch (error) {
    console.error('Medication update error:', error);
    res.status(500).json({ error: 'Failed to update medication' });
  }
});

// Delete medication
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Remove medication from user's health profile
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { 'healthProfile.currentMedications': { _id: id } } },
      { new: true }
    ).select('healthProfile.currentMedications');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Medication removed successfully' });

  } catch (error) {
    console.error('Medication deletion error:', error);
    res.status(500).json({ error: 'Failed to remove medication' });
  }
});

// Get medication reminders
router.get('/reminders', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get active medications
    const user = await User.findById(userId).select('healthProfile.currentMedications');
    const activeMedications = user.healthProfile?.currentMedications?.filter(med => 
      !med.endDate || new Date(med.endDate) > today
    ) || [];

    // Generate reminders based on frequency
    const reminders = [];
    activeMedications.forEach(medication => {
      const startDate = new Date(medication.startDate);
      if (startDate <= today) {
        // Generate reminders for today and tomorrow
        const frequencies = parseFrequency(medication.frequency);
        
        frequencies.forEach(time => {
          const reminderTime = new Date(today);
          const [hours, minutes] = time.split(':');
          reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          if (reminderTime > new Date()) {
            reminders.push({
              medicationId: medication._id,
              medicationName: medication.name,
              dosage: medication.dosage,
              time: reminderTime,
              type: 'today'
            });
          }
        });

        // Tomorrow's reminders
        frequencies.forEach(time => {
          const reminderTime = new Date(tomorrow);
          const [hours, minutes] = time.split(':');
          reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          reminders.push({
            medicationId: medication._id,
            medicationName: medication.name,
            dosage: medication.dosage,
            time: reminderTime,
            type: 'tomorrow'
          });
        });
      }
    });

    // Sort reminders by time
    reminders.sort((a, b) => a.time - b.time);

    res.json({ reminders });

  } catch (error) {
    console.error('Medication reminders error:', error);
    res.status(500).json({ error: 'Failed to fetch medication reminders' });
  }
});

// Get medication statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get medications from user's health profile
    const user = await User.findById(userId).select('healthProfile.currentMedications');
    const medications = user.healthProfile?.currentMedications || [];

    const activeMedications = medications.filter(med => 
      !med.endDate || new Date(med.endDate) > today
    );

    const completedMedications = medications.filter(med => 
      med.endDate && new Date(med.endDate) <= today
    );

    const recentMedications = medications.filter(med => 
      new Date(med.startDate) >= thirtyDaysAgo
    );

    // Group by frequency
    const frequencyBreakdown = medications.reduce((acc, med) => {
      acc[med.frequency] = (acc[med.frequency] || 0) + 1;
      return acc;
    }, {});

    const result = {
      total: medications.length,
      active: activeMedications.length,
      completed: completedMedications.length,
      recent: recentMedications.length,
      frequencyBreakdown
    };

    res.json(result);

  } catch (error) {
    console.error('Medication stats error:', error);
    res.status(500).json({ error: 'Failed to fetch medication statistics' });
  }
});

// Search medications
router.get('/search', auth, async (req, res) => {
  try {
    const { q, status, page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    // Get medications from user's health profile
    const user = await User.findById(userId).select('healthProfile.currentMedications');
    let medications = user.healthProfile?.currentMedications || [];

    // Filter by search query
    if (q) {
      medications = medications.filter(med =>
        med.name.toLowerCase().includes(q.toLowerCase()) ||
        med.notes.toLowerCase().includes(q.toLowerCase())
      );
    }

    // Filter by status
    if (status === 'active') {
      medications = medications.filter(med => 
        !med.endDate || new Date(med.endDate) > new Date()
      );
    } else if (status === 'completed') {
      medications = medications.filter(med => 
        med.endDate && new Date(med.endDate) <= new Date()
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMedications = medications.slice(startIndex, endIndex);

    res.json({
      medications: paginatedMedications,
      pagination: {
        currentPage: page * 1,
        totalPages: Math.ceil(medications.length / limit),
        totalItems: medications.length,
        hasNext: endIndex < medications.length,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Medication search error:', error);
    res.status(500).json({ error: 'Failed to search medications' });
  }
});

// Helper function to parse frequency and return times
function parseFrequency(frequency) {
  const frequencyMap = {
    'once daily': ['09:00'],
    'twice daily': ['09:00', '21:00'],
    'three times daily': ['08:00', '14:00', '20:00'],
    'four times daily': ['08:00', '12:00', '16:00', '20:00'],
    'every 6 hours': ['06:00', '12:00', '18:00', '00:00'],
    'every 8 hours': ['08:00', '16:00', '00:00'],
    'every 12 hours': ['08:00', '20:00'],
    'as needed': ['09:00'],
    'before meals': ['07:00', '12:00', '18:00'],
    'after meals': ['08:00', '13:00', '19:00'],
    'at bedtime': ['21:00']
  };

  return frequencyMap[frequency.toLowerCase()] || ['09:00'];
}

// Import User model at the top
const User = require('../models/User');

module.exports = router;








