const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symptoms: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      required: true
    },
    duration: {
      value: Number,
      unit: {
        type: String,
        enum: ['hours', 'days', 'weeks', 'months'],
        default: 'days'
      }
    },
    frequency: {
      type: String,
      enum: ['constant', 'intermittent', 'occasional', 'rare'],
      default: 'constant'
    },
    location: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  }],
  additionalInfo: {
    age: Number,
    gender: String,
    existingConditions: [String],
    medications: [String],
    lifestyle: {
      diet: String,
      exercise: String,
      sleep: String,
      stress: String
    },
    recentChanges: String,
    familyHistory: [String]
  },
  aiAssessment: {
    possibleConditions: [{
      condition: String,
      probability: {
        type: Number,
        min: 0,
        max: 100
      },
      confidence: {
        type: Number,
        min: 0,
        max: 100
      },
      description: String,
      symptoms: [String],
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
      }
    }],
    recommendations: [{
      type: {
        type: String,
        enum: ['lifestyle', 'medication', 'consultation', 'emergency', 'monitoring'],
        required: true
      },
      title: String,
      description: String,
          priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
      },
      timeframe: String
    }],
    generalAdvice: String,
    whenToSeekHelp: String,
    followUp: {
      timeframe: String,
      actions: [String]
    }
  },
  userFeedback: {
    accuracy: {
      type: Number,
      min: 1,
      max: 5
    },
    helpfulness: {
      type: Number,
      min: 1,
      max: 5
    },
    followUpActions: [String],
    notes: String
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'monitoring', 'escalated'],
    default: 'active'
  },
  tags: [String]
}, {
  timestamps: true
});

// Indexes for better query performance
symptomSchema.index({ userId: 1, createdAt: -1 });
symptomSchema.index({ 'aiAssessment.possibleConditions.condition': 1 });
symptomSchema.index({ status: 1 });
symptomSchema.index({ tags: 1 });

// Method to get summary for dashboard
symptomSchema.methods.getSummary = function() {
  return {
    id: this._id,
    symptomCount: this.symptoms.length,
    severity: this.symptoms.reduce((max, symptom) => 
      symptom.severity === 'severe' ? 'severe' : 
      symptom.severity === 'moderate' ? 'moderate' : 'mild', 'mild'),
    possibleConditions: this.aiAssessment.possibleConditions.length,
    recommendations: this.aiAssessment.recommendations.length,
    status: this.status,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Symptom', symptomSchema);








