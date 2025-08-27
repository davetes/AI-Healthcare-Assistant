"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/auth/profile');
          setUser(response.data.user);
        }
      } catch (error) {
        try { if (typeof window !== 'undefined') localStorage.removeItem('token'); } catch {}
        setToken(null);
        api.defaults.headers.common['Authorization'] = '';
      } finally {
        setLoading(false);
      }
    };

    // Ensure this only runs on the client
    if (typeof window !== 'undefined') {
      checkAuth();
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token: authToken } = response.data;
      try { if (typeof window !== 'undefined') localStorage.setItem('token', authToken); } catch {}
      setToken(authToken);
      setUser(userData);
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed. Please try again.' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { user: newUser, token: authToken } = response.data;
      try { if (typeof window !== 'undefined') localStorage.setItem('token', authToken); } catch {}
      setToken(authToken);
      setUser(newUser);
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      if (token) await api.post('/auth/logout');
    } catch {}
    finally {
      try { if (typeof window !== 'undefined') localStorage.removeItem('token'); } catch {}
      setToken(null);
      setUser(null);
      api.defaults.headers.common['Authorization'] = '';
    }
  };

  const updateProfile = async (updates) => {
    try {
      const response = await api.put('/auth/profile', updates);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Profile update failed. Please try again.' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Password change failed. Please try again.' };
    }
  };

  const refreshToken = async () => {
    try {
      const response = await api.post('/auth/refresh');
      const { user: userData, token: authToken } = response.data;
      try { if (typeof window !== 'undefined') localStorage.setItem('token', authToken); } catch {}
      setToken(authToken);
      setUser(userData);
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      return { success: true };
    } catch (error) {
      await logout();
      return { success: false };
    }
  };

  const checkTokenExpiry = async () => {
    if (!token) return false;
    try {
      await api.get('/auth/profile');
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        const res = await refreshToken();
        return !!res.success;
      }
      return false;
    }
  };

  const value = {
    user,
    loading,
    token,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshToken,
    checkTokenExpiry,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
