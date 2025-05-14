import React, { useRef, useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Box, Typography, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper } from '@mui/material';
import { Print as PrintIcon, Close as CloseIcon } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Purchase print template component
const PurchasePrintTemplate = ({ purchaseData }) => {
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
        {/* Purchase Header - Invoice Number and Date */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
          <Box>
            <Typography variant="body2" component="span" sx={{ fontSize: '10pt', fontWeight: 'bold', color: '#000' }}>
              Purchase No:
            </Typography>{' '}
            <Typography variant="body2" component="span" sx={{ fontSize: '10pt', color: '#000' }}>
              {purchaseData?.invoiceNumber || 'PUR-XXXXXX'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" component="span" sx={{ fontSize: '10pt', fontWeight: 'bold', color: '#000' }}>
              Date:
            </Typography>{' '}
            <Typography variant="body2" component="span" sx={{ fontSize: '10pt', color: '#000' }}>
              {purchaseData?.date ? new Date(purchaseData.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
            </Typography>
          </Box>
        </Box>

        {/* Vendor Information */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" component="span" sx={{ fontSize: '10pt', fontWeight: 'bold', color: '#000' }}>
            Vendor:
          </Typography>{' '}
          <Typography variant="body2" component="span" sx={{ fontSize: '10pt', color: '#000' }}>
            {purchaseData?.vendor?.name || 'Vendor Name'},
            {purchaseData?.vendor?.phone ? ` Ph: ${purchaseData.vendor.phone}` : ''}
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
                <TableCell width="46%">Particulars</TableCell>
                <TableCell align="center" width="14%">Weight</TableCell>
                <TableCell align="right" width="15%">Rate</TableCell>
                <TableCell align="right" width="15%">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchaseData?.items?.map((item, index) => {
                // Simple validation - just ensure numbers are parsed properly
                const rate = item.rate ? parseFloat(item.rate) : (item.ratePerUnit ? parseFloat(item.ratePerUnit) : 0);
                const weight = item.weight ? parseFloat(item.weight) : 0;
                const purity = item.purity ? parseFloat(item.purity) / 100 : 1;
                const totalAmount = rate * weight * purity;
                
                // HSN code logic
                const getHSNCode = (item) => {
                  const purity = (item.purity || '').toLowerCase().trim();
                  
                  // Check for 22K format
                  if (purity === '22k' || purity === '22 k' || purity === '22 kt' || purity === '22kt') {
                    return '7113';
                  }
                  
                  // Check for percentage format (91.6%)
                  if (purity === '91.6%' || purity === '91.6' || purity === '91.6 %') {
                    return '7113';
                  }
                  
                  return '-';
                };
                
                return (
                  <TableRow key={index}>
                    <TableCell align="center">{index + 1}</TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>
                      {item.description ? 
                        item.description.replace(/\s*\(\d+(\.\d+)?\)\s*/i, '').replace(/\s*\d+(\.\d+)?(%|k|kt|karat|carat)\s*/i, '') : 
                        item.category ? item.category.replace(/\s*\(\d+(\.\d+)?\)\s*/i, '') : 'Jewellery'}
                    </TableCell>
                    <TableCell align="center">
                      {item.weight ? `${parseFloat(item.weight).toFixed(3)}g` : '-'}
                    </TableCell>
                    <TableCell align="right">{rate > 0 ? `₹${rate.toLocaleString()}` : '-'}</TableCell>
                    <TableCell align="right">{totalAmount > 0 ? `₹${totalAmount.toLocaleString()}` : '-'}</TableCell>
                  </TableRow>
                );
              })}
              
              {/* Add empty rows to maintain table size */}
              {Array.from({ length: Math.max(0, 5 - (purchaseData?.items?.length || 0)) }).map((_, index) => (
                <TableRow key={`empty-${index}`}>
                  <TableCell style={{ height: '18px' }}></TableCell>
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
          // Get the total directly from purchaseData.amount if available
          // as that is the actual amount paid
          let calculatedTotal = 0;
          
          if (purchaseData?.items?.length > 0) {
            purchaseData.items.forEach(item => {
              const rate = item.rate ? parseFloat(item.rate) : (item.ratePerUnit ? parseFloat(item.ratePerUnit) : 0);
              const weight = item.weight ? parseFloat(item.weight) : 0;
              const purity = item.purity ? parseFloat(item.purity) / 100 : 1;
              calculatedTotal += (rate * weight * purity);
            });
          }
          
          // First try amount, then total, then calculated
          const totalAmount = purchaseData?.amount ? parseFloat(purchaseData.amount) : 
                              (purchaseData?.total ? parseFloat(purchaseData.total) : calculatedTotal);
          
          // No GST calculation for purchases
          
          return (
            <>
              {/* Total Calculation - No GST for purchases */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Box sx={{ width: '40%', border: '1px solid #ddd', backgroundColor: 'white' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.5, backgroundColor: 'white' }}>
                    <Typography variant="body2" sx={{ fontSize: '9pt', fontWeight: 'bold', color: '#000' }}>Total Amount:</Typography>
                    <Typography variant="body2" sx={{ fontSize: '9pt', fontWeight: 'bold', color: '#000' }}>
                      ₹{totalAmount.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Additional Information */}
              <Box sx={{ fontSize: '9pt', mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '9pt', color: '#000' }}>
                    Payment Mode: {purchaseData?.paymentMethod || 'Cash'}
                  </Typography>
                </Box>
              </Box>
            </>
          );
        })()}
      </Box>
    </Box>
  );
};

const PrintPurchase = ({ open, onClose, purchaseData, directPrint = false, generatePdf = false }) => {
  const printRef = useRef(null);
  const [purchaseHtml, setPurchaseHtml] = useState('');
  
  // Clear HTML state when the dialog closes or opens
  useEffect(() => {
    if (!open) {
      setPurchaseHtml('');
    }
  }, [open]);

  // Generate HTML content for direct printing and PDF
  useEffect(() => {
    // Only proceed if dialog is open or we're doing direct actions
    if (!((open || directPrint || generatePdf) && purchaseData)) {
      return;
    }
    
    // Calculate totals if needed
    let calculatedTotal = 0;
    
    if (purchaseData.items && purchaseData.items.length > 0) {
      purchaseData.items.forEach(item => {
        const rate = item.rate ? parseFloat(item.rate) : (item.ratePerUnit ? parseFloat(item.ratePerUnit) : 0);
        const weight = item.weight ? parseFloat(item.weight) : 0;
        const purity = item.purity ? parseFloat(item.purity) / 100 : 1;
        calculatedTotal += (rate * weight * purity);
      });
    }
    
    // First try amount, then total, then calculated
    const totalAmount = purchaseData?.amount ? parseFloat(purchaseData.amount) : 
                        (purchaseData?.total ? parseFloat(purchaseData.total) : calculatedTotal);
    
    // No GST calculation for purchases

    // Base HTML for both print and PDF
    const baseHtml = `
      <div class="content-area">
        <!-- Purchase Header -->
        <div class="header-row">
          <div>
            <span class="bold">Purchase No:</span> ${purchaseData?.invoiceNumber || 'PUR-XXXXXX'}
          </div>
          <div>
            <span class="bold">Date:</span> ${purchaseData?.date ? new Date(purchaseData.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
          </div>
        </div>
        
        <!-- Vendor Info -->
        <div class="vendor-info">
          <span class="bold">Vendor:</span> ${purchaseData?.vendor?.name || 'Vendor Name'}${purchaseData?.vendor?.phone ? `, Ph: ${purchaseData.vendor.phone}` : ''}
        </div>
        
        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 4%;">Sr.</th>
              <th style="width: 46%;">Particulars</th>
              <th style="width: 14%;" class="text-center">Weight</th>
              <th style="width: 15%;" class="text-right">Rate</th>
              <th style="width: 15%;" class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${purchaseData?.items?.map((item, index) => {
              const rate = item.rate ? parseFloat(item.rate) : (item.ratePerUnit ? parseFloat(item.ratePerUnit) : 0);
              const weight = item.weight ? parseFloat(item.weight) : 0;
              const purity = item.purity ? parseFloat(item.purity) / 100 : 1;
              const totalAmount = rate * weight * purity;
              
              return `<tr>
                <td class="text-center">${index + 1}</td>
                <td>${item.description ? 
                  item.description.replace(/\s*\(\d+(\.\d+)?\)\s*/i, '').replace(/\s*\d+(\.\d+)?(%|k|kt|karat|carat)\s*/i, '') : 
                  item.category ? item.category.replace(/\s*\(\d+(\.\d+)?\)\s*/i, '') : 'Jewellery'}</td>
                <td class="text-center">${item.weight ? `${parseFloat(item.weight).toFixed(3)}g` : '-'}</td>
                <td class="text-right">₹${rate > 0 ? rate.toLocaleString() : '-'}</td>
                <td class="text-right">₹${totalAmount > 0 ? totalAmount.toLocaleString() : '-'}</td>
              </tr>`;
            }).join('') || ''}
            
            ${Array.from({ length: Math.max(0, 5 - (purchaseData?.items?.length || 0)) }).map(() => 
              `<tr>
                <td style="height: 18px;"></td>
                <td></td><td></td><td></td><td></td>
              </tr>`
            ).join('')}
          </tbody>
        </table>
        
        <!-- Totals - No GST for purchases -->
        <div class="totals-box">
          <div class="totals-row">
            <div class="bold">Total Amount:</div>
            <div class="bold">₹${totalAmount.toLocaleString()}</div>
          </div>
        </div>
        
        <div class="footer-info">
          <div>Payment Mode: ${purchaseData?.paymentMethod || 'Cash'}</div>
        </div>
      </div>
    `;

    // Generate independent HTML for direct printing (without pre-printed elements)
    let printHtml = null;
    if (directPrint) {
      printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Purchase</title>
            <style>
              @page {
                size: 209.55mm 158.75mm;
                margin: 0;
                padding: 0;
              }
              body {
                margin: 0;
                padding: 0;
                width: 209.55mm;
                height: 158.75mm;
                font-family: Arial, sans-serif;
              }
              * {
                box-sizing: border-box;
              }
              .print-content {
                width: 209.55mm;
                height: 158.75mm;
                position: relative;
                background-color: #fff;
              }
              .content-area {
                position: absolute;
                top: 39mm;
                width: 100%;
                height: 100mm;
                padding: 3mm 5mm;
                box-sizing: border-box;
                font-family: Arial, sans-serif;
                font-size: 10pt;
                background-color: white;
                color: #000;
              }
              .header-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1.5em;
              }
              .bold {
                font-weight: bold;
              }
              .vendor-info {
                margin-bottom: 1.5em;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 1.5em;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 2px 4px;
                font-size: 9pt;
                color: #000;
                background-color: white;
              }
              th {
                font-weight: bold;
                text-align: center;
              }
              .text-center {
                text-align: center;
              }
              .text-right {
                text-align: right;
              }
              .totals-box {
                width: 40%;
                margin-left: auto;
                border: 1px solid #ddd;
              }
              .totals-row {
                display: flex;
                justify-content: space-between;
                padding: 0.5em 1em;
                border-bottom: 1px solid #ddd;
              }
              .totals-row:last-child {
                border-bottom: none;
              }
              .footer-info {
                display: flex;
                justify-content: space-between;
                margin-top: 1em;
              }
            </style>
          </head>
          <body>
            <div class="print-content">
              ${baseHtml}
            </div>
          </body>
        </html>
      `;
    }

    // Generate independent HTML for PDF with pre-printed elements
    let pdfHtml = null;
    if (generatePdf) {
      pdfHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Purchase</title>
            <style>
              @page {
                size: 209.55mm 158.75mm;
                margin: 0;
                padding: 0;
              }
              body {
                margin: 0;
                padding: 0;
                width: 209.55mm;
                height: 158.75mm;
                font-family: Arial, sans-serif;
              }
              * {
                box-sizing: border-box;
              }
              .print-content {
                width: 209.55mm;
                height: 158.75mm;
                position: relative;
                background-color: #fff;
              }
              .header {
                height: 39mm;
                width: 100%;
                background-color: #9e2f50;
                background-image: linear-gradient(to right, #9e2f50, #7e1e3d);
                position: absolute;
                top: 0;
                color: #fff;
                display: flex;
                flex-direction: column;
                padding: 5mm;
              }
              .header-top {
                display: flex;
                width: 100%;
                justify-content: space-between;
              }
              .logo-area {
                width: 30%;
                display: flex;
                align-items: center;
              }
              .logo {
                font-size: 40pt;
                font-weight: bold;
                color: #e9c46a;
                font-family: serif;
                line-height: 1;
              }
              .center-text {
                width: 40%;
                text-align: center;
                font-family: Arial, sans-serif;
              }
              .shop-name {
                font-size: 24pt;
                font-weight: bold;
                margin: 0;
                color: #e9c46a;
              }
              .shop-tagline {
                font-size: 14pt;
                margin: 2mm 0;
              }
              .contact-area {
                width: 30%;
                text-align: right;
              }
              .address {
                margin-top: 2mm;
                text-align: center;
                font-size: 10pt;
              }
              .jurisdiction {
                position: absolute;
                top: 2mm;
                right: 2mm;
                font-size: 8pt;
                color: #e9c46a;
              }
              .footer {
                height: 19.75mm;
                width: 100%;
                background-color: #d4af37;
                position: absolute;
                bottom: 0;
                color: #333;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 15mm;
                font-family: Arial, sans-serif;
              }
              .vendor-sign {
                text-align: left;
              }
              .certified {
                text-align: center;
              }
              .company-sign {
                text-align: right;
              }
              .marathi {
                font-weight: bold;
                font-size: 10pt;
                margin: 0;
              }
              .english {
                font-size: 8pt;
                margin: 0;
              }
              .content-area {
                position: absolute;
                top: 39mm;
                width: 100%;
                height: 100mm;
                padding: 3mm 5mm;
                box-sizing: border-box;
                font-family: Arial, sans-serif;
                font-size: 10pt;
                background-color: white;
                color: #000;
              }
              .header-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1.5em;
              }
              .bold {
                font-weight: bold;
              }
              .vendor-info {
                margin-bottom: 1.5em;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 1.5em;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 2px 4px;
                font-size: 9pt;
                color: #000;
                background-color: white;
              }
              th {
                font-weight: bold;
                text-align: center;
              }
              .text-center {
                text-align: center;
              }
              .text-right {
                text-align: right;
              }
              .totals-box {
                width: 40%;
                margin-left: auto;
                border: 1px solid #ddd;
              }
              .totals-row {
                display: flex;
                justify-content: space-between;
                padding: 0.5em 1em;
                border-bottom: 1px solid #ddd;
              }
              .totals-row:last-child {
                border-bottom: none;
              }
              .footer-info {
                display: flex;
                justify-content: space-between;
                margin-top: 1em;
              }
            </style>
          </head>
          <body>
            <div class="print-content">
              <!-- Header with shop information -->
              <div class="header">
                <div class="jurisdiction">Subject to Solapur Jurisdiction</div>
                <div class="header-top">
                  <div class="logo-area">
                    <div class="logo">M</div>
                    <div style="text-align: center; margin-top: 2mm; font-weight: bold; color: #e9c46a;">M.G potdar</div>
                  </div>
                  <div class="center-text">
                    <p class="shop-name">एम. जी. पोतदार</p>
                    <p class="shop-tagline">ज्वेलर्स | सन 1950</p>
                  </div>
                  <div class="contact-area">
                    <p style="font-size: 12pt; margin: 0 0 4mm 0; color: #e9c46a; font-weight: bold;">Your Trusted Jeweller</p>
                    <p style="font-size: 14pt; margin: 0;">📞 777 699 0377</p>
                    <p style="font-size: 10pt; margin: 2mm 0;">✉ ompotdar1234@gmail.com</p>
                  </div>
                </div>
                <div class="address">
                  871, पश्चिम मंगलवार पेठ, सराफ बाजार, सोलापुर
                </div>
              </div>
              
              ${baseHtml}
              
              <!-- Footer -->
              <div class="footer">
                <div class="vendor-sign">
                  <p class="marathi">विक्रेता सही</p>
                  <p class="english">Vendor Signature</p>
                </div>
                <div class="certified">
                  <p style="margin: 0; font-size: 9pt;">Certified that the particulars given above are true and correct</p>
                </div>
                <div class="company-sign">
                  <p class="marathi">एम. जी. पोतदार कंपनी</p>
                  <p class="english">For M.G. Potdar Jewellers</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
    }
    
    // Set the appropriate HTML based on the action, using separate variables
    if (directPrint) {
      setPurchaseHtml(printHtml);
    } else if (generatePdf) {
      setPurchaseHtml(pdfHtml);
    }
  }, [purchaseData, directPrint, generatePdf, open]);

  // Direct print using iframe - updated to use local variables
  const printDirectly = () => {
    if (!purchaseHtml) return;
    
    try {
      console.log("Starting direct print...");
      // Create a new iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      
      // Write the HTML content to the iframe
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(purchaseHtml);
      doc.close();
      
      // Wait for resources to load
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            
            // Remove iframe after printing
            setTimeout(() => {
              document.body.removeChild(iframe);
              if (onClose) onClose();
            }, 1000);
          } catch (e) {
            console.error('Print error:', e);
            document.body.removeChild(iframe);
            if (onClose) onClose();
          }
        }, 500);
      };
    } catch (error) {
      console.error('Error setting up print:', error);
      if (onClose) onClose();
    }
  };

  // Simplified PDF generation - updated to create a fresh PDF independently
  const generatePDFDirectly = () => {
    if (!purchaseHtml) return;
    
    try {
      console.log("Starting PDF generation...");
      
      // Create a container div to hold the purchase content
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '209.55mm';
      container.style.height = '158.75mm';
      container.style.zIndex = '-9999';
      container.style.visibility = 'hidden';
      document.body.appendChild(container);
      
      // Create an iframe inside the container
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      container.appendChild(iframe);
      
      // Write the content to the iframe
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(purchaseHtml);
      iframeDoc.close();
      
      // Wait for iframe to load
      iframe.onload = () => {
        // Wait a bit to ensure content is rendered
        setTimeout(() => {
          const content = iframeDoc.querySelector('.print-content');
          if (!content) {
            console.error('Could not find content element');
            document.body.removeChild(container);
            if (onClose) onClose();
            return;
          }
          
          // Use html2canvas on the content
          html2canvas(content, {
            scale: 2,
            useCORS: true,
            logging: false
          }).then(canvas => {
            // Generate PDF from canvas
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
              orientation: 'landscape',
              unit: 'mm',
              format: [158.75, 209.55] // Height, Width
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, 209.55, 158.75);
            pdf.save(`Purchase_${purchaseData?.invoiceNumber || 'New'}.pdf`);
            
            // Cleanup
            document.body.removeChild(container);
            if (onClose) onClose();
          }).catch(err => {
            console.error('HTML2Canvas error:', err);
            document.body.removeChild(container);
            if (onClose) onClose();
          });
        }, 800);
      };
    } catch (error) {
      console.error('Error setting up PDF generation:', error);
      if (onClose) onClose();
    }
  };

  // Handle direct print or PDF generation when component is ready, with proper state cleanup
  useEffect(() => {
    if (open && purchaseHtml) {
      if (directPrint) {
        console.log("Direct printing initiated");
        printDirectly();
      } else if (generatePdf) {
        console.log("Direct PDF generation initiated");
        generatePDFDirectly();
      }
    }
    
    // Always cleanup state after direct actions
    return () => {
      if (directPrint || generatePdf) {
        setPurchaseHtml('');
      }
    };
  }, [open, directPrint, generatePdf, purchaseHtml]);

  // Handle printing from dialog
  const handleDialogPrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Purchase_${purchaseData?.invoiceNumber || 'New'}`,
    onAfterPrint: () => {
      if (onClose) onClose();
    }
  });

  // Only render dialog for preview mode
  if (directPrint || generatePdf) {
    return null; // Return null as we're using direct DOM manipulation
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        Print Purchase on Pre-printed Form
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
          <div 
            ref={printRef}
            style={{ 
              width: '209.55mm', 
              height: '158.75mm', 
              border: '1px dashed #ccc', 
              position: 'relative',
              backgroundColor: '#f9f9f9'
            }}
          >
            {/* Top preprinted header area (burgundy in the image) */}
            <div style={{ 
              height: '39mm', 
              width: '100%', 
              backgroundColor: '#9e2f50', 
              backgroundImage: 'linear-gradient(to right, #9e2f50, #7e1e3d)',
              position: 'absolute',
              top: 0,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              padding: '5mm'
            }}>
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '12pt', width: '30%' }}>
                  <img src="/logo-white.png" alt="Logo" style={{ height: '30mm', opacity: 0.8 }} />
                </div>
                <div style={{ textAlign: 'center', width: '40%', fontFamily: 'Arial, sans-serif' }}>
                  <p style={{ fontSize: '24pt', margin: '0', fontWeight: 'bold' }}>M.G. POTDAR</p>
                  <p style={{ fontSize: '14pt', margin: '2mm 0' }}>Jewellers | Est. 1950</p>
                </div>
                <div style={{ width: '30%', textAlign: 'right', fontFamily: 'Arial, sans-serif' }}>
                  <p style={{ fontSize: '14pt', margin: '0' }}>📞 777 699 0377</p>
                  <p style={{ fontSize: '10pt', margin: '2mm 0' }}>✉ ompotdar1234@gmail.com</p>
                </div>
              </div>
              <p style={{ fontStyle: 'italic', opacity: 0.7, fontSize: '8pt', position: 'absolute', bottom: '2mm' }}>
                Preprinted Header (Will not print)
              </p>
            </div>
            
            {/* Bottom preprinted footer area (gold in the image) */}
            <div style={{ 
              height: '19.75mm', 
              width: '100%', 
              backgroundColor: '#d4af37', 
              position: 'absolute',
              bottom: 0,
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 15mm',
              fontFamily: 'Arial, sans-serif'
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '10pt' }}>विक्रेता सही</p>
                <p style={{ margin: 0, fontSize: '8pt' }}>Vendor Signature</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '9pt' }}>Certified that the particulars given above are true and correct</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '10pt' }}>एम. जी. पोतदार कंपनी</p>
                <p style={{ margin: 0, fontSize: '8pt' }}>For M.G. Potdar Jewellers</p>
              </div>
              <p style={{ fontStyle: 'italic', opacity: 0.7, fontSize: '8pt', position: 'absolute', bottom: '2mm', width: '100%', textAlign: 'center' }}>
                Preprinted Footer (Will not print)
              </p>
            </div>
            
            {/* The actual print area - this is what will print */}
            <PurchasePrintTemplate purchaseData={purchaseData} />
          </div>
        </div>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          color="inherit"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleDialogPrint} 
          color="primary" 
          variant="contained" 
          startIcon={<PrintIcon />}
        >
          Print Purchase
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintPurchase; 