const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    required: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phoneNumber: String
  },
  healthProfile: {
    height: {
      value: Number,
      unit: {
        type: String,
        enum: ['cm', 'ft'],
        default: 'cm'
      }
    },
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'kg'
      }
    },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    allergies: [{
      name: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe'],
        default: 'mild'
      },
      notes: String
    }],
    chronicConditions: [{
      name: String,
      diagnosedDate: Date,
      medications: [String],
      notes: String
    }],
    currentMedications: [{
      name: String,
      dosage: String,
      frequency: String,
      startDate: Date,
      endDate: Date,
      notes: String
    }],
    familyHistory: [{
      condition: String,
      relationship: String,
      notes: String
    }]
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    privacy: {
      shareData: { type: Boolean, default: false },
      anonymousUsage: { type: Boolean, default: true }
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ 'healthProfile.allergies.name': 1 });
userSchema.index({ 'healthProfile.chronicConditions.name': 1 });

module.exports = mongoose.model('User', userSchema);




