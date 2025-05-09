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

  // Generate PDF invoice
  const generatePDF = (shouldPrint = false) => {
    if (!sale) return;

    try {
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Shop information at the top
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('MG Potdar Jewellers', pageWidth / 2, 10, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('123 Jewelry Lane, Market Area, Pune, Maharashtra - 411001', pageWidth / 2, 15, { align: 'center' });
      doc.text('Phone: +91 9876543210 | Email: contact@mgpotdarjewellers.com', pageWidth / 2, 19, { align: 'center' });
      
      // Customer and invoice details section - two columns
      const startY = 30;
      
      // Left column - Customer
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Customer     :', 14, startY);
      doc.text('Address      :', 14, startY + 5);
      doc.text('State        :', 14, startY + 10);
      doc.text('GSTIN        :', 14, startY + 15);
      
      doc.setFont('helvetica', 'normal');
      doc.text(formatValue(sale.customer?.name).toUpperCase(), 50, startY);
      doc.text(formatValue(sale.customer?.address, ''), 50, startY + 5);
      doc.text('Maharashtra', 50, startY + 10);
      doc.text(formatValue(sale.customer?.gstin, ''), 50, startY + 15);
      
      // Right column - Tax Invoice
      doc.setFont('helvetica', 'bold');
      doc.text('Tax Invoice', pageWidth - 60, startY);
      doc.text('Bill No.     :', pageWidth - 90, startY + 5);
      doc.text('Bill Date    :', pageWidth - 90, startY + 10);
      doc.text('Reference    :', pageWidth - 90, startY + 15);
      
      doc.setFont('helvetica', 'normal');
      
      // Format date like "28-Apr-25"
      let dateText = '-';
      if (sale.createdAt) {
        const dateObj = new Date(sale.createdAt);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = dateObj.toLocaleString('en-US', { month: 'short' });
        const year = dateObj.getFullYear().toString().slice(2);
        dateText = `${day}-${month}-${year}`;
      }
      
      doc.text(formatValue(sale.invoiceNumber), pageWidth - 60, startY + 5);
      doc.text(dateText, pageWidth - 60, startY + 10);
      doc.text(formatValue(sale.reference, ''), pageWidth - 60, startY + 15);
      
      // Draw table line
      const lineY = startY + 22;
      doc.setLineWidth(0.1);
      doc.line(14, lineY, pageWidth - 14, lineY);
      
      // Item list headers - match exact format from example
      let headerY = lineY + 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      
      // Table headers
      doc.text('Sr', 14, headerY);
      doc.text('Description', 25, headerY);
      doc.text('HUID', 90, headerY);
      doc.text('HSN', 110, headerY);
      doc.text('PCS', 125, headerY);
      doc.text('Gross Weight', 140, headerY);
      doc.text('Net Weight', 170, headerY);
      doc.text('Rate / Gms', 195, headerY);
      doc.text('Making', 225, headerY);
      doc.text('Amount', 250, headerY);
      
      // Draw line after headers
      doc.line(14, headerY + 2, pageWidth - 14, headerY + 2);
      
      // Items listing - print each item directly
      let currentY = headerY + 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      // Total weight calculations and price calculations
      let totalGrossWeight = 0;
      let totalNetWeight = 0;
      let totalMetalPrice = 0;
      let totalMakingCharges = 0;
      let totalItemsPrice = 0;
      
      sale.items.forEach((item, index) => {
        const itemName = item.isCustomItem 
          ? formatValue(item.customProductDetails.name)
          : formatValue(item.product?.name, 'Product');
        
        const purity = item.isCustomItem 
          ? formatValue(item.customProductDetails.purity, '22K').replace('K', ' CT') 
          : formatValue(item.product?.purity, '22K').replace('K', ' CT');
        
        // Format description like "GOLD TOPS (22 CT) 916"
        const description = `${itemName.toUpperCase()} (${purity}) 916`;
        
        // Use HUID from the item or product
        const huid = formatValue(item.huid, formatValue(item.product?.huid, 'NILL'));
        const hsnCode = (item.isCustomItem && item.customProductDetails?.purity === '22K' && item.customProductDetails?.category?.includes('Gold')) ? '7113' : '';
        
        const grossWeight = item.isCustomItem 
          ? parseFloat(formatValue(item.customProductDetails.grossWeight || item.customProductDetails.netWeight, 0))
          : parseFloat(formatValue(item.grossWeight || item.weight, 0));
          
        const netWeight = item.isCustomItem 
          ? parseFloat(formatValue(item.customProductDetails.netWeight, 0))
          : parseFloat(formatValue(item.netWeight || item.weight, 0));
          
        const quantity = formatValue(item.quantity, 1);
        
        // Get rate per gram - this is the daily gold/silver rate from rates section based on purity
        const rate = parseFloat(formatValue(item.rate, 0));
        
        // Calculate metal value
        const metalValue = rate * netWeight;
        
        // Get making charges percentage - typically stored in product.makingCharges as a percentage
        const makingChargesPercentage = item.isCustomItem 
          ? (item.customProductDetails?.makingCharges || 0)
          : (item.product?.makingCharges || item.makingCharges || 0);
        
        // Calculate making charges amount from percentage (e.g., 15% of metal value)
        const makingCharges = (metalValue * makingChargesPercentage / 100);
        
        // Calculate total as metal value + making charges
        const itemTotal = metalValue + makingCharges;
        
        // Add to totals
        totalGrossWeight += grossWeight;
        totalNetWeight += netWeight;
        totalMetalPrice += metalValue;
        totalMakingCharges += makingCharges;
        totalItemsPrice += itemTotal;
        
        // Print item details in exact format requested
        doc.text(`${index + 1}`, 14, currentY);
        doc.text(description, 25, currentY);
        doc.text(huid, 90, currentY);
        doc.text(hsnCode, 110, currentY);
        doc.text(`${quantity}`, 125, currentY);
        doc.text(`${grossWeight.toFixed(3)} GRM`, 140, currentY);
        doc.text(`${netWeight.toFixed(3)} GRM`, 170, currentY);
        doc.text(`${Number(rate).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 195, currentY);
        doc.text(`${Number(makingCharges).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 225, currentY);
        doc.text(`${Number(itemTotal).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 250, currentY);
        
        currentY += 7; // Move to next item
      });
      
      // Draw line after items
      const bottomLineY = currentY + 2;
      doc.line(14, bottomLineY, pageWidth - 14, bottomLineY);
      
      // Calculate tax and totals
      const subTotal = totalItemsPrice;
      const taxRate = sale.tax || 3; // Default to 3% if not specified  
      const cgst = (subTotal * (taxRate / 2)) / 100;
      const sgst = (subTotal * (taxRate / 2)) / 100;
      // Use absolute discount amount
      const discount = sale.discount || 0;
      const roundOff = Math.round((subTotal + cgst + sgst - discount) * 100) / 100 - Math.floor((subTotal + cgst + sgst - discount) * 100) / 100;
      const grandTotal = subTotal + cgst + sgst - discount + roundOff;
      
      // Total amount on the right side
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`₹ ${subTotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 250, currentY + 10);
      
      // Tax summary on right side
      const taxY = currentY + 15;
      doc.setFont('helvetica', 'normal');
      doc.text('CGST', 225, taxY);
      doc.text(`₹ ${cgst.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 250, taxY);
      
      doc.text('SGST', 225, taxY + 5);
      doc.text(`₹ ${sgst.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 250, taxY + 5);
      
      doc.text('ROUND OFF', 225, taxY + 10);
      doc.text(`₹ ${roundOff.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 250, taxY + 10);
      
      if (sale.discount) {
        doc.text('DISCOUNT', 225, taxY + 15);
        doc.text(`(-) ₹ ${discount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 250, taxY + 15);
      }
      
      // Draw line for grand total
      doc.line(225, taxY + 17, 265, taxY + 17);
      
      // Grand Total
      doc.setFont('helvetica', 'bold');
      doc.text('Grand Total', 225, taxY + 22);
      doc.text(`₹ ${grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 250, taxY + 22);
      
      // Amount in words
      const wordsY = taxY + 35;
      doc.setFont('helvetica', 'bold');
      doc.text('In Words: ', 14, wordsY);
      
      // Convert amount to words
      const amountInWords = convertToWords(grandTotal);
      doc.setFont('helvetica', 'normal');
      doc.text(`INR ${amountInWords} Only`, 40, wordsY);
      
      // Notes section
      if (sale.notes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Note:', 14, wordsY + 10);
        doc.setFont('helvetica', 'normal');
        doc.text(sale.notes, 14, wordsY + 15);
      }
      
      // GSTIN and certification
      doc.text('GSTIN : 27BAQPK8257A1ZH', 14, wordsY + 25);
      doc.text('Certified that the particulars given above are true and correct', 14, wordsY + 30);
      
      // Store information at bottom
      doc.setFontSize(8);
      doc.text('For MG Potdar Jewellers', pageWidth - 40, wordsY + 30);
      doc.line(pageWidth - 60, wordsY + 35, pageWidth - 20, wordsY + 35);
      doc.text('Authorized Signatory', pageWidth - 40, wordsY + 40, { align: 'center' });
      
      // Footer
      const footerY = wordsY + 50;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for your business! Visit us again.', pageWidth / 2, footerY, { align: 'center' });
      doc.text('For any queries, please contact: +91 9876543210 or email: contact@mgpotdarjewellers.com', pageWidth / 2, footerY + 4, { align: 'center' });
      
      // If shouldPrint is true, open and print PDF, otherwise just save it
      if (shouldPrint) {
        // Generate blob from PDF document
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        
        // Open PDF in new tab
        const printWindow = window.open(blobUrl, '_blank');
        
        // Once PDF is loaded, trigger print
        if (printWindow) {
          printWindow.addEventListener('load', () => {
            printWindow.print();
          });
          toast.success('PDF opened for printing!');
        } else {
          // If pop-up is blocked, show message to user
          toast.warning('Please allow pop-ups to print the invoice');
          // Fallback to download
          doc.save(`Invoice_${sale.invoiceNumber || 'Sale'}.pdf`);
        }
      } else {
        // Save PDF with invoice number as filename (original behavior)
        doc.save(`Invoice_${sale.invoiceNumber || 'Sale'}.pdf`);
        toast.success('Invoice PDF generated successfully!');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF invoice');
    }
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
    const subTotal = data.subTotal || 0;
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
      <PageHeader
        title="Sale Details"
        breadcrumbs={[
          { label: 'Sales', link: '/sales' },
          { label: sale.invoiceNumber },
        ]}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/sales')}
          >
            Back
          </Button>
          <Button
            variant="outlined"
            color="secondary"
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
            onClick={() => generatePDF()}
          >
            Download PDF
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={() => generatePDF(true)}
          >
            Print PDF
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
              <Typography variant="subtitle1">Subtotal:</Typography>
              <Typography variant="subtitle1">{formatCurrency(sale.subTotal)}</Typography>
            </Box>
            
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
                  // Determine if item is 22K gold for HSN code
                  const isPurity22K = item.isCustomItem 
                    ? item.customProductDetails?.purity === '22K'
                    : item.product?.purity === '22K';
                    
                  const isGoldItem = item.isCustomItem
                    ? item.customProductDetails?.category?.includes('Gold')
                    : item.product?.category?.includes('Gold');
                    
                  const hsnCode = (isGoldItem && isPurity22K) ? '7113' : '';
                  
                  // Get HUID if available
                  const huid = item.isCustomItem 
                    ? (item.customProductDetails?.huid || '-')
                    : (item.product?.huidNumber || '-');
                  
                  // Get weights
                  const grossWeight = item.isCustomItem
                    ? item.customProductDetails?.grossWeight || item.customProductDetails?.netWeight || 0
                    : item.product?.grossWeight || item.weight || 0;
                    
                  const netWeight = item.isCustomItem
                    ? item.customProductDetails?.netWeight || 0
                    : item.product?.netWeight || item.weight || 0;
                    
                  const weightType = item.isCustomItem
                    ? item.customProductDetails?.weightType || 'g'
                    : item.product?.weightType || 'g';
                  
                  // Calculate making charges in rupees
                  const makingChargesPercent = item.isCustomItem
                    ? (item.customProductDetails?.makingCharges || 0)
                    : (item.product?.makingCharges || item.makingCharges || 0);
                    
                  const rate = item.rate || 0;
                  const metalValue = netWeight * rate;
                  const makingChargesAmount = (metalValue * makingChargesPercent / 100);
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {item.isCustomItem 
                          ? item.customProductDetails.name
                          : item.product?.name || 'Product Not Found'}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {item.isCustomItem 
                            ? item.customProductDetails.category 
                            : item.product?.category || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{huid}</TableCell>
                      <TableCell>{hsnCode}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{`${grossWeight} ${weightType}`}</TableCell>
                      <TableCell align="right">{`${netWeight} ${weightType}`}</TableCell>
                      <TableCell align="right">{formatCurrency(rate)}</TableCell>
                      <TableCell align="right">{formatCurrency(makingChargesAmount)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

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
    </>
  );
};

export default SaleDetail; 