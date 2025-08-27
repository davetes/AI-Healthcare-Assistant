const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get user's health profile
router.get('/health-profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('healthProfile dateOfBirth gender')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate age
    let age = null;
    if (user.dateOfBirth) {
      age = calculateAge(user.dateOfBirth);
    }

    const healthProfile = {
      ...user.healthProfile,
      age,
      gender: user.gender
    };

    res.json({ healthProfile });

  } catch (error) {
    console.error('Health profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch health profile' });
  }
});

// Update health profile
router.put('/health-profile', auth, [
  body('height.value').optional().isNumeric().withMessage('Height value must be a number'),
  body('height.unit').optional().isIn(['cm', 'ft']).withMessage('Height unit must be cm or ft'),
  body('weight.value').optional().isNumeric().withMessage('Weight value must be a number'),
  body('weight.unit').optional().isIn(['kg', 'lbs']).withMessage('Weight unit must be kg or lbs'),
  body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood type'),
  body('allergies').optional().isArray().withMessage('Allergies must be an array'),
  body('allergies.*.name').optional().trim().notEmpty().withMessage('Allergy name is required'),
  body('allergies.*.severity').optional().isIn(['mild', 'moderate', 'severe']).withMessage('Invalid allergy severity'),
  body('chronicConditions').optional().isArray().withMessage('Chronic conditions must be an array'),
  body('chronicConditions.*.name').optional().trim().notEmpty().withMessage('Condition name is required'),
  body('chronicConditions.*.diagnosedDate').optional().isISO8601().withMessage('Valid diagnosis date is required'),
  body('familyHistory').optional().isArray().withMessage('Family history must be an array'),
  body('familyHistory.*.condition').optional().trim().notEmpty().withMessage('Condition name is required'),
  body('familyHistory.*.relationship').optional().trim().notEmpty().withMessage('Relationship is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = req.body;
    const allowedUpdates = [
      'height', 'weight', 'bloodType', 'allergies', 'chronicConditions', 'familyHistory'
    ];

    // Filter out non-allowed updates
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { 'healthProfile': filteredUpdates } },
      { new: true, runValidators: true }
    ).select('healthProfile dateOfBirth gender');

    // Calculate age
    let age = null;
    if (user.dateOfBirth) {
      age = calculateAge(user.dateOfBirth);
    }

    const healthProfile = {
      ...user.healthProfile,
      age,
      gender: user.gender
    };

    res.json({
      message: 'Health profile updated successfully',
      healthProfile
    });

  } catch (error) {
    console.error('Health profile update error:', error);
    res.status(500).json({ error: 'Failed to update health profile' });
  }
});

// Add allergy to health profile
router.post('/health-profile/allergies', auth, [
  body('name').trim().notEmpty().withMessage('Allergy name is required'),
  body('severity').isIn(['mild', 'moderate', 'severe']).withMessage('Valid severity levels are: mild, moderate, severe'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, severity, notes } = req.body;

    const newAllergy = {
      name,
      severity,
      notes: notes || ''
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { 'healthProfile.allergies': newAllergy } },
      { new: true, runValidators: true }
    ).select('healthProfile.allergies');

    const addedAllergy = user.healthProfile.allergies[user.healthProfile.allergies.length - 1];

    res.status(201).json({
      message: 'Allergy added successfully',
      allergy: addedAllergy
    });

  } catch (error) {
    console.error('Allergy addition error:', error);
    res.status(500).json({ error: 'Failed to add allergy' });
  }
});

// Update allergy
router.put('/health-profile/allergies/:id', auth, [
  body('name').optional().trim().notEmpty().withMessage('Allergy name cannot be empty'),
  body('severity').optional().isIn(['mild', 'moderate', 'severe']).withMessage('Valid severity levels are: mild, moderate, severe'),
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

    const updateQuery = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateQuery[`healthProfile.allergies.$.${key}`] = updates[key];
      }
    });

    const user = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        'healthProfile.allergies._id': id
      },
      { $set: updateQuery },
      { new: true, runValidators: true }
    ).select('healthProfile.allergies');

    if (!user) {
      return res.status(404).json({ error: 'Allergy not found' });
    }

    const updatedAllergy = user.healthProfile.allergies.find(
      allergy => allergy._id.toString() === id
    );

    res.json({
      message: 'Allergy updated successfully',
      allergy: updatedAllergy
    });

  } catch (error) {
    console.error('Allergy update error:', error);
    res.status(500).json({ error: 'Failed to update allergy' });
  }
});

// Remove allergy
router.delete('/health-profile/allergies/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { 'healthProfile.allergies': { _id: id } } },
      { new: true }
    ).select('healthProfile.allergies');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Allergy removed successfully' });

  } catch (error) {
    console.error('Allergy removal error:', error);
    res.status(500).json({ error: 'Failed to remove allergy' });
  }
});

// Add chronic condition
router.post('/health-profile/chronic-conditions', auth, [
  body('name').trim().notEmpty().withMessage('Condition name is required'),
  body('diagnosedDate').isISO8601().withMessage('Valid diagnosis date is required'),
  body('medications').optional().isArray().withMessage('Medications must be an array'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, diagnosedDate, medications, notes } = req.body;

    const newCondition = {
      name,
      diagnosedDate: new Date(diagnosedDate),
      medications: medications || [],
      notes: notes || ''
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { 'healthProfile.chronicConditions': newCondition } },
      { new: true, runValidators: true }
    ).select('healthProfile.chronicConditions');

    const addedCondition = user.healthProfile.chronicConditions[user.healthProfile.chronicConditions.length - 1];

    res.status(201).json({
      message: 'Chronic condition added successfully',
      condition: addedCondition
    });

  } catch (error) {
    console.error('Chronic condition addition error:', error);
    res.status(500).json({ error: 'Failed to add chronic condition' });
  }
});

// Update chronic condition
router.put('/health-profile/chronic-conditions/:id', auth, [
  body('name').optional().trim().notEmpty().withMessage('Condition name cannot be empty'),
  body('diagnosedDate').optional().isISO8601().withMessage('Valid diagnosis date is required'),
  body('medications').optional().isArray().withMessage('Medications must be an array'),
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

    // Convert diagnosedDate to Date object if provided
    if (updates.diagnosedDate) {
      updates.diagnosedDate = new Date(updates.diagnosedDate);
    }

    const updateQuery = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateQuery[`healthProfile.chronicConditions.$.${key}`] = updates[key];
      }
    });

    const user = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        'healthProfile.chronicConditions._id': id
      },
      { $set: updateQuery },
      { new: true, runValidators: true }
    ).select('healthProfile.chronicConditions');

    if (!user) {
      return res.status(404).json({ error: 'Chronic condition not found' });
    }

    const updatedCondition = user.healthProfile.chronicConditions.find(
      condition => condition._id.toString() === id
    );

    res.json({
      message: 'Chronic condition updated successfully',
      condition: updatedCondition
    });

  } catch (error) {
    console.error('Chronic condition update error:', error);
    res.status(500).json({ error: 'Failed to update chronic condition' });
  }
});

// Remove chronic condition
router.delete('/health-profile/chronic-conditions/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { 'healthProfile.chronicConditions': { _id: id } } },
      { new: true }
    ).select('healthProfile.chronicConditions');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Chronic condition removed successfully' });

  } catch (error) {
    console.error('Chronic condition removal error:', error);
    res.status(500).json({ error: 'Failed to remove chronic condition' });
  }
});

// Add family history
router.post('/health-profile/family-history', auth, [
  body('condition').trim().notEmpty().withMessage('Condition name is required'),
  body('relationship').trim().notEmpty().withMessage('Relationship is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { condition, relationship, notes } = req.body;

    const newFamilyHistory = {
      condition,
      relationship,
      notes: notes || ''
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { 'healthProfile.familyHistory': newFamilyHistory } },
      { new: true, runValidators: true }
    ).select('healthProfile.familyHistory');

    const addedFamilyHistory = user.healthProfile.familyHistory[user.healthProfile.familyHistory.length - 1];

    res.status(201).json({
      message: 'Family history added successfully',
      familyHistory: addedFamilyHistory
    });

  } catch (error) {
    console.error('Family history addition error:', error);
    res.status(500).json({ error: 'Failed to add family history' });
  }
});

// Update family history
router.put('/health-profile/family-history/:id', auth, [
  body('condition').optional().trim().notEmpty().withMessage('Condition name cannot be empty'),
  body('relationship').optional().trim().notEmpty().withMessage('Relationship cannot be empty'),
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

    const updateQuery = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateQuery[`healthProfile.familyHistory.$.${key}`] = updates[key];
      }
    });

    const user = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        'healthProfile.familyHistory._id': id
      },
      { $set: updateQuery },
      { new: true, runValidators: true }
    ).select('healthProfile.familyHistory');

    if (!user) {
      return res.status(404).json({ error: 'Family history not found' });
    }

    const updatedFamilyHistory = user.healthProfile.familyHistory.find(
      history => history._id.toString() === id
    );

    res.json({
      message: 'Family history updated successfully',
      familyHistory: updatedFamilyHistory
    });

  } catch (error) {
    console.error('Family history update error:', error);
    res.status(500).json({ error: 'Failed to update family history' });
  }
});

// Remove family history
router.delete('/health-profile/family-history/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { 'healthProfile.familyHistory': { _id: id } } },
      { new: true }
    ).select('healthProfile.familyHistory');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Family history removed successfully' });

  } catch (error) {
    console.error('Family history removal error:', error);
    res.status(500).json({ error: 'Failed to remove family history' });
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


