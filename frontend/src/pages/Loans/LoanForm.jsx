import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  Grid, 
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper, 
  Select,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { 
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { format, addDays, addMonths } from 'date-fns';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import PageHeader from '../../components/Common/PageHeader';
import AsyncSelect from '../../components/Common/AsyncSelect';

const LoanForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const isEditing = Boolean(id);

  // Form state
  const [formData, setFormData] = useState({
    customer: '',
    startDate: new Date(),
    interestRate: 3, // Default 3% monthly interest
    items: [],
    notes: '',
    totalLoanAmount: 0,
    status: 'Active'
  });

  // UI state
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  
  // New item form state
  const [newItem, setNewItem] = useState({
    name: '',
    itemType: 'Gold Jewelry',
    weight: '',
    purity: '',
    quantity: 1,
    loanAmount: '',
    description: ''
  });

  // Fetch loan data if editing
  useEffect(() => {
    if (isEditing) {
      const fetchLoan = async () => {
        try {
          const response = await api.get(`/loans/${id}`);
          const loanData = response.data.data;
          
          setFormData({
            ...loanData,
            customer: loanData.customer._id,
            startDate: new Date(loanData.startDate),
            items: loanData.items
          });
          
          setLoading(false);
        } catch (err) {
          console.error('Error fetching loan:', err);
          showSnackbar('Failed to load loan details', 'error');
          navigate('/loans');
        }
      };
      
      fetchLoan();
    }
  }, [id, isEditing]);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await api.get('/customers');
        setCustomers(response.data.data);
      } catch (err) {
        console.error('Error fetching customers:', err);
        showSnackbar('Failed to load customers', 'error');
      }
    };
    
    fetchCustomers();
  }, []);

  // Calculate totals
  useEffect(() => {
    const totalLoanAmount = formData.items.reduce(
      (sum, item) => sum + (item.loanAmount || 0), 
      0
    );
    
    setFormData(prev => ({
      ...prev,
      totalLoanAmount
    }));
  }, [formData.items]);

  // Handle form field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // Handle customer selection
  const handleCustomerChange = (e) => {
    setFormData(prev => ({
      ...prev,
      customer: e.target.value
    }));
    
    if (errors.customer) {
      setErrors(prev => ({
        ...prev,
        customer: undefined
      }));
    }
  };

  // Handle date changes
  const handleDateChange = (name, date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // Handle new item form changes
  const handleNewItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add item to loan
  const addItemToLoan = () => {
    // Validate item
    if (!newItem.name || !newItem.loanAmount) {
      showSnackbar('Please fill all required item details', 'error');
      return;
    }
    
    // Add item to loan
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...newItem }]
    }));
    
    // Reset new item form
    setNewItem({
      name: '',
      itemType: 'Gold Jewelry',
      weight: '',
      purity: '',
      quantity: 1,
      loanAmount: '',
      description: ''
    });
    
    if (errors.items) {
      setErrors(prev => ({
        ...prev,
        items: undefined
      }));
    }
  };

  // Remove item from loan
  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.customer) {
      newErrors.customer = 'Please select a customer';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (formData.interestRate < 0) {
      newErrors.interestRate = 'Interest rate cannot be negative';
    }
    
    if (formData.items.length === 0) {
      newErrors.items = 'At least one collateral item is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showSnackbar('Please fix the errors before submitting', 'error');
      return;
    }
    
    setSubmitting(true);
    
    try {
      if (isEditing) {
        await api.put(`/loans/${id}`, formData);
        showSnackbar('Loan updated successfully', 'success');
      } else {
        const response = await api.post('/loans', formData);
        showSnackbar('Loan created successfully', 'success');
      }
      
      navigate('/loans');
    } catch (err) {
      console.error('Error saving loan:', err);
      showSnackbar(err.response?.data?.error || 'Failed to save loan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <PageHeader 
        title={isEditing ? "Edit Loan" : "Create New Loan"} 
        breadcrumbs={[
          { label: 'Loans', link: '/loans' },
          { label: isEditing ? 'Edit Loan' : 'New Loan' },
        ]}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/loans')}
          sx={{ mr: 1 }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Save Loan'}
        </Button>
      </PageHeader>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Customer and Loan Details */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Customer & Loan Details
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth error={!!errors.customer} required>
                    <InputLabel id="customer-select-label">Customer</InputLabel>
                    <Select
                      labelId="customer-select-label"
                      id="customer-select"
                      value={formData.customer}
                      onChange={handleCustomerChange}
                      label="Customer"
                    >
                      <MenuItem value="" disabled>
                        <em>Select a customer</em>
                      </MenuItem>
                      {customers.map(customer => (
                        <MenuItem key={customer._id} value={customer._id}>
                          {customer.name} - {customer.phone}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.customer && (
                      <FormHelperText>{errors.customer}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Start Date"
                      value={formData.startDate}
                      onChange={(date) => handleDateChange('startDate', date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          error: !!errors.startDate,
                          helperText: errors.startDate
                        }
                      }}
                      format="dd/MM/yyyy"
                    />
                  </LocalizationProvider>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="interestRate"
                    label="Monthly Interest Rate (%)"
                    type="number"
                    value={formData.interestRate}
                    onChange={handleInputChange}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">% per month</InputAdornment>,
                    }}
                    fullWidth
                    required
                    error={!!errors.interestRate}
                    helperText={errors.interestRate}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      label="Status"
                    >
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Closed">Closed</MenuItem>
                      <MenuItem value="Defaulted">Defaulted</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    name="notes"
                    label="Notes"
                    value={formData.notes || ''}
                    onChange={handleInputChange}
                    multiline
                    rows={3}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Loan Items and Summary */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Loan Summary
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>                
                <Grid item xs={12}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    Total Loan Amount:
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                    ₹{formData.totalLoanAmount.toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
            
            <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Collateral Items
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {/* Add new item form */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Add Collateral Item
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Item Name"
                        name="name"
                        value={newItem.name}
                        onChange={handleNewItemChange}
                        fullWidth
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Item Type</InputLabel>
                        <Select
                          name="itemType"
                          value={newItem.itemType}
                          onChange={handleNewItemChange}
                          label="Item Type"
                        >
                          <MenuItem value="Gold Jewelry">Gold Jewelry</MenuItem>
                          <MenuItem value="Silver Jewelry">Silver Jewelry</MenuItem>
                          <MenuItem value="Diamond Jewelry">Diamond Jewelry</MenuItem>
                          <MenuItem value="Other Jewelry">Other Jewelry</MenuItem>
                          <MenuItem value="Watch">Watch</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Weight (grams)"
                        name="weight"
                        type="number"
                        value={newItem.weight}
                        onChange={handleNewItemChange}
                        fullWidth
                        required
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Purity"
                        name="purity"
                        value={newItem.purity}
                        onChange={handleNewItemChange}
                        fullWidth
                        placeholder="e.g. 916, 22K, 999, etc."
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        label="Loan Amount"
                        name="loanAmount"
                        type="number"
                        value={newItem.loanAmount}
                        onChange={handleNewItemChange}
                        fullWidth
                        required
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        }}
                        inputProps={{ min: 0, step: 1 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        label="Description"
                        name="description"
                        value={newItem.description}
                        onChange={handleNewItemChange}
                        fullWidth
                        multiline
                        rows={2}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={addItemToLoan}
                        fullWidth
                      >
                        Add Item
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
              
              {/* Display loan items */}
              {errors.items && (
                <Typography color="error" sx={{ mt: 1, mb: 2 }}>
                  {errors.items}
                </Typography>
              )}
              
              {formData.items.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: 'rgba(92, 107, 192, 0.08)' }}>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Weight (g)</TableCell>
                        <TableCell align="right">Loan Amount</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {item.name}
                            {item.description && (
                              <Typography variant="caption" display="block" color="textSecondary">
                                {item.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{item.itemType}</TableCell>
                          <TableCell align="right">{item.weight} g</TableCell>
                          <TableCell align="right">₹{item.loanAmount.toLocaleString()}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Remove Item">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeItem(index)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                  No collateral items added yet
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </form>
    </>
  );
};

export default LoanForm; 