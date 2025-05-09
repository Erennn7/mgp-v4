import React, { useState, useEffect } from 'react';
import { 
  Autocomplete, 
  TextField, 
  CircularProgress, 
  Box, 
  Typography, 
  Paper,
  InputAdornment
} from '@mui/material';
import { 
  Search as SearchIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import api from '../../services/api';

/**
 * CustomerLookup component for searching and selecting customers
 * 
 * @param {Object} props
 * @param {string} props.value - The selected customer ID
 * @param {function} props.onChange - Callback for when a customer is selected
 * @param {boolean} props.disabled - Whether the lookup is disabled
 * @param {Object} props.customer - Pre-selected customer object
 * @param {string} props.label - Custom label for the input
 * @param {string} props.placeholder - Custom placeholder text
 */
const CustomerLookup = ({ 
  value,
  onChange,
  disabled = false,
  customer: initialCustomer = null,
  label = "Select Customer",
  placeholder = "Search by name or phone",
  error = false, 
  helperText = ""
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true); // Start with loading to show we're fetching initial customers
  const [selectedCustomer, setSelectedCustomer] = useState(initialCustomer);
  const [fetchError, setFetchError] = useState(null);

  // Initial load of customers
  useEffect(() => {
    const loadInitialCustomers = async () => {
      try {
        const response = await api.get('/customers?limit=50');
        console.log('Initial customers loaded:', response.data);
        if (response.data && response.data.data) {
          setOptions(response.data.data);
          setFetchError(null);
        } else {
          setFetchError('No customer data returned');
        }
      } catch (error) {
        console.error('Error loading initial customers:', error);
        setFetchError('Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    loadInitialCustomers();
  }, []);

  // Search customers when input changes
  useEffect(() => {
    if (inputValue.length < 2) {
      return;
    }

    let active = true;
    setLoading(true);

    const searchCustomers = async () => {
      try {
        // Client-side filtering from our initial load
        const searchTerm = inputValue.toLowerCase();
        const filteredCustomers = options.filter(customer => 
          customer.name.toLowerCase().includes(searchTerm) || 
          (customer.phone && customer.phone.includes(searchTerm))
        );
        
        console.log('Filtered customers:', filteredCustomers);
        
        if (active) {
          setOptions(filteredCustomers.length > 0 ? filteredCustomers : options);
        }
      } catch (error) {
        console.error('Error searching customers:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      searchCustomers();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [inputValue]);

  // Fetch customer by ID when value changes and no initialCustomer was provided
  useEffect(() => {
    if (!value || initialCustomer || disabled) return;

    const fetchCustomer = async () => {
      try {
        const response = await api.get(`/customers/${value}`);
        console.log('Fetched customer by ID:', response.data);
        setSelectedCustomer(response.data.data);
      } catch (error) {
        console.error('Error fetching customer:', error);
      }
    };

    fetchCustomer();
  }, [value, initialCustomer, disabled]);

  // Handle customer selection
  const handleCustomerChange = (event, newValue) => {
    console.log('Customer selected:', newValue);
    setSelectedCustomer(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <>
      <Autocomplete
        id="customer-lookup"
        options={options}
        getOptionLabel={(option) => option.name || ''}
        isOptionEqualToValue={(option, value) => option._id === value._id}
        loading={loading}
        disabled={disabled}
        value={selectedCustomer}
        onChange={handleCustomerChange}
        inputValue={inputValue}
        onInputChange={(event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            variant="outlined"
            fullWidth
            error={error || !!fetchError}
            helperText={helperText || fetchError}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props}>
            <Box>
              <Typography variant="body1">{option.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {option.phone} {option.email ? `• ${option.email}` : ''}
              </Typography>
            </Box>
          </li>
        )}
        noOptionsText={fetchError ? "Failed to load customers" : "No customers found"}
      />
    </>
  );
};

export default CustomerLookup; 