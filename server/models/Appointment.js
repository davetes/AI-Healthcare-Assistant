const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  type: {
    type: String,
    enum: ['consultation', 'follow-up', 'emergency', 'routine', 'specialist'],
    required: true
  },
  mode: {
    type: String,
    enum: ['in-person', 'virtual', 'phone'],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  dateTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 30
  },
  location: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    virtualLink: String,
    instructions: String
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  symptoms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Symptom'
  }],
  notes: {
    patient: String,
    doctor: String,
    admin: String
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push'],
      required: true
    },
    time: {
      type: Date,
      required: true
    },
    sent: {
      type: Boolean,
      default: false
    }
  }],
  followUp: {
    required: Boolean,
    date: Date,
    reason: String
  },
  cost: {
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    insurance: {
      covered: Boolean,
      provider: String,
      policyNumber: String
    }
  },
  cancellation: {
    allowed: {
      type: Boolean,
      default: true
    },
    deadline: {
      type: Date
    },
    policy: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
appointmentSchema.index({ userId: 1, dateTime: 1 });
appointmentSchema.index({ doctorId: 1, dateTime: 1 });
appointmentSchema.index({ status: 1, dateTime: 1 });
appointmentSchema.index({ dateTime: 1 });

// Virtual for checking if appointment is upcoming
appointmentSchema.virtual('isUpcoming').get(function() {
  return this.dateTime > new Date() && this.status === 'scheduled';
});

// Virtual for checking if appointment is today
appointmentSchema.virtual('isToday').get(function() {
  const today = new Date();
  const appointmentDate = new Date(this.dateTime);
  return appointmentDate.toDateString() === today.toDateString();
});

// Method to check if appointment can be cancelled
appointmentSchema.methods.canBeCancelled = function() {
  if (!this.cancellation.allowed) return false;
  if (this.cancellation.deadline) {
    return new Date() < this.cancellation.deadline;
  }
  // Default: can cancel up to 24 hours before
  const deadline = new Date(this.dateTime);
  deadline.setHours(deadline.getHours() - 24);
  return new Date() < deadline;
};

// Method to get appointment summary
appointmentSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.type,
    mode: this.mode,
    status: this.status,
    dateTime: this.dateTime,
    duration: this.duration,
    reason: this.reason,
    isUpcoming: this.isUpcoming,
    isToday: this.isToday,
    canBeCancelled: this.canBeCancelled()
  };
};

// Pre-save middleware to set default reminders
appointmentSchema.pre('save', function(next) {
  if (this.isNew && this.reminders.length === 0) {
    const appointmentTime = new Date(this.dateTime);
    
    // 24 hours before
    this.reminders.push({
      type: 'email',
      time: new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000)
    });
    
    // 1 hour before
    this.reminders.push({
      type: 'push',
      time: new Date(appointmentTime.getTime() - 60 * 60 * 1000)
    });
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);








