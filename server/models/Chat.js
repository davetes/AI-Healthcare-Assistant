const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  title: {
    type: String,
    default: 'Health Consultation'
  },
  category: {
    type: String,
    enum: ['general', 'symptoms', 'medication', 'lifestyle', 'emergency', 'appointment'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active'
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'symptom-form', 'recommendation'],
        default: 'text'
      },
      attachments: [{
        type: String,
        url: String,
        filename: String,
        mimeType: String
      }],
      aiConfidence: Number,
      suggestedActions: [String],
      followUpQuestions: [String]
    }
  }],
  context: {
    userProfile: {
      age: Number,
      gender: String,
      existingConditions: [String],
      medications: [String],
      allergies: [String]
    },
    conversationSummary: String,
    keyTopics: [String],
    emotionalState: {
      type: String,
      enum: ['calm', 'anxious', 'concerned', 'urgent', 'relaxed'],
      default: 'calm'
    },
    urgencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    }
  },
  aiInsights: {
    primaryConcern: String,
    suggestedTopics: [String],
    riskAssessment: {
      level: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
      },
      factors: [String],
      recommendations: [String]
    },
    followUpActions: [{
      action: String,
      priority: String,
      timeframe: String,
      type: String
    }]
  },
  userFeedback: {
    helpfulness: {
      type: Number,
      min: 1,
      max: 5
    },
    accuracy: {
      type: Number,
      min: 1,
      max: 5
    },
    satisfaction: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    followUpActions: [String]
  },
  settings: {
    aiModel: {
      type: String,
      default: 'gpt-4'
    },
    language: {
      type: String,
      default: 'en'
    },
    responseStyle: {
      type: String,
      enum: ['professional', 'friendly', 'simple', 'detailed'],
      default: 'friendly'
    },
    privacyLevel: {
      type: String,
      enum: ['standard', 'enhanced', 'strict'],
      default: 'standard'
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ sessionId: 1 });
chatSchema.index({ category: 1, status: 1 });
chatSchema.index({ 'context.urgencyLevel': 1 });

// Virtual for message count
chatSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Virtual for last message
chatSchema.virtual('lastMessage').get(function() {
  return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
});

// Virtual for conversation duration
chatSchema.virtual('duration').get(function() {
  if (this.messages.length < 2) return 0;
  const firstMessage = this.messages[0].timestamp;
  const lastMessage = this.messages[this.messages.length - 1].timestamp;
  return Math.round((lastMessage - firstMessage) / (1000 * 60)); // in minutes
});

// Method to add message
chatSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    metadata: {
      messageType: 'text',
      ...metadata
    }
  });
  
  // Update context based on new message
  this.updateContext();
  
  return this.save();
};

// Method to update conversation context
chatSchema.methods.updateContext = function() {
  if (this.messages.length === 0) return;
  
  const recentMessages = this.messages.slice(-5); // Last 5 messages
  const userMessages = recentMessages.filter(msg => msg.role === 'user');
  
  if (userMessages.length > 0) {
    const lastUserMessage = userMessages[userMessages.length - 1];
    
    // Simple urgency detection based on keywords
    const urgentKeywords = ['emergency', 'urgent', 'immediate', 'severe', 'critical', 'pain', 'help'];
    const hasUrgentKeywords = urgentKeywords.some(keyword => 
      lastUserMessage.content.toLowerCase().includes(keyword)
    );
    
    if (hasUrgentKeywords) {
      this.context.urgencyLevel = 'high';
      this.context.emotionalState = 'urgent';
    }
  }
};

// Method to get conversation summary
chatSchema.methods.getSummary = function() {
  return {
    id: this._id,
    sessionId: this.sessionId,
    title: this.title,
    category: this.category,
    status: this.status,
    messageCount: this.messageCount,
    duration: this.duration,
    urgencyLevel: this.context.urgencyLevel,
    lastMessage: this.lastMessage,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Pre-save middleware to generate session ID if not provided
chatSchema.pre('save', function(next) {
  if (!this.sessionId) {
    this.sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

module.exports = mongoose.model('Chat', chatSchema);


