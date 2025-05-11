import React from 'react';
import { Box, Typography, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { format } from 'date-fns';

// Function to convert number to words
const convertToWords = (amount) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  // Round to 2 decimal places
  const numString = amount.toFixed(2);
  const [rupees, paise] = numString.split('.');
  
  const convertGroup = (num) => {
    if (num === 0) return '';
    else if (num < 20) return ones[num];
    else return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  }
  
  const convertNumber = (num) => {
    if (num === 0) return 'Zero';
    
    // Handle lakhs, thousands, hundreds
    const lakh = Math.floor(num / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const hundred = Math.floor((num % 1000) / 100);
    const remainder = num % 100;
    
    let words = '';
    
    if (lakh > 0) {
      words += (lakh < 20 ? ones[lakh] : tens[Math.floor(lakh / 10)] + (lakh % 10 ? ' ' + ones[lakh % 10] : '')) + ' Lakh ';
    }
    
    if (thousand > 0) {
      words += (thousand < 20 ? ones[thousand] : tens[Math.floor(thousand / 10)] + (thousand % 10 ? ' ' + ones[thousand % 10] : '')) + ' Thousand ';
    }
    
    if (hundred > 0) {
      words += ones[hundred] + ' Hundred ';
    }
    
    if (remainder > 0) {
      if (words !== '') words += 'and ';
      words += (remainder < 20 ? ones[remainder] : tens[Math.floor(remainder / 10)] + (remainder % 10 ? ' ' + ones[remainder % 10] : ''));
    }
    
    return words;
  }
  
  let result = convertNumber(parseInt(rupees));
  
  if (parseInt(paise) > 0) {
    result += ' Rupees and ' + convertNumber(parseInt(paise)) + ' Paise';
  } else {
    result += ' Rupees Only';
  }
  
  return result;
};

const BillPrintTemplate = ({ billData }) => {
  // Bill dimensions in mm
  // Total height: 158.75mm (6.25 inches)
  // Total width: 209.55mm (8.25 inches)
  // Top preprinted area: 39mm (3.9cm)
  // Content area height: 100mm (10cm)
  // Bottom preprinted area: ~19.75mm

  return (
    <Box 
      sx={{
        width: '209.55mm',
        height: '158.75mm',
        position: 'relative',
        backgroundColor: '#fff',
        color: '#000',
        "@media print": {
          padding: 0,
          margin: 0
        }
      }}
    >
      {/* Content Area (starts after 39mm from top) */}
      <Box 
        sx={{
          position: 'absolute',
          top: '39mm',
          width: '100%',
          height: '100mm',
          padding: '3mm 5mm',
          boxSizing: 'border-box',
          fontFamily: 'Arial, sans-serif',
          fontSize: '10pt',
          backgroundColor: 'white',
          color: '#000'
        }}
      >
        {/* Bill Header - Invoice Number and Date */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
          <Box>
            <Typography variant="body2" component="span" sx={{ fontSize: '10pt', fontWeight: 'bold', color: '#000' }}>
              Bill No:
            </Typography>{' '}
            <Typography variant="body2" component="span" sx={{ fontSize: '10pt', color: '#000' }}>
              {billData?.invoiceNumber || 'INV-XXXXXX'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" component="span" sx={{ fontSize: '10pt', fontWeight: 'bold', color: '#000' }}>
              Date:
            </Typography>{' '}
            <Typography variant="body2" component="span" sx={{ fontSize: '10pt', color: '#000' }}>
              {billData?.date ? format(new Date(billData.date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}
            </Typography>
          </Box>
        </Box>

        {/* Customer Information */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" component="span" sx={{ fontSize: '10pt', fontWeight: 'bold', color: '#000' }}>
            Customer:
          </Typography>{' '}
          <Typography variant="body2" component="span" sx={{ fontSize: '10pt', color: '#000' }}>
            {billData?.customer?.name || 'Customer Name'},
            {billData?.customer?.phone ? ` Ph: ${billData.customer.phone}` : ''}
          </Typography>
        </Box>

        {/* Items Table - Compact styling for proper fit */}
        <TableContainer component={Paper} sx={{ mb: 1.5, boxShadow: 'none', border: 'none', backgroundColor: 'white' }}>
          <Table size="small" sx={{ 
            backgroundColor: 'white',
            '& .MuiTableCell-root': { 
              padding: '2px 4px',
              fontSize: '9pt',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              color: '#000',
              height: 'auto'
            },
            '& .MuiTableCell-head': {
              fontWeight: 'bold',
              backgroundColor: 'white',
              color: '#000',
              verticalAlign: 'middle'
            }
          }}>
            <TableHead>
              <TableRow>
                <TableCell align="center" width="4%">Sr.</TableCell>
                <TableCell width="22%" sx={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>Particulars</TableCell>
                <TableCell align="center" width="9%">HUID</TableCell>
                <TableCell align="center" width="6%">HSN</TableCell>
                <TableCell align="center" width="5%">PCS</TableCell>
                <TableCell align="center" width="8%">Gross Wt.</TableCell>
                <TableCell align="center" width="8%">Net Wt.</TableCell>
                <TableCell align="right" width="10%">Rate</TableCell>
                <TableCell align="right" width="10%">Making</TableCell>
                <TableCell align="right" width="12%">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {billData?.items?.map((item, index) => {
                // Calculate making charge (assuming 10% if not provided)
                const makingChargePercentage = 10;
                const baseAmount = item.rate * item.weight;
                const makingCharge = item.makingCharge || (baseAmount * makingChargePercentage / 100);
                // Calculate total amount (baseAmount + makingCharge)
                const totalAmount = baseAmount + makingCharge;
                
                return (
                  <TableRow key={index}>
                    <TableCell align="center">{index + 1}</TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>
                      {item.description || `${item.category || ''} ${item.purity || ''}`}
                    </TableCell>
                    <TableCell align="center">
                      {item.huid || (item.product?.huidNumber) || '-'}
                    </TableCell>
                    <TableCell align="center">
                      {(item.category?.toLowerCase().includes('gold') && item.purity === '22K') ? '7113' : ''}
                    </TableCell>
                    <TableCell align="center">{item.quantity || 1}</TableCell>
                    <TableCell align="center">{item.grossWeight ? `${item.grossWeight}g` : '-'}</TableCell>
                    <TableCell align="center">{item.weight ? `${item.weight}g` : '-'}</TableCell>
                    <TableCell align="right">₹{item.rate?.toLocaleString() || '-'}</TableCell>
                    <TableCell align="right">₹{makingCharge?.toLocaleString() || '-'}</TableCell>
                    <TableCell align="right">₹{totalAmount.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
              
              {/* Add empty rows to maintain table size */}
              {Array.from({ length: Math.max(0, 5 - (billData?.items?.length || 0)) }).map((_, index) => (
                <TableRow key={`empty-${index}`}>
                  <TableCell style={{ height: '18px' }}></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Calculate total values */}
        {(() => {
          // Calculate subtotal as sum of all item totals
          let calculatedSubTotal = 0;
          
          billData?.items?.forEach(item => {
            const baseAmount = item.rate * item.weight;
            const makingChargePercentage = 10;
            const makingCharge = item.makingCharge || (baseAmount * makingChargePercentage / 100);
            calculatedSubTotal += (baseAmount + makingCharge);
          });
          
          // Calculate tax
          const taxRate = billData?.taxRate || 3;
          const calculatedTax = calculatedSubTotal * (taxRate / 100);
          
          // Calculate grand total
          const calculatedGrandTotal = calculatedSubTotal + calculatedTax;
          
          return (
            <>
              {/* Total Calculation */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Box sx={{ width: '40%', border: '1px solid #ddd', backgroundColor: 'white' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.5, borderBottom: '1px solid #ddd', backgroundColor: 'white' }}>
                    <Typography variant="body2" sx={{ fontSize: '9pt', color: '#000' }}>Sub Total:</Typography>
                    <Typography variant="body2" sx={{ fontSize: '9pt', color: '#000' }}>₹{calculatedSubTotal.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.5, borderBottom: '1px solid #ddd', backgroundColor: 'white' }}>
                    <Typography variant="body2" sx={{ fontSize: '9pt', color: '#000' }}>CGST ({taxRate/2}%):</Typography>
                    <Typography variant="body2" sx={{ fontSize: '9pt', color: '#000' }}>₹{(calculatedTax/2).toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.5, borderBottom: '1px solid #ddd', backgroundColor: 'white' }}>
                    <Typography variant="body2" sx={{ fontSize: '9pt', color: '#000' }}>SGST ({taxRate/2}%):</Typography>
                    <Typography variant="body2" sx={{ fontSize: '9pt', color: '#000' }}>₹{(calculatedTax/2).toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.5, backgroundColor: 'white' }}>
                    <Typography variant="body2" sx={{ fontSize: '9pt', fontWeight: 'bold', color: '#000' }}>Grand Total:</Typography>
                    <Typography variant="body2" sx={{ fontSize: '9pt', fontWeight: 'bold', color: '#000' }}>₹{calculatedGrandTotal.toLocaleString()}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Additional Information */}
              <Box sx={{ fontSize: '9pt', mt: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '9pt', fontStyle: 'italic', color: '#000' }}>
                  Amount in words: {billData?.amountInWords || convertToWords(calculatedGrandTotal)}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '9pt', color: '#000' }}>
                    Payment Mode: {billData?.paymentMethod || 'Cash'}
                  </Typography>
                </Box>
              </Box>
            </>
          );
        })()}
      </Box>
      
      {/* GSTIN in bottom strip */}
      <Box 
        sx={{
          position: 'absolute',
          bottom: '10mm',
          width: '100%',
          textAlign: 'center',
          fontSize: '10pt',
          fontWeight: 'bold',
          color: '#000'
        }}
      >
        <Typography variant="body2" sx={{ fontSize: '10pt', color: '#000' }}>
          GSTIN: 27DGJPP9641E1ZZ
        </Typography>
      </Box>
    </Box>
  );
};

export default BillPrintTemplate; 
 
 