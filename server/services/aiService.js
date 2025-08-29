const Groq = require('groq-sdk');
const User = require('../models/User');

class AIService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    this.defaultModel = process.env.GROQ_MODEL || 'llama3-70b-8192';

    this.systemPrompts = {
      symptomChecker: `You are a medical AI assistant designed to help users understand their symptoms and provide general health guidance. 

IMPORTANT DISCLAIMERS:
- You are NOT a doctor and cannot provide medical diagnosis
- Always recommend consulting healthcare professionals for serious symptoms
- Focus on general wellness advice and symptom understanding
- Encourage professional medical evaluation when appropriate

Your role is to:
1. Analyze reported symptoms and provide possible explanations
2. Suggest when to seek professional medical help
3. Offer general wellness and lifestyle recommendations
4. Help users understand their symptoms better
5. Provide educational information about health conditions

Always maintain a caring, professional tone and prioritize user safety.`,

      healthChat: `You are a compassionate AI healthcare assistant designed to provide general health information, wellness advice, and support to users.

Your capabilities include:
- Answering general health questions
- Providing wellness and lifestyle advice
- Explaining medical concepts in simple terms
- Offering emotional support and encouragement
- Suggesting healthy habits and preventive measures

IMPORTANT LIMITATIONS:
- You cannot diagnose medical conditions
- You cannot prescribe medications
- You cannot replace professional medical advice
- Always recommend consulting healthcare providers for medical concerns

Maintain a warm, supportive, and professional tone while being clear about your limitations.`,

      appointmentScheduler: `You are an AI assistant that helps users schedule and manage healthcare appointments.

Your role is to:
- Help users understand what type of appointment they need
- Suggest appropriate appointment types based on symptoms
- Provide guidance on preparation for appointments
- Help users articulate their concerns to healthcare providers
- Offer tips for effective doctor-patient communication

Focus on being helpful and informative while maintaining appropriate boundaries.`
    };
  }

  async analyzeSymptoms(symptoms, userContext = {}) {
    try {
      // If no API key is provided, return a rule-based local assessment so the feature works
      if (!process.env.GROQ_API_KEY) {
        return this.ruleBasedAssessment(symptoms, userContext);
      }
      const system = `
${this.systemPrompts.symptomChecker}

User Profile:
- Age: ${userContext.age || 'Not specified'}
- Gender: ${userContext.gender || 'Not specified'}
- Existing Conditions: ${userContext.existingConditions?.join(', ') || 'None reported'}
- Current Medications: ${userContext.medications?.join(', ') || 'None reported'}
- Allergies: ${userContext.allergies?.join(', ') || 'None reported'}

Reported Symptoms:
${symptoms.map(s => `- ${s.name}: ${s.severity} severity, ${s.duration?.value || 'unknown'} ${s.duration?.unit || 'duration'}, ${s.description || 'no description'}`).join('\n')}

Please provide:
1. Possible explanations for these symptoms (with confidence levels)
2. Recommendations for when to seek medical attention
3. General wellness advice
4. Follow-up actions the user should consider

Format your response as JSON with the following structure:
{
  "possibleConditions": [
    {
      "condition": "string",
      "probability": number (0-100),
      "confidence": number (0-100),
      "description": "string",
      "symptoms": ["string"],
      "riskLevel": "low|medium|high|critical"
    }
  ],
  "recommendations": [
    {
      "type": "lifestyle|medication|consultation|emergency|monitoring",
      "title": "string",
      "description": "string",
      "priority": "low|medium|high|urgent",
      "timeframe": "string"
    }
  ],
  "generalAdvice": "string",
  "whenToSeekHelp": "string",
  "followUp": {
    "timeframe": "string",
    "actions": ["string"]
  }
}`;

      const completion = await this.groq.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: 'Please analyze these symptoms and provide guidance.' }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const response = completion.choices?.[0]?.message?.content || '';

      // Try direct JSON parse first
      try {
        return JSON.parse(response);
      } catch (directParseError) {
        // Attempt to extract JSON block from the response text
        const firstBrace = response.indexOf('{');
        const lastBrace = response.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const jsonSlice = response.slice(firstBrace, lastBrace + 1);
          try {
            return JSON.parse(jsonSlice);
          } catch (sliceParseError) {
            // fall through
          }
        }
        return this.parseFallbackResponse(response);
      }
    } catch (error) {
      console.error('AI symptom analysis error:', error);
      // Use rule-based assessment as a robust fallback so users always get a result
      return this.ruleBasedAssessment(symptoms, userContext);
    }
  }

  async chatResponse(message, chatHistory = [], userContext = {}) {
    try {
      const conversationContext = chatHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const system = `
${this.systemPrompts.healthChat}

User Context:
- Age: ${userContext.age || 'Not specified'}
- Gender: ${userContext.gender || 'Not specified'}
- Health Profile: ${userContext.healthProfile || 'Not specified'}

Recent Conversation:
${conversationContext.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Current Message: ${message}

Please provide a helpful, informative response that:
1. Addresses the user's question or concern
2. Provides accurate health information
3. Maintains appropriate medical boundaries
4. Offers supportive and encouraging guidance
5. Suggests when professional help might be needed

Keep your response conversational, helpful, and within your capabilities.`;

      const completion = await this.groq.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: system },
          ...conversationContext,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      return completion.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('AI chat error:', error);
      return 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment, or contact our support team if the issue persists.';
    }
  }

  async generateHealthTip(userContext = {}) {
    try {
      const system = `
You are a health and wellness expert. Generate a personalized daily health tip based on the user's context.

User Context:
- Age: ${userContext.age || 'Not specified'}
- Gender: ${userContext.gender || 'Not specified'}
- Lifestyle: ${userContext.lifestyle || 'Not specified'}

Generate a helpful, actionable health tip that is:
1. Relevant to the user's context
2. Practical and easy to implement
3. Evidence-based
4. Encouraging and positive
5. Appropriate for daily practice

Format as a single, concise tip (max 2 sentences).`;

      const completion = await this.groq.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: 'Please provide a personalized daily health tip.' }
        ],
        temperature: 0.8,
        max_tokens: 100
      });

      return completion.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('AI health tip generation error:', error);
      return 'Stay hydrated and aim for 7-9 hours of quality sleep each night for optimal health.';
    }
  }

  async suggestAppointmentType(symptoms, userContext = {}) {
    try {
      const system = `
${this.systemPrompts.appointmentScheduler}

Based on the user's symptoms and context, suggest the most appropriate type of healthcare appointment.

User Context:
- Age: ${userContext.age || 'Not specified'}
- Gender: ${userContext.gender || 'Not specified'}
- Symptoms: ${symptoms.join(', ')}

Suggest appointment types that would be most appropriate, considering:
1. Urgency of symptoms
2. Type of healthcare provider needed
3. Whether virtual or in-person consultation is suitable
4. Preparation needed for the appointment

Provide your suggestion in a helpful, informative manner.`;

      const completion = await this.groq.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: 'What type of appointment should I schedule for these symptoms?' }
        ],
        temperature: 0.5,
        max_tokens: 300
      });

      return completion.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('AI appointment suggestion error:', error);
      return 'Based on your symptoms, I recommend scheduling a consultation with your primary care physician to discuss your concerns and determine the best course of action.';
    }
  }

  parseFallbackResponse(response) {
    return {
      possibleConditions: [{
        condition: 'General symptoms',
        probability: 50,
        confidence: 60,
        description: 'Based on the symptoms provided',
        symptoms: ['Various symptoms'],
        riskLevel: 'medium'
      }],
      recommendations: [{
        type: 'consultation',
        title: 'Consult Healthcare Provider',
        description: 'Schedule an appointment with your doctor to discuss these symptoms',
        priority: 'medium',
        timeframe: 'Within a week'
      }],
      generalAdvice: response || 'Please consult with a healthcare professional for proper evaluation.',
      whenToSeekHelp: 'If symptoms persist or worsen, seek medical attention promptly.',
      followUp: {
        timeframe: '1-2 weeks',
        actions: ['Monitor symptoms', 'Schedule doctor appointment']
      }
    };
  }

  // Simple local heuristic to ensure varying, useful results without external API
  ruleBasedAssessment(symptoms, userContext = {}) {
    const severityScore = { mild: 1, moderate: 2, severe: 3 };
    const totalSeverity = (symptoms || []).reduce((sum, s) => sum + (severityScore[(s.severity || 'mild')] || 1), 0);
    const maxSeverity = (symptoms || []).reduce((max, s) => Math.max(max, severityScore[(s.severity || 'mild')] || 1), 1);
    const names = (symptoms || []).map(s => (s.name || '').toLowerCase());

    // Very lightweight mapping of common symptoms to conditions
    const rules = [
      { match: ['fever', 'cough'], condition: 'Viral respiratory infection', riskBase: 30 },
      { match: ['headache', 'nausea'], condition: 'Migraine', riskBase: 25 },
      { match: ['chest pain'], condition: 'Cardiac or musculoskeletal cause', riskBase: 50 },
      { match: ['fatigue'], condition: 'Fatigue (multifactorial)', riskBase: 20 },
      { match: ['abdominal pain'], condition: 'Gastrointestinal upset', riskBase: 30 },
      { match: ['shortness of breath'], condition: 'Respiratory issue', riskBase: 40 },
    ];

    const matched = rules.filter(r => r.match.some(m => names.includes(m)));
    const baseConditions = matched.length ? matched : [{ match: [], condition: 'Non-specific presentation', riskBase: 15 }];

    const possibleConditions = baseConditions.slice(0, 3).map((r, idx) => {
      const probability = Math.min(90, r.riskBase + maxSeverity * 10 + idx * 5);
      const confidence = Math.min(90, 40 + totalSeverity * 8 - idx * 5);
      const riskLevel = probability >= 70 ? 'high' : probability >= 45 ? 'medium' : 'low';
      return {
        condition: r.condition,
        probability,
        confidence,
        description: 'Estimated from reported symptoms using heuristic rules.',
        symptoms: names,
        riskLevel
      };
    });

    const recommendations = [];
    if (maxSeverity >= 3 || names.includes('chest pain') || names.includes('shortness of breath')) {
      recommendations.push({
        type: 'emergency',
        title: 'Seek urgent medical care if symptoms are severe',
        description: 'If chest pain, severe shortness of breath, fainting, or confusion occur, seek immediate medical attention.',
        priority: 'urgent',
        timeframe: 'Immediately'
      });
    }
    recommendations.push({
      type: 'consultation',
      title: 'Consult a healthcare professional',
      description: 'Discuss these symptoms with your healthcare provider for appropriate evaluation.',
      priority: maxSeverity >= 2 ? 'high' : 'medium',
      timeframe: maxSeverity >= 2 ? 'Within 1-3 days' : 'Within 1-2 weeks'
    });
    recommendations.push({
      type: 'lifestyle',
      title: 'Supportive care',
      description: 'Hydration, balanced diet, rest, and monitoring of symptom changes.',
      priority: 'medium',
      timeframe: 'Ongoing'
    });

    const generalAdvice = 'This is educational guidance only and not a diagnosis. Monitor symptom changes and seek professional care as appropriate.';
    const whenToSeekHelp = 'If symptoms worsen, new severe symptoms develop, or you are concerned, seek medical attention promptly.';
    const followUp = { timeframe: '1-2 weeks', actions: ['Monitor symptoms daily', 'Track temperature and severity', 'Consult provider if persistent'] };

    return { possibleConditions, recommendations, generalAdvice, whenToSeekHelp, followUp };
  }

  validateResponse(response) {
    const dangerousKeywords = [
      'self-diagnose', 'self-treat', 'ignore symptoms', 'delay treatment',
      'alternative medicine only', 'avoid doctors', 'natural cure'
    ];

    const hasDangerousContent = typeof response === 'string' && dangerousKeywords.some(keyword => 
      response.toLowerCase().includes(keyword)
    );

    if (hasDangerousContent) {
      return {
        isValid: false,
        sanitizedResponse: 'I recommend consulting with a healthcare professional for proper evaluation of your symptoms.'
      };
    }

    return { isValid: true, sanitizedResponse: response };
  }
}

module.exports = new AIService();
