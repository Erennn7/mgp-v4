import { create } from 'zustand';
import axios from 'axios';
import { toast } from 'react-toastify';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  // State
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,

  // Actions
  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;
      
      // Store token and user info
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update state
      set({ 
        token, 
        user, 
        isAuthenticated: true, 
        loading: false,
        error: null
      });
      
      toast.success('Registration successful!');
      return true;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.error || 'Registration failed. Please try again.'
      });
      toast.error(error.response?.data?.error || 'Registration failed. Please try again.');
      return false;
    }
  },
  
  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, user } = response.data;
      
      // Store token and user info
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set token for all subsequent API calls
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Update state
      set({ 
        token, 
        user, 
        isAuthenticated: true, 
        loading: false,
        error: null
      });
      
      toast.success('Login successful!');
      return true;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.error || 'Login failed. Please check your credentials.'
      });
      toast.error(error.response?.data?.error || 'Login failed. Please check your credentials.');
      return false;
    }
  },
  
  logout: async () => {
    try {
      // Call logout endpoint (optional)
      await api.get('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear token from axios headers
      delete api.defaults.headers.common['Authorization'];
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Update state
      set({ 
        token: null, 
        user: null, 
        isAuthenticated: false,
        error: null
      });
      
      toast.info('You have been logged out.');
    }
  },
  
  checkAuth: async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      set({ isAuthenticated: false });
      return false;
    }
    
    try {
      // Set token for API call
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token by getting user info
      const response = await api.get('/auth/me');
      
      if (response.data.success) {
        set({ isAuthenticated: true, user: response.data.data });
        return true;
      } else {
        // If token is invalid, log the user out
        get().logout();
        return false;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      // If API call fails, log the user out
      get().logout();
      return false;
    }
  },
  
  updateUserProfile: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put('/auth/updatedetails', userData);
      
      if (response.data.success) {
        // Update user in local storage and state
        localStorage.setItem('user', JSON.stringify(response.data.data));
        set({ 
          user: response.data.data, 
          loading: false,
          error: null
        });
        
        toast.success('Profile updated successfully!');
        return true;
      }
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.error || 'Failed to update profile.'
      });
      toast.error(error.response?.data?.error || 'Failed to update profile.');
      return false;
    }
  },
  
  updatePassword: async (passwordData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put('/auth/updatepassword', passwordData);
      
      if (response.data.success) {
        set({ loading: false, error: null });
        toast.success('Password updated successfully!');
        return true;
      }
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.error || 'Failed to update password.'
      });
      toast.error(error.response?.data?.error || 'Failed to update password.');
      return false;
    }
  }
}));

export default useAuthStore; 