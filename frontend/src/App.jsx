import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Hooks
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { SnackbarProvider } from './context/SnackbarContext';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Customers from './pages/Customers/Customers';
import CustomerDetail from './pages/Customers/CustomerDetail';
import Products from './pages/Products/Products';
import ProductDetail from './pages/Products/ProductDetail';
import Rates from './pages/Rates/Rates';
import Sales from './pages/Sales/Sales';
import SaleDetail from './pages/Sales/SaleDetail';
import Loans from './pages/Loans/Loans';
import LoanDetail from './pages/Loans/LoanDetail';
import LoanForm from './pages/Loans/LoanForm';
import Savings from './pages/Savings/Savings';
import SavingDetail from './pages/Savings/SavingDetail';
import SavingForm from './pages/Savings/SavingForm';
import SavingRedemption from './pages/Savings/SavingRedemption';
import SavingRedemptionDetail from './pages/Savings/SavingRedemptionDetail';
import Purchases from './pages/Purchases/Purchases';
import PurchaseDetail from './pages/Purchases/PurchaseDetail';
import Suppliers from './pages/Suppliers/Suppliers';
import SupplierDetail from './pages/Suppliers/SupplierDetail';
import Reports from './pages/Reports/Reports';
import NotFound from './pages/NotFound';

function App() {
  const { checkAuth, isAuthenticated, user } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <SnackbarProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <CssBaseline />
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme={theme.palette.mode}
            />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
              <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/:id" element={<CustomerDetail />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/rates" element={<Rates />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/sales/:id" element={<SaleDetail />} />
                  <Route path="/loans" element={<Loans />} />
                  <Route path="/loans/new" element={<LoanForm />} />
                  <Route path="/loans/:id" element={<LoanDetail />} />
                  <Route path="/loans/:id/edit" element={<LoanForm />} />
                  <Route path="/savings" element={<Savings />} />
                  <Route path="/savings/new" element={<SavingForm />} />
                  <Route path="/savings/:id" element={<SavingDetail />} />
                  <Route path="/savings/:id/edit" element={<SavingForm />} />
                  <Route path="/savings/:id/redeem" element={<SavingRedemption />} />
                  <Route path="/savings/redemptions/:id" element={<SavingRedemptionDetail />} />
                  <Route path="/purchases" element={<Purchases />} />
                  <Route path="/purchases/new" element={<Purchases />} />
                  <Route path="/purchases/:id" element={<PurchaseDetail />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/suppliers/new" element={<Suppliers />} />
                  <Route path="/suppliers/:id" element={<SupplierDetail />} />
                  <Route path="/reports" element={<Reports />} />
                </Route>
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LocalizationProvider>
        </SnackbarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 