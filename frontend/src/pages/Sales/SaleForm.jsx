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
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  Button,
  IconButton,
  Paper,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Person as PersonIcon,
  Inventory as InventoryIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Money as MoneyIcon,
  Payment as PaymentIcon,
  Description as DescriptionIcon,
  Refresh as RefreshIcon,
  ClearAll as ClearAllIcon,
  PersonAdd as PersonAddIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  LocationCity as LocationIcon,
  Home as HomeIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const SaleForm = ({ initialData = null, loading = false, onFormDataChange }) => {
  // Form data state
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    customer: '',
    items: [],
    subTotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    paymentMethod: 'Cash',
    paymentStatus: 'Paid',
    amountPaid: 0,
    notes: ''
  });

  // Additional states
  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [openCustomProductDialog, setOpenCustomProductDialog] = useState(false);
  const [openNewCustomerDialog, setOpenNewCustomerDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
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
    }
  });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customProduct, setCustomProduct] = useState({
    _id: 'custom-' + Date.now(),
    name: '',
    category: 'Gold Jewelry',
    netWeight: 0,
    grossWeight: 0,
    purity: '22K',
    weightType: 'Gram',
    price: 0,
    ratePerGram: 0,
    makingCharges: 0,
    hasStone: false,
    stonePrice: 0,
    huid: ''
  });
  const [latestRates, setLatestRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [rates, setRates] = useState([]);
  const [customPurities, setCustomPurities] = useState({
    Gold: [],
    Silver: []
  });

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        invoiceNumber: initialData.invoiceNumber || '',
        customer: initialData.customer?._id || initialData.customer || '',
        items: initialData.items || [],
        subTotal: initialData.subTotal || 0,
        tax: initialData.tax || 0,
        discount: initialData.discount || 0,
        total: initialData.total || 0,
        paymentMethod: initialData.paymentMethod || 'Cash',
        paymentStatus: initialData.paymentStatus || 'Paid',
        amountPaid: initialData.amountPaid || 0,
        notes: initialData.notes || ''
      });
    } else {
      // Generate a temporary invoice number if this is a new sale
      generateInvoiceNumber();
    }
  }, [initialData]);

  // Fetch customers and products on component mount
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchLatestRates();
  }, []);

  // Recalculate totals when items, tax, or discount changes
  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.tax, formData.discount]);

  // Calculate price when custom product details change
  useEffect(() => {
    calculateCustomProductPrice();
  }, [customProduct.category, customProduct.purity, customProduct.netWeight, customProduct.hasStone, customProduct.stonePrice, latestRates]);

  // Fetch latest rates
  const fetchLatestRates = async () => {
    setLoadingRates(true);
    try {
      const response = await api.get('/rates/latest');
      if (response.data.success) {
        setLatestRates(response.data.data);
        
        // Extract custom purities
        const defaultGoldPurities = ["24K", "22K", "20K", "18K", "14K"];
        const defaultSilverPurities = ["999", "925", "900", "800"];
        
        const customGoldPurities = [];
        const customSilverPurities = [];
        
        response.data.data.forEach(rate => {
          if (rate.metal === 'Gold' && !defaultGoldPurities.includes(rate.purity)) {
            customGoldPurities.push({
              key: rate.purity,
              value: rate.purity,
              label: `${rate.purity} (Custom)`,
              ratePerGram: rate.ratePerGram
            });
          } else if (rate.metal === 'Silver' && !defaultSilverPurities.includes(rate.purity)) {
            customSilverPurities.push({
              key: rate.purity,
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
      toast.error('Failed to load latest rates');
    } finally {
      setLoadingRates(false);
    }
  };

  // Calculate price for custom product based on rates
  const calculateCustomProductPrice = () => {
    if (!customProduct.netWeight || !customProduct.purity || !customProduct.category || latestRates.length === 0) {
      return;
    }

    // Determine metal type from category
    const metal = customProduct.category.includes('Gold') ? 'Gold' : 'Silver';
    
    // Find matching rate
    const rateInfo = latestRates.find(r => r.metal === metal && r.purity === customProduct.purity);
    
    if (rateInfo) {
      // Store the rate per gram directly from rates
      const ratePerGram = rateInfo.ratePerGram;
      
      // Base metal value calculation
      const metalValue = customProduct.netWeight * ratePerGram;
      
      // Calculate making charges (applied only to the metal value)
      const makingChargesAmount = customProduct.makingCharges ? (metalValue * customProduct.makingCharges / 100) : 0;
      
      // Add stone price if product has stones
      const stonePrice = customProduct.hasStone && customProduct.stonePrice ? parseFloat(customProduct.stonePrice) : 0;
      
      // Final price = Metal value + Making charges on metal + Stone price
      const finalPrice = metalValue + makingChargesAmount + stonePrice;
      
      // Update the product price and ratePerGram
      setCustomProduct({
        ...customProduct,
        price: finalPrice,
        ratePerGram: ratePerGram
      });
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await api.get('/customers');
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast.error('Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await api.get('/products');
      if (response.data.success) {
        // Get latest rates for price calculation
        const ratesResponse = await api.get('/rates/latest');
        const latestRates = ratesResponse.data.success ? ratesResponse.data.data : [];
        
        // Calculate price for each product
        const productsWithPrices = response.data.data.map(product => {
          // Default price to 0
          let calculatedPrice = 0;
          let ratePerGram = 0;
          
          // Only calculate for products with both category and purity
          if (product.category && product.purity && product.netWeight) {
            // Determine metal type from category
            const metal = product.category.includes('Gold') ? 'Gold' : 'Silver';
            
            // Find matching rate
            const rateInfo = latestRates.find(r => r.metal === metal && r.purity === product.purity);
            
            if (rateInfo) {
              // Store the rate per gram directly from rates section
              ratePerGram = rateInfo.ratePerGram;
              
              // Base metal value calculation
              const metalValue = product.netWeight * ratePerGram;
              
              // Calculate making charges (applied only to the metal value)
              const makingChargesAmount = product.makingCharges ? (metalValue * product.makingCharges / 100) : 0;
              
              // Add stone price if product has stones
              const stonePrice = product.hasStone && product.stonePrice ? product.stonePrice : 0;
              
              // Final price = Metal value + Making charges on metal + Stone price
              calculatedPrice = metalValue + makingChargesAmount + stonePrice;
            }
          }
          
          // Return product with calculated price and rate per gram
          return {
            ...product,
            price: calculatedPrice,
            ratePerGram: ratePerGram
          };
        });
        
        setProducts(productsWithPrices.filter(p => p.stock > 0));
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle special number fields
    let parsedValue = value;
    if (['tax', 'discount', 'amountPaid'].includes(name) && value !== '') {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) parsedValue = 0;
      
      // Limit tax percentage to a reasonable range (0-100%)
      if (name === 'tax') {
        parsedValue = Math.max(0, Math.min(100, parsedValue));
      }
      
      // Ensure discount is not negative
      if (name === 'discount') {
        parsedValue = Math.max(0, parsedValue);
      }
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

  // Handle customer selection
  const handleCustomerChange = (event, newValue) => {
    const customerId = newValue ? newValue._id : '';
    
    const updatedFormData = {
      ...formData,
      customer: customerId
    };
    
    setFormData(updatedFormData);
    
    // Notify parent component about data change
    if (onFormDataChange) {
      onFormDataChange(updatedFormData);
    }
    
    // Clear error for the field
    if (errors.customer) {
      setErrors({
        ...errors,
        customer: ''
      });
    }
  };

  // Handle product selection
  const handleProductChange = (event, newValue) => {
    setCurrentProduct(newValue);
  };

  // Handle quantity change
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setCurrentQuantity(value);
    }
  };

  // Add product to the sale
  const addProductToSale = () => {
    if (!currentProduct) {
      toast.error('Please select a product');
      return;
    }
    
    if (currentProduct.stock < currentQuantity) {
      toast.error(`Only ${currentProduct.stock} items available in stock`);
      return;
    }
    
    // Check if product already exists in the items array
    const existingItemIndex = formData.items.findIndex(
      item => item.product._id === currentProduct._id
    );
    
    let updatedItems = [...formData.items];
    
    // Calculate total for this item based on rate per gram, weight and making charges
    const metalValue = currentProduct.netWeight * currentProduct.ratePerGram;
    const makingChargesPercent = currentProduct.makingCharges || 0;
    const makingChargesAmount = makingChargesPercent ? (metalValue * makingChargesPercent / 100) : 0;
    const stonePrice = currentProduct.hasStone && currentProduct.stonePrice ? 
      currentProduct.stonePrice : 0;
    const itemTotal = (metalValue + makingChargesAmount + stonePrice) * currentQuantity;
    
    console.log('Adding product with details:', {
      metalValue,
      makingChargesPercent,
      makingChargesAmount,
      ratePerGram: currentProduct.ratePerGram,
      netWeight: currentProduct.netWeight,
      itemTotal
    });
    
    if (existingItemIndex >= 0) {
      // Update quantity if product already exists
      const newQuantity = updatedItems[existingItemIndex].quantity + currentQuantity;
      
      if (currentProduct.stock < newQuantity) {
        toast.error(`Only ${currentProduct.stock} items available in stock`);
        return;
      }
      
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: newQuantity,
        total: (newQuantity / currentQuantity) * itemTotal // Scale the total by the new quantity
      };
    } else {
      // Add new item
      updatedItems.push({
        product: currentProduct,
        quantity: currentQuantity,
        rate: currentProduct.ratePerGram, // Use rate per gram from rates section
        weight: currentProduct.netWeight || 0,
        makingCharges: makingChargesPercent, // Store the making charges percentage
        total: itemTotal
      });
    }
    
    const updatedFormData = {
      ...formData,
      items: updatedItems
    };
    
    setFormData(updatedFormData);
    
    // Notify parent component about data change
    if (onFormDataChange) {
      onFormDataChange(updatedFormData);
    }
    
    // Reset current product and quantity
    setCurrentProduct(null);
    setCurrentQuantity(1);
  };

  // Remove product from the sale
  const removeProductFromSale = (index) => {
    const updatedItems = [...formData.items];
    updatedItems.splice(index, 1);
    
    const updatedFormData = {
      ...formData,
      items: updatedItems
    };
    
    setFormData(updatedFormData);
    
    // Notify parent component about data change
    if (onFormDataChange) {
      onFormDataChange(updatedFormData);
    }
  };

  // Calculate subtotal, tax, and total
  const calculateTotals = () => {
    // Calculate subtotal (sum of all item totals)
    const subTotal = formData.items.reduce(
      (sum, item) => sum + item.total,
      0
    );
    
    // Calculate GST amount based on percentage
    const gstPercentage = formData.tax || 0;
    const gstAmount = (subTotal * gstPercentage) / 100;
    
    // Use discount as absolute amount instead of percentage
    const discountAmount = parseFloat(formData.discount) || 0;
    
    // Calculate final total
    const total = Math.max(0, subTotal + gstAmount - discountAmount);
    
    const updatedFormData = {
      ...formData,
      subTotal,
      total,
      amountPaid: formData.paymentStatus === 'Paid' ? total : formData.amountPaid
    };
    
    setFormData(updatedFormData);
    
    // Notify parent component about data change
    if (onFormDataChange) {
      onFormDataChange(updatedFormData);
    }
  };

  // Format currency display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Get customer by ID
  const getCustomerById = (id) => {
    return customers.find(customer => customer._id === id);
  };

  // Generate a temporary invoice number
  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoiceNumber = `INV-${year}${month}${day}-${random}`;
    
    const updatedFormData = {
      ...formData,
      invoiceNumber
    };
    
    setFormData(updatedFormData);
    
    // Notify parent component about data change
    if (onFormDataChange) {
      onFormDataChange(updatedFormData);
    }
  };

  // Open custom product dialog
  const handleOpenCustomProductDialog = () => {
    // Default category is 'Gold Jewelry', so default purity should be '22K'
    const defaultCategory = 'Gold Jewelry';
    const defaultPurity = defaultCategory.includes('Silver') ? '925' : '22K';
    
    // Reset custom product form with a new ID
    setCustomProduct({
      _id: 'custom-' + Date.now(),
      name: '',
      category: defaultCategory,
      netWeight: 0,
      grossWeight: 0,
      purity: defaultPurity,
      weightType: 'Gram',
      price: 0,
      ratePerGram: 0,
      makingCharges: 0,
      hasStone: false,
      stonePrice: 0,
      huid: ''
    });
    setOpenCustomProductDialog(true);
  };

  // Close custom product dialog
  const handleCloseCustomProductDialog = () => {
    setOpenCustomProductDialog(false);
  };

  // Generate a random HUID sample
  const generateHUIDSample = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let huid = '';
    for (let i = 0; i < 10; i++) {
      huid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomProduct({
      ...customProduct,
      huid: huid
    });
  };

  // Clear HUID field
  const clearHUID = () => {
    setCustomProduct({
      ...customProduct,
      huid: ''
    });
  };

  // Handle custom product field changes
  const handleCustomProductChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle special inputs
    let parsedValue = value;
    if (['netWeight', 'grossWeight', 'makingCharges', 'stonePrice'].includes(name)) {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) parsedValue = 0;
    }
    
    // Handle checkbox
    if (type === 'checkbox') {
      parsedValue = checked;
    }
    
    // Special handling for category change to update purity
    if (name === 'category') {
      const isSilver = value.includes('Silver');
      setCustomProduct({
        ...customProduct,
        [name]: parsedValue,
        // Reset purity to appropriate default when switching between Gold and Silver
        purity: isSilver ? '925' : '22K'
      });
    } else {
      // Update custom product for other fields
      setCustomProduct({
        ...customProduct,
        [name]: parsedValue
      });
    }
  };

  // Add custom product to the sale
  const handleAddCustomProduct = () => {
    // Validate custom product data
    if (!customProduct.name) {
      toast.error('Please enter a product name');
      return;
    }
    
    if (!customProduct.price || customProduct.price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    
    if (!customProduct.netWeight || customProduct.netWeight <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }
    
    // Create a "quantity" field for the UI
    const quantity = 1;
    
    // Get rate per gram (either from calculated value or directly from rates)
    const ratePerGram = customProduct.ratePerGram || 0;
    const netWeight = customProduct.netWeight || 0;
    
    // Calculate the metal value and making charges amount
    const metalValue = netWeight * ratePerGram;
    const makingChargesPercent = customProduct.makingCharges || 0;
    const makingChargesAmount = makingChargesPercent ? (metalValue * makingChargesPercent / 100) : 0;
    const stonePrice = customProduct.hasStone && customProduct.stonePrice ? parseFloat(customProduct.stonePrice) : 0;
    
    // Calculate total price from components to ensure it's accurate
    const totalPrice = metalValue + makingChargesAmount + stonePrice;
    
    console.log('Adding custom product with details:', {
      metalValue,
      makingChargesPercent,
      makingChargesAmount,
      ratePerGram,
      netWeight,
      totalPrice
    });
    
    // Add custom product to items with customProduct flag to handle backend differently
    const updatedItems = [...formData.items];
    updatedItems.push({
      // Don't include a product field for custom items, to avoid MongoDB ObjectId casting errors
      // Instead, store all product details in the customProductDetails object
      isCustomItem: true,
      quantity: quantity,
      rate: ratePerGram, // Use rate per gram instead of total price
      weight: netWeight,
      makingCharges: makingChargesPercent, // Store the making charges percentage
      total: totalPrice * quantity,
      customProductDetails: {
        name: customProduct.name,
        category: customProduct.category,
        netWeight: netWeight,
        grossWeight: customProduct.grossWeight,
        purity: customProduct.purity,
        weightType: customProduct.weightType,
        price: totalPrice, // Store the correct calculated price
        ratePerGram: ratePerGram,
        makingCharges: makingChargesPercent,
        hasStone: customProduct.hasStone,
        stonePrice: stonePrice,
        huid: customProduct.huid
      },
      // Add a display property for the UI only
      _displayProduct: {
        name: `${customProduct.name} (Custom)`,
        category: customProduct.category,
        netWeight: netWeight,
        grossWeight: customProduct.grossWeight,
        purity: customProduct.purity,
        weightType: customProduct.weightType
      }
    });
    
    const updatedFormData = {
      ...formData,
      items: updatedItems
    };
    
    setFormData(updatedFormData);
    
    // Notify parent component about data change
    if (onFormDataChange) {
      onFormDataChange(updatedFormData);
    }
    
    // Default category and purity for reset
    const defaultCategory = 'Gold Jewelry';
    const defaultPurity = '22K';
    
    // Reset custom product form and close dialog
    setCustomProduct({
      _id: 'custom-' + Date.now(),
      name: '',
      category: defaultCategory,
      netWeight: 0,
      grossWeight: 0,
      purity: defaultPurity,
      weightType: 'Gram',
      price: 0,
      ratePerGram: 0,
      makingCharges: 0,
      hasStone: false,
      stonePrice: 0,
      huid: ''
    });
    setOpenCustomProductDialog(false);
    
    toast.success('Custom product added to bill');
  };

  // Handle open new customer dialog
  const handleOpenNewCustomerDialog = () => {
    setNewCustomer({
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
      }
    });
    setOpenNewCustomerDialog(true);
  };

  // Handle close new customer dialog
  const handleCloseNewCustomerDialog = () => {
    setOpenNewCustomerDialog(false);
  };

  // Handle new customer field changes
  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested address fields
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setNewCustomer(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setNewCustomer(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle date of birth change
  const handleDobChange = (date) => {
    setNewCustomer(prev => ({
      ...prev,
      dob: date
    }));
  };

  // Handle save new customer
  const handleSaveNewCustomer = async () => {
    // Validate at least name is provided
    if (!newCustomer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    
    if (!newCustomer.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setSavingCustomer(true);
    try {
      // Prepare data for API
      const customerData = {
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        idType: newCustomer.idType,
        idNumber: newCustomer.idNumber,
        dob: newCustomer.dob ? newCustomer.dob.toISOString() : null,
        address: newCustomer.address
      };
      
      // Save new customer to database
      const response = await api.post('/customers', customerData);
      
      if (response.data.success) {
        const createdCustomer = response.data.data;
        
        // Add new customer to the local customers array
        setCustomers(prev => [createdCustomer, ...prev]);
        
        // Select the new customer in the form
        const updatedFormData = {
          ...formData,
          customer: createdCustomer._id
        };
        
        setFormData(updatedFormData);
        
        // Notify parent component about data change
        if (onFormDataChange) {
          onFormDataChange(updatedFormData);
        }
        
        toast.success('Customer added successfully');
        handleCloseNewCustomerDialog();
      }
    } catch (err) {
      console.error('Error creating customer:', err);
      toast.error('Failed to create customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  // ID Type options
  const idTypeOptions = [
    { value: 'Aadhar', label: 'Aadhar Card' },
    { value: 'PAN', label: 'PAN Card' },
    { value: 'Passport', label: 'Passport' },
    { value: 'Driving License', label: 'Driving License' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <Grid container spacing={3}>
      {/* Invoice and Customer Information */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Basic Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          required
          label="Invoice Number"
          name="invoiceNumber"
          value={formData.invoiceNumber}
          onChange={handleChange}
          disabled={loading || initialData} // Disable editing for existing sales
          error={!!errors.invoiceNumber}
          helperText={errors.invoiceNumber || 'Auto-generated, but can be customized'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <ReceiptIcon />
              </InputAdornment>
            ),
            endAdornment: !initialData && (
              <InputAdornment position="end">
                <Tooltip title="Generate new invoice number">
                  <IconButton onClick={generateInvoiceNumber} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            )
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Autocomplete
            fullWidth
            options={customers}
            loading={loadingCustomers}
            getOptionLabel={(option) => option.name ? `${option.name} (${option.phone})` : ''}
            value={formData.customer ? getCustomerById(formData.customer) || null : null}
            onChange={handleCustomerChange}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                label="Select Customer"
                error={!!errors.customer}
                helperText={errors.customer}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <Button
            variant="outlined"
            color="primary"
            onClick={handleOpenNewCustomerDialog}
            startIcon={<PersonAddIcon />}
            sx={{ minWidth: '120px' }}
          >
            New
          </Button>
        </Box>
      </Grid>
      
      {/* Product Selection */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Product Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12} sm={5}>
        <Autocomplete
          fullWidth
          options={products}
          loading={loadingProducts}
          getOptionLabel={(option) => {
            if (!option.name) return '';
            
            // Format weights for display
            const netWeight = option.netWeight ? `${option.netWeight}${option.weightType || 'g'}` : '-';
            const grossWeight = option.grossWeight ? `${option.grossWeight}${option.weightType || 'g'}` : '-';
            
            return `${option.name} (${netWeight}/${grossWeight}) - ${option.category}`;
          }}
          value={currentProduct}
          onChange={handleProductChange}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Product"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <InputAdornment position="start">
                      <InventoryIcon />
                    </InputAdornment>
                    {params.InputProps.startAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} sm={2}>
        <TextField
          fullWidth
          label="Quantity"
          type="number"
          value={currentQuantity}
          onChange={handleQuantityChange}
          InputProps={{
            inputProps: { min: 1 }
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={2.5}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={addProductToSale}
          startIcon={<AddIcon />}
          sx={{ height: '56px' }}
          disabled={!currentProduct}
        >
          Add Product
        </Button>
      </Grid>
      
      <Grid item xs={12} sm={2.5}>
        <Button
          fullWidth
          variant="outlined"
          color="secondary"
          onClick={handleOpenCustomProductDialog}
          startIcon={<AddIcon />}
          sx={{ height: '56px' }}
        >
          Add Custom Product
        </Button>
      </Grid>
      
      {/* Product List */}
      <Grid item xs={12}>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width="40">Sr</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>HUID</TableCell>
                <TableCell>HSN</TableCell>
                <TableCell align="right">PCS</TableCell>
                <TableCell align="right">Gross Weight</TableCell>
                <TableCell align="right">Net Weight</TableCell>
                <TableCell align="right">Rate/Gms</TableCell>
                <TableCell align="right">Making</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formData.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    No products added yet
                  </TableCell>
                </TableRow>
              ) : (
                formData.items.map((item, index) => {
                  // Determine if item is 22K gold for HSN code
                  const isPurity22K = (item.isCustomItem ? 
                    item._displayProduct.purity === '22K' : 
                    item.product.purity === '22K');
                  const isGoldItem = (item.isCustomItem ? 
                    item._displayProduct.category.includes('Gold') : 
                    item.product.category.includes('Gold'));
                  const hsnCode = (isGoldItem && isPurity22K) ? '7113' : '';
                  
                  // Get HUID if available
                  const huid = item.isCustomItem ? 
                    (item.customProductDetails?.huid || '-') : 
                    (item.product.huidNumber || '-');
                    
                  // Calculate making charges in rupees
                  const netWeight = item.isCustomItem ? 
                    item._displayProduct.netWeight : 
                    item.product.netWeight || 0;
                  const makingChargesPercent = item.isCustomItem ?
                    (item.customProductDetails?.makingCharges || 0) :
                    (item.product.makingCharges || 0);
                  const ratePerGram = item.rate || 0;
                  const metalValue = netWeight * ratePerGram;
                  const makingChargesAmount = (metalValue * makingChargesPercent / 100);

                  return (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {item.isCustomItem ? item._displayProduct.name : item.product.name}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {item.isCustomItem ? item._displayProduct.category : item.product.category}
                        </Typography>
                      </TableCell>
                      <TableCell>{huid}</TableCell>
                      <TableCell>{hsnCode}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">
                        {item.isCustomItem ? item._displayProduct.grossWeight : item.product.grossWeight} 
                        {item.isCustomItem ? item._displayProduct.weightType : item.product.weightType || 'g'}
                      </TableCell>
                      <TableCell align="right">
                        {item.isCustomItem ? item._displayProduct.netWeight : item.product.netWeight} 
                        {item.isCustomItem ? item._displayProduct.weightType : item.product.weightType || 'g'}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.rate)}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(makingChargesAmount)}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeProductFromSale(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
      
      {/* Payment Details */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Payment Details
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Subtotal"
              value={formatCurrency(formData.subTotal)}
              disabled
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ReceiptIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="GST (%)"
              name="tax"
              type="number"
              value={formData.tax}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                inputProps: { min: 0, max: 100 }
              }}
              helperText="GST percentage of subtotal"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Discount"
              name="discount"
              type="number"
              value={formData.discount}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">₹</InputAdornment>,
                inputProps: { min: 0 }
              }}
              helperText="Discount amount in rupees"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Total Amount"
              value={formatCurrency(formData.total)}
              disabled
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="payment-method-label">Payment Method</InputLabel>
              <Select
                labelId="payment-method-label"
                id="paymentMethod"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                disabled={loading}
                startAdornment={
                  <InputAdornment position="start">
                    <PaymentIcon />
                  </InputAdornment>
                }
              >
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Card">Card</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="payment-status-label">Payment Status</InputLabel>
              <Select
                labelId="payment-status-label"
                id="paymentStatus"
                name="paymentStatus"
                value={formData.paymentStatus}
                onChange={handleChange}
                disabled={loading}
                startAdornment={
                  <InputAdornment position="start">
                    <PaymentIcon />
                  </InputAdornment>
                }
              >
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Partial">Partial</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {formData.paymentStatus === 'Partial' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Amount Paid"
                name="amountPaid"
                type="number"
                value={formData.amountPaid}
                onChange={handleChange}
                disabled={loading}
                error={!!errors.amountPaid}
                helperText={errors.amountPaid}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              disabled={loading}
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
      </Grid>
      
      {/* Custom Product Dialog */}
      <Dialog 
        open={openCustomProductDialog}
        onClose={handleCloseCustomProductDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Custom Product</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Product Name"
                name="name"
                value={customProduct.name}
                onChange={handleCustomProductChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={customProduct.category}
                  onChange={handleCustomProductChange}
                >
                  <MenuItem value="Gold Jewelry">Gold Jewelry</MenuItem>
                  <MenuItem value="Silver Jewelry">Silver Jewelry</MenuItem>
                  <MenuItem value="Diamond Jewelry">Diamond Jewelry</MenuItem>
                  <MenuItem value="Gemstone Jewelry">Gemstone Jewelry</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="Net Weight"
                name="netWeight"
                type="number"
                value={customProduct.netWeight}
                onChange={handleCustomProductChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{customProduct.weightType}</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Gross Weight"
                name="grossWeight"
                type="number"
                value={customProduct.grossWeight}
                onChange={handleCustomProductChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{customProduct.weightType}</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Weight Type</InputLabel>
                <Select
                  name="weightType"
                  value={customProduct.weightType}
                  onChange={handleCustomProductChange}
                >
                  <MenuItem value="Gram">Gram</MenuItem>
                  <MenuItem value="Milligram">Milligram</MenuItem>
                  <MenuItem value="Carat">Carat</MenuItem>
                  <MenuItem value="Piece">Piece</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <Autocomplete
                  id="custom-product-purity"
                  freeSolo
                  disableClearable
                  options={
                    customProduct.category.includes('Silver') ? 
                      [
                        { key: "999", value: "999", label: "999 (99.9% Pure)" },
                        { key: "925", value: "925", label: "925 (Sterling Silver)" },
                        { key: "900", value: "900", label: "900 (90.0% Pure)" },
                        { key: "800", value: "800", label: "800 (80.0% Pure)" },
                        ...customPurities.Silver
                      ] : 
                      [
                        { key: "24K", value: "24K", label: "24K (99.9% Pure)" },
                        { key: "22K", value: "22K", label: "22K (91.6% Pure)" },
                        { key: "20K", value: "20K", label: "20K (83.3% Pure)" },
                        { key: "18K", value: "18K", label: "18K (75% Pure)" },
                        { key: "14K", value: "14K", label: "14K (58.3% Pure)" },
                        ...customPurities.Gold
                      ]
                  }
                  getOptionLabel={(option) => {
                    // Handle both string values and option objects
                    if (typeof option === 'string') return option;
                    return option.label || option.value || '';
                  }}
                  value={customProduct.purity}
                  onChange={(event, newValue) => {
                    // Handle both string values and option objects
                    const value = typeof newValue === 'string' ? newValue : newValue?.value;
                    handleCustomProductChange({
                      target: { name: 'purity', value }
                    });
                  }}
                  inputValue={customProduct.purity || ''}
                  onInputChange={(event, newInputValue) => {
                    if (event) {
                      handleCustomProductChange({
                        target: { name: 'purity', value: newInputValue }
                      });
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Purity"
                      name="purity"
                      required
                      helperText="Select from list or type custom value"
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
                required
                label="Price"
                name="price"
                type="number"
                value={customProduct.price}
                onChange={handleCustomProductChange}
                disabled={!!(customProduct.netWeight > 0 && customProduct.purity)}
                helperText={customProduct.netWeight > 0 && customProduct.purity ? "Auto-calculated based on rate" : ""}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Making Charges (%)"
                name="makingCharges"
                type="number"
                value={customProduct.makingCharges}
                onChange={handleCustomProductChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="HUID Number"
                name="huid"
                value={customProduct.huid}
                onChange={handleCustomProductChange}
                placeholder="Enter Hallmarking Unique ID if available"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Fill Sample HUID">
                        <IconButton onClick={generateHUIDSample} size="small">
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Clear HUID">
                        <IconButton onClick={clearHUID} size="small">
                          <ClearAllIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={customProduct.hasStone}
                    onChange={handleCustomProductChange}
                    name="hasStone"
                  />
                }
                label="Has Stone/Beeds"
              />
            </Grid>
            
            {customProduct.hasStone && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Stone Price"
                    name="stonePrice"
                    type="number"
                    value={customProduct.stonePrice}
                    onChange={handleCustomProductChange}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCustomProductDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleAddCustomProduct}
          >
            Add to Bill
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog 
        open={openNewCustomerDialog}
        onClose={handleCloseNewCustomerDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
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
                value={newCustomer.name}
                onChange={handleNewCustomerChange}
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
                value={newCustomer.phone}
                onChange={handleNewCustomerChange}
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
                value={newCustomer.email}
                onChange={handleNewCustomerChange}
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
                value={newCustomer.dob}
                onChange={handleDobChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
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
                value={newCustomer.idType}
                onChange={handleNewCustomerChange}
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
                value={newCustomer.idNumber}
                onChange={handleNewCustomerChange}
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
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>
                Address Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                name="address.street"
                value={newCustomer.address.street}
                onChange={handleNewCustomerChange}
                multiline
                rows={2}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <HomeIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                name="address.city"
                value={newCustomer.address.city}
                onChange={handleNewCustomerChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                name="address.state"
                value={newCustomer.address.state}
                onChange={handleNewCustomerChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Pincode"
                name="address.pincode"
                value={newCustomer.address.pincode}
                onChange={handleNewCustomerChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MapIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewCustomerDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSaveNewCustomer}
            disabled={savingCustomer}
          >
            {savingCustomer ? 'Saving...' : 'Save Customer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

SaleForm.propTypes = {
  initialData: PropTypes.object,
  loading: PropTypes.bool,
  onFormDataChange: PropTypes.func,
};

export default SaleForm; 