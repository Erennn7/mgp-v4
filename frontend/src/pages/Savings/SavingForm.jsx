import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Grid,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Calculate as CalculateIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import PageHeader from '../../components/Common/PageHeader';
import CustomerLookup from '../../components/Customer/CustomerLookup';

const SavingForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const isEditMode = Boolean(id);

  // Generate a default scheme number (SV-YYYYMMDD-XXXX format)
  const generateSchemeNumber = () => {
    const date = dayjs().format('YYYYMMDD');
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    return `SV-${date}-${random}`;
  };

  // Form state
  const [formData, setFormData] = useState({
    customer: '',
    schemeName: '',
    schemeNumber: generateSchemeNumber(),
    installmentAmount: '',
    duration: 11,
    startDate: dayjs().format('YYYY-MM-DD'),
    bonusAmount: '',
    bonusPercentage: '',
    notes: '',
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [customerError, setCustomerError] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [calculatedData, setCalculatedData] = useState({
    totalAmount: 0,
    bonusAmount: 0,
    maturityAmount: 0,
    maturityDate: null,
    installments: [],
  });
  
  // Check authentication status
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCustomerError('Authentication required. Please log in again.');
      showSnackbar('Authentication error. Please log in again.', 'error');
    }
  }, []);
  
  // Fetch savings data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchSavingData = async () => {
        setFetchingData(true);
        try {
          const response = await api.get(`/savings/${id}`);
          const saving = response.data.data;
          
          // Format dates
          const startDate = saving.startDate ? dayjs(saving.startDate).format('YYYY-MM-DD') : '';
          
          setFormData({
            customer: saving.customer._id,
            schemeName: saving.schemeName,
            schemeNumber: saving.schemeNumber,
            installmentAmount: saving.installmentAmount,
            duration: saving.duration,
            startDate,
            bonusAmount: saving.bonusAmount,
            bonusPercentage: saving.bonusPercentage,
            notes: saving.notes || '',
          });
          
          setCustomerDetails(saving.customer);
          
          // Calculate maturity amount and dates
          calculateSchemeDetails({
            ...saving,
            startDate,
          });
          
        } catch (err) {
          console.error('Error fetching saving scheme:', err);
          setError('Failed to load saving scheme details');
          showSnackbar('Error loading saving scheme details', 'error');
        } finally {
          setFetchingData(false);
        }
      };
      
      fetchSavingData();
    }
  }, [id, isEditMode]);
  
  // Calculate scheme details when form changes
  useEffect(() => {
    if (formData.installmentAmount && formData.duration) {
      calculateSchemeDetails(formData);
    }
  }, [formData.installmentAmount, formData.duration, formData.startDate, formData.bonusAmount, formData.bonusPercentage]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  // Handle customer selection
  const handleCustomerSelect = (customer) => {
    console.log('Customer selected in SavingForm:', customer);
    if (!customer) return;

    setFormData({
      ...formData,
      customer: customer._id,
    });
    setCustomerDetails(customer);
    setCustomerError(null);
  };
  
  // Handle date changes
  const handleDateChange = (date, fieldName) => {
    setFormData({
      ...formData,
      [fieldName]: date ? dayjs(date).format('YYYY-MM-DD') : null,
    });
  };
  
  // Calculate scheme details
  const calculateSchemeDetails = (data) => {
    if (!data.installmentAmount || !data.duration || !data.startDate) {
      return;
    }
    
    const installmentAmount = parseFloat(data.installmentAmount) || 0;
    const duration = parseInt(data.duration, 10) || 0;
    const startDate = dayjs(data.startDate);
    
    // Calculate total contribution
    const totalAmount = installmentAmount * duration;
    
    // Generate installment dates
    const installments = [];
    for (let i = 0; i < duration; i++) {
      const dueDate = startDate.add(i, 'month');
      installments.push({
        index: i + 1,
        amount: installmentAmount,
        dueDate: dueDate.format('YYYY-MM-DD'),
        status: 'Pending',
      });
    }
    
    // Calculate maturity date (one month after last installment)
    const maturityDate = startDate.add(duration, 'month');
    
    // Calculate bonus and maturity amount
    let bonusAmount = 0;
    
    if (data.bonusAmount && parseFloat(data.bonusAmount) > 0) {
      // Use specified fixed bonus
      bonusAmount = parseFloat(data.bonusAmount);
    } else if (data.bonusPercentage && parseFloat(data.bonusPercentage) > 0) {
      // Calculate bonus based on percentage
      bonusAmount = (totalAmount * parseFloat(data.bonusPercentage)) / 100;
    } else {
      // Default: One month's installment as bonus
      bonusAmount = installmentAmount;
    }
    
    const maturityAmount = totalAmount + bonusAmount;
    
    setCalculatedData({
      totalAmount,
      bonusAmount,
      maturityAmount,
      maturityDate: maturityDate.format('YYYY-MM-DD'),
      installments,
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.customer) {
      showSnackbar('Please select a customer', 'error');
      setCustomerError('Please select a customer');
      return;
    }
    
    if (!formData.schemeName) {
      showSnackbar('Please enter a scheme name', 'error');
      return;
    }
    
    if (!formData.installmentAmount || parseFloat(formData.installmentAmount) <= 0) {
      showSnackbar('Please enter a valid installment amount', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      const dataToSubmit = {
        ...formData,
        totalAmount: calculatedData.totalAmount,
        maturityDate: calculatedData.maturityDate,
      };
      
      let response;
      
      if (isEditMode) {
        response = await api.put(`/savings/${id}`, dataToSubmit);
        showSnackbar('Saving scheme updated successfully', 'success');
      } else {
        response = await api.post('/savings', dataToSubmit);
        showSnackbar('Saving scheme created successfully', 'success');
      }
      
      navigate(`/savings/${response.data.data._id}`);
    } catch (err) {
      console.error('Error saving scheme:', err);
      setError(err.response?.data?.error || 'Failed to save saving scheme');
      showSnackbar(err.response?.data?.error || 'Failed to save saving scheme', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle duration increase/decrease
  const adjustDuration = (amount) => {
    const newDuration = Math.max(1, parseInt(formData.duration || 0) + amount);
    setFormData({
      ...formData,
      duration: newDuration,
    });
  };

  if (fetchingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Format values with fallbacks to prevent errors
  const formatCurrency = (value) => {
    return (value || 0).toLocaleString();
  };

  return (
    <Box>
      <PageHeader
        title={isEditMode ? 'Edit Saving Scheme' : 'New Saving Scheme'}
        subtitle={isEditMode ? 'Update saving scheme details' : 'Create a new saving scheme'}
        breadcrumbs={[
          { label: 'Savings', link: '/savings' },
          { label: isEditMode ? 'Edit Scheme' : 'New Scheme' },
        ]}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(isEditMode ? `/savings/${id}` : '/savings')}
          size="small"
        >
          Back
        </Button>
      </PageHeader>

      <Paper sx={{ p: 2, borderRadius: 2, mb: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {customerError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {customerError}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {/* Customer Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Customer Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={12}>
              <CustomerLookup
                value={formData.customer}
                onChange={handleCustomerSelect}
                disabled={isEditMode}
                customer={customerDetails}
                error={!!customerError}
                helperText={customerError}
              />
            </Grid>

            {/* Scheme Details */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Scheme Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Scheme Number"
                name="schemeNumber"
                value={formData.schemeNumber}
                onChange={handleChange}
                required
                size="small"
                disabled={isEditMode}
                InputProps={{
                  readOnly: isEditMode,
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Scheme Name"
                name="schemeName"
                value={formData.schemeName}
                onChange={handleChange}
                required
                placeholder="e.g., Gold Savings Plan, Silver Scheme"
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Start Date"
                value={formData.startDate ? dayjs(formData.startDate) : null}
                onChange={(date) => handleDateChange(date, 'startDate')}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    size: "small",
                    InputProps: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon />
                        </InputAdornment>
                      ),
                    },
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Monthly Installment Amount"
                name="installmentAmount"
                type="number"
                value={formData.installmentAmount}
                onChange={handleChange}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Duration (Months)"
                name="duration"
                type="number"
                value={formData.duration}
                onChange={handleChange}
                required
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Tooltip title="Decrease">
                        <IconButton 
                          size="small" 
                          onClick={() => adjustDuration(-1)}
                          disabled={parseInt(formData.duration) <= 1}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Increase">
                        <IconButton size="small" onClick={() => adjustDuration(1)}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bonus Amount (Fixed)"
                name="bonusAmount"
                type="number"
                value={formData.bonusAmount}
                onChange={handleChange}
                helperText="Fixed bonus amount on maturity (leave empty to use default)"
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bonus Percentage"
                name="bonusPercentage"
                type="number"
                value={formData.bonusPercentage}
                onChange={handleChange}
                helperText="Percentage of total amount as bonus (leave empty to use default)"
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                multiline
                rows={3}
                size="small"
              />
            </Grid>

            {/* Calculated Summary */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Contribution:
                    </Typography>
                    <Typography variant="h6">
                      ₹{formatCurrency(calculatedData.totalAmount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Bonus Amount:
                    </Typography>
                    <Typography variant="h6">
                      ₹{formatCurrency(calculatedData.bonusAmount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Maturity Amount:
                    </Typography>
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                      ₹{formatCurrency(calculatedData.maturityAmount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Maturity Date:
                    </Typography>
                    <Typography variant="h6">
                      {calculatedData.maturityDate
                        ? dayjs(calculatedData.maturityDate).format('DD/MM/YYYY')
                        : 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate(isEditMode ? `/savings/${id}` : '/savings')}
                sx={{ mr: 2 }}
                size="small"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                disabled={loading}
                size="small"
              >
                {loading ? <CircularProgress size={24} /> : isEditMode ? 'Update' : 'Save'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default SavingForm; 