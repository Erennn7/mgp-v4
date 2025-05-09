import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Grid,
  TextField,
  MenuItem,
  InputAdornment,
  Box,
  Divider,
  Typography,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  Tooltip,
  IconButton,
  Button,
  Autocomplete,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  Scale as ScaleIcon,
  Description as DescriptionIcon,
  Money as MoneyIcon,
  LocalOffer as LocalOfferIcon,
  Layers as LayersIcon,
  Assignment as AssignmentIcon,
  Diamond as DiamondIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { toast } from 'react-toastify';

const ProductForm = ({ initialData = null, loading = false, onFormDataChange }) => {
  // Create a ref to prevent re-renders due to toggles
  const isFirstRender = useRef(true);
  
  const [formData, setFormData] = useState({
    huidNumber: '',
    name: '',
    category: '',
    type: '',
    weightType: 'Gram',
    netWeight: '',
    grossWeight: '',
    purity: '',
    makingCharges: 0,
    description: '',
    stock: 0,
    isActive: true,
    hasStone: false,
    stoneDetails: '',
    stonePrice: 0
  });

  // Remove the separate hasHuid state
  const [errors, setErrors] = useState({});
  const [rates, setRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [dailyRate, setDailyRate] = useState(null);
  const [customPurities, setCustomPurities] = useState({
    Gold: [],
    Silver: []
  });

  // Modified useEffect to prevent re-renders
  useEffect(() => {
    if (isFirstRender.current && initialData) {
      const initialFormData = {
        huidNumber: initialData.huidNumber || initialData.itemCode || '',
        name: initialData.name || '',
        category: initialData.category || '',
        type: initialData.type || '',
        weightType: initialData.weightType || 'Gram',
        netWeight: initialData.netWeight || initialData.weight || '',
        grossWeight: initialData.grossWeight || initialData.weight || '',
        purity: initialData.purity || '',
        makingCharges: initialData.makingCharges || 0,
        description: initialData.description || '',
        stock: initialData.stock || 0,
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
        hasStone: initialData.hasStone || false,
        stoneDetails: initialData.stoneDetails || '',
        stonePrice: initialData.stonePrice || 0
      };
      
      setFormData(initialFormData);
      
      // Notify parent component about initial data
      if (onFormDataChange) {
        onFormDataChange(initialFormData);
      }
      
      isFirstRender.current = false;
    }

    // Fetch rates on component mount
    if (isFirstRender.current) {
      fetchRates();
      isFirstRender.current = false;
    }
  }, [initialData, onFormDataChange]);

  // Fetch rates
  const fetchRates = async () => {
    setLoadingRates(true);
    try {
      const response = await api.get('/rates/latest');
      if (response.data.success) {
        setRates(response.data.data);
        
        // Extract custom purities from rates
        const goldPurities = new Set(goldPurityOptions.map(option => option.value));
        const silverPurities = new Set(silverPurityOptions.map(option => option.value));
        
        const customGoldPurities = [];
        const customSilverPurities = [];
        
        response.data.data.forEach(rate => {
          if (rate.metal === 'Gold' && !goldPurities.has(rate.purity)) {
            customGoldPurities.push({ 
              value: rate.purity, 
              label: `${rate.purity} (Custom)`,
              ratePerGram: rate.ratePerGram 
            });
          } else if (rate.metal === 'Silver' && !silverPurities.has(rate.purity)) {
            customSilverPurities.push({ 
              value: rate.purity, 
              label: `${rate.purity} (Custom)`,
              ratePerGram: rate.ratePerGram 
            });
          }
        });
        
        setCustomPurities({
          Gold: customGoldPurities,
          Silver: customSilverPurities
        });
      }
    } catch (err) {
      console.error('Error fetching rates:', err);
    } finally {
      setLoadingRates(false);
    }
  };

  // Update daily rate when purity changes
  useEffect(() => {
    if (formData.purity && formData.category) {
      const metal = formData.category.includes('Gold') ? 'Gold' : 
                   formData.category.includes('Silver') ? 'Silver' : null;
      
      if (metal && rates.length > 0) {
        const rateInfo = rates.find(r => r.metal === metal && r.purity === formData.purity);
        if (rateInfo) {
          setDailyRate(rateInfo.ratePerGram);
        } else {
          setDailyRate(null);
        }
      } else {
        setDailyRate(null);
      }
    } else {
      setDailyRate(null);
    }
  }, [formData.purity, formData.category, rates]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const updatedFormData = {
        ...formData,
        [name]: checked
      };
      
      // If hasStone is unchecked, reset the stone fields
      if (name === 'hasStone' && !checked) {
        updatedFormData.stoneDetails = '';
        updatedFormData.stonePrice = 0;
      }
      
      setFormData(updatedFormData);
      
      // Notify parent component about data change
      if (onFormDataChange) {
        onFormDataChange(updatedFormData);
      }
      
      return;
    }
    
    // Special handling for huidNumber field
    if (name === 'huidNumber') {
      // If the user types something in the HUID field, make sure hasHuid is true
      if (value && value.trim() !== '') {
        console.log('Setting hasHuid to true because HUID field has value:', value);
      }
      // If they clear it completely, set hasHuid to false
      else if (value === '') {
        console.log('Setting hasHuid to false because HUID field is empty');
      }
    }
    
    // Handle special number fields
    let parsedValue = value;
    if (['netWeight', 'grossWeight', 'makingCharges', 'stock', 'stonePrice'].includes(name) && value !== '') {
      parsedValue = parseFloat(value);
    }
    
    // Special handling for huidNumber - ensure empty string is null or undefined
    if (name === 'huidNumber' && value === '') {
      parsedValue = null;
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

  // Refresh rates
  const handleRefreshRates = () => {
    fetchRates();
    toast.info('Refreshing current metal rates...');
  };

  // Check if purity field is required
  const isPurityRequired = ['Gold Jewelry', 'Silver Jewelry'].includes(formData.category);
  
  // Category options (simplified)
  const categoryOptions = [
    { value: 'Gold Jewelry', label: 'Gold Jewelry' },
    { value: 'Silver Jewelry', label: 'Silver Jewelry' }
  ];

  // Jewelry type options
  const typeOptions = [
    { value: 'Ring', label: 'Ring' },
    { value: 'Necklace', label: 'Necklace' },
    { value: 'Bracelet', label: 'Bracelet' },
    { value: 'Earring', label: 'Earring' },
    { value: 'Pendant', label: 'Pendant' },
    { value: 'Chain', label: 'Chain' },
    { value: 'Bangle', label: 'Bangle' },
    { value: 'Coin', label: 'Coin' },
    { value: 'Other', label: 'Other' }
  ];

  // Weight type options
  const weightTypeOptions = [
    { value: 'Gram', label: 'Gram' },
    { value: 'Milligram', label: 'Milligram' },
    { value: 'Carat', label: 'Carat' },
    { value: 'Piece', label: 'Piece' }
  ];

  // Gold purity options
  const goldPurityOptions = [
    { value: '24K', label: '24K (99.9% Pure)' },
    { value: '22K', label: '22K (91.6% Pure)' },
    { value: '20K', label: '20K (83.3% Pure)' },
    { value: '18K', label: '18K (75% Pure)' },
    { value: '14K', label: '14K (58.3% Pure)' }
  ];

  // Silver purity options
  const silverPurityOptions = [
    { value: '999', label: '999 (99.9% Pure)' },
    { value: '925', label: '925 (92.5% Pure)' },
    { value: '900', label: '900 (90% Pure)' },
    { value: '800', label: '800 (80% Pure)' }
  ];

  // Get purity options based on selected category
  const getPurityOptions = () => {
    if (formData.category === 'Gold Jewelry') {
      return [...goldPurityOptions, ...customPurities.Gold];
    } else if (formData.category === 'Silver Jewelry') {
      return [...silverPurityOptions, ...customPurities.Silver];
    }
    return [];
  };

  // Format price display
  const formatPrice = (price) => {
    if (!price && price !== 0) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(price);
  };

  return (
    <Grid container spacing={3}>
      {/* Basic Information */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Basic Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      {/* Direct HUID input with helper button */}
      <Grid item xs={12} sm={6}>
        <Box sx={{ display: 'flex' }}>
          <TextField
            fullWidth
            label="HUID Number (Optional)"
            name="huidNumber"
            value={formData.huidNumber || ''}
            onChange={handleChange}
            disabled={loading}
            error={!!errors.huidNumber}
            helperText={errors.huidNumber || 'Hallmark Unique ID Number (if available)'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AssignmentIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, mr: 1 }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleChange({
              target: {
                name: 'huidNumber',
                value: formData.huidNumber ? '' : '1234567890'
              }
            })}
            sx={{ height: 56, minWidth: 100 }}
          >
            {formData.huidNumber ? 'Clear' : 'Fill Sample'}
          </Button>
        </Box>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          required
          label="Product Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          disabled={loading}
          error={!!errors.name}
          helperText={errors.name}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <InventoryIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required error={!!errors.category}>
          <InputLabel id="category-label">Category</InputLabel>
          <Select
            labelId="category-label"
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            disabled={loading}
            startAdornment={
              <InputAdornment position="start">
                <CategoryIcon />
              </InputAdornment>
            }
          >
            {categoryOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required error={!!errors.type}>
          <InputLabel id="type-label">Type</InputLabel>
          <Select
            labelId="type-label"
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            disabled={loading}
            startAdornment={
              <InputAdornment position="start">
                <DiamondIcon />
              </InputAdornment>
            }
          >
            {typeOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
        </FormControl>
      </Grid>
      
      {/* Weight Information */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Weight Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          required
          label="Net Weight"
          name="netWeight"
          type="number"
          value={formData.netWeight}
          onChange={handleChange}
          disabled={loading}
          error={!!errors.netWeight}
          helperText={errors.netWeight || 'Pure metal weight'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <ScaleIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          required
          label="Gross Weight"
          name="grossWeight"
          type="number"
          value={formData.grossWeight}
          onChange={handleChange}
          disabled={loading}
          error={!!errors.grossWeight}
          helperText={errors.grossWeight || 'Total product weight'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <ScaleIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel id="weightType-label">Weight Unit</InputLabel>
          <Select
            labelId="weightType-label"
            id="weightType"
            name="weightType"
            value={formData.weightType}
            onChange={handleChange}
            disabled={loading}
            startAdornment={
              <InputAdornment position="start">
                <ScaleIcon />
              </InputAdornment>
            }
          >
            {weightTypeOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      {/* Purity and Price Information */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Purity and Price Information
          <Tooltip title="Refresh metal rates">
            <IconButton 
              size="small" 
              onClick={handleRefreshRates} 
              disabled={loadingRates}
              sx={{ ml: 1 }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      {isPurityRequired && (
        <>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth required error={!!errors.purity}>
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
                inputValue={formData.purity || ''}
                onInputChange={(event, newInputValue) => {
                  if (event) {
                    handleChange({
                      target: { name: 'purity', value: newInputValue }
                    });
                  }
                }}
                disabled={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Purity"
                    name="purity"
                    required
                    error={!!errors.purity}
                    helperText={errors.purity || "Select from list or type custom value"}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocalOfferIcon />
                        </InputAdornment>
                      ),
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
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Current Rate per Gram"
              value={dailyRate ? formatPrice(dailyRate) : 'Select purity first'}
              disabled
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon />
                  </InputAdornment>
                ),
              }}
              helperText={dailyRate ? `Daily rate for ${formData.purity} as per rates section` : 'Rate will be shown once purity is selected'}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Making Charges (%)"
              name="makingCharges"
              type="number"
              value={formData.makingCharges}
              onChange={handleChange}
              disabled={loading}
              error={!!errors.makingCharges}
              helperText={errors.makingCharges || 'Percentage applied to metal value (weight × rate)'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>
        </>
      )}
      
      {/* Stock Information */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Stock Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          required
          label="Stock Quantity"
          name="stock"
          type="number"
          value={formData.stock}
          onChange={handleChange}
          disabled={loading}
          error={!!errors.stock}
          helperText={errors.stock}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LayersIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      {/* Stone/Beeds Information */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Stone/Beeds Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel id="hasStone-label">Has Stone/Beeds?</InputLabel>
          <Select
            labelId="hasStone-label"
            id="hasStone"
            name="hasStone"
            value={formData.hasStone}
            onChange={(e) => handleChange({
              target: {
                name: 'hasStone',
                value: e.target.value,
                type: 'checkbox',
                checked: e.target.value
              }
            })}
            disabled={loading}
            startAdornment={
              <InputAdornment position="start">
                <DiamondIcon />
              </InputAdornment>
            }
          >
            <MenuItem value={true}>Yes</MenuItem>
            <MenuItem value={false}>No</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      {formData.hasStone && (
        <>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Stone/Beeds Details"
              name="stoneDetails"
              value={formData.stoneDetails}
              onChange={handleChange}
              disabled={loading}
              placeholder="Type, quality, size, etc."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DiamondIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Stone/Beeds Price"
              name="stonePrice"
              type="number"
              value={formData.stonePrice}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </>
      )}
      
      {/* Description */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Additional Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          disabled={loading}
          error={!!errors.description}
          helperText={errors.description}
          multiline
          rows={3}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <DescriptionIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
    </Grid>
  );
};

ProductForm.propTypes = {
  initialData: PropTypes.object,
  loading: PropTypes.bool,
  onFormDataChange: PropTypes.func,
};

export default ProductForm; 