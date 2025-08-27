# AI Healthcare Assistant

A comprehensive, AI-powered healthcare application that helps users monitor their health, get basic medical advice, and manage appointments. Built with modern web technologies and powered by  Groq  models.

## 🚀 Features

### Core Functionality
- **AI-Powered Symptom Checker**: Analyze symptoms and get possible conditions with confidence levels
- **Secure User Authentication**: JWT-based authentication with encrypted password storage
- **Health Profile Management**: Comprehensive health records including allergies, medications, and conditions
- **AI Chat Interface**: Intelligent health conversations with context-aware responses
- **Appointment Scheduling**: Virtual and in-person appointment management
- **Health Dashboard**: Visual health tracking and analytics
- **Daily Health Tips**: Personalized wellness recommendations
- **Medication Reminders**: Track medications and set reminders

### AI Capabilities
- Symptom analysis with risk assessment
- Personalized health recommendations
- Natural language health conversations
- Appointment type suggestions
- Health tip generation
- Safety validation for all AI responses

### Security Features
- JWT authentication with refresh tokens
- Password encryption using bcrypt
- Rate limiting for API endpoints
- Input validation and sanitization
- CORS protection
- Helmet security headers

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **OpenAI API** for AI-powered features
- **JWT** for authentication
- **bcrypt** for password hashing
- **Express Validator** for input validation

### Frontend
- **React 18** with functional components
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **React Hook Form** for form management
- **Recharts** for data visualization

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher
- npm or yarn package manager

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai-healthcare-assistant
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Return to root
cd ..
```

### 3. Environment Configuration

#### Backend (.env file in server directory)
```bash
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/ai-healthcare

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secret-jwt-key-here

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=7d
```

#### Frontend (.env file in client directory)
```bash
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Database Setup
```bash
# Start MongoDB (if not running as a service)
mongod

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 5. Start the Application
```bash
# Development mode (runs both server and client)
npm run dev

# Or run separately:
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📱 Usage

### 1. User Registration
- Navigate to the registration page
- Fill in your personal and health information
- Create a secure password
- Verify your email (if email service is configured)

### 2. Symptom Checking
- Go to the Symptom Checker page
- Describe your symptoms in detail
- Select severity and duration
- Get AI-powered analysis and recommendations

### 3. Health Chat
- Start a new chat session
- Ask health-related questions
- Receive personalized advice
- Get follow-up recommendations

### 4. Appointment Management
- Schedule appointments with healthcare providers
- Choose between virtual and in-person visits
- Set reminders and notifications
- Track appointment history

### 5. Health Dashboard
- View your health statistics
- Track symptom patterns
- Monitor medication adherence
- Access daily health tips

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - User logout

### Symptoms
- `POST /api/symptoms/check` - AI symptom analysis
- `GET /api/symptoms/history` - Symptom history
- `GET /api/symptoms/stats/overview` - Symptom statistics

### Chat
- `POST /api/chat/start` - Start chat session
- `POST /api/chat/:sessionId/message` - Send message
- `GET /api/chat/history` - Chat history

### Appointments
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment

## 🏗️ Project Structure

```
ai-healthcare-assistant/
├── server/                 # Backend server
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── services/          # Business logic
│   └── index.js          # Server entry point
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   ├── services/     # API services
│   │   └── App.js        # Main app component
│   └── public/           # Static assets
├── package.json           # Root package.json
└── README.md             # This file
```

## 🔒 Security Considerations

### Data Protection
- All passwords are hashed using bcrypt
- JWT tokens have expiration times
- User data is isolated by user ID
- Input validation prevents injection attacks

### AI Safety
- All AI responses are validated for safety
- Medical disclaimers are prominently displayed
- Users are always encouraged to consult professionals
- Emergency situations are flagged appropriately

### Privacy
- User data is not shared with third parties
- Health information is encrypted in transit
- Users control their data sharing preferences
- GDPR-compliant data handling

## 🧪 Testing

```bash
# Run backend tests
cd server
npm test

# Run frontend tests
cd client
npm test

# Run all tests
npm run test:all
```

## 🚀 Deployment

### Production Environment Variables
```bash
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
GROQ_API_KEY=your-openai-api-key
CLIENT_URL=https://yourdomain.com
```

### Build and Deploy
```bash
# Build frontend
cd client
npm run build

# Start production server
cd ../server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**Important Medical Disclaimer**: This application is designed to provide general health information and guidance only. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read or received from this application.

In case of emergency, call your local emergency services immediately.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Contact the development team

## 🔮 Future Enhancements

- Integration with wearable devices
- Telemedicine video calls
- Prescription management
- Insurance integration
- Multi-language support
- Advanced analytics and reporting
- Mobile app development
- Integration with EHR systems

---

**Made by Tesfahun Kere**
