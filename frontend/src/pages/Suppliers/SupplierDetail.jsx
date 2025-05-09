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
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import api from '../../services/api';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-toastify';

const SupplierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplierPurchase, setSupplierPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const receiptRef = React.useRef(null);

  useEffect(() => {
    const fetchSupplierPurchase = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/suppliers/${id}`);
        setSupplierPurchase(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching supplier purchase:', err);
        setError('Failed to load supplier purchase details');
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierPurchase();
  }, [id]);

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Supplier_Purchase_Receipt_${supplierPurchase?.purchaseNumber}`,
  });

  // Generate PDF for supplier purchase
  const generatePDF = (shouldPrint = false) => {
    if (!supplierPurchase) return;

    try {
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Leave space at top for pre-printed business info
      const startY = 40; // Start lower to leave space for pre-printed header
      
      // Supplier and purchase details section - two columns
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      // Left column - Supplier
      doc.text('Supplier:', 14, startY);
      doc.text('Address:', 14, startY + 5);
      doc.text('State:', 14, startY + 10);
      doc.text('GSTIN:', 14, startY + 15);
      
      doc.setFont('helvetica', 'normal');
      doc.text(formatValue(supplierPurchase.supplier?.name), 40, startY);
      doc.text(formatValue(supplierPurchase.supplier?.address, 'Maharashtra'), 40, startY + 5);
      doc.text('Maharashtra', 40, startY + 10);
      doc.text(formatValue(supplierPurchase.supplier?.gstin, ''), 40, startY + 15);
      
      // Right column - Purchase details
      doc.setFont('helvetica', 'bold');
      doc.text('Purchase No.:', pageWidth - 90, startY);
      doc.text('Date:', pageWidth - 90, startY + 5);
      
      if (supplierPurchase.invoiceNumber) {
        doc.text('Invoice No.:', pageWidth - 90, startY + 10);
      }
      
      doc.setFont('helvetica', 'normal');
      doc.text(formatValue(supplierPurchase.purchaseNumber), pageWidth - 55, startY);
      doc.text(supplierPurchase.purchaseDate ? format(new Date(supplierPurchase.purchaseDate), 'dd/MM/yyyy') : '-', pageWidth - 55, startY + 5);
      
      if (supplierPurchase.invoiceNumber) {
        doc.text(formatValue(supplierPurchase.invoiceNumber), pageWidth - 55, startY + 10);
      }
      
      // Item list headers
      let currentY = startY + 25;
      doc.setFont('helvetica', 'bold');
      doc.text('Sr', 14, currentY);
      doc.text('Description', 25, currentY);
      doc.text('HUID', 100, currentY);
      doc.text('HSN', 130, currentY);
      doc.text('PCS', 150, currentY);
      doc.text('Gross Weight', 165, currentY);
      doc.text('Net Weight', 195, currentY);
      doc.text('Rate / Gms', 225, currentY);
      doc.text('Making Charges', 255, currentY);
      doc.text('Amount', 290, currentY);
      
      currentY += 5;
      doc.setLineWidth(0.1);
      doc.line(14, currentY, pageWidth - 14, currentY);
      currentY += 5;
      
      // Items listing - print each item directly
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      // Total weight calculations
      let totalGrossWeight = 0;
      let totalNetWeight = 0;
      
      supplierPurchase.items?.forEach((item, index) => {
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
        const ratePerUnit = parseFloat(formatValue(item.ratePerUnit, 0));
        const makingCharges = parseFloat(formatValue(item.makingCharges || 0, 0));
        const totalAmount = parseFloat(formatValue(item.totalAmount, 0));
        
        // Add to totals
        totalGrossWeight += grossWeight;
        totalNetWeight += netWeight;
        
        // Print item details in exact format requested
        doc.text(`${index + 1}`, 14, currentY);
        doc.text(description, 25, currentY);
        doc.text(huid, 100, currentY);
        doc.text(hsn, 130, currentY);
        doc.text(`${quantity}`, 150, currentY);
        doc.text(`${grossWeight.toFixed(3)} GRM`, 165, currentY);
        doc.text(`${netWeight.toFixed(3)} GRM`, 195, currentY);
        doc.text(`${Number(ratePerUnit).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 225, currentY);
        doc.text(`${Number(makingCharges).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 255, currentY);
        doc.text(`${Number(totalAmount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 290, currentY);
        
        currentY += 8; // Move to next item
      });
      
      // Draw line after items
      currentY += 2;
      doc.line(14, currentY, pageWidth - 14, currentY);
      currentY += 7;
      
      // Print total weights
      const finalY = currentY;
      doc.setFontSize(9);
      doc.text(`Total Gross Weight: ${totalGrossWeight.toFixed(3)} ${supplierPurchase.items?.[0]?.weightType || 'g'}`, 14, finalY);
      doc.text(`Total Net Weight: ${totalNetWeight.toFixed(3)} ${supplierPurchase.items?.[0]?.weightType || 'g'}`, 14, finalY + 6);
      
      // Payment details
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Summary', pageWidth - 90, finalY);
      
      doc.setFont('helvetica', 'normal');
      doc.text('Payment Method:', pageWidth - 90, finalY + 6);
      doc.text(formatValue(supplierPurchase.paymentMethod, 'Cash'), pageWidth - 20, finalY + 6, { align: 'right' });
      
      doc.text('Payment Status:', pageWidth - 90, finalY + 12);
      doc.text(formatValue(supplierPurchase.paymentStatus, 'Paid'), pageWidth - 20, finalY + 12, { align: 'right' });
      
      if (supplierPurchase.paymentStatus === 'Partial') {
        doc.text('Amount Paid:', pageWidth - 90, finalY + 18);
        doc.text(`₹${formatValue(supplierPurchase.amountPaid, 0).toLocaleString()}`, pageWidth - 20, finalY + 18, { align: 'right' });
        
        doc.text('Balance Due:', pageWidth - 90, finalY + 24);
        const balanceDue = supplierPurchase.totalAmount - supplierPurchase.amountPaid;
        doc.text(`₹${balanceDue.toLocaleString()}`, pageWidth - 20, finalY + 24, { align: 'right' });
      }
      
      doc.setLineWidth(0.2);
      doc.line(pageWidth - 90, finalY + 26, pageWidth - 14, finalY + 26);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Total Amount:', pageWidth - 90, finalY + 32);
      doc.text(`₹${formatValue(supplierPurchase.totalAmount, 0).toLocaleString()}`, pageWidth - 20, finalY + 32, { align: 'right' });
      
      // Amount in words
      doc.setFont('helvetica', 'bold');
      doc.text('Amount in Words:', 14, finalY + 40);
      doc.setFont('helvetica', 'normal');
      
      // Convert amount to words
      const amountInWords = convertToWords(supplierPurchase.totalAmount || 0);
      doc.text(`INR ${amountInWords} Only`, 14, finalY + 46);
      
      // GSTIN and certification
      doc.setFontSize(8);
      doc.text('GSTIN: 27XXXXXXXXXXXZH', 14, finalY + 60);
      doc.text('Certified that the particulars given above are true and correct', 14, finalY + 65);

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
          doc.save(`Supplier_Purchase_${supplierPurchase.purchaseNumber || 'Receipt'}.pdf`);
        }
      } else {
        // Save PDF with purchase number as filename
        doc.save(`Supplier_Purchase_${supplierPurchase.purchaseNumber || 'Receipt'}.pdf`);
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
          onClick={() => navigate('/suppliers')}
          sx={{ mt: 2 }}
        >
          Back to Suppliers
        </Button>
      </Box>
    );
  }

  if (!supplierPurchase) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="warning">Supplier purchase not found</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/suppliers')}
          sx={{ mt: 2 }}
        >
          Back to Suppliers
        </Button>
      </Box>
    );
  }

  return (
    <>
      <PageHeader 
        title="Supplier Purchase Details" 
        subtitle={`Purchase #${supplierPurchase.purchaseNumber}`}
        breadcrumbs={[
          { label: 'Suppliers', link: '/suppliers' },
          { label: supplierPurchase.purchaseNumber },
        ]}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/suppliers')}
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
        {/* Supplier Information */}
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1 }} /> Supplier Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Name:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {supplierPurchase.supplier?.name || 'N/A'}
              </Typography>
            </Box>
            
            {supplierPurchase.supplier?.contact && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Contact:
                </Typography>
                <Typography variant="body1">
                  {supplierPurchase.supplier.contact}
                </Typography>
              </Box>
            )}
            
            {supplierPurchase.supplier?.address && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Address:
                </Typography>
                <Typography variant="body1">
                  {supplierPurchase.supplier.address}
                </Typography>
              </Box>
            )}

            {supplierPurchase.invoiceNumber && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Invoice Number:
                </Typography>
                <Typography variant="body1">
                  {supplierPurchase.invoiceNumber}
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
                  {supplierPurchase.purchaseNumber}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Date:
                </Typography>
                <Typography variant="body1">
                  {format(new Date(supplierPurchase.purchaseDate), 'dd/MM/yyyy')}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Payment Status:
                </Typography>
                <Chip 
                  label={supplierPurchase.paymentStatus}
                  color={
                    supplierPurchase.paymentStatus === 'Paid' ? 'success' :
                    supplierPurchase.paymentStatus === 'Partial' ? 'warning' : 'error'
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
                  {supplierPurchase.paymentMethod}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Amount Paid:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  ₹{supplierPurchase.amountPaid?.toLocaleString() || '0'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Amount:
                </Typography>
                <Typography variant="body1" fontWeight="bold" color="primary.main">
                  ₹{supplierPurchase.totalAmount?.toLocaleString() || '0'}
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
                  {supplierPurchase.items?.map((item, index) => (
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
                      ₹{supplierPurchase.totalAmount?.toLocaleString() || '0'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        {/* Notes */}
        {supplierPurchase.notes && (
          <Grid item xs={12}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Notes
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1">
                {supplierPurchase.notes}
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
                Supplier Purchase Receipt
              </Typography>
              <Typography variant="body2">
                Receipt #: {supplierPurchase.purchaseNumber}
              </Typography>
              {supplierPurchase.invoiceNumber && (
                <Typography variant="body2">
                  Invoice #: {supplierPurchase.invoiceNumber}
                </Typography>
              )}
              <Typography variant="body2">
                Date: {format(new Date(supplierPurchase.purchaseDate), 'dd/MM/yyyy')}
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
                  {supplierPurchase.supplier?.name || 'N/A'}
                </Typography>
              </Grid>
              
              {supplierPurchase.supplier?.contact && (
                <>
                  <Grid item xs={3}>
                    <Typography variant="body2" fontWeight="bold">
                      Contact:
                    </Typography>
                  </Grid>
                  <Grid item xs={9}>
                    <Typography variant="body2">
                      {supplierPurchase.supplier.contact}
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
                  {supplierPurchase.items?.map((item, index) => (
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
                    ₹{supplierPurchase.totalAmount?.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Payment Status:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    {supplierPurchase.paymentStatus}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Payment Method:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    {supplierPurchase.paymentMethod}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
          
          {supplierPurchase.notes && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Notes:
              </Typography>
              <Typography variant="body2">
                {supplierPurchase.notes}
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

export default SupplierDetail; 