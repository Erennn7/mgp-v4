import React from 'react';
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
  // Updated getHSNCode function
  const getHSNCode = (item) => {
    // Normalize the purity string for comparison
    const normalizedPurity = (item.purity || '').toLowerCase().trim();
    
    // Check for 24K format
    if (normalizedPurity === '24k' || normalizedPurity === '24 k' || normalizedPurity === '24 kt' || normalizedPurity === '24kt') {
      return '7108';
    }
    
    // Check for 24K percentage format (99.9%)
    if (normalizedPurity === '99.9%' || normalizedPurity === '99.9' || normalizedPurity === '99.9 %' || normalizedPurity === '999') {
      return '7108';
    }
    
    // Check for 22K format
    if (normalizedPurity === '22k' || normalizedPurity === '22 k' || normalizedPurity === '22 kt' || normalizedPurity === '22kt') {
      return '7113';
    }
    
    // Check for percentage format (91.6%)
    if (normalizedPurity === '91.6%' || normalizedPurity === '91.6' || normalizedPurity === '91.6 %') {
      return '7113';
    }
    
    return '-';
  };

  return (
    <div className="relative w-[210mm] h-[158mm] bg-white text-black" style={{ 
      width: '210mm', 
      height: '158mm',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Content Area (starts after 38mm from top) */}
      <div className="absolute w-full" style={{
        top: '38mm',
        left: 0,
        right: 0,
        width: '210mm',
        height: '100mm',
        padding: '3mm 5mm',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        fontSize: '9pt',
        lineHeight: '1.2'
      }}>
        {/* Bill Header - Invoice Number and Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontSize: '8pt' }}>
            <span style={{ fontWeight: 'bold' }}>Bill No:</span>{' '}
            <span>{billData?.invoiceNumber || 'INV-XXXXXX'}</span>
          </div>
          <div style={{ fontSize: '10pt' }}>
            <span style={{ fontWeight: 'bold' }}>Date:</span>{' '}
            <span>
              {billData?.date ? format(new Date(billData.date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}
            </span>
          </div>
        </div>

        {/* Invoice Number - GST or REG based on bill type */}
        {billData?.serialNumber && (
          <div style={{ marginBottom: '3px' }}>
            <div style={{ fontSize: '8pt' }}>
              <span style={{ fontWeight: 'bold' }}>
                {(billData?.taxRate > 0 || billData?.tax > 0) ? 'GST Invoice No:' : 'REG Invoice No:'}
              </span>{' '}
              <span style={{ fontWeight: 'bold', color: '#1976d2' }}>
                {(billData?.taxRate > 0 || billData?.tax > 0) ? 
                  `GST-${Number(billData.serialNumber) + 54}` : 
                  `REG-${Number(billData.serialNumber)}`}
              </span>
            </div>
          </div>
        )}

        {/* Customer Information */}
        <div style={{ marginBottom: '8px', fontSize: '8pt' }}>
          <div style={{ marginBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>Name:</span>{' '}
            <span>{billData?.customer?.name || 'Customer Name'}</span>
          </div>
          <div style={{ marginBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>Address:</span>{' '}
            <span>
              {billData?.customer?.address?.street && `${billData.customer.address.street}, `}
              {billData?.customer?.address?.city && `${billData.customer.address.city}, `}
              {billData?.customer?.address?.state && `${billData.customer.address.state} `}
              {billData?.customer?.address?.pincode && `- ${billData.customer.address.pincode}`}
              {!billData?.customer?.address?.street && !billData?.customer?.address?.city && !billData?.customer?.address?.state && !billData?.customer?.address?.pincode && 'N/A'}
            </span>
          </div>
          <div style={{ marginBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>Phone No:</span>{' '}
            <span>{billData?.customer?.phone || 'N/A'}</span>
          </div>
          {billData?.customer?.gstin && (
            <div style={{ marginTop: '2px' }}>
              <span style={{ fontWeight: 'bold' }}>Customer GSTIN:</span>{' '}
              <span>{billData.customer.gstin}</span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '8px', backgroundColor: 'white' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            fontSize: '8pt',
            tableLayout: 'fixed'
          }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', width: '3%', fontWeight: 'bold', backgroundColor: 'white' }}>Sr.</th>
                <th style={{ border: '1px solid #d1d5db', padding: '2px', width: '20%', fontWeight: 'bold', backgroundColor: 'white', textAlign: 'left' }}>Particulars</th>
                <th style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', width: '6%', fontWeight: 'bold', backgroundColor: 'white' }}>Purity</th>
                <th style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', width: '6%', fontWeight: 'bold', backgroundColor: 'white' }}>HUID</th>
                <th style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', width: '5%', fontWeight: 'bold', backgroundColor: 'white' }}>HSN</th>
                <th style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', width: '3%', fontWeight: 'bold', backgroundColor: 'white' }}>PCS</th>
                <th style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', width: '7%', fontWeight: 'bold', backgroundColor: 'white' }}>Gross Wt.</th>
                <th style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', width: '7%', fontWeight: 'bold', backgroundColor: 'white' }}>Net Wt.</th>
                <th style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'right', width: '9%', fontWeight: 'bold', backgroundColor: 'white' }}>Rate(per gm)</th>
                <th style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'right', width: '9%', fontWeight: 'bold', backgroundColor: 'white' }}>Making</th>
                <th style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'right', width: '10%', fontWeight: 'bold', backgroundColor: 'white' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {billData?.items?.map((item, index) => {
                const baseAmount = item.rate * item.weight;
                const makingCharge = item.makingCharge || 0;
                const totalAmount = baseAmount + makingCharge;
                
                return (
                  <tr key={index}>
                    <td style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', backgroundColor: 'white' }}>{index + 1}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '2px', wordBreak: 'break-word', backgroundColor: 'white' }}>
                      {item.description || item.category || 'Jewellery'}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', backgroundColor: 'white' }}>
                      {item.purity || '-'}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', backgroundColor: 'white' }}>
                      {item.huid || (item.product?.huidNumber) || '-'}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', backgroundColor: 'white' }}>
                      {getHSNCode(item)}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', backgroundColor: 'white' }}>{item.quantity || 1}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', backgroundColor: 'white' }}>
                      {item.grossWeight ? `${parseFloat(item.grossWeight).toFixed(3)}g` : '-'}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'center', backgroundColor: 'white' }}>
                      {item.netWeight ? `${parseFloat(item.netWeight).toFixed(3)}g` : '-'}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'right', backgroundColor: 'white' }}>₹{item.rate?.toLocaleString() || '-'}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'right', backgroundColor: 'white' }}>₹{makingCharge?.toLocaleString() || '-'}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '2px', textAlign: 'right', backgroundColor: 'white' }}>₹{totalAmount.toLocaleString()}</td>
                  </tr>
                );
              })}
              
              {/* Add empty rows to maintain table size */}
              {Array.from({ length: Math.max(0, 5 - (billData?.items?.length || 0)) }).map((_, index) => (
                <tr key={`empty-${index}`}>
                  <td style={{ border: '1px solid #d1d5db', height: '16px', backgroundColor: 'white' }}></td>
                  <td style={{ border: '1px solid #d1d5db', backgroundColor: 'white' }}></td>
                  <td style={{ border: '1px solid #d1d5db', backgroundColor: 'white' }}></td>
                  <td style={{ border: '1px solid #d1d5db', backgroundColor: 'white' }}></td>
                  <td style={{ border: '1px solid #d1d5db', backgroundColor: 'white' }}></td>
                  <td style={{ border: '1px solid #d1d5db', backgroundColor: 'white' }}></td>
                  <td style={{ border: '1px solid #d1d5db', backgroundColor: 'white' }}></td>
                  <td style={{ border: '1px solid #d1d5db', backgroundColor: 'white' }}></td>
                  <td style={{ border: '1px solid #d1d5db', backgroundColor: 'white' }}></td>
                  <td style={{ border: '1px solid #d1d5db', backgroundColor: 'white' }}></td>
                  <td style={{ border: '1px solid #d1d5db', backgroundColor: 'white' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
          
          // Apply discount if available
          const discountAmount = billData?.discount ? parseFloat(billData.discount) : 0;
          const discountedSubTotal = calculatedSubTotal - discountAmount;
          
          // Calculate tax based on discounted subtotal
          const taxRate = billData?.taxRate || 3;
          const calculatedTax = discountedSubTotal * (taxRate / 100);
          
          // Calculate grand total
          const calculatedGrandTotal = discountedSubTotal + calculatedTax;
          
          // Use the total from billData if provided (takes precedence over calculation)
          const finalGrandTotal = billData?.total ? parseFloat(billData.total) : calculatedGrandTotal;
          
          // Update amount in words
          const amountInWords = billData?.amountInWords || convertToWords(finalGrandTotal);
          
          return (
            <>
              {/* Total Calculation */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                <div style={{ width: '33%', border: '1px solid #d1d5db', backgroundColor: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', borderBottom: '1px solid #d1d5db', backgroundColor: 'white', fontSize: '8pt' }}>
                    <span>Sub Total:</span>
                    <span>₹{calculatedSubTotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', borderBottom: '1px solid #d1d5db', backgroundColor: 'white', fontSize: '8pt' }}>
                        <span>Discount:</span>
                        <span>-₹{discountAmount.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', borderBottom: '1px solid #d1d5db', backgroundColor: 'white', fontSize: '8pt' }}>
                        <span>Net Amount:</span>
                        <span>₹{discountedSubTotal.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  {taxRate > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', borderBottom: '1px solid #d1d5db', backgroundColor: 'white', fontSize: '8pt' }}>
                        <span>CGST ({taxRate/2}%):</span>
                        <span>₹{(calculatedTax/2).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', borderBottom: '1px solid #d1d5db', backgroundColor: 'white', fontSize: '8pt' }}>
                        <span>SGST ({taxRate/2}%):</span>
                        <span>₹{(calculatedTax/2).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', backgroundColor: 'white', fontSize: '8pt' }}>
                    <span style={{ fontWeight: 'bold' }}>Grand Total:</span>
                    <span style={{ fontWeight: 'bold' }}>₹{finalGrandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Additional Information - Compact version */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginTop: '4px' }}>
                <div style={{ width: '60%' }}>
                  <p style={{ fontSize: '8pt', fontStyle: 'italic', marginBottom: '4px', margin: 0 }}>
                    Amount in words: {amountInWords}
                  </p>
                </div>
                <div style={{ width: '40%', textAlign: 'right' }}>
                  <p style={{ fontSize: '8pt', marginBottom: '4px', margin: 0 }}>
                    Payment Mode: {billData?.paymentMethod || 'Cash'}
                  </p>
                </div>
              </div>

              {/* GSTIN in the content area instead of bottom strip */}
              {taxRate > 0 && (
                <div style={{ textAlign: 'center', fontSize: '8pt', fontWeight: 'bold', marginTop: '4px' }}>
                  GSTIN: 27DGJPP9641E1ZZ
                  {billData?.customer?.gstin && ` | Customer GSTIN: ${billData.customer.gstin}`}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default BillPrintTemplate;