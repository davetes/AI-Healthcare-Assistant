const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
// Ensure Doctor model is registered for population
require('../models/Doctor');

const router = express.Router();

// Get user's appointments
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, mode } = req.query;
    const userId = req.user._id;

    const query = { userId };
    if (status) query.status = status;
    if (type) query.type = type;
    if (mode) query.mode = mode;

    const appointments = await Appointment.find(query)
      .sort({ dateTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('doctorId', 'name specialization')
      .select('-__v');

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments: appointments.map(a => a.getSummary()),
      pagination: {
        currentPage: page * 1,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * 1 < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Appointments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Create new appointment
router.post('/', auth, [
  body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
  body('type').isIn(['consultation', 'follow-up', 'emergency', 'routine', 'specialist']).withMessage('Valid appointment type is required'),
  body('mode').isIn(['in-person', 'virtual', 'phone']).withMessage('Valid appointment mode is required'),
  body('dateTime').isISO8601().withMessage('Valid date and time is required'),
  body('reason').trim().notEmpty().withMessage('Appointment reason is required'),
  body('duration').optional().isInt({ min: 15, max: 240 }).withMessage('Duration must be between 15 and 240 minutes')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      doctorId,
      type,
      mode,
      dateTime,
      duration = 30,
      reason,
      location,
      symptoms
    } = req.body;

    const userId = req.user._id;

    // Check if appointment time is in the future
    if (new Date(dateTime) <= new Date()) {
      return res.status(400).json({ error: 'Appointment time must be in the future' });
    }

    // Check for scheduling conflicts (basic check)
    const conflictingAppointment = await Appointment.findOne({
      userId,
      dateTime: {
        $gte: new Date(new Date(dateTime).getTime() - duration * 60000),
        $lte: new Date(new Date(dateTime).getTime() + duration * 60000)
      },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({ error: 'Appointment time conflicts with existing appointment' });
    }

    // Create appointment
    const appointment = new Appointment({
      userId,
      doctorId,
      type,
      mode,
      dateTime,
      duration,
      reason,
      location,
      symptoms
    });

    await appointment.save();

    res.status(201).json({
      message: 'Appointment scheduled successfully',
      appointment: appointment.getSummary()
    });

  } catch (error) {
    console.error('Appointment creation error:', error);
    res.status(500).json({ error: 'Failed to schedule appointment' });
  }
});

// Get specific appointment
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('doctorId', 'name specialization');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ appointment });

  } catch (error) {
    console.error('Appointment fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Update appointment
router.put('/:id', auth, [
  body('dateTime').optional().isISO8601().withMessage('Valid date and time is required'),
  body('reason').optional().trim().notEmpty().withMessage('Reason cannot be empty'),
  body('status').optional().isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rescheduled']).withMessage('Invalid status'),
  body('notes.patient').optional().trim(),
  body('notes.doctor').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = req.body;
    const allowedUpdates = [
      'dateTime', 'reason', 'status', 'notes', 'location',
      'duration', 'followUp', 'cost'
    ];

    // Filter out non-allowed updates
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    // Check if appointment can be updated
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Prevent updates to completed or cancelled appointments
    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({ error: 'Cannot update completed or cancelled appointments' });
    }

    // If updating date/time, check for conflicts
    if (filteredUpdates.dateTime) {
      const newDateTime = new Date(filteredUpdates.dateTime);
      if (newDateTime <= new Date()) {
        return res.status(400).json({ error: 'Appointment time must be in the future' });
      }

      const duration = filteredUpdates.duration || appointment.duration;
      const conflictingAppointment = await Appointment.findOne({
        userId: req.user._id,
        _id: { $ne: req.params.id },
        dateTime: {
          $gte: new Date(newDateTime.getTime() - duration * 60000),
          $lte: new Date(newDateTime.getTime() + duration * 60000)
        },
        status: { $in: ['scheduled', 'confirmed'] }
      });

      if (conflictingAppointment) {
        return res.status(400).json({ error: 'Appointment time conflicts with existing appointment' });
      }
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    ).populate('doctorId', 'name specialization');

    res.json({
      message: 'Appointment updated successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Appointment update error:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Cancel appointment
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (!appointment.canBeCancelled()) {
      return res.status(400).json({ error: 'Appointment cannot be cancelled at this time' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({
      message: 'Appointment cancelled successfully',
      appointment: appointment.getSummary()
    });

  } catch (error) {
    console.error('Appointment cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// Get appointment statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await Appointment.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 },
          upcomingAppointments: {
            $sum: { $cond: [{ $gt: ['$dateTime', new Date()] }, 1, 0] }
          },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const recentAppointments = await Appointment.countDocuments({
      userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const typeBreakdown = await Appointment.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const modeBreakdown = await Appointment.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$mode',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: stats[0]?.totalAppointments || 0,
      upcoming: stats[0]?.upcomingAppointments || 0,
      completed: stats[0]?.completedAppointments || 0,
      cancelled: stats[0]?.cancelledAppointments || 0,
      recent: recentAppointments,
      typeBreakdown: typeBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      modeBreakdown: modeBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    res.json(result);

  } catch (error) {
    console.error('Appointment stats error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment statistics' });
  }
});

// Search appointments
router.get('/search', auth, async (req, res) => {
  try {
    const { q, type, mode, status, startDate, endDate, page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const query = { userId };

    if (q) {
      query.$or = [
        { reason: { $regex: q, $options: 'i' } },
        { 'notes.patient': { $regex: q, $options: 'i' } },
        { 'notes.doctor': { $regex: q, $options: 'i' } }
      ];
    }

    if (type) query.type = type;
    if (mode) query.mode = mode;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.dateTime = {};
      if (startDate) query.dateTime.$gte = new Date(startDate);
      if (endDate) query.dateTime.$lte = new Date(endDate);
    }

    const appointments = await Appointment.find(query)
      .sort({ dateTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('doctorId', 'name specialization')
      .select('-__v');

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments: appointments.map(a => a.getSummary()),
      pagination: {
        currentPage: page * 1,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * 1 < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Appointment search error:', error);
    res.status(500).json({ error: 'Failed to search appointments' });
  }
});

module.exports = router;


