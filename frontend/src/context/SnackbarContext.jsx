import React, { createContext, useContext } from 'react';
import { toast } from 'react-toastify';

// Create context
const SnackbarContext = createContext(null);

// Provider component
export const SnackbarProvider = ({ children }) => {
  // Wrapper function to display snackbars using toast
  const showSnackbar = (message, type = 'info', options = {}) => {
    switch (type) {
      case 'success':
        toast.success(message, options);
        break;
      case 'error':
        toast.error(message, options);
        break;
      case 'warning':
        toast.warning(message, options);
        break;
      case 'info':
      default:
        toast.info(message, options);
        break;
    }
  };

  const value = {
    showSnackbar
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
    </SnackbarContext.Provider>
  );
};

// Custom hook to use the snackbar context
export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  
  if (context === null) {
    // If not wrapped in provider, return a simple implementation using toast directly
    return {
      showSnackbar: (message, type = 'info', options = {}) => {
        switch (type) {
          case 'success':
            toast.success(message, options);
            break;
          case 'error':
            toast.error(message, options);
            break;
          case 'warning':
            toast.warning(message, options);
            break;
          case 'info':
          default:
            toast.info(message, options);
            break;
        }
      }
    };
  }
  
  return context;
}; 