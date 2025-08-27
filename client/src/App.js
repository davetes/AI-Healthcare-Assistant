import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import SymptomChecker from './pages/SymptomChecker';
import Chat from './pages/Chat';
import Appointments from './pages/Appointments';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import HealthTips from './pages/HealthTips';
import Medications from './pages/Medications';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Main App Layout
const AppLayout = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// Public Routes
const PublicRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="*" element={<Navigate to="/login" />} />
  </Routes>
);

// Protected Routes
const ProtectedRoutes = () => (
  <Routes>
    <Route path="/" element={
      <AppLayout>
        <Dashboard />
      </AppLayout>
    } />
    <Route path="/symptoms" element={
      <AppLayout>
        <SymptomChecker />
      </AppLayout>
    } />
    <Route path="/chat" element={
      <AppLayout>
        <Chat />
      </AppLayout>
    } />
    <Route path="/appointments" element={
      <AppLayout>
        <Appointments />
      </AppLayout>
    } />
    <Route path="/health-tips" element={
      <AppLayout>
        <HealthTips />
      </AppLayout>
    } />
    <Route path="/medications" element={
      <AppLayout>
        <Medications />
      </AppLayout>
    } />
    <Route path="/profile" element={
      <AppLayout>
        <Profile />
      </AppLayout>
    } />
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
);

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

// App Routes Component
const AppRoutes = () => {
  const { user } = useAuth();
  
  return user ? <ProtectedRoutes /> : <PublicRoutes />;
};

export default App;


