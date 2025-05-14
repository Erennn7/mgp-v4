import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Divider,
  Button,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  LocalShipping as ShippingIcon,
  Payment as PaymentIcon,
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import PageHeader from '../../components/Common/PageHeader';
import StatusChip from '../../components/Common/StatusChip';
import FormDialog from '../../components/Common/FormDialog';
import SaleForm from './SaleForm';
import PrintBill from '../../components/Printing/PrintBill';
import api from '../../services/api';
import { toast } from 'react-toastify';

const SaleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openEditForm, setOpenEditForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [saleFormData, setSaleFormData] = useState(null);
  const [printBillOpen, setPrintBillOpen] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [productDetails, setProductDetails] = useState({});

  // Fetch sale data
  const fetchSale = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/sales/${id}`);
      setSale(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load sale data');
      console.error('Sale fetch error:', err);
      toast.error('Failed to load sale data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch product details for each item in the sale
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (sale && sale.items) {
        const productIds = sale.items
          .filter(item => !item.isCustomItem && item.product?._id)
          .map(item => item.product._id);
        
        const detailsMap = {};
        
        for (const productId of productIds) {
          try {
            const response = await api.get(`/products/${productId}`);
            if (response.data && response.data.data) {
              detailsMap[productId] = response.data.data;
            }
          } catch (err) {
            console.error(`Error fetching product ${productId}:`, err);
          }
        }
        
        setProductDetails(detailsMap);
      }
    };
    
    if (sale) {
      fetchProductDetails();
    }
  }, [sale]);

  useEffect(() => {
    fetchSale();
  }, [id]);

  // Handle edit sale
  const handleEditSale = () => {
    setOpenEditForm(true);
  };

  // Handle form data change
  const handleFormDataChange = (formData) => {
    setSaleFormData(formData);
  };

  // Handle delete sale
  const handleDeleteSale = () => {
    setConfirmDelete(true);
  };

  // Format currency for PDF without any symbols, just the number
  const formatNumberForPDF = (amount) => {
    return Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2,
      useGrouping: true // Keep the thousands separator
    });
  };

  // Generate PDF invoice using the bill print template
  const generatePDF = () => {
    setIsPrintMode(false);
    setIsPdfMode(true);
    setPrintBillOpen(true);
  };

  // Direct print without showing dialog
  const handlePrintBill = () => {
    setIsPrintMode(true);
    setIsPdfMode(false);
    setPrintBillOpen(true);
  };

  // Helper function to convert number to words
  const convertToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const numString = num.toFixed(2);
    const [rupees, paise] = numString.split('.');
    
    const rupeesInWords = () => {
      const rupeesNum = parseInt(rupees);
      if (rupeesNum === 0) return 'Zero';
      
      // Convert to words based on Indian numbering system
      const lakh = Math.floor(rupeesNum / 100000);
      const thousands = Math.floor((rupeesNum % 100000) / 1000);
      const hundreds = Math.floor((rupeesNum % 1000) / 100);
      const remainder = rupeesNum % 100;
      
      let words = '';
      
      if (lakh > 0) {
        words += (lakh < 20 ? ones[lakh] : tens[Math.floor(lakh / 10)] + (lakh % 10 !== 0 ? ' ' + ones[lakh % 10] : '')) + ' Lakh ';
      }
      
      if (thousands > 0) {
        words += (thousands < 20 ? ones[thousands] : tens[Math.floor(thousands / 10)] + (thousands % 10 !== 0 ? ' ' + ones[thousands % 10] : '')) + ' Thousand ';
      }
      
      if (hundreds > 0) {
        words += ones[hundreds] + ' Hundred ';
      }
      
      if (remainder > 0) {
        if (words !== '') words += 'and ';
        words += (remainder < 20 ? ones[remainder] : tens[Math.floor(remainder / 10)] + (remainder % 10 !== 0 ? ' ' + ones[remainder % 10] : ''));
      }
      
      return words;
    };
    
    return `${rupeesInWords()}`;
  };

  // Handle form submit for edit
  const handleFormSubmit = async () => {
    if (!saleFormData) {
      toast.error('No form data available');
      return;
    }

    // Validate form data
    if (!saleFormData.customer) {
      toast.error('Please select a customer');
      return;
    }

    if (saleFormData.items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    // Prepare data for API
    const saleData = {
      ...saleFormData,
      // Ensure tax and discount are sent as percentages
      tax: parseFloat(saleFormData.tax) || 0,
      discount: parseFloat(saleFormData.discount) || 0,
      // Calculate the total correctly based on percentages
      total: calculateTotal(saleFormData),
      // Map items to format expected by API
      items: saleFormData.items.map(item => {
        // Handle custom items differently
        if (item.isCustomItem) {
          return {
            isCustomItem: true,
            customProductDetails: item.customProductDetails,
            quantity: item.quantity,
            rate: item.rate,
            weight: item.weight,
            makingCharges: item.makingCharges,
            total: item.total
          };
        } else {
          // Regular products with ObjectId reference
          return {
            product: item.product._id,
            quantity: item.quantity,
            rate: item.rate,
            weight: item.weight,
            makingCharges: item.makingCharges,
            total: item.total
          };
        }
      })
    };

    setFormSubmitting(true);
    try {
      await api.put(`/sales/${id}`, saleData);
      toast.success('Sale updated successfully');
      fetchSale();
      setOpenEditForm(false);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to update sale';
      toast.error(errorMessage);
      console.error('Sale update error:', err);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Helper function to calculate total including GST and discount
  const calculateTotal = (data) => {
    const itemsTotal = data.itemsTotal || data.subTotal; // Fallback for backward compatibility
    const makingChargesAmount = (itemsTotal * (data.makingChargesPercentage / 100)) || 0;
    const subTotal = itemsTotal + makingChargesAmount;
    const gstAmount = subTotal * (data.tax / 100) || 0;
    // Treat discount as absolute amount
    const discountAmount = parseFloat(data.discount) || 0;
    return Math.max(0, subTotal + gstAmount - discountAmount);
  };

  // Confirm delete sale
  const confirmDeleteSale = async () => {
    setFormSubmitting(true);
    try {
      await api.delete(`/sales/${id}`);
      toast.success('Sale deleted successfully');
      navigate('/sales');
    } catch (err) {
      toast.error('Failed to delete sale');
      console.error('Sale delete error:', err);
    } finally {
      setFormSubmitting(false);
      setConfirmDelete(false);
    }
  };

  // Format value for display with fallback
  const formatValue = (value, fallback = '-') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') {
      // Handle objects by returning a reasonable string representation
      if (value.toString !== Object.prototype.toString) {
        // If it has a custom toString method, use it
        return value.toString();
      }
      // For plain objects, just return the fallback
      return fallback;
    }
    return value;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'PPP');
    } catch (err) {
      return '-';
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  // Error state
  if (error || !sale) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error || 'Sale not found'}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/sales')} startIcon={<ArrowBackIcon />}>
          Back to Sales
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ py: 3, px: { xs: 2, md: 3 } }}>
        <PageHeader
          title="Sale Details"
          breadcrumbs={[
            { label: 'Home', link: '/' },
            { label: 'Sales', link: '/sales' },
            { label: 'Sale Details' },
          ]}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/sales')}
            >
              Back
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              onClick={handleEditSale}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteSale}
            >
              Delete
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<PdfIcon />}
              onClick={generatePDF}
            >
              PDF
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<PrintIcon />}
              onClick={handlePrintBill}
              sx={{ fontWeight: 'bold' }}
            >
              Print Bill
            </Button>
          </Box>
        </PageHeader>

        <Grid container spacing={3}>
          {/* Sale Header Information */}
          <Grid item xs={12} md={8}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Invoice Number
                    </Typography>
                    <Typography variant="h6">
                      {sale.invoiceNumber}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(sale.createdAt)}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Payment Status
                    </Typography>
                    <StatusChip status={sale.paymentStatus} />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Customer
                    </Typography>
                    <Typography variant="body1">
                      {formatValue(sale.customer?.name)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Contact
                    </Typography>
                    <Typography variant="body1">
                      {formatValue(sale.customer?.phone)}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Payment Method
                    </Typography>
                    <Typography variant="body1">
                      {formatValue(sale.paymentMethod)}
                    </Typography>
                  </Box>
                </Grid>
                
                {sale.notes && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body2">
                      {sale.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
          
          {/* Sale Summary */}
          <Grid item xs={12} md={4}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">Items Total:</Typography>
                <Typography variant="subtitle1">
                  {formatCurrency(sale.itemsTotal || sale.subTotal)}
                </Typography>
              </Box>
              
              {sale.makingChargesPercentage > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="subtitle1">Making Charges ({sale.makingChargesPercentage}%):</Typography>
                  <Typography variant="subtitle1">{formatCurrency(sale.makingChargesAmount)}</Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="subtitle1">GST ({sale.tax}%):</Typography>
                <Typography variant="subtitle1">{formatCurrency((sale.subTotal * sale.tax) / 100)}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="subtitle1">Discount:</Typography>
                <Typography variant="subtitle1">- {formatCurrency(sale.discount || 0)}</Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6">{formatCurrency(sale.total)}</Typography>
              </Box>
              
              {sale.paymentStatus === 'Partial' && (
                <>
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">Amount Paid:</Typography>
                    <Typography variant="subtitle1">{formatCurrency(sale.amountPaid)}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="subtitle1">Balance Due:</Typography>
                    <Typography variant="subtitle1" color="error">
                      {formatCurrency(sale.total - sale.amountPaid)}
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
          
          {/* Product Table */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Products Sold
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sr</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Purity</TableCell>
                    <TableCell>HUID</TableCell>
                    <TableCell>HSN</TableCell>
                    <TableCell align="right">PCS</TableCell>
                    <TableCell align="right">Gross Weight</TableCell>
                    <TableCell align="right">Net Weight</TableCell>
                    <TableCell align="right">Rate/Gms</TableCell>
                    <TableCell align="right">Making</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sale.items.map((item, index) => {
                    // Get the complete product details if available
                    const fullProductDetails = item.isCustomItem ? null : 
                      (productDetails[item.product?._id] || item.product);
                    
                    // Get weights
                    const grossWeight = item.isCustomItem
                      ? item.customProductDetails?.grossWeight || item.customProductDetails?.netWeight || 0
                      : fullProductDetails?.grossWeight || item.weight || 0;
                      
                    const netWeight = item.isCustomItem
                      ? item.customProductDetails?.netWeight || 0
                      : fullProductDetails?.netWeight || item.weight || 0;
                      
                    const weightType = item.isCustomItem
                      ? item.customProductDetails?.weightType || 'g'
                      : fullProductDetails?.weightType || 'g';
                    
                    // Calculate making charges in rupees
                    const makingChargesPercent = item.isCustomItem
                      ? (item.customProductDetails?.makingCharges || item.makingCharges || sale.makingChargesPercentage || 0)
                      : (fullProductDetails?.makingCharges || item.makingCharges || sale.makingChargesPercentage || 0);
                      
                    const rate = item.rate || 0;
                    const metalValue = netWeight * rate;
                    const makingCharge = (metalValue * makingChargesPercent / 100);
                    
                    // Calculate the subtotal (metalValue + makingCharges) which will be displayed as the Amount
                    const itemSubtotal = metalValue + makingCharge;
                    
                    const purity = item.isCustomItem
                      ? item.customProductDetails?.purity || item._displayProduct?.purity || '-'
                      : fullProductDetails?.purity || item.purity || '-';
                    const category = item.isCustomItem
                      ? item.customProductDetails?.category || ''
                      : fullProductDetails?.category || '';
                    const isPurity22K = purity === '22K';
                    const isGoldItem = category.includes('Gold');
                    
                    // Get correct HUID from product
                    const huid = item.isCustomItem 
                      ? (item.customProductDetails?.huid || '-')
                      : (fullProductDetails?.huidNumber || '-');
                    
                    // Set HSN code based on purity and category
                    const hsnCode = (isPurity22K && isGoldItem) ? '7113' : '';
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {item.isCustomItem 
                            ? item.customProductDetails.name
                            : fullProductDetails?.name || 'Product Not Found'}
                          <Typography variant="caption" display="block" color="text.secondary">
                            {category || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{purity}</TableCell>
                        <TableCell>{huid}</TableCell>
                        <TableCell>{hsnCode || '-'}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{`${grossWeight} ${weightType}`}</TableCell>
                        <TableCell align="right">{`${netWeight} ${weightType}`}</TableCell>
                        <TableCell align="right">{formatCurrency(rate)}</TableCell>
                        <TableCell align="right">{formatCurrency(makingCharge)}</TableCell>
                        <TableCell align="right">{formatCurrency(itemSubtotal)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Box>

      {/* Edit Sale Form */}
      {openEditForm && (
        <FormDialog
          open={openEditForm}
          onClose={() => setOpenEditForm(false)}
          title="Edit Sale"
          onSubmit={handleFormSubmit}
          loading={formSubmitting}
          submitLabel="Update"
          maxWidth="lg"
          fullWidth
        >
          <SaleForm
            initialData={sale}
            loading={formSubmitting}
            onFormDataChange={handleFormDataChange}
          />
        </FormDialog>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <FormDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="Delete Sale"
          subtitle="Are you sure you want to delete this sale? This action cannot be undone."
          onSubmit={confirmDeleteSale}
          loading={formSubmitting}
          submitLabel="Delete"
          maxWidth="xs"
        >
          <Box sx={{ py: 1 }}>
            <strong>Invoice #:</strong> {sale.invoiceNumber}
            <br />
            <strong>Customer:</strong> {formatValue(sale.customer?.name)}
            <br />
            <strong>Date:</strong> {formatDate(sale.createdAt)}
            <br />
            <strong>Total:</strong> {formatCurrency(sale.total)}
          </Box>
        </FormDialog>
      )}

      {/* Bill Print Dialog */}
      <PrintBill 
        open={printBillOpen} 
        onClose={() => {
          setPrintBillOpen(false);
          setIsPrintMode(false);
          setIsPdfMode(false);
        }} 
        directPrint={isPrintMode}
        generatePdf={isPdfMode}
        billData={sale ? {
          invoiceNumber: sale.invoiceNumber,
          date: sale.createdAt,
          customer: sale.customer,
          items: sale.items.map(item => {
            // Get the complete product details if available
            const fullProductDetails = item.isCustomItem ? null : 
              (productDetails[item.product?._id] || item.product);
              
            // Calculate making charges in rupees
            const netWeight = item.isCustomItem
              ? item.customProductDetails?.netWeight || 0
              : fullProductDetails?.netWeight || item.weight || 0;
            
            const makingChargesPercent = item.isCustomItem
              ? (item.customProductDetails?.makingCharges || item.makingCharges || sale.makingChargesPercentage || 0)
              : (fullProductDetails?.makingCharges || item.makingCharges || sale.makingChargesPercentage || 0);
            
            const rate = item.rate || 0;
            const metalValue = netWeight * rate;
            const makingCharge = (metalValue * makingChargesPercent / 100);
            
            const purity = item.isCustomItem
              ? item.customProductDetails?.purity || item._displayProduct?.purity || '-'
              : fullProductDetails?.purity || item.purity || '-';
            const category = item.isCustomItem
              ? item.customProductDetails?.category || ''
              : fullProductDetails?.category || '';
            const isPurity22K = purity === '22K';
            const isGoldItem = category.includes('Gold');
            const hsnCode = (isPurity22K && isGoldItem) ? '7113' : '';
            
            // Get correct HUID value
            const huid = item.isCustomItem 
              ? (item.customProductDetails?.huid || '')
              : (fullProductDetails?.huidNumber || '');
            
            return {
              description: item.isCustomItem 
                ? item.customProductDetails.name 
                : fullProductDetails?.name || 'Product',
              category: category,
              purity: purity,
              grossWeight: item.isCustomItem
                ? item.customProductDetails?.grossWeight || item.weight
                : fullProductDetails?.grossWeight || item.weight,
              netWeight: netWeight,
              weight: netWeight,
              rate: rate,
              makingCharge: makingCharge,
              total: metalValue + makingCharge,
              hsnCode: hsnCode,
              huid: huid
            };
          }),
          subTotal: sale.subTotal,
          taxRate: sale.tax,
          tax: (sale.subTotal * sale.tax / 100),
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          amountInWords: convertToWords(sale.total)
        } : null}
      />
    </>
  );
};

export default SaleDetail; 
