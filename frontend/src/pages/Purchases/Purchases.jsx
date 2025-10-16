import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Divider, 
  FormControlLabel, 
  Checkbox, 
  InputAdornment,
  Tabs,
  Tab,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Autocomplete
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Print as PrintIcon,
  Add as AddIcon,
  Calculate as CalculateIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  LocationCity as LocationIcon,
  Home as HomeIcon,
  Map as MapIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useSnackbar } from '../../context/SnackbarContext';
import PageHeader from '../../components/Common/PageHeader';
import api from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../../components/Common/SearchBar';
import DataTable from '../../components/Common/DataTable';

const Purchases = () => {
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openReceipt, setOpenReceipt] = useState(false);
  const receiptRef = React.useRef(null);
  const [purchases, setPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 100,
    page: 0,
  });
  const [rates, setRates] = useState([]);
  const [customPurities, setCustomPurities] = useState({
    Gold: [],
    Silver: []
  });

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    metalType: 'Gold',
    grossWeight: '',
    netWeight: '',
    hasStones: false,
    stonePrice: '',
    purity: '91.6',
    pricePerGram: '',
    totalAmount: 0,
    notes: ''
  });

  // Receipt data
  const [receiptData, setReceiptData] = useState(null);

  const [searchParams, setSearchParams] = useState({
    searchTerm: '',
    filters: {}
  });

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

  // Set the tab to 0 (Customer Buyback) when navigating to /purchases/new
  useEffect(() => {
    if (location.pathname === '/purchases/new') {
      setTabValue(0);
    }
  }, [location.pathname]);

  // Fetch purchases
  useEffect(() => {
    fetchRates();
    fetchPurchases();
    fetchAllCustomers();
  }, [paginationModel.page, paginationModel.pageSize]);

  // Fetch all customers
  const fetchAllCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await api.get('/customers?limit=500');
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      showSnackbar('Failed to load customers', 'error');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchPurchases = async (params = {}) => {
    setPurchasesLoading(true);
    try {
      // Create query string from search params
      let queryString = `page=${paginationModel.page + 1}&limit=${paginationModel.pageSize}`;
      
      // Add search term if present (search by purchase number or vendor name)
      if (params.searchTerm) {
        queryString += `&searchTerm=${encodeURIComponent(params.searchTerm)}`;
      }
      
      // Add date filters if present
      if (params.filters?.startDate) {
        queryString += `&startDate=${encodeURIComponent(params.filters.startDate)}`;
      }
      if (params.filters?.endDate) {
        queryString += `&endDate=${encodeURIComponent(params.filters.endDate)}`;
      }
      
      // Add payment status filter if present
      if (params.filters?.paymentStatus) {
        queryString += `&paymentStatus=${encodeURIComponent(params.filters.paymentStatus)}`;
      }
      
      // Add min/max amount filters if present
      if (params.filters?.minAmount) {
        queryString += `&minAmount=${encodeURIComponent(params.filters.minAmount)}`;
      }
      if (params.filters?.maxAmount) {
        queryString += `&maxAmount=${encodeURIComponent(params.filters.maxAmount)}`;
      }
      
      const response = await api.get(`/purchases?${queryString}`);
      setPurchases(response.data.data || []);
      
      // Set total count from pagination data
      if (response.data.pagination) {
        setTotalPurchases(response.data.total || response.data.data.length);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      showSnackbar('Failed to load purchases', 'error');
    } finally {
      setPurchasesLoading(false);
    }
  };

  // Fetch rates to get custom purities
  const fetchRates = async () => {
    try {
      const response = await api.get('/rates/latest');
      if (response.data.success) {
        setRates(response.data.data);
        
        // Extract custom purities
        const defaultGoldPurities = ["24K", "22K", "18K", "14K"];
        const defaultSilverPurities = ["99.9", "92.5"];
        
        const customGoldPurities = [];
        const customSilverPurities = [];
        
        response.data.data.forEach(rate => {
          if (rate.metal === 'Gold' && !defaultGoldPurities.includes(rate.purity)) {
            customGoldPurities.push({
              value: rate.purity,
              label: `${rate.purity} (Custom)`,
              ratePerGram: rate.ratePerGram
            });
          } else if (rate.metal === 'Silver' && !defaultSilverPurities.includes(rate.purity)) {
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
    }
  };

  const handleSearch = (params) => {
    setSearchParams(params);
    fetchPurchases(params);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Auto-calculate total amount when relevant fields change
    if (['netWeight', 'pricePerGram', 'purity', 'metalType', 'hasStones', 'stonePrice'].includes(name)) {
      // We'll update the form data first, then calculate
      setFormData(prev => {
        const updatedFormData = {
          ...prev,
          [name]: newValue
        };
        
        // Calculate with the updated values
        const weight = parseFloat(updatedFormData.netWeight) || 0;
        const price = parseFloat(updatedFormData.pricePerGram) || 0;
        
        // Get purity as percentage (directly entered as percentage)
        const purityValue = parseFloat(updatedFormData.purity) || 100;
        const purityPercentage = purityValue / 100;
        
        // Calculate metal value
        const metalValue = price * weight * purityPercentage;
        
        // Add stone price if applicable
        const stonePrice = updatedFormData.hasStones ? (parseFloat(updatedFormData.stonePrice) || 0) : 0;
        
        // Calculate total
        const total = metalValue + stonePrice;
        
        return {
          ...updatedFormData,
          totalAmount: total
        };
      });
    }
  };

  const calculateTotal = () => {
    const weight = parseFloat(formData.netWeight) || 0;
    const price = parseFloat(formData.pricePerGram) || 0;
    
    // Get purity as percentage (directly entered as percentage)
    const purityValue = parseFloat(formData.purity) || 100;
    const purityPercentage = purityValue / 100;
    
    // Calculate metal value
    const metalValue = price * weight * purityPercentage;
    
    // Add stone price if applicable
    const stonePrice = formData.hasStones ? (parseFloat(formData.stonePrice) || 0) : 0;
    
    // Calculate total
    const total = metalValue + stonePrice;
    
    setFormData(prev => ({
      ...prev,
      totalAmount: total
    }));
    return total;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.metalType || !formData.netWeight || !formData.pricePerGram) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      // Calculate total to ensure it's a valid number
      const totalAmount = calculateTotal();
      
      // Generate a temporary purchase number (will be replaced by backend)
      const tempPurchaseNumber = `PUR-${new Date().getFullYear().toString().substr(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Create purchase data object
      const purchaseData = {
        purchaseNumber: tempPurchaseNumber, // Add temporary purchase number
        purchaseDate: new Date(), // Explicitly set purchase date
        vendor: {
          name: formData.customerName,
          contact: formData.customerPhone
        },
        items: [
          {
            category: formData.metalType.includes('Gold') ? 'Raw Gold' : 
                      formData.metalType.includes('Silver') ? 'Raw Silver' : 'Other',
            description: `${formData.metalType} (${formData.purity})${formData.hasStones ? ' with stones' : ''}`,
            weightType: 'Gram',
            weight: parseFloat(formData.netWeight),
            purity: formData.purity,
            quantity: 1,
            ratePerUnit: parseFloat(formData.pricePerGram),
            totalAmount: totalAmount,
            hasStones: formData.hasStones,
            stonePrice: formData.hasStones ? parseFloat(formData.stonePrice) || 0 : 0
          }
        ],
        totalAmount: totalAmount,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        amountPaid: totalAmount,
        notes: formData.notes
      };
      
      // Send to backend
      const response = await api.post('/purchases', purchaseData);
      
      // Store the purchase ID from response for navigation
      const purchaseId = response.data.data._id;
      
      showSnackbar('Purchase recorded successfully', 'success');
      
      // Refresh the purchases list
      fetchPurchases();
      
      // Reset form after successful submission
      setFormData({
        customerName: '',
        customerPhone: '',
        metalType: 'Gold',
        grossWeight: '',
        netWeight: '',
        hasStones: false,
        stonePrice: '',
        purity: '91.6',
        pricePerGram: '',
        totalAmount: 0,
        notes: ''
      });
      
      // Navigate to the purchase detail page instead of showing the receipt modal
      navigate(`/purchases/${purchaseId}`);
    } catch (error) {
      console.error('Error recording purchase:', error);
      // Show specific validation errors if available
      if (error.response?.data?.error) {
        showSnackbar(`Error: ${error.response.data.error}`, 'error');
      } else {
        showSnackbar('Error recording purchase. Please check all required fields.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Purchase_Receipt_${receiptData?.purchaseNumber || 'New'}`,
    onAfterPrint: () => {
      showSnackbar('Receipt printed successfully', 'success');
    }
  });

  const previewReceipt = () => {
    // Calculate total first to ensure we have the correct amount
    const total = calculateTotal();
    
    // Set receipt data with explicit values to prevent undefined
    setReceiptData({
      ...formData,
      purchaseDate: new Date(),
      purchaseNumber: `PREVIEW-${Math.floor(100000 + Math.random() * 900000)}`,
      totalAmount: total || 0 // Ensure we have a default value
    });
    setOpenReceipt(true);
  };

  // Handle view purchase
  const handleViewPurchase = (purchaseId) => {
    navigate(`/purchases/${purchaseId}`);
  };

  // Handle edit purchase
  const handleEditPurchase = (purchase) => {
    navigate(`/purchases/${purchase._id}/edit`);
  };

  // Handle delete purchase
  const handleDeletePurchase = async (purchase) => {
    if (window.confirm(`Are you sure you want to delete purchase #${purchase.purchaseNumber}?`)) {
      try {
        await api.delete(`/purchases/${purchase._id}`);
        showSnackbar('Purchase deleted successfully', 'success');
        fetchPurchases();
      } catch (error) {
        console.error('Error deleting purchase:', error);
        showSnackbar('Failed to delete purchase', 'error');
      }
    }
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
      showSnackbar('Customer name is required', 'error');
      return;
    }

    if (!newCustomer.phone.trim()) {
      showSnackbar('Phone number is required', 'error');
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
        
        // Update form with new customer's data
        setFormData(prev => ({
          ...prev,
          customerName: createdCustomer.name,
          customerPhone: createdCustomer.phone || ''
        }));
        
        showSnackbar('Customer added successfully', 'success');
        handleCloseNewCustomerDialog();
      }
    } catch (err) {
      console.error('Error creating customer:', err);
      showSnackbar('Failed to create customer', 'error');
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

  // Add the custom search function for DataTable
  const customSearchFunction = (purchase, searchTerm) => {
    if (!searchTerm) return true;
    searchTerm = searchTerm.toLowerCase();
    
    // Search in purchase number
    if (purchase.purchaseNumber && purchase.purchaseNumber.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search in vendor name
    if (purchase.vendor && purchase.vendor.name && 
        purchase.vendor.name.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    return false;
  };

  // Update the Purchase List tab to include DataTable with custom search
  const renderPurchasesList = () => {
    const columns = [
      {
        field: 'purchaseNumber',
        headerName: 'Purchase #',
        flex: 1,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {params.value}
          </Typography>
        )
      },
      {
        field: 'serialNumber',
        headerName: 'Serial No.',
        flex: 0.8,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#1976d2' }}>
            {params.value ? `PUR-${params.value}` : '-'}
          </Typography>
        )
      },
      {
        field: 'vendorName',
        headerName: 'Vendor',
        flex: 1.5,
        valueGetter: (params) => params.row.vendor?.name || 'N/A'
      },
      {
        field: 'purchaseDate',
        headerName: 'Date',
        flex: 1,
        valueGetter: (params) => new Date(params.row.purchaseDate),
        valueFormatter: (params) => format(new Date(params.value), 'dd/MM/yyyy')
      },
      {
        field: 'totalAmount',
        headerName: 'Amount',
        flex: 1,
        type: 'number',
        valueFormatter: (params) => `₹${params.value.toLocaleString('en-IN')}`
      },
      {
        field: 'paymentStatus',
        headerName: 'Status',
        flex: 1,
        renderCell: (params) => {
          let color = 'default';
          if (params.value === 'Paid') color = 'success';
          else if (params.value === 'Partial') color = 'warning';
          else if (params.value === 'Pending') color = 'error';
          
          return <Chip label={params.value} color={color} size="small" />;
        }
      },
      {
        field: 'actions',
        headerName: 'Actions',
        flex: 1,
        renderCell: (params) => (
          <Box>
            <Tooltip title="View Details">
              <IconButton 
                size="small" 
                onClick={() => handleViewPurchase(params.row._id)}
                sx={{ mr: 1 }}
              >
                <ViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton 
                size="small" 
                onClick={() => handleEditPurchase(params.row)}
                sx={{ mr: 1 }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton 
                size="small" 
                onClick={() => handleDeletePurchase(params.row)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )
      }
    ];

    return (
      <Box sx={{ mt: 3 }}>
        <DataTable
          title="Purchases"
          rows={purchases}
          columns={columns}
          loading={purchasesLoading}
          quickSearch={true}
          customSearchFunction={customSearchFunction}
          getRowId={(row) => row._id}
          paginationMode="server"
          rowCount={totalPurchases}
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => {
            setPaginationModel(model);
            fetchPurchases(searchParams);
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          onFilterModelChange={(model) => {
            // Handle DataGrid filtering if needed
          }}
          onQuickSearchChange={(searchTerm) => {
            const newSearchParams = { ...searchParams, searchTerm };
            setSearchParams(newSearchParams);
            fetchPurchases(newSearchParams);
          }}
        />
      </Box>
    );
  };

  return (
    <>
      <PageHeader
        title="Purchases"
        subtitle="Manage your purchase records"
        breadcrumbs={[{ label: 'Purchases' }]}
        actionText={tabValue === 1 ? 'New Purchase' : ''}
        actionIcon={tabValue === 1 ? <AddIcon /> : null}
        onActionClick={() => navigate('/purchases/new')}
      />

      <Paper sx={{ width: '100%', mb: 2, p: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab label="New Buyback" />
          <Tab label="All Purchases" />
        </Tabs>
        
        {tabValue === 0 && (
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Record Customer Buyback
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Use this form to record purchases of gold/silver from customers.
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                {/* Customer Information */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Customer Information
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Autocomplete
                      fullWidth
                      freeSolo
                      id="customer-name-autocomplete"
                      options={customers}
                      getOptionLabel={(option) => {
                        // Handle both string values and customer objects
                        if (typeof option === 'string') return option;
                        return option.name || '';
                      }}
                      loading={loadingCustomers}
                      value={formData.customerName}
                      onChange={(event, newValue) => {
                        // Handle both string values and customer objects
                        const name = typeof newValue === 'string' ? newValue : newValue?.name || '';
                        const phone = typeof newValue === 'object' && newValue ? newValue.phone || '' : formData.customerPhone;
                        setFormData(prev => ({
                          ...prev,
                          customerName: name,
                          customerPhone: phone
                        }));
                      }}
                      onInputChange={(event, newInputValue) => {
                        if (event) {
                          setFormData(prev => ({
                            ...prev,
                            customerName: newInputValue
                          }));
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Customer Name"
                          required
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {loadingCustomers ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <li {...props}>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="body1">{option.name}</Typography>
                            {option.phone && (
                              <Typography variant="caption" color="text.secondary">
                                {option.phone}
                              </Typography>
                            )}
                          </Box>
                        </li>
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
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Customer Phone"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleChange}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                
                {/* Item Details */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Metal Details
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth required>
                    <InputLabel id="metal-type-label">Metal Type</InputLabel>
                    <Select
                      labelId="metal-type-label"
                      name="metalType"
                      value={formData.metalType}
                      onChange={handleChange}
                      label="Metal Type"
                    >
                      <MenuItem value="Gold">Gold</MenuItem>
                      <MenuItem value="Silver">Silver</MenuItem>
                      <MenuItem value="Platinum">Platinum</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth required>
                    <TextField
                      id="purchase-purity"
                      label="Purity (%)"
                      name="purity"
                      type="number"
                      value={formData.purity}
                      onChange={handleChange}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>
                      }}
                      inputProps={{
                        min: 0,
                        max: 100,
                        step: "0.1"
                      }}
                      helperText="Enter purity percentage"
                    />
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    required
                    fullWidth
                    label="Gross Weight"
                    name="grossWeight"
                    type="number"
                    value={formData.grossWeight}
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">g</InputAdornment>
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    required
                    fullWidth
                    label="Net Weight"
                    name="netWeight"
                    type="number"
                    value={formData.netWeight}
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">g</InputAdornment>
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.hasStones}
                        onChange={handleChange}
                        name="hasStones"
                      />
                    }
                    label="Contains Stones/Beads"
                  />
                </Grid>
                
                {formData.hasStones && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Stone Price"
                      name="stonePrice"
                      type="number"
                      value={formData.stonePrice}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>
                      }}
                    />
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                
                {/* Price Information */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Price Information
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    required
                    fullWidth
                    label="Price per Gram"
                    name="pricePerGram"
                    type="number"
                    value={formData.pricePerGram}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Total Amount"
                    type="number"
                    value={formData.totalAmount}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      readOnly: true,
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<CalculateIcon />}
                    onClick={calculateTotal}
                    fullWidth
                    sx={{ height: '56px' }}
                  >
                    Calculate Total
                  </Button>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    name="notes"
                    multiline
                    rows={3}
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </Grid>
                
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    startIcon={<SaveIcon />}
                    disabled={loading}
                    size="large"
                  >
                    {loading ? <CircularProgress size={24} /> : 'Record Purchase'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ReceiptIcon />}
                    onClick={previewReceipt}
                    disabled={!formData.customerName || !formData.netWeight || !formData.pricePerGram}
                    size="large"
                  >
                    Preview Receipt
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        )}
        
        {tabValue === 1 && (
          <>
            <Box sx={{ mb: 2 }}>
              <SearchBar 
                onSearch={handleSearch}
                placeholder="Search by purchase number or vendor..."
                quickFilters={[
                  {
                    name: 'paymentStatus',
                    label: 'Payment Status',
                    options: [
                      { label: 'All', value: '' },
                      { label: 'Paid', value: 'Paid' },
                      { label: 'Partial', value: 'Partial' },
                      { label: 'Pending', value: 'Pending' }
                    ]
                  }
                ]}
                advancedFilters={[
                  {
                    name: 'startDate',
                    label: 'Start Date',
                    type: 'date'
                  },
                  {
                    name: 'endDate',
                    label: 'End Date',
                    type: 'date'
                  },
                  {
                    name: 'minAmount',
                    label: 'Min Amount',
                    type: 'number'
                  },
                  {
                    name: 'maxAmount',
                    label: 'Max Amount',
                    type: 'number'
                  }
                ]}
              />
            </Box>
            
            {renderPurchasesList()}
          </>
        )}
      </Paper>
      
      {/* Receipt Preview Dialog */}
      <Dialog
        open={openReceipt}
        onClose={() => setOpenReceipt(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Purchase Receipt
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Box 
              ref={receiptRef} 
              sx={{ 
                p: 4, 
                bgcolor: 'white',
                border: '1px solid #ddd',
                boxShadow: 1,
                minHeight: '650px',
                width: '100%',
                '@media print': {
                  boxShadow: 'none',
                  border: 'none'
                }
              }}
            >
              {receiptData && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                      <Typography variant="h5" gutterBottom>
                        Purchase Receipt
                      </Typography>
                      <Typography variant="body2">
                        Receipt #: {receiptData.purchaseNumber}
                      </Typography>
                      <Typography variant="body2">
                        Date: {format(receiptData.purchaseDate, 'dd/MM/yyyy hh:mm a')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6">
                        MG Potdar Jewellers
                      </Typography>
                      <Typography variant="body2">
                        123 Main Street, Pune
                      </Typography>
                      <Typography variant="body2">
                        Phone: 1234567890
                      </Typography>
                      <Typography variant="body2">
                        Email: contact@mgpotdarjewellers.com
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ mb: 3 }} />
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Customer Information
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={3}>
                        <Typography variant="body2" fontWeight="bold">
                          Name:
                        </Typography>
                      </Grid>
                      <Grid item xs={9}>
                        <Typography variant="body2">
                          {receiptData.customerName}
                        </Typography>
                      </Grid>
                      
                      {receiptData.customerPhone && (
                        <>
                          <Grid item xs={3}>
                            <Typography variant="body2" fontWeight="bold">
                              Phone:
                            </Typography>
                          </Grid>
                          <Grid item xs={9}>
                            <Typography variant="body2">
                              {receiptData.customerPhone}
                            </Typography>
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Purchase Details
                    </Typography>
                    
                    <TableContainer>
                      <Table>
                        <TableHead sx={{ bgcolor: 'primary.main', '& .MuiTableCell-root': { color: 'white' } }}>
                          <TableRow>
                            <TableCell>Sr</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>HUID</TableCell>
                            <TableCell>HSN</TableCell>
                            <TableCell align="right">PCS</TableCell>
                            <TableCell align="right">Gross Weight</TableCell>
                            <TableCell align="right">Net Weight</TableCell>
                            <TableCell align="right">Rate/Gms</TableCell>
                            <TableCell align="right">Amount</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {receiptData ? (
                            <TableRow>
                              <TableCell>1</TableCell>
                              <TableCell>
                                {receiptData.metalType || 'Gold'} ({receiptData.purity || '22K'})
                                {receiptData.hasStones ? ' with stones/beads' : ''}
                              </TableCell>
                              <TableCell>-</TableCell>
                              <TableCell>
                                {receiptData.metalType?.includes('Gold') && receiptData.purity === '22K' ? '7113' : 
                                 receiptData.metalType?.includes('Silver') ? '7114' : '7115'}
                              </TableCell>
                              <TableCell align="right">1</TableCell>
                              <TableCell align="right">
                                {parseFloat(receiptData.grossWeight) > 0 ? 
                                 `${parseFloat(receiptData.grossWeight).toFixed(3)}g` : '-'}
                              </TableCell>
                              <TableCell align="right">
                                {parseFloat(receiptData.netWeight) ? 
                                 `${parseFloat(receiptData.netWeight).toFixed(3)}g` : '0.000g'}
                              </TableCell>
                              <TableCell align="right">
                                ₹{parseFloat(receiptData.pricePerGram) ? 
                                  parseFloat(receiptData.pricePerGram).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  }) : '0.00'}
                              </TableCell>
                              <TableCell align="right">
                                ₹{parseFloat(receiptData.totalAmount) ? 
                                  parseFloat(receiptData.totalAmount).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  }) : '0.00'}
                              </TableCell>
                            </TableRow>
                          ) : (
                            <TableRow>
                              <TableCell colSpan={9} align="center">No data available</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                    <Box sx={{ width: '200px' }}>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body1" fontWeight="bold">
                            Total:
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body1" fontWeight="bold" align="right">
                            ₹{parseFloat(receiptData.totalAmount) ? parseFloat(receiptData.totalAmount).toLocaleString() : '0'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Box>
                  
                  {receiptData.notes && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Notes:
                      </Typography>
                      <Typography variant="body2">
                        {receiptData.notes}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>In Words:</strong> {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                      }).format(receiptData.totalAmount).replace('₹', '')} Rupees Only
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ mb: 3 }} />
                  
                  <Box>
                    <Typography variant="body2" align="center">
                      Thank you for your business!
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReceipt(false)}>Close</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print Receipt
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
    </>
  );
};

export default Purchases; 
