import React, { createContext, useContext } from 'react';
import useAuthStore from '../store/authStore';

// Create context
const AuthContext = createContext(null);

// Provider component
export const AuthProvider = ({ children }) => {
  const authStore = useAuthStore();
  
  return (
    <AuthContext.Provider value={authStore}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    return useAuthStore(); // Fallback to direct store usage if not wrapped in provider
  }
  return context;
}; 