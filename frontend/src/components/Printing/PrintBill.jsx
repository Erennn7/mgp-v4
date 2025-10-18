import React, { useRef, useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Box } from '@mui/material';
import { Print as PrintIcon, Close as CloseIcon } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import BillPrintTemplate from './BillPrintTemplate';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Function to convert number to words
const convertToWords = (amount) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  // Round to 2 decimal places
  const numString = amount.toFixed(2);
  const [rupees, paise] = numString.split('.');
  
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

const PrintBill = ({ open, onClose, billData, directPrint = false, generatePdf = false }) => {
  const printRef = useRef(null);
  const [billHtml, setBillHtml] = useState('');
  
  // Clear HTML state when the dialog closes or opens
  useEffect(() => {
    if (!open) {
      setBillHtml('');
    }
  }, [open]);

  // Generate HTML content for direct printing and PDF
  useEffect(() => {
    // Only proceed if dialog is open or we're doing direct actions
    if (!((open || directPrint || generatePdf) && billData)) {
      return;
    }
    
    // Calculate values needed for the bill
    let calculatedSubTotal = 0;
    
    if (billData.items) {
      billData.items.forEach(item => {
        const baseAmount = item.rate * item.weight;
        const makingCharge = item.makingCharge || 0;
        calculatedSubTotal += (baseAmount + makingCharge);
      });
    }
    console.log(billData);
    // Apply discount if available
    const discountAmount = billData?.discount ? parseFloat(billData.discount) : 0;
    const discountedSubTotal = calculatedSubTotal - discountAmount;
    
    const taxRate = billData?.taxRate || 0;
    const calculatedTax = discountedSubTotal * (taxRate / 100);
    const calculatedGrandTotal = discountedSubTotal + calculatedTax;
    
    // Use the total from billData if provided (takes precedence over calculation)
    const finalGrandTotal = billData?.total ? parseFloat(billData.total) : calculatedGrandTotal;
console.log(billData);

    // Base HTML for both print and PDF
    const baseHtml = `
      <div class="content-area">
        <!-- Bill Header -->
        <div class="header-row">
          <div style="font-size: 8pt;">
            <span class="bold">Bill No:</span> ${billData?.invoiceNumber || 'INV-XXXXXX'}
          </div>
          <div style="font-size: 10pt;">
            <span class="bold">Date:</span> ${billData?.date ? new Date(billData.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
          </div>
        </div>
        
        <!-- Invoice Number - GST or REG based on bill type -->
        ${billData?.serialNumber ? `
        <div style="margin-bottom: 3px;">
          <div style="font-size: 8pt;">
            <span class="bold">${(billData?.taxRate > 0 || billData?.tax > 0) ? 'GST Invoice No:' : 'REG Invoice No:'}</span>
            <span style="font-weight: bold; color: #1976d2;">
              ${(billData?.taxRate > 0 || billData?.tax > 0) ? 
                'GST-' + (Number(billData.serialNumber) + 54) : 
                'REG-' + Number(billData.serialNumber)}
            </span>
          </div>
        </div>
        ` : ''}
        
        <!-- Customer Info -->
        <div style="margin-bottom: 8px; font-size: 8pt;">
          <div style="margin-bottom: 2px;">
            <span class="bold">Name:</span> ${billData?.customer?.name || 'Customer Name'}
          </div>
          <div style="margin-bottom: 2px;">
            <span class="bold">Address:</span> 
            ${billData?.customer?.address?.street ? billData.customer.address.street + ', ' : ''}${billData?.customer?.address?.city ? billData.customer.address.city + ', ' : ''}${billData?.customer?.address?.state ? billData.customer.address.state + ' ' : ''}${billData?.customer?.address?.pincode ? '- ' + billData.customer.address.pincode : ''}${!billData?.customer?.address?.street && !billData?.customer?.address?.city && !billData?.customer?.address?.state && !billData?.customer?.address?.pincode ? 'N/A' : ''}
          </div>
          <div style="margin-bottom: 2px;">
            <span class="bold">Phone No:</span> ${billData?.customer?.phone || 'N/A'}
          </div>
          ${billData?.customer?.gstin ? `<div style="margin-top: 2px;"><span class="bold">Customer GSTIN:</span> ${billData.customer.gstin}</div>` : ''}
        </div>
        
        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 3%;">Sr.</th>
              <th style="width: 20%;">Particulars</th>
              <th style="width: 6%;">Purity</th>
              <th style="width: 6%;">HUID</th>
              <th style="width: 5%;">HSN</th>
              <th style="width: 3%;">PCS</th>
              <th style="width: 7%;">Gross Wt.</th>
              <th style="width: 7%;">Net Wt.</th>
              <th style="width: 9%;" class="text-right">Rate</th>
              <th style="width: 9%;" class="text-right">Making</th>
              <th style="width: 10%;" class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${billData?.items?.map((item, index) => {
              const baseAmount = item.rate * item.weight;
              const makingCharge = item.makingCharge || 0;
              const totalAmount = baseAmount + makingCharge;
              
              // Updated HSN code logic
              const getHSNCode = (item) => {
                console.log(item);
                
                
                const purity = (item.purity || '').toLowerCase().trim();
                
                
                // Check for 24K format
                if (purity === '24k' || purity === '24 k' || purity === '24 kt' || purity === '24kt') {
                  return '7108';
                }
                
                // Check for 24K percentage format (99.9%)
                if (purity === '99.9%' || purity === '99.9' || purity === '99.9 %' || purity === '999') {
                  return '7108';
                }
                
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
              
              // Use netWeight for net weight and grossWeight for gross weight
              const grossWeightDisplay = item.grossWeight ? `${parseFloat(item.grossWeight).toFixed(3)}g` : '-';
              const netWeightDisplay = item.netWeight ? `${parseFloat(item.netWeight).toFixed(3)}g` : '-';
              
              return `<tr>
                <td class="text-center">${index + 1}</td>
                <td>${item.description || item.category || 'Jewellery'}</td>
                <td class="text-center">${item.purity || '-'}</td>
                <td class="text-center">${item.huid || (item.product?.huidNumber) || '-'}</td>
                <td class="text-center">${getHSNCode(item)}</td>
                <td class="text-center">${item.quantity || 1}</td>
                <td class="text-center">${grossWeightDisplay}</td>
                <td class="text-center">${netWeightDisplay}</td>
                <td class="text-right">₹${item.rate?.toLocaleString() || '-'}</td>
                <td class="text-right">₹${makingCharge?.toLocaleString() || '-'}</td>
                <td class="text-right">₹${totalAmount.toLocaleString()}</td>
              </tr>`;
            }).join('') || ''}
            
            ${Array.from({ length: Math.max(0, 5 - (billData?.items?.length || 0)) }).map(() => 
              `<tr>
                <td style="height: 18px;"></td>
                <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>`
            ).join('')}
          </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals-box">
          <div class="totals-row">
            <div>Sub Total:</div>
            <div>₹${calculatedSubTotal.toLocaleString()}</div>
          </div>
          ${discountAmount > 0 ? `
          <div class="totals-row">
            <div>Discount:</div>
            <div>-₹${discountAmount.toLocaleString()}</div>
          </div>
          <div class="totals-row">
            <div>Net Amount:</div>
            <div>₹${discountedSubTotal.toLocaleString()}</div>
          </div>
          ` : ''}
          ${taxRate > 0 ? `
          <div class="totals-row">
            <div>CGST (${taxRate/2}%):</div>
            <div>₹${(calculatedTax/2).toLocaleString()}</div>
          </div>
          <div class="totals-row">
            <div>SGST (${taxRate/2}%):</div>
            <div>₹${(calculatedTax/2).toLocaleString()}</div>
          </div>
          ` : ''}
          <div class="totals-row">
            <div class="bold">Grand Total:</div>
            <div class="bold">₹${finalGrandTotal.toLocaleString()}</div>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
          <div style="width: 60%;">
            <div class="amount-words">
              Amount in words: ${billData?.amountInWords || convertToWords(finalGrandTotal)}
            </div>
          </div>
          <div style="width: 40%; text-align: right;">
            <div class="footer-info">
              <div>Payment Mode: ${billData?.paymentMethod || 'Cash'}</div>
            </div>
          </div>
        </div>
        
        ${taxRate > 0 ? `
        <!-- GSTIN Info -->
        <div class="gstin-info">
          GSTIN: 27DGJPP9641E1ZZ ${billData?.customer?.gstin ? `| Customer GSTIN: ${billData.customer.gstin}` : ''}
        </div>
        ` : ''}
      </div>
    `;

    // Generate independent HTML for direct printing (without pre-printed elements)
    let printHtml = null;
    if (directPrint) {
      printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Bill</title>
            <style>
              @page {
                size: 210mm 158mm landscape;
                margin: 0;
                padding: 0;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              body {
                margin: 0;
                padding: 0;
                width: 210mm;
                height: 158mm;
                font-family: Arial, sans-serif;
                overflow: hidden;
              }
              .print-content {
                width: 210mm;
                height: 158mm;
                position: relative;
                background-color: #fff;
                overflow: hidden;
              }
              .content-area {
                position: absolute;
                top: 38mm;
                left: 0;
                right: 0;
                width: 210mm;
                height: 100mm;
                padding: 3mm 5mm;
                box-sizing: border-box;
                font-family: Arial, sans-serif;
                font-size: 9pt;
                line-height: 1.2;
                background-color: white;
                color: #000;
              }
              .header-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
                font-size: 10pt;
              }
              .bold {
                font-weight: bold;
              }
              .customer-info {
                margin-bottom: 8px;
                font-size: 10pt;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 8px;
                table-layout: fixed;
              }
              th, td {
                border: 1px solid #d1d5db;
                padding: 2px;
                font-size: 8pt;
                color: #000;
                background-color: white;
              }
              th {
                font-weight: bold;
                text-align: center;
              }
              }
              .text-center {
                text-align: center;
              }
              .text-right {
                text-align: right;
              }
              .totals-box {
                width: 33%;
                margin-left: auto;
                border: 1px solid #d1d5db;
                background-color: white;
              }
              .totals-row {
                display: flex;
                justify-content: space-between;
                padding: 2px 8px;
                border-bottom: 1px solid #d1d5db;
                font-size: 8pt;
              }
              .totals-row:last-child {
                border-bottom: none;
              }
              .amount-words {
                font-size: 8pt;
                font-style: italic;
                margin-top: 4px;
                margin-bottom: 4px;
              }
              .footer-info {
                display: flex;
                justify-content: space-between;
                margin-top: 4px;
                font-size: 8pt;
              }
              .gstin-info {
                text-align: center;
                font-weight: bold;
                margin-top: 4px;
                font-size: 8pt;
              }
            </style>
          </head>
          <body>
            <div class="print-content ">
              ${baseHtml.replace( `<div >
            <span class=
"bold">Date:</span>
          </div>`, `<div>
            <span class="bold">Date:</span> ${billData?.date ? new Date(billData.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
          </div>`)}
              `;
    }

    // Generate independent HTML for PDF with pre-printed elements
    let pdfHtml = null;
    if (generatePdf) {
      pdfHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Bill</title>
            <style>
              @page {
                size: 210mm 158mm;
                margin: 0;
                padding: 0;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              body {
                margin: 0;
                padding: 0;
                width: 210mm;
                height: 158mm;
                font-family: Arial, sans-serif;
                overflow: hidden;
              }
              .print-content {
                width: 210mm;
                height: 158mm;
                position: relative;
                background-color: #fff;
                overflow: hidden;
              }
              .header {
                height: 38mm;
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
              .customer-sign {
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
                top: 38mm;
                left: 0;
                right: 0;
                width: 210mm;
                height: 100mm;
                padding: 3mm 5mm;
                box-sizing: border-box;
                font-family: Arial, sans-serif;
                font-size: 9pt;
                line-height: 1.2;
                background-color: white;
                color: #000;
              }
              .header-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
              }
              .bold {
                font-weight: bold;
              }
              .customer-info {
                margin-bottom: 8px;
                font-size: 10pt;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 8px;
                table-layout: fixed;
              }
              th, td {
                border: 1px solid #d1d5db;
                padding: 2px;
                font-size: 8pt;
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
                width: 33%;
                margin-left: auto;
                border: 1px solid #d1d5db;
                background-color: white;
              }
              .totals-row {
                display: flex;
                justify-content: space-between;
                padding: 2px 8px;
                border-bottom: 1px solid #d1d5db;
                font-size: 8pt;
              }
              .totals-row:last-child {
                border-bottom: none;
              }
              .amount-words {
                font-size: 8pt;
                font-style: italic;
                margin-top: 4px;
                margin-bottom: 4px;
              }
              .footer-info {
                font-size: 8pt;
              }
              .gstin-info {
                text-align: center;
                font-weight: bold;
                margin-top: 4px;
                font-size: 8pt;
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
              
              ${baseHtml.replace(`<div class="totals-row">
            <div>CGST (${taxRate/2}%):</div>
            <div>₹${taxRate === 0 ? '0' : (calculatedTax/2).toLocaleString()}</div>
          </div>
          <div class="totals-row">
            <div>SGST (${taxRate/2}%):</div>
            <div>₹${taxRate === 0 ? '0' : (calculatedTax/2).toLocaleString()}</div>
          </div>`, taxRate > 0 ? `<div class="totals-row">
            <div>CGST (${taxRate/2}%):</div>
            <div>₹${(calculatedTax/2).toLocaleString()}</div>
          </div>
          <div class="totals-row">
            <div>SGST (${taxRate/2}%):</div>
            <div>₹${(calculatedTax/2).toLocaleString()}</div>
          </div>` : '')}
              
              <!-- Footer -->
              <div class="footer">
                <div class="customer-sign">
                  <p class="marathi">ग्राहकाची सही</p>
                  <p class="english">Customer Signature</p>
                </div>
                <div class="certified">
                  <p style="margin: 0; font-size: 9pt;">Certified that the particulars given above are true and correct</p>
                  ${taxRate > 0 ? `<p style="margin-top: 8px; font-size: 10pt; font-weight: bold;">GSTIN: 27DGJPP9641E1ZZ</p>` : ''}
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
      setBillHtml(printHtml);
    } else if (generatePdf) {
      setBillHtml(pdfHtml);
    }
  }, [billData, directPrint, generatePdf, open]);

  // Handle direct print or PDF generation when component is ready, with proper state cleanup
  useEffect(() => {
    if (open && billHtml) {
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
        setBillHtml('');
      }
    };
  }, [open, directPrint, generatePdf, billHtml]);

  // Direct print using iframe
  const printDirectly = () => {
    if (!billHtml) return;
    
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
      doc.write(billHtml);
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

  // Simplified PDF generation
  const generatePDFDirectly = () => {
    if (!billHtml) return;
    
    try {
      console.log("Starting PDF generation...");
      
      // Create a container div to hold the bill content
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '210mm';
      container.style.height = '158mm';
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
      iframeDoc.write(billHtml);
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
              format: [210, 158]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 158);
            pdf.save(`Bill_${billData?.invoiceNumber || 'New'}.pdf`);
            
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

  // Handle printing from dialog
  const handleDialogPrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Bill_${billData?.invoiceNumber || 'New'}`,
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
        Print Bill on Pre-printed Form
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
              width: '210mm', 
              height: '158mm', 
              border: '1px dashed #ccc', 
              position: 'relative',
              backgroundColor: '#f9f9f9'
            }}
          >
            {/* Top preprinted header area (burgundy in the image) */}
            <div style={{ 
              height: '38mm', 
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
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '10pt' }}>ग्राहकाची सही</p>
                <p style={{ margin: 0, fontSize: '8pt' }}>Customer Signature</p>
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
            <BillPrintTemplate billData={billData} />
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
          Print Bill
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintBill;