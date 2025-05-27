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
    <div className="relative w-[210mm] h-[158mm] bg-white text-black">
      {/* Content Area (starts after 38mm from top) */}
      <div className="absolute top-[38mm] w-full h-[100mm] p-[3mm] box-border font-sans text-[9pt]">
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

        {/* Bill Type Indicator */}
        <div className="mb-2 text-center">
          <span className={`font-bold inline-block py-1 px-3 text-[12pt] ${billData?.taxRate > 0 || billData?.tax > 0 ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'} border rounded-md`}>
            {billData?.taxRate > 0 || billData?.tax > 0 ? 'GST INVOICE' : 'RETAIL INVOICE'}
            {billData?.serialNumber && (
              <span className="ml-2 text-[10pt]">
                {billData?.taxRate > 0 || billData?.tax > 0 ? 
                  `GST-${Number(billData.serialNumber) + 54}` : 
                  `REG-${Number(billData.serialNumber)}`}
              </span>
            )}
          </span>
        </div>

        {/* Customer Information */}
        <div className="mb-4">
          <span className="font-bold text-[10pt]">Customer:</span>{' '}
          <span className="text-[10pt]">
            {billData?.customer?.name || 'Customer Name'},
            {billData?.customer?.phone ? ` Ph: ${billData.customer.phone}` : ''}
          </span>
          {billData?.customer?.gstin && (
            <div className="mt-1">
              <span className="font-bold text-[10pt]">Customer GSTIN:</span>{' '}
              <span className="text-[10pt]">{billData.customer.gstin}</span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-2 bg-white">
          <table className="w-full border-collapse bg-white text-[8pt]">
            <thead>
              <tr>
                <th className="border border-gray-300 p-[2px] text-center w-[3%] font-bold bg-white">Sr.</th>
                <th className="border border-gray-300 p-[2px] w-[20%] font-bold bg-white">Particulars</th>
                <th className="border border-gray-300 p-[2px] text-center w-[6%] font-bold bg-white">Purity</th>
                <th className="border border-gray-300 p-[2px] text-center w-[6%] font-bold bg-white">HUID</th>
                <th className="border border-gray-300 p-[2px] text-center w-[5%] font-bold bg-white">HSN</th>
                <th className="border border-gray-300 p-[2px] text-center w-[3%] font-bold bg-white">PCS</th>
                <th className="border border-gray-300 p-[2px] text-center w-[7%] font-bold bg-white">Gross Wt.</th>
                <th className="border border-gray-300 p-[2px] text-center w-[7%] font-bold bg-white">Net Wt.</th>
                <th className="border border-gray-300 p-[2px] text-right w-[9%] font-bold bg-white">Rate</th>
                <th className="border border-gray-300 p-[2px] text-right w-[9%] font-bold bg-white">Making</th>
                <th className="border border-gray-300 p-[2px] text-right w-[10%] font-bold bg-white">Amount</th>
              </tr>
            </thead>
            <tbody>
              {billData?.items?.map((item, index) => {
                const baseAmount = item.rate * item.weight;
                const makingCharge = item.makingCharge || 0;
                const totalAmount = baseAmount + makingCharge;
                
                return (
                  <tr key={index}>
                    <td className="border border-gray-300 p-[2px] text-center">{index + 1}</td>
                    <td className="border border-gray-300 p-[2px] break-words">
                      {item.description || item.category || 'Jewellery'}
                    </td>
                    <td className="border border-gray-300 p-[2px] text-center">
                      {item.purity || '-'}
                    </td>
                    <td className="border border-gray-300 p-[2px] text-center">
                      {item.huid || (item.product?.huidNumber) || '-'}
                    </td>
                    <td className="border border-gray-300 p-[2px] text-center">
                      {getHSNCode(item)}
                    </td>
                    <td className="border border-gray-300 p-[2px] text-center">{item.quantity || 1}</td>
                    <td className="border border-gray-300 p-[2px] text-center">
                      {item.grossWeight ? `${parseFloat(item.grossWeight).toFixed(3)}g` : '-'}
                    </td>
                    <td className="border border-gray-300 p-[2px] text-center">
                      {item.netWeight ? `${parseFloat(item.netWeight).toFixed(3)}g` : '-'}
                    </td>
                    <td className="border border-gray-300 p-[2px] text-right">₹{item.rate?.toLocaleString() || '-'}</td>
                    <td className="border border-gray-300 p-[2px] text-right">₹{makingCharge?.toLocaleString() || '-'}</td>
                    <td className="border border-gray-300 p-[2px] text-right">₹{totalAmount.toLocaleString()}</td>
                  </tr>
                );
              })}
              
              {/* Add empty rows to maintain table size */}
              {Array.from({ length: Math.max(0, 5 - (billData?.items?.length || 0)) }).map((_, index) => (
                <tr key={`empty-${index}`}>
                  <td className="border border-gray-300 h-3"></td>
                  <td className="border border-gray-300"></td>
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
              <div className="flex justify-end mb-1">
                <div className="w-1/3 border border-gray-300 bg-white">
                  <div className="flex justify-between px-2 py-[2px] border-b border-gray-300 bg-white">
                    <span className="text-[8pt]">Sub Total:</span>
                    <span className="text-[8pt]">₹{calculatedSubTotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <>
                      <div className="flex justify-between px-2 py-[2px] border-b border-gray-300 bg-white">
                        <span className="text-[8pt]">Discount:</span>
                        <span className="text-[8pt]">-₹{discountAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between px-2 py-[2px] border-b border-gray-300 bg-white">
                        <span className="text-[8pt]">Net Amount:</span>
                        <span className="text-[8pt]">₹{discountedSubTotal.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  {taxRate > 0 && (
                    <>
                      <div className="flex justify-between px-2 py-[2px] border-b border-gray-300 bg-white">
                        <span className="text-[8pt]">CGST ({taxRate/2}%):</span>
                        <span className="text-[8pt]">₹{(calculatedTax/2).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between px-2 py-[2px] border-b border-gray-300 bg-white">
                        <span className="text-[8pt]">SGST ({taxRate/2}%):</span>
                        <span className="text-[8pt]">₹{(calculatedTax/2).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between px-2 py-[2px] bg-white">
                    <span className="text-[8pt] font-bold">Grand Total:</span>
                    <span className="text-[8pt] font-bold">₹{finalGrandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Additional Information - Compact version */}
              <div className="flex justify-between text-[8pt] mt-1">
                <div className="w-3/5">
                  <p className="text-[8pt] italic mb-1">
                    Amount in words: {amountInWords}
                  </p>
                </div>
                <div className="w-2/5 text-right">
                  <p className="text-[8pt] mb-1">
                    Payment Mode: {billData?.paymentMethod || 'Cash'}
                  </p>
                </div>
              </div>

              {/* GSTIN in the content area instead of bottom strip */}
              {taxRate > 0 && (
                <div className="text-center text-[8pt] font-bold mt-1">
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