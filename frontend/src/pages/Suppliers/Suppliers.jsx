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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Chip
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Print as PrintIcon,
  Add as AddIcon,
  Calculate as CalculateIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../context/SnackbarContext';
import PageHeader from '../../components/Common/PageHeader';
import api from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

const Suppliers = () => {
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openReceipt, setOpenReceipt] = useState(false);
  const receiptRef = React.useRef(null);
  const [supplierPurchases, setSupplierPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    supplierName: '',
    supplierContact: '',
    metalType: 'Gold',
    grossWeight: '',
    netWeight: '',
    hasStones: false,
    stoneWeight: '',
    purity: '22K',
    pricePerGram: '',
    totalAmount: 0,
    invoiceNumber: '',
    notes: ''
  });

  // Receipt data
  const [receiptData, setReceiptData] = useState(null);

  // Set the tab to 0 (New Purchase) when navigating to /suppliers/new
  useEffect(() => {
    if (location.pathname === '/suppliers/new') {
      setTabValue(0);
    }
  }, [location.pathname]);

  // Fetch supplier purchases
  useEffect(() => {
    fetchSupplierPurchases();
  }, []);

  const fetchSupplierPurchases = async () => {
    setPurchasesLoading(true);
    try {
      const response = await api.get('/suppliers');
      setSupplierPurchases(response.data.data || []);
    } catch (error) {
      console.error('Error fetching supplier purchases:', error);
      showSnackbar('Failed to load supplier purchases', 'error');
    } finally {
      setPurchasesLoading(false);
    }
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
    if (['netWeight', 'pricePerGram'].includes(name)) {
      const weight = name === 'netWeight' ? parseFloat(value) || 0 : parseFloat(formData.netWeight) || 0;
      const price = name === 'pricePerGram' ? parseFloat(value) || 0 : parseFloat(formData.pricePerGram) || 0;
      
      const total = weight * price;
      setFormData(prev => ({
        ...prev,
        totalAmount: total
      }));
    }
  };

  const calculateTotal = () => {
    const weight = parseFloat(formData.netWeight) || 0;
    const price = parseFloat(formData.pricePerGram) || 0;
    
    const total = weight * price;
    setFormData(prev => ({
      ...prev,
      totalAmount: total
    }));
    return total;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.supplierName || !formData.metalType || !formData.netWeight || !formData.pricePerGram) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      // Calculate total to ensure it's a valid number
      const totalAmount = calculateTotal();
      
      // Generate a temporary purchase number
      const tempPurchaseNumber = `SUP-${new Date().getFullYear().toString().substr(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Create supplier purchase data object
      const purchaseData = {
        purchaseNumber: tempPurchaseNumber,
        purchaseDate: new Date(),
        supplier: {
          name: formData.supplierName,
          contact: formData.supplierContact
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
            totalAmount: totalAmount
          }
        ],
        totalAmount: totalAmount,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        amountPaid: totalAmount,
        invoiceNumber: formData.invoiceNumber,
        notes: formData.notes
      };
      
      // Send to backend
      const response = await api.post('/suppliers', purchaseData);
      
      // Store the supplier purchase ID from response for navigation
      const supplierPurchaseId = response.data.data._id;
      
      showSnackbar('Supplier purchase recorded successfully', 'success');
      
      // Refresh the supplier purchases list
      fetchSupplierPurchases();
      
      // Reset form after successful submission
      setFormData({
        supplierName: '',
        supplierContact: '',
        metalType: 'Gold',
        grossWeight: '',
        netWeight: '',
        hasStones: false,
        stoneWeight: '',
        purity: '22K',
        pricePerGram: '',
        totalAmount: 0,
        invoiceNumber: '',
        notes: ''
      });
      
      // Navigate to the supplier purchase detail page instead of showing the receipt modal
      navigate(`/suppliers/${supplierPurchaseId}`);
    } catch (error) {
      console.error('Error recording supplier purchase:', error);
      // Show specific validation errors if available
      if (error.response?.data?.error) {
        showSnackbar(`Error: ${error.response.data.error}`, 'error');
      } else {
        showSnackbar('Error recording supplier purchase. Please check all required fields.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Supplier_Purchase_Receipt_${receiptData?.purchaseNumber || 'New'}`,
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
      totalAmount: total || 0
    });
    setOpenReceipt(true);
  };

  return (
    <Box>
      <PageHeader 
        title="Suppliers" 
        subtitle="Record purchases from suppliers"
        breadcrumbs={[{ label: 'Suppliers' }]}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/suppliers/new')}
        >
          New Supplier Purchase
        </Button>
      </PageHeader>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="suppliers tabs">
          <Tab label="New Purchase" id="tab-0" />
          <Tab label="Purchase Records" id="tab-1" />
        </Tabs>
      </Paper>
      
      {tabValue === 0 && (
        <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Record Supplier Purchase
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Use this form to record purchases of inventory from suppliers.
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              {/* Supplier Information */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  Supplier Information
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Supplier Name"
                  name="supplierName"
                  value={formData.supplierName}
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Supplier Contact"
                  name="supplierContact"
                  value={formData.supplierContact}
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Invoice Number"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  placeholder="Supplier's invoice number (if available)"
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
                  <InputLabel id="purity-label">Purity</InputLabel>
                  <Select
                    labelId="purity-label"
                    name="purity"
                    value={formData.purity}
                    onChange={handleChange}
                    label="Purity"
                  >
                    <MenuItem value="24K">24K (99.9%)</MenuItem>
                    <MenuItem value="22K">22K (91.6%)</MenuItem>
                    <MenuItem value="18K">18K (75%)</MenuItem>
                    <MenuItem value="14K">14K (58.5%)</MenuItem>
                    <MenuItem value="92.5">Silver Sterling (92.5%)</MenuItem>
                    <MenuItem value="99.9">Silver Pure (99.9%)</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
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
                    label="Stone Weight (deducted)"
                    name="stoneWeight"
                    type="number"
                    value={formData.stoneWeight}
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">g</InputAdornment>
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
                  disabled={!formData.supplierName || !formData.netWeight || !formData.pricePerGram}
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
        <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Supplier Purchase Records
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchSupplierPurchases}
              disabled={purchasesLoading}
            >
              Refresh
            </Button>
          </Box>
          
          {purchasesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : supplierPurchases.length === 0 ? (
            <Typography variant="body1" sx={{ py: 2 }}>
              No supplier purchase records found. Create a new purchase to see it here.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'primary.main', '& .MuiTableCell-root': { color: 'white' } }}>
                  <TableRow>
                    <TableCell>Purchase #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supplierPurchases.map((purchase) => (
                    <TableRow key={purchase._id}>
                      <TableCell>{purchase.purchaseNumber}</TableCell>
                      <TableCell>
                        {format(new Date(purchase.purchaseDate), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{purchase.supplier?.name}</TableCell>
                      <TableCell>{purchase.invoiceNumber || 'N/A'}</TableCell>
                      <TableCell>
                        {purchase.items?.map((item, i) => (
                          <div key={i}>
                            {item.description} ({item.weight}g)
                            {i < purchase.items.length - 1 && ', '}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell align="right">₹{purchase.totalAmount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip 
                          size="small"
                          label={purchase.paymentStatus} 
                          color={purchase.paymentStatus === 'Paid' ? 'success' : 
                                 purchase.paymentStatus === 'Partial' ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => navigate(`/suppliers/${purchase._id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
      
      {/* Receipt Preview Dialog */}
      <Dialog
        open={openReceipt}
        onClose={() => setOpenReceipt(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Supplier Purchase Receipt
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
                        Supplier Purchase Receipt
                      </Typography>
                      <Typography variant="body2">
                        Receipt #: {receiptData.purchaseNumber}
                      </Typography>
                      <Typography variant="body2">
                        Date: {format(receiptData.purchaseDate, 'dd/MM/yyyy hh:mm a')}
                      </Typography>
                      {receiptData.invoiceNumber && (
                        <Typography variant="body2">
                          Supplier Invoice #: {receiptData.invoiceNumber}
                        </Typography>
                      )}
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
                      Supplier Information
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={3}>
                        <Typography variant="body2" fontWeight="bold">
                          Name:
                        </Typography>
                      </Grid>
                      <Grid item xs={9}>
                        <Typography variant="body2">
                          {receiptData.supplierName}
                        </Typography>
                      </Grid>
                      
                      {receiptData.supplierContact && (
                        <>
                          <Grid item xs={3}>
                            <Typography variant="body2" fontWeight="bold">
                              Contact:
                            </Typography>
                          </Grid>
                          <Grid item xs={9}>
                            <Typography variant="body2">
                              {receiptData.supplierContact}
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
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Weight</TableCell>
                            <TableCell align="right">Rate</TableCell>
                            <TableCell align="right">Amount</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {receiptData ? (
                            <TableRow>
                              <TableCell>
                                {receiptData.metalType || 'Gold'} ({receiptData.purity || '22K'})
                                {receiptData.hasStones ? ' with stones/beads' : ''}
                              </TableCell>
                              <TableCell align="right">
                                {parseFloat(receiptData.netWeight) ? `${parseFloat(receiptData.netWeight).toFixed(2)}g (Net)` : '0.00g (Net)'}
                                {parseFloat(receiptData.grossWeight) > 0 && ` / ${parseFloat(receiptData.grossWeight).toFixed(2)}g (Gross)`}
                              </TableCell>
                              <TableCell align="right">
                                ₹{parseFloat(receiptData.pricePerGram) ? parseFloat(receiptData.pricePerGram).toLocaleString() : '0'}/g
                              </TableCell>
                              <TableCell align="right">
                                ₹{parseFloat(receiptData.totalAmount) ? parseFloat(receiptData.totalAmount).toLocaleString() : '0'}
                              </TableCell>
                            </TableRow>
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} align="center">No data available</TableCell>
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
    </Box>
  );
};

export default Suppliers; 