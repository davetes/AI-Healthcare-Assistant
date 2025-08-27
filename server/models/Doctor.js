const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  specialization: {
    type: String,
    required: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  availability: {
    monday: {
      start: String, // Format: "09:00"
      end: String,   // Format: "17:00"
      available: { type: Boolean, default: true }
    },
    tuesday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    wednesday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    thursday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    friday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    saturday: {
      start: String,
      end: String,
      available: { type: Boolean, default: false }
    },
    sunday: {
      start: String,
      end: String,
      available: { type: Boolean, default: false }
    }
  },
  consultationTypes: [{
    type: String,
    enum: ['in-person', 'virtual', 'phone'],
    default: ['in-person', 'virtual']
  }],
  consultationDuration: {
    type: Number, // in minutes
    default: 30
  },
  consultationFee: {
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  languages: [{
    type: String,
    default: ['English']
  }],
  education: [{
    degree: String,
    institution: String,
    year: Number
  }],
  experience: {
    years: Number,
    previousInstitutions: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ isActive: 1 });
doctorSchema.index({ 'availability.monday.available': 1 });

// Method to check if doctor is available at specific time
doctorSchema.methods.isAvailableAt = function(dateTime) {
  const dayOfWeek = dateTime.toLocaleDateString('en-US', { weekday: 'monday' }).toLowerCase();
  const time = dateTime.toTimeString().slice(0, 5); // Format: "HH:MM"
  
  const dayAvailability = this.availability[dayOfWeek];
  
  if (!dayAvailability || !dayAvailability.available) {
    return false;
  }
  
  return time >= dayAvailability.start && time <= dayAvailability.end;
};

// Method to get available time slots for a specific day
doctorSchema.methods.getAvailableTimeSlots = function(date, duration = 30) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'monday' }).toLowerCase();
  const dayAvailability = this.availability[dayOfWeek];
  
  if (!dayAvailability || !dayAvailability.available) {
    return [];
  }
  
  const slots = [];
  const startTime = new Date(date);
  startTime.setHours(parseInt(dayAvailability.start.split(':')[0]));
  startTime.setMinutes(parseInt(dayAvailability.start.split(':')[1]));
  
  const endTime = new Date(date);
  endTime.setHours(parseInt(dayAvailability.end.split(':')[0]));
  endTime.setMinutes(parseInt(dayAvailability.end.split(':')[1]));
  
  while (startTime < endTime) {
    slots.push(new Date(startTime));
    startTime.setMinutes(startTime.getMinutes() + duration);
  }
  
  return slots;
};

// Method to get doctor summary
doctorSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    specialization: this.specialization,
    licenseNumber: this.licenseNumber,
    email: this.email,
    phoneNumber: this.phoneNumber,
    consultationTypes: this.consultationTypes,
    consultationDuration: this.consultationDuration,
    consultationFee: this.consultationFee,
    languages: this.languages,
    isActive: this.isActive
  };
};

module.exports = mongoose.model('Doctor', doctorSchema);


