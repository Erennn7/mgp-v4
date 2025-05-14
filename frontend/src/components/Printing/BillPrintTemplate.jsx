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
    <div className="relative w-[209.55mm] h-[158.75mm] bg-white text-black">
      {/* Content Area (starts after 39mm from top) */}
      <div className="absolute top-[39mm] w-full h-[100mm] p-[3mm] box-border font-sans text-[10pt]">
        {/* Bill Header - Invoice Number and Date */}
        <div className="flex justify-between mb-4">
          <div>
            <span className="font-bold text-[10pt]">Bill No:</span>{' '}
            <span className="text-[10pt]">{billData?.invoiceNumber || 'INV-XXXXXX'}</span>
          </div>
          <div>
            <span className="font-bold text-[10pt]">Date:</span>{' '}
            <span className="text-[10pt]">
              {billData?.date ? format(new Date(billData.date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}
            </span>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-4">
          <span className="font-bold text-[10pt]">Customer:</span>{' '}
          <span className="text-[10pt]">
            {billData?.customer?.name || 'Customer Name'},
            {billData?.customer?.phone ? ` Ph: ${billData.customer.phone}` : ''}
          </span>
        </div>

        {/* Items Table */}
        <div className="mb-4 bg-white">
          <table className="w-full border-collapse bg-white text-[9pt]">
            <thead>
              <tr>
                <th className="border border-gray-300 p-1 text-center w-[4%] font-bold bg-white">Sr.</th>
                <th className="border border-gray-300 p-1 w-[22%] font-bold bg-white">Particulars</th>
                <th className="border border-gray-300 p-1 text-center w-[9%] font-bold bg-white">HUID</th>
                <th className="border border-gray-300 p-1 text-center w-[6%] font-bold bg-white">HSN</th>
                <th className="border border-gray-300 p-1 text-center w-[5%] font-bold bg-white">PCS</th>
                <th className="border border-gray-300 p-1 text-center w-[8%] font-bold bg-white">Gross Wt.</th>
                <th className="border border-gray-300 p-1 text-center w-[8%] font-bold bg-white">Net Wt.</th>
                <th className="border border-gray-300 p-1 text-right w-[10%] font-bold bg-white">Rate</th>
                <th className="border border-gray-300 p-1 text-right w-[10%] font-bold bg-white">Making</th>
                <th className="border border-gray-300 p-1 text-right w-[12%] font-bold bg-white">Amount</th>
              </tr>
            </thead>
            <tbody>
              {billData?.items?.map((item, index) => {
                const baseAmount = item.rate * item.weight;
                const makingCharge = item.makingCharge || 0;
                const totalAmount = baseAmount + makingCharge;
                
                return (
                  <tr key={index}>
                    <td className="border border-gray-300 p-1 text-center">{index + 1}</td>
                    <td className="border border-gray-300 p-1 break-words">
                      {item.description || `${item.category || ''} ${item.purity || ''}`}
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      {item.huid || (item.product?.huidNumber) || '-'}
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      {getHSNCode(item)}
                    </td>
                    <td className="border border-gray-300 p-1 text-center">{item.quantity || 1}</td>
                    <td className="border border-gray-300 p-1 text-center">
                      {item.grossWeight ? `${parseFloat(item.grossWeight).toFixed(3)}g` : '-'}
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      {item.netWeight ? `${parseFloat(item.netWeight).toFixed(3)}g` : '-'}
                    </td>
                    <td className="border border-gray-300 p-1 text-right">₹{item.rate?.toLocaleString() || '-'}</td>
                    <td className="border border-gray-300 p-1 text-right">₹{makingCharge?.toLocaleString() || '-'}</td>
                    <td className="border border-gray-300 p-1 text-right">₹{totalAmount.toLocaleString()}</td>
                  </tr>
                );
              })}
              
              {/* Add empty rows to maintain table size */}
              {Array.from({ length: Math.max(0, 5 - (billData?.items?.length || 0)) }).map((_, index) => (
                <tr key={`empty-${index}`}>
                  <td className="border border-gray-300 h-4"></td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300"></td>
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
          
          // Calculate tax
          const taxRate = billData?.taxRate || 3;
          const calculatedTax = calculatedSubTotal * (taxRate / 100);
          
          // Calculate grand total
          const calculatedGrandTotal = calculatedSubTotal + calculatedTax;
          
          return (
            <>
              {/* Total Calculation */}
              <div className="flex justify-end mb-4">
                <div className="w-2/5 border border-gray-300 bg-white">
                  <div className="flex justify-between px-4 py-1 border-b border-gray-300 bg-white">
                    <span className="text-[9pt]">Sub Total:</span>
                    <span className="text-[9pt]">₹{calculatedSubTotal.toLocaleString()}</span>
                  </div>
                  {taxRate > 0 && (
                    <>
                      <div className="flex justify-between px-4 py-1 border-b border-gray-300 bg-white">
                        <span className="text-[9pt]">CGST ({taxRate/2}%):</span>
                        <span className="text-[9pt]">₹{(calculatedTax/2).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between px-4 py-1 border-b border-gray-300 bg-white">
                        <span className="text-[9pt]">SGST ({taxRate/2}%):</span>
                        <span className="text-[9pt]">₹{(calculatedTax/2).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between px-4 py-1 bg-white">
                    <span className="text-[9pt] font-bold">Grand Total:</span>
                    <span className="text-[9pt] font-bold">₹{calculatedGrandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="text-[9pt] mt-4">
                <p className="text-[9pt] italic">
                  Amount in words: {billData?.amountInWords || convertToWords(calculatedGrandTotal)}
                </p>
                <div className="flex justify-between mt-4">
                  <p className="text-[9pt]">
                    Payment Mode: {billData?.paymentMethod || 'Cash'}
                  </p>
                </div>
              </div>
            </>
          );
        })()}
      </div>
      
      {/* GSTIN in bottom strip */}
      {(() => {
        // Calculate tax rate to determine if GSTIN should be shown
        const taxRate = billData?.taxRate || 0;
        
        // Only show GSTIN if tax rate is greater than 0
        if (taxRate > 0) {
          return (
            <div className="absolute bottom-[10mm] w-full text-center text-[10pt] font-bold">
              <p className="text-[10pt]">
                GSTIN: 27DGJPP9641E1ZZ
              </p>
            </div>
          );
        }
        
        // Return null if tax rate is 0
        return null;
      })()}
    </div>
  );
};

export default BillPrintTemplate;