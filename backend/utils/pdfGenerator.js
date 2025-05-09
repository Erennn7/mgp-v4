const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Function to generate PDF invoice
exports.generateInvoice = async (sale, res) => {
  try {
    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Pipe the PDF into the response
    doc.pipe(res);

    // Add business info
    addBusinessDetails(doc);
    
    // Add customer info
    addCustomerInfo(doc, sale);
    
    // Add invoice header
    addInvoiceHeader(doc, sale);
    
    // Add table header
    generateTableHeader(doc);
    
    // Add table rows
    generateTableRows(doc, sale);
    
    // Add summary
    generateSummary(doc, sale);
    
    // Add footer
    addFooter(doc);

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Could not generate invoice PDF');
  }
};

// Add business details to PDF
const addBusinessDetails = (doc) => {
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('MG Potdar Jewellers', { align: 'center' })
    .fontSize(12)
    .font('Helvetica')
    .text('123 Main Street, Pune', { align: 'center' })
    .text('Phone: 1234567890 | Email: contact@mgpotdarjewellers.com', { align: 'center' })
    .moveDown(2);
};

// Add customer info to PDF
const addCustomerInfo = (doc, sale) => {
  doc
    .fontSize(12)
    .text('Customer Details:', { underline: true })
    .text(`Name: ${sale.customer.name || 'N/A'}`)
    .text(`Phone: ${sale.customer.phone || 'N/A'}`)
    .text(`Email: ${sale.customer.email || 'N/A'}`)
    .moveDown(1);
};

// Add invoice header to PDF
const addInvoiceHeader = (doc, sale) => {
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('INVOICE', { align: 'center' })
    .fontSize(12)
    .font('Helvetica')
    .text(`Invoice No: ${sale.invoiceNumber}`, { align: 'right' })
    .text(`Date: ${new Date(sale.createdAt).toLocaleDateString()}`, { align: 'right' })
    .moveDown(2);
};

// Generate table header
const generateTableHeader = (doc) => {
  doc
    .fontSize(9)
    .font('Helvetica-Bold');
  
  // Draw table header background
  doc
    .fillColor('#f0f0f0')
    .rect(50, doc.y, 500, 20)
    .fill();
  
  // Draw table header text
  const y = doc.y + 5;
  doc
    .fillColor('#000000')
    .text('Sr', 55, y)
    .text('Description', 75, y)
    .text('HUID', 175, y)
    .text('HSN', 230, y)
    .text('PCS', 265, y)
    .text('Gross Wt', 290, y)
    .text('Net Wt', 345, y)
    .text('Rate/Gms', 395, y)
    .text('Making', 450, y)
    .text('Amount', 490, y)
    .moveDown(1);
};

// Generate table rows
const generateTableRows = (doc, sale) => {
  doc.font('Helvetica').fontSize(8);
  
  let i = 1;
  let y = doc.y;
  
  // Draw rows
  sale.items.forEach(item => {
    // Create alternating row background
    if (i % 2 === 0) {
      doc
        .fillColor('#f9f9f9')
        .rect(50, y, 500, 20)
        .fill();
    }
    
    // Determine if item is 22K gold for HSN code
    const isPurity22K = item.product?.purity === '22K' || 
                        (item.customProductDetails?.purity === '22K');
    const isGoldItem = item.product?.category?.includes('Gold') ||
                     (item.customProductDetails?.category?.includes('Gold'));
    const hsnCode = (isGoldItem && isPurity22K) ? '7113' : '';
    
    // Get product name and details
    const prodName = item.product?.name || item.customProductDetails?.name || 'Product';
    const prodCategory = item.product?.category || item.customProductDetails?.category || '';
    const description = `${prodName}\n${prodCategory}`;
    
    // Get HUID if available
    const huid = item.product?.huidNumber || item.customProductDetails?.huid || '-';
    
    // Get weights
    const grossWeight = item.grossWeight || item.product?.grossWeight || 
                       item.customProductDetails?.grossWeight || item.weight || 0;
    const netWeight = item.netWeight || item.product?.netWeight || 
                     item.customProductDetails?.netWeight || item.weight || 0;
    const weightUnit = item.product?.weightType || item.customProductDetails?.weightType || 'g';
    
    // Get making charges percentage - must use the original stored value, not calculate
    const makingChargesPercent = item.makingCharges || 
                               item.customProductDetails?.makingCharges || 
                               (item.product?.makingCharges || 0);
    
    // Calculate making charges in rupees
    const rate = item.rate || 0;
    const metalValue = netWeight * rate;
    const makingChargesAmount = (metalValue * makingChargesPercent / 100);

    // Add row text
    doc
      .fillColor('#000000')
      .text(i.toString(), 55, y + 5)
      .text(description, 75, y + 5, { width: 95 })
      .text(huid, 175, y + 5)
      .text(hsnCode, 230, y + 5)
      .text(item.quantity.toString(), 265, y + 5)
      .text(`${grossWeight} ${weightUnit}`, 290, y + 5)
      .text(`${netWeight} ${weightUnit}`, 345, y + 5)
      .text(`₹${rate.toFixed(2)}`, 395, y + 5)
      .text(`₹${makingChargesAmount.toFixed(2)}`, 450, y + 5)
      .text(`₹${item.total.toFixed(2)}`, 490, y + 5);
    
    // Calculate height needed for this row based on description length
    const textHeight = Math.max(20, doc.heightOfString(description, { width: 95 }) + 10);
    y += textHeight;
    i++;
    
    // Add new page if we're at the bottom
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
  });
  
  doc.moveDown(1);
};

// Generate summary section
const generateSummary = (doc, sale) => {
  // Draw summary divider
  doc
    .moveDown(1)
    .strokeColor('#000000')
    .lineWidth(1)
    .moveTo(350, doc.y)
    .lineTo(550, doc.y)
    .stroke()
    .moveDown(1);
  
  // Summary text
  doc
    .fontSize(10)
    .text('Sub Total:', 400, doc.y)
    .text(`₹${sale.subTotal.toFixed(2)}`, 500, doc.y - 12, { align: 'right' })
    .moveDown(0.5);
  
  if (sale.tax > 0) {
    doc
      .text('Tax:', 400, doc.y)
      .text(`₹${sale.tax.toFixed(2)}`, 500, doc.y - 12, { align: 'right' })
      .moveDown(0.5);
  }
  
  if (sale.discount > 0) {
    doc
      .text('Discount:', 400, doc.y)
      .text(`₹${sale.discount.toFixed(2)}`, 500, doc.y - 12, { align: 'right' })
      .moveDown(0.5);
  }
  
  // Draw total line
  doc
    .strokeColor('#000000')
    .lineWidth(1)
    .moveTo(350, doc.y)
    .lineTo(550, doc.y)
    .stroke()
    .moveDown(1);
  
  // Total amount
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('Total:', 400, doc.y)
    .text(`₹${sale.total.toFixed(2)}`, 500, doc.y - 12, { align: 'right' })
    .moveDown(1);
  
  // Payment details
  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`Payment Method: ${sale.paymentMethod}`)
    .text(`Payment Status: ${sale.paymentStatus}`)
    .moveDown(0.5);
  
  if (sale.notes) {
    doc
      .text(`Notes: ${sale.notes}`)
      .moveDown(1);
  }
};

// Add footer to PDF
const addFooter = (doc) => {
  doc
    .fontSize(10)
    .text('Thank you for your business!', { align: 'center' })
    .moveDown(0.5)
    .text('For any queries, please contact us.', { align: 'center' })
    .moveDown(0.5)
    .fontSize(8)
    .text('This is a computer-generated invoice and does not require a signature.', { align: 'center' });
};

// Function to generate PDF receipt for loan payment
exports.generateLoanReceipt = async (loan, payment, res) => {
  try {
    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Pipe the PDF into the response
    doc.pipe(res);

    // Add business info
    addBusinessDetails(doc);
    
    // Add customer info
    addCustomerInfo(doc, { customer: loan.customer });
    
    // Add receipt header
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('LOAN PAYMENT RECEIPT', { align: 'center' })
      .fontSize(12)
      .font('Helvetica')
      .text(`Receipt No: LP-${payment._id.toString().substr(-6)}`, { align: 'right' })
      .text(`Date: ${new Date(payment.date).toLocaleDateString()}`, { align: 'right' })
      .moveDown(1);
    
    // Add loan details
    doc
      .fontSize(12)
      .text('Loan Details:', { underline: true })
      .text(`Loan Number: ${loan.loanNumber}`)
      .text(`Principal Amount: ₹${loan.principal.toFixed(2)}`)
      .text(`Interest Rate: ${loan.interestRate}% (${loan.interestType})`)
      .text(`Issue Date: ${new Date(loan.issuedDate).toLocaleDateString()}`)
      .text(`Due Date: ${new Date(loan.dueDate).toLocaleDateString()}`)
      .moveDown(1);
    
    // Add payment details
    doc
      .fontSize(12)
      .text('Payment Details:', { underline: true })
      .text(`Amount Paid: ₹${payment.amount.toFixed(2)}`)
      .text(`Payment Method: ${payment.method}`)
      .text(`Payment Date: ${new Date(payment.date).toLocaleDateString()}`)
      .moveDown(1);
    
    if (payment.notes) {
      doc
        .text(`Notes: ${payment.notes}`)
        .moveDown(1);
    }
    
    // Add summary
    doc
      .fontSize(12)
      .text('Summary:', { underline: true })
      .text(`Total Paid (including this payment): ₹${loan.totalPaid.toFixed(2)}`)
      .text(`Remaining Balance: ₹${loan.remainingAmount.toFixed(2)}`)
      .moveDown(2);
    
    // Add footer
    addFooter(doc);

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Could not generate loan receipt PDF');
  }
};

// Function to generate a savings scheme receipt
exports.generateSavingsReceipt = async (saving, installment, res) => {
  try {
    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Pipe the PDF into the response
    doc.pipe(res);

    // Add business info
    addBusinessDetails(doc);
    
    // Add customer info
    addCustomerInfo(doc, { customer: saving.customer });
    
    // Add receipt header
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('SAVINGS INSTALLMENT RECEIPT', { align: 'center' })
      .fontSize(12)
      .font('Helvetica')
      .text(`Receipt No: SI-${installment._id.toString().substr(-6)}`, { align: 'right' })
      .text(`Date: ${new Date(installment.paidDate).toLocaleDateString()}`, { align: 'right' })
      .moveDown(1);
    
    // Add savings scheme details
    doc
      .fontSize(12)
      .text('Savings Scheme Details:', { underline: true })
      .text(`Scheme Number: ${saving.schemeNumber}`)
      .text(`Scheme Name: ${saving.schemeName}`)
      .text(`Total Amount: ₹${saving.totalAmount.toFixed(2)}`)
      .text(`Monthly Installment: ₹${saving.installmentAmount.toFixed(2)}`)
      .text(`Start Date: ${new Date(saving.startDate).toLocaleDateString()}`)
      .text(`Maturity Date: ${new Date(saving.maturityDate).toLocaleDateString()}`)
      .moveDown(1);
    
    // Add installment details
    doc
      .fontSize(12)
      .text('Installment Details:', { underline: true })
      .text(`Amount Paid: ₹${installment.amount.toFixed(2)}`)
      .text(`Payment Method: ${installment.paymentMethod}`)
      .text(`Due Date: ${new Date(installment.dueDate).toLocaleDateString()}`)
      .text(`Paid Date: ${new Date(installment.paidDate).toLocaleDateString()}`)
      .moveDown(1);
    
    if (installment.notes) {
      doc
        .text(`Notes: ${installment.notes}`)
        .moveDown(1);
    }
    
    // Add summary
    doc
      .fontSize(12)
      .text('Summary:', { underline: true })
      .text(`Total Paid: ₹${saving.totalPaid.toFixed(2)}`)
      .text(`Remaining Amount: ₹${saving.remainingAmount.toFixed(2)}`)
      .moveDown(2);
    
    // Add footer
    addFooter(doc);

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Could not generate savings receipt PDF');
  }
}; 