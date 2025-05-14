import axios from 'axios';
import { toast } from 'react-toastify';

// Determine API URL based on environment
const API_URL = "https://jewelry-management-api.onrender.com/api";

console.log('API URL:', API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage if it exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle error responses
    const { response } = error;
    
    if (response) {
      // Handle token expiration or invalid token
      if (response.status === 401) {
        // Clear token and user data from local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Show error message
        toast.error('Your session has expired. Please log in again.');
        
        // Redirect to login page
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      } else if (response.status === 404) {
        toast.error('Resource not found. Please check your request.');
      } else if (response.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        // Display the error message from the API if available
        const errorMessage = response.data?.error || 'An error occurred. Please try again.';
        toast.error(errorMessage);
      }
    } else {
      // Network error
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

export default api; 