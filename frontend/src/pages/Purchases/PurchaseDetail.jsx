import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  Divider, 
  CircularProgress, 
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  IconButton
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Print as PrintIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  LocalOffer as TagIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import api from '../../services/api';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-toastify';

const PurchaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const receiptRef = React.useRef(null);

  useEffect(() => {
    const fetchPurchase = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/purchases/${id}`);
        setPurchase(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching purchase:', err);
        setError('Failed to load purchase details');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchase();
  }, [id]);

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Purchase_Receipt_${purchase?.purchaseNumber}`,
  });

  // Generate PDF for purchase
  const generatePDF = (shouldPrint = false) => {
    if (!purchase) return;

    try {
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Customer and invoice details section - two columns
      const startY = 25;
      
      // Left column - Vendor
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Customer     :', 14, startY);
      doc.text('Address      :', 14, startY + 5);
      doc.text('State        :', 14, startY + 10);
      doc.text('GSTIN        :', 14, startY + 15);
      
      doc.setFont('helvetica', 'normal');
      doc.text(formatValue(purchase.vendor?.name).toUpperCase(), 50, startY);
      doc.text(formatValue(purchase.vendor?.address, ''), 50, startY + 5);
      doc.text('Maharashtra', 50, startY + 10);
      doc.text(formatValue(purchase.vendor?.gstin, ''), 50, startY + 15);
      
      // Right column - Tax Invoice
      doc.setFont('helvetica', 'bold');
      doc.text('Tax Invoice', pageWidth - 60, startY);
      doc.text('Bill No.     :', pageWidth - 90, startY + 5);
      doc.text('Bill Date    :', pageWidth - 90, startY + 10);
      doc.text('Reference    :', pageWidth - 90, startY + 15);
      
      doc.setFont('helvetica', 'normal');
      doc.text(formatValue(purchase.purchaseNumber), pageWidth - 60, startY + 5);
      
      // Format date like "28-Apr-25"
      let dateText = '-';
      if (purchase.purchaseDate) {
        const dateObj = new Date(purchase.purchaseDate);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = dateObj.toLocaleString('en-US', { month: 'short' });
        const year = dateObj.getFullYear().toString().slice(2);
        dateText = `${day}-${month}-${year}`;
      }
      
      doc.text(dateText, pageWidth - 60, startY + 10);
      doc.text(formatValue(purchase.reference, ''), pageWidth - 60, startY + 15);
      
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
      
      // Total weight calculations
      let totalGrossWeight = 0;
      let totalNetWeight = 0;
      
      // Calculate totals
      const subTotal = purchase.totalAmount || 0;
      const tax = 0; // No tax for purchases
      const cgst = 0; // No CGST for purchases 
      const sgst = 0; // No SGST for purchases
      const discount = purchase.discount ? (subTotal * purchase.discount) / 100 : 0;
      const roundOff = 0; // No round off for purchases
      const grandTotal = purchase.totalAmount || 0; // Grand total is the same as subtotal
      
      purchase.items?.forEach((item, index) => {
        // Format description like "GOLD TOPS (22 CT) 916"
        const category = formatValue(item.category, 'GOLD').toUpperCase();
        const purity = formatValue(item.purity, '22K').replace('K', ' CT');
        const description = `${category} ${formatValue(item.description, 'JEWELRY').toUpperCase()} (${purity}) 916`;
        
        // Create HUID and HSN
        const huid = formatValue(item.huid, 'NILL');
        const isGoldItem = category.includes('GOLD');
        const isPurity22K = item.purity === '22K';
        const hsn = (isGoldItem && isPurity22K) ? '7113' : '';
        
        // Handle gross and net weights
        const grossWeight = parseFloat(formatValue(item.grossWeight || item.weight, 0));
        const netWeight = parseFloat(formatValue(item.netWeight || item.weight, 0));
        
        const quantity = formatValue(item.quantity, 1);
        
        // Get rate per gram - this is the daily gold/silver rate from rates section based on purity
        const ratePerUnit = parseFloat(formatValue(item.ratePerUnit, 0));
        
        // Calculate metal value
        const metalValue = ratePerUnit * netWeight;
        
        // Get making charges percentage - typically stored as a percentage
        const makingChargesPercentage = item.makingChargesPercentage || 0;
        
        // Calculate making charges amount from percentage (e.g., 15% of metal value)
        const makingCharges = (metalValue * makingChargesPercentage / 100);
        
        // Calculate total as metal value + making charges
        const totalAmount = metalValue + makingCharges;
        
        // Add to totals
        totalGrossWeight += grossWeight;
        totalNetWeight += netWeight;
        
        // Print item details in exact format requested
        doc.text(`${index + 1}`, 14, currentY);
        doc.text(description, 25, currentY);
        doc.text(huid, 90, currentY);
        doc.text(hsn, 110, currentY);
        doc.text(`${quantity}`, 125, currentY);
        doc.text(`${grossWeight.toFixed(3)} GRM`, 140, currentY);
        doc.text(`${netWeight.toFixed(3)} GRM`, 170, currentY);
        doc.text(`${Number(ratePerUnit).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 195, currentY);
        doc.text(`${Number(makingCharges).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 225, currentY);
        doc.text(`${Number(totalAmount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 250, currentY);
        
        currentY += 7; // Move to next item
      });
      
      // Draw line after items
      const bottomLineY = currentY + 2;
      doc.line(14, bottomLineY, pageWidth - 14, bottomLineY);
      
      // Total amount on the right side
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`₹ ${subTotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 250, currentY + 10);
      
      // Tax summary on right side
      const taxY = currentY + 15;
      doc.setFont('helvetica', 'normal');
      
      // Remove all tax related information for purchases
      
      // Draw line for grand total
      doc.line(225, taxY - 3, 265, taxY - 3);
      
      // Grand Total directly
      doc.setFont('helvetica', 'bold');
      doc.text('Grand Total', 225, taxY);
      doc.text(`₹ ${grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 250, taxY);
      
      // Amount in words
      const wordsY = taxY + 35;
      doc.setFont('helvetica', 'bold');
      doc.text('In Words: ', 14, wordsY);
      
      // Convert amount to words
      const amountInWords = convertToWords(purchase.totalAmount || 0);
      doc.setFont('helvetica', 'normal');
      doc.text(`INR ${amountInWords} Only`, 40, wordsY);
      
      // Notes section
      if (purchase.notes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Note:', 14, wordsY + 10);
        doc.setFont('helvetica', 'normal');
        doc.text(purchase.notes, 14, wordsY + 15);
      }
      
      // GSTIN and certification
      doc.text('GSTIN : 27BAQPK8257A1ZH', 14, wordsY + 25);
      doc.text('Certified that the particulars given above are true and correct', 14, wordsY + 30);

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
          toast.warning('Please allow pop-ups to print the PDF');
          // Fallback to download
          doc.save(`Purchase_Receipt_${purchase.purchaseNumber || 'Receipt'}.pdf`);
        }
      } else {
        // Save PDF with purchase number as filename
        doc.save(`Purchase_Receipt_${purchase.purchaseNumber || 'Receipt'}.pdf`);
        toast.success('PDF generated successfully!');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF receipt');
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/purchases')}
          sx={{ mt: 2 }}
        >
          Back to Purchases
        </Button>
      </Box>
    );
  }

  if (!purchase) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="warning">Purchase not found</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/purchases')}
          sx={{ mt: 2 }}
        >
          Back to Purchases
        </Button>
      </Box>
    );
  }

  return (
    <>
      <PageHeader 
        title="Purchase Details" 
        subtitle={`Purchase #${purchase.purchaseNumber}`}
        breadcrumbs={[
          { label: 'Purchases', link: '/purchases' },
          { label: purchase.purchaseNumber },
        ]}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/purchases')}
          >
            Back
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print Receipt
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
        {/* Customer Information */}
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1 }} /> Customer Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Name:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {purchase.vendor?.name || 'N/A'}
              </Typography>
            </Box>
            
            {purchase.vendor?.contact && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Contact:
                </Typography>
                <Typography variant="body1">
                  {purchase.vendor.contact}
                </Typography>
              </Box>
            )}
            
            {purchase.vendor?.address && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Address:
                </Typography>
                <Typography variant="body1">
                  {purchase.vendor.address}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Purchase Information */}
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <CalendarIcon sx={{ mr: 1 }} /> Purchase Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Purchase Number:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {purchase.purchaseNumber}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Date:
                </Typography>
                <Typography variant="body1">
                  {format(new Date(purchase.purchaseDate), 'dd/MM/yyyy')}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Payment Status:
                </Typography>
                <Chip 
                  label={purchase.paymentStatus}
                  color={
                    purchase.paymentStatus === 'Paid' ? 'success' :
                    purchase.paymentStatus === 'Partial' ? 'warning' : 'error'
                  }
                  size="small"
                  sx={{ fontWeight: 'medium' }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Payment Method:
                </Typography>
                <Typography variant="body1">
                  {purchase.paymentMethod}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Amount Paid:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  ₹{purchase.amountPaid?.toLocaleString() || '0'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Amount:
                </Typography>
                <Typography variant="body1" fontWeight="bold" color="primary.main">
                  ₹{purchase.totalAmount?.toLocaleString() || '0'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Purchase Items */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TagIcon sx={{ mr: 1 }} /> Purchase Items
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'primary.main', '& .MuiTableCell-root': { color: 'white' } }}>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Weight</TableCell>
                    <TableCell>Purity</TableCell>
                    <TableCell align="right">Rate</TableCell>
                    <TableCell align="center">Quantity</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchase.items?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.weight} {item.weightType}</TableCell>
                      <TableCell>{item.purity}</TableCell>
                      <TableCell align="right">₹{item.ratePerUnit?.toLocaleString()}</TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="right">₹{item.totalAmount?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Box sx={{ width: '250px' }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body1" fontWeight="bold">
                      Total:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" fontWeight="bold" align="right">
                      ₹{purchase.totalAmount?.toLocaleString() || '0'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        {/* Notes */}
        {purchase.notes && (
          <Grid item xs={12}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Notes
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1">
                {purchase.notes}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
      
      {/* Hidden Receipt for Printing */}
      <Box sx={{ display: 'none' }}>
        <Box 
          ref={receiptRef} 
          sx={{ 
            p: 4, 
            bgcolor: 'white',
            width: '210mm', // A4 width
            minHeight: '297mm', // A4 height
            '@media print': {
              width: '100%',
              height: 'auto',
            }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Purchase Receipt
              </Typography>
              <Typography variant="body2">
                Receipt #: {purchase.purchaseNumber}
              </Typography>
              <Typography variant="body2">
                Date: {format(new Date(purchase.purchaseDate), 'dd/MM/yyyy')}
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
                  {purchase.vendor?.name || 'N/A'}
                </Typography>
              </Grid>
              
              {purchase.vendor?.contact && (
                <>
                  <Grid item xs={3}>
                    <Typography variant="body2" fontWeight="bold">
                      Contact:
                    </Typography>
                  </Grid>
                  <Grid item xs={9}>
                    <Typography variant="body2">
                      {purchase.vendor.contact}
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
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Weight</TableCell>
                    <TableCell align="right">Rate</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchase.items?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {item.description}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {item.category} - {item.purity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.weight} {item.weightType}
                      </TableCell>
                      <TableCell align="right">
                        ₹{item.ratePerUnit?.toLocaleString()}/{item.weightType}
                      </TableCell>
                      <TableCell align="right">
                        {item.quantity}
                      </TableCell>
                      <TableCell align="right">
                        ₹{item.totalAmount?.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <Box sx={{ width: '250px' }}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight="bold">
                    Total Amount:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight="bold" align="right">
                    ₹{purchase.totalAmount?.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Payment Status:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    {purchase.paymentStatus}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Payment Method:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    {purchase.paymentMethod}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
          
          {purchase.notes && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Notes:
              </Typography>
              <Typography variant="body2">
                {purchase.notes}
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
      </Box>
    </>
  );
};

export default PurchaseDetail; 