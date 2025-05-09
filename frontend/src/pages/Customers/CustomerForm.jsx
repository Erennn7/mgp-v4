import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Grid,
  TextField,
  MenuItem,
  InputAdornment,
  Box,
  Divider,
  Typography,
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  LocationCity as LocationIcon,
  Home as HomeIcon,
  Map as MapIcon,
  PostAdd as PostAddIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const CustomerForm = ({ initialData = null, loading = false, onFormDataChange }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    idType: 'Aadhar',
    idNumber: '',
    dob: null,
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
    },
    photo: '',
  });

  const [errors, setErrors] = useState({});

  // Initialize form with initial data if provided
  useEffect(() => {
    if (initialData) {
      const initialFormData = {
        name: initialData.name || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        idType: initialData.idType || 'Aadhar',
        idNumber: initialData.idNumber || '',
        dob: initialData.dob ? dayjs(initialData.dob) : null,
        address: {
          street: initialData.address?.street || '',
          city: initialData.address?.city || '',
          state: initialData.address?.state || '',
          pincode: initialData.address?.pincode || '',
        },
        photo: initialData.photo || '',
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
    let updatedFormData;
    
    // Handle nested address fields
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      updatedFormData = {
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value,
        },
      };
    } else {
      updatedFormData = {
        ...formData,
        [name]: value,
      };
    }
    
    setFormData(updatedFormData);
    
    // Notify parent component about data change
    if (onFormDataChange) {
      onFormDataChange(updatedFormData);
    }
    
    // Clear error for the field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  // Handle date of birth change
  const handleDateChange = (date) => {
    const updatedFormData = {
      ...formData,
      dob: date,
    };
    
    setFormData(updatedFormData);
    
    // Notify parent component about data change
    if (onFormDataChange) {
      onFormDataChange(updatedFormData);
    }
    
    // Clear error
    if (errors.dob) {
      setErrors({
        ...errors,
        dob: '',
      });
    }
  };

  const idTypeOptions = [
    { value: 'Aadhar', label: 'Aadhar Card' },
    { value: 'PAN', label: 'PAN Card' },
    { value: 'Passport', label: 'Passport' },
    { value: 'Driving License', label: 'Driving License' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <Grid container spacing={3}>
      {/* Personal Information */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Personal Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          required
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          disabled={loading}
          error={!!errors.name}
          helperText={errors.name}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          required
          label="Phone Number"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          disabled={loading}
          error={!!errors.phone}
          helperText={errors.phone}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PhoneIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
          error={!!errors.email}
          helperText={errors.email}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <DatePicker
          label="Date of Birth"
          value={formData.dob}
          onChange={handleDateChange}
          disabled={loading}
          slotProps={{
            textField: {
              fullWidth: true,
              error: !!errors.dob,
              helperText: errors.dob,
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
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          select
          label="ID Type"
          name="idType"
          value={formData.idType}
          onChange={handleChange}
          disabled={loading}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <BadgeIcon />
              </InputAdornment>
            ),
          }}
        >
          {idTypeOptions.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="ID Number"
          name="idNumber"
          value={formData.idNumber}
          onChange={handleChange}
          disabled={loading}
          error={!!errors.idNumber}
          helperText={errors.idNumber}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <BadgeIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      {/* Address Information */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Address Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Street Address"
          name="address.street"
          value={formData.address.street}
          onChange={handleChange}
          disabled={loading}
          error={!!errors['address.street']}
          helperText={errors['address.street']}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <HomeIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="City"
          name="address.city"
          value={formData.address.city}
          onChange={handleChange}
          disabled={loading}
          error={!!errors['address.city']}
          helperText={errors['address.city']}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LocationIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="State"
          name="address.state"
          value={formData.address.state}
          onChange={handleChange}
          disabled={loading}
          error={!!errors['address.state']}
          helperText={errors['address.state']}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MapIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="PIN Code"
          name="address.pincode"
          value={formData.address.pincode}
          onChange={handleChange}
          disabled={loading}
          error={!!errors['address.pincode']}
          helperText={errors['address.pincode']}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PostAddIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
    </Grid>
  );
};

CustomerForm.propTypes = {
  initialData: PropTypes.object,
  loading: PropTypes.bool,
  onFormDataChange: PropTypes.func,
};

export default CustomerForm; 