import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  FormHelperText,
  Chip,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import { 
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  History as HistoryIcon,
  CheckCircleOutline as CheckCircleOutlineIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import Autocomplete from '@mui/material/Autocomplete';

import PageHeader from '../../components/Common/PageHeader';
import DataTable from '../../components/Common/DataTable';
import FormDialog from '../../components/Common/FormDialog';
import api from '../../services/api';
import { toast } from 'react-toastify';

// Rate form component
const RateForm = ({ initialData, loading, onFormDataChange }) => {
  const [formData, setFormData] = useState({
    metal: '',
    purity: '',
    ratePerGram: '',
    rateDate: dayjs(),
    isActive: true
  });
  
  const [errors, setErrors] = useState({});

  // Initialize form with initial data if editing
  useEffect(() => {
    if (initialData) {
      const initialFormData = {
        metal: initialData.metal || '',
        purity: initialData.purity || '',
        ratePerGram: initialData.ratePerGram || initialData.rate || '',
        rateDate: initialData.rateDate ? dayjs(initialData.rateDate) : dayjs(),
        isActive: initialData.isActive !== undefined ? initialData.isActive : true
      };
      
      setFormData(initialFormData);
      
      // Notify parent component about initial data
      if (onFormDataChange) {
        onFormDataChange(initialFormData);
      }
    }
  }, [initialData, onFormDataChange]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle special number fields
    let parsedValue = value;
    if (name === 'ratePerGram' && value !== '') {
      parsedValue = parseFloat(value);
    }
    
    const updatedFormData = {
      ...formData,
      [name]: parsedValue
    };
    
    setFormData(updatedFormData);
    
    // Notify parent component about data change
    if (onFormDataChange) {
      onFormDataChange(updatedFormData);
    }
    
    // Clear error for the field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  // Handle date change
  const handleDateChange = (date) => {
    const updatedFormData = {
      ...formData,
      rateDate: date
    };
    
    setFormData(updatedFormData);
    
    // Notify parent component about data change
    if (onFormDataChange) {
      onFormDataChange(updatedFormData);
    }
  };

  // Metal options
  const metalOptions = [
    { value: 'Gold', label: 'Gold' },
    { value: 'Silver', label: 'Silver' },
    { value: 'Diamond', label: 'Diamond' },
    { value: 'Other', label: 'Other' }
  ];

  // Get purity options based on selected metal
  const getPurityOptions = () => {
    if (formData.metal === 'Gold') {
      return [
        { value: '24K', label: '24K (99.9% Pure)' },
        { value: '22K', label: '22K (91.6% Pure)' },
        { value: '20K', label: '20K (83.3% Pure)' },
        { value: '18K', label: '18K (75% Pure)' },
        { value: '14K', label: '14K (58.3% Pure)' }
      ];
    } else if (formData.metal === 'Silver') {
      return [
        { value: '999', label: '999 (99.9% Pure)' },
        { value: '925', label: '925 (92.5% Pure)' },
        { value: '900', label: '900 (90% Pure)' },
        { value: '800', label: '800 (80% Pure)' }
      ];
    } else if (formData.metal === 'Diamond') {
      return [
        { value: 'VS', label: 'VS Clarity' },
        { value: 'SI', label: 'SI Clarity' },
        { value: 'I', label: 'I Clarity' }
      ];
    }
    return [
      { value: 'Standard', label: 'Standard' }
    ];
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required error={!!errors.metal}>
          <InputLabel id="metal-label">Metal</InputLabel>
          <Select
            labelId="metal-label"
            id="metal"
            name="metal"
            value={formData.metal}
            onChange={handleChange}
            disabled={loading}
          >
            {metalOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {errors.metal && <FormHelperText>{errors.metal}</FormHelperText>}
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required error={!!errors.purity} disabled={!formData.metal}>
          <Autocomplete
            id="purity"
            freeSolo
            disableClearable
            options={getPurityOptions()}
            getOptionLabel={(option) => {
              // Handle both string values and option objects
              if (typeof option === 'string') return option;
              return option.label || option.value || '';
            }}
            value={formData.purity}
            onChange={(event, newValue) => {
              // Handle both string values and option objects
              const value = typeof newValue === 'string' ? newValue : newValue?.value;
              handleChange({
                target: { name: 'purity', value }
              });
            }}
            disabled={loading || !formData.metal}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Purity"
                name="purity"
                required
                error={!!errors.purity}
                helperText={errors.purity || "Select from list or type custom value"}
                onChange={(e) => {
                  handleChange({
                    target: { name: 'purity', value: e.target.value }
                  });
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                {option.label || option.value}
              </li>
            )}
          />
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          required
          label="Rate per Gram"
          name="ratePerGram"
          type="number"
          value={formData.ratePerGram}
          onChange={handleChange}
          disabled={loading}
          error={!!errors.ratePerGram}
          helperText={errors.ratePerGram}
          InputProps={{
            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <DatePicker
          label="Rate Date"
          value={formData.rateDate}
          onChange={handleDateChange}
          slotProps={{
            textField: {
              fullWidth: true,
              required: true,
              error: !!errors.rateDate,
              helperText: errors.rateDate,
            },
          }}
          disabled={loading}
        />
      </Grid>
    </Grid>
  );
};

const Rates = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [selectedRate, setSelectedRate] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [rateHistory, setRateHistory] = useState([]);
  const [selectedRateType, setSelectedRateType] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle form data changes
  const handleFormDataChange = (data) => {
    setFormData(data);
  };

  // Fetch rates from API
  const fetchRates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/rates');
      setRates(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load rates');
      console.error('Rates fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch rate history for a specific metal and purity
  const fetchRateHistory = async (metal, purity) => {
    if (!metal || !purity) return;
    
    setLoadingHistory(true);
    setSelectedRateType({ metal, purity });
    
    try {
      const response = await api.get(`/rates/history/${metal}/${purity}`);
      setRateHistory(response.data.data);
    } catch (err) {
      toast.error('Failed to load rate history');
      console.error('Rate history fetch error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // Handle add/edit rate
  const handleAddRate = () => {
    setSelectedRate(null);
    setOpenForm(true);
  };

  const handleEditRate = (rate) => {
    setSelectedRate(rate);
    setOpenForm(true);
  };

  // Toggle rate active status
  const handleToggleActive = async (rate) => {
    try {
      await api.patch(`/rates/${rate._id}/toggle-active`);
      toast.success(`Rate ${rate.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchRates();
      
      // Refresh history if we're viewing it
      if (selectedRateType) {
        fetchRateHistory(selectedRateType.metal, selectedRateType.purity);
      }
    } catch (err) {
      toast.error('Failed to update rate status');
      console.error('Rate status update error:', err);
    }
  };

  // View rate history
  const handleViewHistory = (metal, purity) => {
    fetchRateHistory(metal, purity);
    setActiveTab(1);
  };

  // Handle form submit
  const handleFormSubmit = async () => {
    if (!formData) return;
    
    // Validate form data
    const errors = {};
    if (!formData.metal) errors.metal = 'Metal is required';
    if (!formData.purity) errors.purity = 'Purity is required';
    if (!formData.ratePerGram) errors.ratePerGram = 'Rate is required';
    
    if (Object.keys(errors).length > 0) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setFormSubmitting(true);
    
    try {
      const submitData = {
        metal: formData.metal,
        purity: formData.purity,
        ratePerGram: formData.ratePerGram,
        rateDate: formData.rateDate.toISOString(),
        isActive: formData.isActive
      };
      
      if (selectedRate) {
        await api.put(`/rates/${selectedRate._id}`, submitData);
        toast.success('Rate updated successfully');
      } else {
        await api.post('/rates', submitData);
        toast.success('Rate added successfully');
      }
      
      fetchRates();
      setOpenForm(false);
      
      // Refresh history if we're viewing it and the updated rate is related
      if (selectedRateType && 
          selectedRateType.metal === formData.metal && 
          selectedRateType.purity === formData.purity) {
        fetchRateHistory(selectedRateType.metal, selectedRateType.purity);
      }
    } catch (err) {
      toast.error('Failed to save rate');
      console.error('Rate save error:', err);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Table columns for current rates
  const currentRatesColumns = [
    {
      field: 'metal',
      headerName: 'Metal',
      width: 120,
    },
    {
      field: 'purity',
      headerName: 'Purity',
      width: 120,
    },
    {
      field: 'ratePerGram',
      headerName: 'Rate (per gram)',
      width: 180,
      valueFormatter: (params) =>
        params.value
          ? new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
            }).format(params.value)
          : '-',
    },
    {
      field: 'rateDate',
      headerName: 'Rate Date',
      width: 150,
      valueFormatter: (params) =>
        params.value 
          ? new Date(params.value).toLocaleDateString() 
          : '-',
    },
    {
      field: 'isActive',
      headerName: 'Active',
      width: 120,
      renderCell: (params) => (
        <Chip 
          icon={params.value ? <CheckCircleIcon /> : <CheckCircleOutlineIcon />}
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 300,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            onClick={() => handleEditRate(params.row)}
          >
            Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            color={params.row.isActive ? 'error' : 'success'}
            onClick={() => handleToggleActive(params.row)}
          >
            {params.row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<HistoryIcon />}
            onClick={() => handleViewHistory(params.row.metal, params.row.purity)}
          >
            History
          </Button>
        </Box>
      ),
    },
  ];

  // Table columns for rate history
  const historyColumns = [
    {
      field: 'ratePerGram',
      headerName: 'Rate (per gram)',
      width: 180,
      valueFormatter: (params) =>
        params.value
          ? new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
            }).format(params.value)
          : '-',
    },
    {
      field: 'rateDate',
      headerName: 'Rate Date',
      width: 180,
      valueFormatter: (params) =>
        params.value 
          ? new Date(params.value).toLocaleDateString() 
          : '-',
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip 
          icon={params.value ? <CheckCircleIcon /> : <CheckCircleOutlineIcon />}
          label={params.value ? 'Current Rate' : 'Historical'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 150,
      valueFormatter: (params) =>
        params.value 
          ? new Date(params.value).toLocaleString() 
          : '-',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {!params.row.isActive && (
            <Button
              size="small"
              variant="outlined"
              color="success"
              onClick={() => handleToggleActive(params.row)}
            >
              Make Current
            </Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Metal Rates"
        subtitle="Manage current metal rates"
        breadcrumbs={[{ label: 'Rates' }]}
        actionText="Add Rate"
        actionIcon={<AddIcon />}
        onActionClick={handleAddRate}
      />

      <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Current Rates" />
            <Tab label="Rate History" disabled={!selectedRateType} />
          </Tabs>
        </Box>

        {/* Current Rates Tab */}
        {activeTab === 0 && (
          <>
            <Typography variant="h6" gutterBottom>
              Metal Rates
            </Typography>
            
            <DataTable
              rows={rates}
              columns={currentRatesColumns}
              loading={loading}
              error={error}
              getRowId={(row) => row._id}
              height={400}
            />
          </>
        )}

        {/* Rate History Tab */}
        {activeTab === 1 && selectedRateType && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Rate History: {selectedRateType.metal} {selectedRateType.purity}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setActiveTab(0)}
              >
                Back to Rates
              </Button>
            </Box>
            
            <DataTable
              rows={rateHistory}
              columns={historyColumns}
              loading={loadingHistory}
              getRowId={(row) => row._id}
              height={400}
            />
          </>
        )}
      </Paper>

      {/* Add/Edit Rate Form */}
      {openForm && (
        <FormDialog
          open={openForm}
          onClose={() => setOpenForm(false)}
          title={selectedRate ? 'Edit Rate' : 'Add New Rate'}
          onSubmit={handleFormSubmit}
          loading={formSubmitting}
          submitLabel={selectedRate ? 'Update' : 'Save'}
        >
          <RateForm
            initialData={selectedRate}
            loading={formSubmitting}
            onFormDataChange={handleFormDataChange}
          />
        </FormDialog>
      )}
    </>
  );
};

export default Rates; 