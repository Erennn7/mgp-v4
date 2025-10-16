# GST Invoice Number Display Fix

## Issue
GST invoice numbers (GST-XX or REG-XX) were not being prominently displayed on printed bills, making it difficult to identify invoice numbers for GST compliance and record-keeping.

## Solution Implemented

### Changes Made

#### 1. Added Dedicated Line for GST Invoice Number
Instead of displaying the GST invoice number inline with the "GST INVOICE" badge, it now appears on a separate, dedicated line for maximum visibility.

**Before:**
```
Bill No: INV-000123        Date: 17/10/2025
     [GST INVOICE GST-77]
Customer: John Doe
```

**After:**
```
Bill No: INV-000123        Date: 17/10/2025
GST Invoice No: GST-77
          [GST INVOICE]
Customer: John Doe
```

#### 2. Enhanced Styling
- **Bold text** for the GST invoice number
- **Blue color (#1976d2)** to make it stand out
- **Proper alignment** with other header elements
- **Consistent positioning** across preview, print, and PDF

### Files Modified

1. **frontend/src/components/Printing/BillPrintTemplate.jsx**
   - Added conditional rendering for GST/REG invoice number line
   - Positioned between bill header and bill type indicator
   - Applied bold styling with blue color

2. **frontend/src/components/Printing/PrintBill.jsx**
   - Updated HTML template for direct printing
   - Added GST invoice number line in print output
   - Ensured consistent styling in PDF generation

### Invoice Number Format

#### GST Bills
- **Label:** "GST Invoice No:"
- **Format:** GST-XX
- **Calculation:** serialNumber + 54
- **Example:** If serialNumber = 23, displays as "GST-77"

#### Retail Bills
- **Label:** "Invoice No:"
- **Format:** REG-XX
- **Calculation:** serialNumber
- **Example:** If serialNumber = 23, displays as "REG-23"

### Display Logic

```javascript
// Condition check
if (billData?.serialNumber) {
  // For GST bills (taxRate > 0)
  if (billData?.taxRate > 0 || billData?.tax > 0) {
    display: "GST Invoice No: GST-" + (serialNumber + 54)
  }
  // For Retail bills (no tax)
  else {
    display: "Invoice No: REG-" + serialNumber
  }
}
```

### Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│  Bill No: INV-000123              Date: 17/10/2025     │ <- 4px margin
├─────────────────────────────────────────────────────────┤
│  GST Invoice No: GST-77 (in blue, bold)                │ <- 6px margin
├─────────────────────────────────────────────────────────┤
│              [GST INVOICE] (centered badge)             │ <- 6px margin
├─────────────────────────────────────────────────────────┤
│  Customer: John Doe, Ph: 9876543210                     │ <- 8px margin
├─────────────────────────────────────────────────────────┤
│  [Items Table]                                          │
└─────────────────────────────────────────────────────────┘
```

## Testing

### How to Verify

1. **Preview Mode:**
   - Open a bill with GST/tax applied
   - Check if "GST Invoice No: GST-XX" appears on separate line
   - Verify blue color and bold styling

2. **Print Mode:**
   - Print a GST bill
   - Confirm GST invoice number is visible and properly aligned
   - Check color printing if enabled

3. **PDF Generation:**
   - Generate PDF of a GST bill
   - Verify GST invoice number appears in PDF
   - Confirm styling is preserved

### Test Cases

| Bill Type | Serial Number | Tax Rate | Expected Display |
|-----------|---------------|----------|------------------|
| GST       | 23           | 3%       | GST Invoice No: GST-77 |
| GST       | 1            | 3%       | GST Invoice No: GST-55 |
| Retail    | 23           | 0%       | Invoice No: REG-23 |
| Retail    | 1            | 0%       | Invoice No: REG-1 |

## Benefits

✅ **Improved Compliance:** GST invoice numbers are clearly visible for tax records
✅ **Better Tracking:** Easy to identify and reference specific invoices
✅ **Professional Appearance:** Clean, organized bill layout
✅ **Print-Friendly:** GST number visible in all output formats (preview, print, PDF)
✅ **Consistent Display:** Same appearance across all viewing methods

## Troubleshooting

### GST Invoice Number Not Showing

**Possible Causes:**
1. serialNumber field is missing from billData
2. serialNumber is null or undefined
3. Data not properly loaded

**Solution:**
- Check database for serialNumber field in Sale model
- Verify serialNumber is included in bill data query
- Ensure auto-increment is working for new sales

### Color Not Printing

**Possible Causes:**
- Background graphics disabled in print settings
- Printer settings blocking colors

**Solution:**
- Enable "Background graphics" in browser print dialog
- Check printer color settings
- Verify `-webkit-print-color-adjust: exact` is applied

### Alignment Issues

**Possible Causes:**
- Browser zoom not at 100%
- Incorrect page size selected

**Solution:**
- Reset browser zoom to 100%
- Select correct paper size (A5 Landscape, 210mm x 158mm)
- Ensure margins are set to 0

## Related Documentation
- See `BILL_ALIGNMENT_FIX.md` for complete bill alignment details
- Check Sale model for serialNumber field implementation
- Refer to print settings documentation for optimal results

---
**Last Updated:** 2025-10-17
**Status:** ✅ Fixed and Tested
**Priority:** High (GST Compliance)
