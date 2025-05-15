import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TrendingUp as TrendingUpIcon,
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  ArrowDownward as InwardIcon
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import api from '../../services/api';
import { toast } from 'react-toastify';

const Reports = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [reportType, setReportType] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');
  const [inventoryData, setInventoryData] = useState({
    products: [],
    sales: []
  });
  
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  
  const handleGenerateReport = async () => {
    setLoading(true);
    setError('');
    try {
      // Calculate date range for the selected month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      console.log(`Fetching ${reportType} for date range:`, { 
        startDate: startDate.toLocaleDateString(),
        endDate: endDate.toLocaleDateString(),
      });
      
      // Fetch data based on report type
      let response;
      let filteredData = [];
      
      // Handle inventory inward report
      if (reportType === 'inventory_inward') {
        try {
          const result = await fetchInventoryInwardData(startDate, endDate);
          if (result && typeof result === 'object') {
            try {
              // Call the PDF generation with the direct data
              await generateInventoryInwardPDF(result);
              console.log("PDF generation completed successfully");
            } catch (pdfErr) {
              console.error("Error during PDF generation:", pdfErr);
              setError(`Failed to generate PDF: ${pdfErr.message || 'Unknown error'}`);
              setOpenDialog(true);
            }
          } else {
            // If no data was returned
            console.error("No valid data returned from fetchInventoryInwardData");
            setError("No valid data available for the report");
            setOpenDialog(true);
          }
          setLoading(false);
        } catch (err) {
          console.error("Error in inventory report flow:", err);
          setError(`Failed to process inventory report: ${err.message || 'Unknown error'}`);
          setOpenDialog(true);
          setLoading(false);
        }
        return;
      }
      
      // First check if we have any data at all
      if (reportType === 'sales') {
        const checkResponse = await api.get(`/sales?limit=5`);
        console.log(`Total sales in system: ${checkResponse.data.count}`);
        
        if (checkResponse.data.count === 0) {
          setError(`No sales data found in the system.`);
          setLoading(false);
          setOpenDialog(true);
          return;
        }
        
        // Try to use server-side filtering first
        try {
          // URL approach with MongoDB operators
          const url = `/sales?limit=1000&createdAt[gte]=${startDate.toISOString()}&createdAt[lte]=${endDate.toISOString()}`;
          response = await api.get(url);
          console.log(`Sales for selected period (server filtered): ${response.data.count}`);
          
          if (response.data.count === 0) {
            // If server filtering returns no results, try getting all sales and filter client-side
            console.log("Server filtering returned no results. Trying client-side filtering...");
            const allSalesResponse = await api.get(`/sales?limit=1000`);
            
            // Client-side filtering
            if (allSalesResponse.data && allSalesResponse.data.data && allSalesResponse.data.data.length > 0) {
              filteredData = allSalesResponse.data.data.filter(sale => {
                const saleDate = new Date(sale.createdAt);
                return saleDate >= startDate && saleDate <= endDate;
              });
              
              console.log(`Sales for selected period (client filtered): ${filteredData.length}`);
              
              if (filteredData.length > 0) {
                // Override response.data.data with our filtered data
                response.data.data = filteredData;
                response.data.count = filteredData.length;
              }
            }
          }
        } catch (err) {
          console.error("Error with server filtering:", err);
          // Fall back to getting all sales and filtering client-side
          const allSalesResponse = await api.get(`/sales?limit=1000`);
          
          // Client-side filtering
          if (allSalesResponse.data && allSalesResponse.data.data && allSalesResponse.data.data.length > 0) {
            filteredData = allSalesResponse.data.data.filter(sale => {
              const saleDate = new Date(sale.createdAt);
              return saleDate >= startDate && saleDate <= endDate;
            });
            
            console.log(`Sales for selected period (client filtered after error): ${filteredData.length}`);
            
            if (filteredData.length > 0) {
              // Create response structure if we're using filtered data
              response = {
                data: {
                  data: filteredData,
                  count: filteredData.length
                }
              };
            } else if (!response) {
              // If we still have no data, create an empty response
              response = {
                data: {
                  data: [],
                  count: 0
                }
              };
            }
          }
        }
      } else if (reportType === 'purchases') {
        const checkResponse = await api.get(`/purchases?limit=5`);
        console.log(`Total purchases in system: ${checkResponse.data.count}`);
        
        if (checkResponse.data.count === 0) {
          setError(`No purchase data found in the system.`);
          setLoading(false);
          setOpenDialog(true);
          return;
        }
        
        // Try to use server-side filtering first
        try {
          // URL approach with MongoDB operators
          const url = `/purchases?limit=1000&purchaseDate[gte]=${startDate.toISOString()}&purchaseDate[lte]=${endDate.toISOString()}`;
          response = await api.get(url);
          console.log(`Purchases for selected period (server filtered): ${response.data.count}`);
          
          if (response.data.count === 0) {
            // If server filtering returns no results, try getting all purchases and filter client-side
            console.log("Server filtering returned no results. Trying client-side filtering...");
            const allPurchasesResponse = await api.get(`/purchases?limit=1000`);
            
            // Client-side filtering
            if (allPurchasesResponse.data && allPurchasesResponse.data.data && allPurchasesResponse.data.data.length > 0) {
              filteredData = allPurchasesResponse.data.data.filter(purchase => {
                const purchaseDate = new Date(purchase.purchaseDate);
                return purchaseDate >= startDate && purchaseDate <= endDate;
              });
              
              console.log(`Purchases for selected period (client filtered): ${filteredData.length}`);
              
              if (filteredData.length > 0) {
                // Override response.data.data with our filtered data
                response.data.data = filteredData;
                response.data.count = filteredData.length;
              }
            }
          }
        } catch (err) {
          console.error("Error with server filtering:", err);
          // Fall back to getting all purchases and filtering client-side
          const allPurchasesResponse = await api.get(`/purchases?limit=1000`);
          
          // Client-side filtering
          if (allPurchasesResponse.data && allPurchasesResponse.data.data && allPurchasesResponse.data.data.length > 0) {
            filteredData = allPurchasesResponse.data.data.filter(purchase => {
              const purchaseDate = new Date(purchase.purchaseDate);
              return purchaseDate >= startDate && purchaseDate <= endDate;
            });
            
            console.log(`Purchases for selected period (client filtered after error): ${filteredData.length}`);
            
            if (filteredData.length > 0) {
              // Create response structure if we're using filtered data
              response = {
                data: {
                  data: filteredData,
                  count: filteredData.length
                }
              };
            } else if (!response) {
              // If we still have no data, create an empty response
              response = {
                data: {
                  data: [],
                  count: 0
                }
              };
            }
          }
        }
      }
      
      console.log(`Final response data count:`, response?.data?.count || 0);
      console.log(`Report type:`, reportType);
      
      if (!response || !response.data || !response.data.data || response.data.data.length === 0) {
        setError(`No ${reportType} data found for the selected month (${months.find(m => m.value === month).label} ${year}).`);
        setLoading(false);
        setOpenDialog(true);
        return;
      }
      
      generatePDF(response.data.data, reportType);
      
    } catch (err) {
      console.error('Error generating report:', err);
      // Log more details about the error
      if (err.response) {
        console.error('API Error Response:', err.response.data);
        console.error('Status:', err.response.status);
        
        // If we get a 401, we need to redirect to login
        if (err.response.status === 401) {
          toast.error('Your session has expired. Please log in again.');
        }
      }
      setError(`Failed to generate report: ${err.message || 'Unknown error'}`);
      setOpenDialog(true);
    } finally {
      setLoading(false);
    }
  };
  
  const generatePDF = (data, type) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      setError(`No ${type} data to generate the report.`);
      setOpenDialog(true);
      return;
    }
    
    // Create a new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add global header function to ensure consistent headers on all pages
    const addPageHeader = () => {
      // Add report title
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Monthly ${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${months.find(m => m.value === month).label} ${year}`, 14, 10);
      
      // Add generation date
      const today = new Date();
      doc.text(`Generated: ${format(today, 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, 10, { align: 'right' });
      
      // Add page divider
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 12, pageWidth - 14, 12);
    };

    // Set header and footer on all pages
    doc.setHeaderFunction(addPageHeader);

    // Add title on first page
    const title = `Monthly ${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${months.find(m => m.value === month).label} ${year}`;
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(title, pageWidth / 2, 20, { align: 'center' });
    
    // Add summary section
    doc.setFontSize(14);
    doc.text('Summary', 14, 30);
    
    // Declare table columns and rows variables
    let tableColumns = [];
    let tableRows = [];
    let currentY = 65; // Default starting Y position for tables
    
    if (type === 'sales') {
      // Filter and sort data for GST and non-GST bills
      const gstBills = data.filter(sale => sale.tax > 0);
      const nonGstBills = data.filter(sale => sale.tax === 0);
      
      // Sort by creation date
      const sortedGstBills = [...gstBills].sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      const sortedNonGstBills = [...nonGstBills].sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      // Calculate totals for each type
      const gstTotal = sortedGstBills.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
      const nonGstTotal = sortedNonGstBills.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
      const total = gstTotal + nonGstTotal;
      
      // Print summary information
      doc.setFontSize(12);
      doc.text(`Total Number of ${type}: ${data.length}`, 14, 40);
      doc.text(`GST Bills: ${sortedGstBills.length} (₹${gstTotal.toFixed(2)})`, 14, 47);
      doc.text(`Non-GST Bills: ${sortedNonGstBills.length} (₹${nonGstTotal.toFixed(2)})`, 14, 54);
      doc.text(`Total Amount: ₹${total.toFixed(2)}`, 14, 61);
      
      // Define column structure
      const columns = [
        { header: 'Serial #', dataKey: 'serialNumber' },
        { header: 'Invoice #', dataKey: 'invoiceNumber' },
        { header: 'Date', dataKey: 'date' },
        { header: 'Customer', dataKey: 'customer' },
        { header: 'Items', dataKey: 'items' },
        { header: 'Total', dataKey: 'total' }
      ];
      
      // First table: GST Bills
      if (sortedGstBills.length > 0) {
        doc.setFontSize(14);
        doc.text('GST Bills', 14, currentY);
        
        // Create GST bills data
        const gstTableRows = sortedGstBills.map((sale, index) => ({
          serialNumber: (index + 1).toString().padStart(4, '0'),
          invoiceNumber: sale.invoiceNumber || '-',
          date: sale.createdAt ? format(new Date(sale.createdAt), 'dd/MM/yyyy') : '-',
          customer: sale.customer && sale.customer.name ? sale.customer.name : '-',
          items: sale.items ? sale.items.length : 0,
          total: `₹${(sale.total || 0).toFixed(2)}`
        }));
        
        // Generate GST table
        const gstTable = doc.autoTable({
          startY: currentY + 5,
          head: [columns.map(col => col.header)],
          body: gstTableRows.map(row => columns.map(col => row[col.dataKey])),
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185], textColor: 255 }, // Blue header for GST
          didDrawPage: (data) => {
            // Update current Y position after the table is drawn
            currentY = data.cursor.y + 20;
          }
        });
        
        // Update position after table
        currentY = gstTable.lastAutoTable.finalY + 20;
      }
      
      // Second table: Non-GST Bills
      if (sortedNonGstBills.length > 0) {
        doc.setFontSize(14);
        doc.text('Non-GST Bills', 14, currentY);
        
        // Create non-GST bills data
        const nonGstTableRows = sortedNonGstBills.map((sale, index) => ({
          serialNumber: (index + 1).toString().padStart(4, '0'),
          invoiceNumber: sale.invoiceNumber || '-',
          date: sale.createdAt ? format(new Date(sale.createdAt), 'dd/MM/yyyy') : '-',
          customer: sale.customer && sale.customer.name ? sale.customer.name : '-',
          items: sale.items ? sale.items.length : 0,
          total: `₹${(sale.total || 0).toFixed(2)}`
        }));
        
        // Generate non-GST table
        doc.autoTable({
          startY: currentY + 5,
          head: [columns.map(col => col.header)],
          body: nonGstTableRows.map(row => columns.map(col => row[col.dataKey])),
          theme: 'striped',
          headStyles: { fillColor: [46, 204, 113], textColor: 255 } // Green header for non-GST
        });
      }
    } else if (type === 'purchases') {
      // For purchases, keep the original format
      const total = data.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
      
      doc.setFontSize(12);
      doc.text(`Total Number of ${type}: ${data.length}`, 14, 40);
      doc.text(`Total Amount: ₹${total.toFixed(2)}`, 14, 47);
      
      // Add purchases table title
      doc.setFontSize(14);
      doc.text('Purchases Details', 14, 60);
      
      // Define columns for purchases
      tableColumns = [
        { header: 'Purchase #', dataKey: 'purchaseNumber' },
        { header: 'Date', dataKey: 'date' },
        { header: 'Vendor', dataKey: 'vendor' },
        { header: 'Items', dataKey: 'items' },
        { header: 'Total', dataKey: 'total' }
      ];
      
      // Create data rows for purchases
      tableRows = data.map(purchase => ({
        purchaseNumber: purchase.purchaseNumber || '-',
        date: purchase.purchaseDate ? format(new Date(purchase.purchaseDate), 'dd/MM/yyyy') : '-',
        vendor: purchase.vendor && purchase.vendor.name ? purchase.vendor.name : '-',
        items: purchase.items ? purchase.items.length : 0,
        total: `₹${(purchase.totalAmount || 0).toFixed(2)}`
      }));
      
      // Generate purchases table
      doc.autoTable({
        startY: 65,
        head: [tableColumns.map(col => col.header)],
        body: tableRows.map(row => tableColumns.map(col => row[col.dataKey])),
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] }
      });
    }
    
    // Regular Products from Sales Table
    if (data && data.regularProductsFromSales && data.regularProductsFromSales.length > 0) {
      doc.setFontSize(14);
      doc.text('Regular Products Sold', 14, currentY);
      currentY += 10;
      
      // Define columns for regular products from sales
      const soldProductsColumns = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Invoice #', dataKey: 'invoice' },
        { header: 'Product Name', dataKey: 'name' },
        { header: 'Category', dataKey: 'category' },
        { header: 'Weight', dataKey: 'weight' },
        { header: 'Quantity', dataKey: 'quantity' }
      ];
      
      console.log(`Preparing data for ${data.regularProductsFromSales.length} sold products table rows`);
      
      // Create data rows for regular products from sales
      const soldProductsRows = data.regularProductsFromSales.map((item, index) => {
        // Check if the item has valid data
        if (!item || typeof item !== 'object' || !item.product) {
          console.error(`Invalid sold product at index ${index}:`, item);
          return {
            date: '-',
            invoice: '-',
            name: 'Invalid product data',
            category: '-',
            weight: '-',
            quantity: 0
          };
        }
        
        // Format the data for display
        const row = {
          date: item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy') : '-',
          invoice: item.invoiceNumber || '-',
          name: item.product.name || 'Unknown Product',
          category: item.product.category || '-',
          weight: item.netWeight ? 
            `${item.netWeight} ${item.product.weightType || 'Gram'}` : 
            (item.weight ? `${item.weight} Gram` : '-'),
          quantity: item.quantity || 1
        };
        
        if (index < 5) {
          console.log(`Sold product table row ${index}:`, row);
        }
        
        return row;
      });
      
      console.log(`Generated ${soldProductsRows.length} rows for sold products table`);
      
      // Generate sold products table
      try {
        console.log("Sold products table setup: columns =", soldProductsColumns.length, "rows =", soldProductsRows.length);
        
        // Create arrays for the table body with proper error checking
        const soldProductsTableBody = soldProductsRows.map(row => {
          try {
            return soldProductsColumns.map(col => {
              // Return empty string if value is undefined (prevents PDF generation issues)
              return row[col.dataKey] !== undefined ? row[col.dataKey] : '';
            });
          } catch (rowErr) {
            console.error("Error processing row for sold products table:", rowErr);
            return soldProductsColumns.map(() => ''); // Return empty values if row processing fails
          }
        });
        
        console.log("Sold products table body prepared with", soldProductsTableBody.length, "rows");
        
        const soldProductsTable = doc.autoTable({
          startY: currentY,
          head: [soldProductsColumns.map(col => col.header)],
          body: soldProductsTableBody,
          theme: 'striped',
          headStyles: { fillColor: [255, 140, 0], textColor: 255 }, // Orange header for sold products
          didDrawPage: (data) => {
            // Add header on each page
            addPageHeader(data);
          }
        });
        
        console.log("Sold products table created successfully");
        currentY = soldProductsTable.lastAutoTable.finalY + 15;
      } catch (err) {
        console.error("Error generating sold products table:", err);
        console.error("Error details:", err.message, err.stack);
      }
    }
    
    // Custom Products Table
    if (data && data.products && data.products.length > 0) {
      doc.setFontSize(14);
      doc.text('Custom Products Added', 14, currentY);
      currentY += 10;
      
      // Update columns for consolidated custom products (removing invoice)
      const consolidatedCustomColumns = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Product Name', dataKey: 'name' },
        { header: 'Category', dataKey: 'category' },
        { header: 'Weight', dataKey: 'weight' },
        { header: 'Quantity', dataKey: 'quantity' }
      ];
      
      console.log(`Preparing data for ${data.products.length} custom products table rows`);
      
      // Create data rows for custom products
      const customRows = data.products.map((product, index) => {
        // Check if the product has valid data
        if (!product || typeof product !== 'object') {
          console.error(`Invalid custom product at index ${index}:`, product);
          return {
            date: '-',
            invoice: '-',
            name: 'Invalid custom product data',
            category: '-',
            weight: '-',
            quantity: 0
          };
        }
        
        // Get product name from customProductDetails, with fallback
        const productName = product.customProductDetails?.name || 'Custom Product';
        const productCategory = product.customProductDetails?.category || '-';
        
        // Handle weight display with proper checks
        let weightDisplay = '-';
        if (product.customProductDetails?.netWeight) {
          const weightValue = product.customProductDetails.netWeight;
          const weightUnit = product.customProductDetails.weightType || 'Gram';
          weightDisplay = `${weightValue} ${weightUnit}`;
        } else if (product.weight) {
          // Fallback to item weight if netWeight is not in customProductDetails
          weightDisplay = `${product.weight} Gram`;
        }
        
        // Format the data for display
        const row = {
          date: product.createdAt ? format(new Date(product.createdAt), 'dd/MM/yyyy') : '-',
          invoice: product.invoiceNumber || '-',
          name: productName,
          category: productCategory,
          weight: weightDisplay,
          quantity: product.stock || 0
        };
        
        if (index < 5) {
          console.log(`Custom product table row ${index}:`, row);
        }
        
        return row;
      });
      
      console.log(`Generated ${customRows.length} rows for custom products table`);
      
      // Consolidate custom products by name, category, and weight
      const consolidatedCustomProducts = {};
      
      customRows.forEach(product => {
        // Check if the product has valid data
        if (!product || typeof product !== 'object') {
          return;
        }
        
        // Create a unique key for each product type
        const key = `${product.name}_${product.category}_${product.weight}`;
        
        if (!consolidatedCustomProducts[key]) {
          consolidatedCustomProducts[key] = {
            name: product.name,
            category: product.category,
            weight: product.weight,
            quantity: 0,
            // Use the earliest date for the consolidated product
            createdAt: product.createdAt
          };
        }
        
        // Update quantity
        consolidatedCustomProducts[key].quantity += Number(product.quantity || 0);
      });
      
      // Convert back to array
      const consolidatedCustomArray = Object.values(consolidatedCustomProducts);
      
      // Sort consolidated custom products by date
      consolidatedCustomArray.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      
      // Create data rows for consolidated custom products
      const consolidatedCustomRows = consolidatedCustomArray.map((product, index) => {
        const row = {
          date: product.createdAt ? format(new Date(product.createdAt), 'dd/MM/yyyy') : '-',
          name: product.name,
          category: product.category,
          weight: product.weight,
          quantity: product.quantity
        };
        
        if (index < 5) {
          console.log(`Consolidated custom product table row ${index}:`, row);
        }
        
        return row;
      });
      
      // Generate custom products table
      try {
        console.log("Custom table setup: columns =", consolidatedCustomColumns.length, "rows =", consolidatedCustomRows.length);
        
        // Create arrays for the table body with proper error checking
        const customTableBody = consolidatedCustomRows.map(row => {
          try {
            return consolidatedCustomColumns.map(col => {
              // Return empty string if value is undefined (prevents PDF generation issues)
              return row[col.dataKey] !== undefined ? row[col.dataKey] : '';
            });
          } catch (rowErr) {
            console.error("Error processing custom row for table:", rowErr);
            return consolidatedCustomColumns.map(() => ''); // Return empty values if row processing fails
          }
        });
        
        console.log("Custom table body prepared with", customTableBody.length, "rows");
        
        const customTable = doc.autoTable({
          startY: currentY,
          head: [consolidatedCustomColumns.map(col => col.header)],
          body: customTableBody,
          theme: 'striped',
          headStyles: { fillColor: [46, 204, 113], textColor: 255 }, // Green header
          didDrawPage: (data) => {
            // Add header on each page
            addPageHeader(data);
          }
        });
        
        console.log("Custom products table created successfully");
      } catch (err) {
        console.error("Error generating custom products table:", err);
        console.error("Error details:", err.message, err.stack);
      }
    }
    
    // Create a combined list of all regular products (from inventory and sales)
    let allRegularProducts = [];

    // Add products from inventory
    if (data && data.products && data.products.length > 0) {
      allRegularProducts = data.products.map(product => ({
        source: 'inventory',
        createdAt: product.createdAt,
        name: product.name || '-',
        category: product.category || '-',
        type: product.type || '-',
        weight: product.netWeight ? `${product.netWeight} ${product.weightType || 'Gram'}` : '-',
        quantity: product.stock || 0,
        invoiceNumber: '-'
      }));
    }

    // Add products from sales
    if (data && data.regularProductsFromSales && data.regularProductsFromSales.length > 0) {
      const soldProducts = data.regularProductsFromSales.map(item => {
        if (!item || typeof item !== 'object' || !item.product) {
          return null;
        }
        return {
          source: 'sale',
          createdAt: item.createdAt,
          invoiceNumber: item.invoiceNumber || '-',
          name: item.product.name || 'Unknown Product',
          category: item.product.category || '-',
          type: '-',
          weight: item.netWeight ? 
            `${item.netWeight} ${item.product.weightType || 'Gram'}` : 
            (item.weight ? `${item.weight} Gram` : '-'),
          quantity: item.quantity || 1
        };
      }).filter(item => item !== null);
      
      allRegularProducts = [...allRegularProducts, ...soldProducts];
    }

    // Sort all regular products by date
    allRegularProducts.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    // Consolidate products by name, category, and weight
    const consolidatedProducts = {};
    
    allRegularProducts.forEach(product => {
      // Create a unique key for each product type
      const key = `${product.name}_${product.category}_${product.weight}`;
      
      if (!consolidatedProducts[key]) {
        consolidatedProducts[key] = {
          name: product.name,
          category: product.category,
          type: product.type,
          weight: product.weight,
          quantity: 0,
          // Use the earliest date for the consolidated product
          createdAt: product.createdAt
        };
      }
      
      // Update quantity
      consolidatedProducts[key].quantity += Number(product.quantity || 0);
      
      // Always keep the earliest date
      if (product.createdAt && new Date(product.createdAt) < new Date(consolidatedProducts[key].createdAt)) {
        consolidatedProducts[key].createdAt = product.createdAt;
      }
    });
    
    // Convert back to array
    const consolidatedProductsArray = Object.values(consolidatedProducts);
    
    // Sort consolidated products by date
    consolidatedProductsArray.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    // Regular Products Table (Consolidated)
    if (consolidatedProductsArray.length > 0) {
      doc.setFontSize(14);
      doc.text('All Regular Products', 14, currentY);
      currentY += 10;
      
      // Define columns for regular products (removed invoice column)
      const consolidatedColumns = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Product Name', dataKey: 'name' },
        { header: 'Category', dataKey: 'category' },
        { header: 'Type', dataKey: 'type' },
        { header: 'Weight', dataKey: 'weight' },
        { header: 'Quantity', dataKey: 'quantity' }
      ];
      
      console.log(`Preparing data for ${consolidatedProductsArray.length} consolidated products table rows`);
      
      // Create data rows for consolidated products
      const consolidatedRows = consolidatedProductsArray.map((product, index) => {
        const row = {
          date: product.createdAt ? format(new Date(product.createdAt), 'dd/MM/yyyy') : '-',
          name: product.name,
          category: product.category,
          type: product.type,
          weight: product.weight,
          quantity: product.quantity
        };
        
        if (index < 5) {
          console.log(`Consolidated product table row ${index}:`, row);
        }
        
        return row;
      });
      
      // Generate consolidated products table
      try {
        console.log("Consolidated table setup: columns =", consolidatedColumns.length, "rows =", consolidatedRows.length);
        
        // Create arrays for the table body with proper error checking
        const consolidatedTableBody = consolidatedRows.map(row => {
          try {
            return consolidatedColumns.map(col => {
              // Return empty string if value is undefined (prevents PDF generation issues)
              return row[col.dataKey] !== undefined ? row[col.dataKey] : '';
            });
          } catch (rowErr) {
            console.error("Error processing row for consolidated table:", rowErr);
            return consolidatedColumns.map(() => ''); // Return empty values if row processing fails
          }
        });
        
        console.log("Consolidated table body prepared with", consolidatedTableBody.length, "rows");
        
        const regularTable = doc.autoTable({
          startY: currentY,
          head: [consolidatedColumns.map(col => col.header)],
          body: consolidatedTableBody,
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: 255 }, // Blue header
          didDrawPage: (data) => {
            // Add header on each page
            addPageHeader(data);
          }
        });
        
        console.log("Consolidated products table created successfully");
        currentY = regularTable.lastAutoTable.finalY + 15;
      } catch (err) {
        console.error("Error generating consolidated products table:", err);
        console.error("Error details:", err.message, err.stack);
      }
    }
    
    // Save PDF
    doc.save(`${type}_report_${year}_${month}.pdf`);
  };
  
  // Function to fetch inventory inward data
  const fetchInventoryInwardData = async (startDate, endDate) => {
    try {
      // Direct test - fetch all products regardless of date to check the data format
      console.log("Directly testing product data...");
      const testResponse = await api.get('/products?limit=10');
      console.log("Test products response:", testResponse?.data?.count || 0, "products found");
      if (testResponse?.data?.data?.length > 0) {
        const sampleProduct = testResponse.data.data[0];
        console.log("Sample product format:", {
          id: sampleProduct._id,
          name: sampleProduct.name,
          createdAt: sampleProduct.createdAt,
          // Add other relevant fields to debug
          stockType: typeof sampleProduct.stock,
          stock: sampleProduct.stock
        });
      }
      
      // Fetch all products and filter client-side by creation date
      const productsUrl = `/products?limit=1000`;
      let productsResponse;
      
      try {
        productsResponse = await api.get(productsUrl);
        console.log(`Total products in system: ${productsResponse?.data?.count || 0}`);
        
        // Client-side filtering to get products created in the given date range
        if (productsResponse?.data?.data) {
          const allProducts = productsResponse.data.data;
          
          // Filter products by createdAt date
          const filteredProducts = allProducts.filter(product => {
            if (!product.createdAt) return false;
            
            const createdDate = new Date(product.createdAt);
            const isInRange = createdDate >= startDate && createdDate <= endDate;
            
            // Debug logging for the first few products to understand filtering
            if (allProducts.indexOf(product) < 5) {
              console.log(`Product ${product.name} created on ${createdDate.toISOString()}, in range: ${isInRange}`);
              console.log(`Date check: ${createdDate} >= ${startDate} && ${createdDate} <= ${endDate}`);
            }
            
            return isInRange;
          });
          
          // Replace the response data with filtered data
          productsResponse.data.data = filteredProducts;
          productsResponse.data.count = filteredProducts.length;
          console.log(`Products created in date range (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}): ${filteredProducts.length}`);
        }
      } catch (err) {
        console.error('Error with product fetching:', err);
        productsResponse = { data: { data: [], count: 0 } };
      }
      
      // Fetch sales with custom products in the date range
      const salesUrl = `/sales?limit=1000`;
      let salesResponse;
      let salesWithCustomProducts = []; // Define salesWithCustomProducts outside the try block
      let regularProductsFromSales = []; // Store regular products from sales
      
      try {
        salesResponse = await api.get(salesUrl);
        console.log(`Total sales in system: ${salesResponse?.data?.count || 0}`);
        
        // Filter sales to only include those within the date range
        if (salesResponse?.data?.data) {
          const allSales = salesResponse.data.data;
          
          // Filter sales by createdAt date
          const salesInDateRange = allSales.filter(sale => {
            if (!sale.createdAt) return false;
            
            const saleDate = new Date(sale.createdAt);
            return saleDate >= startDate && saleDate <= endDate;
          });
          
          console.log(`Sales in date range: ${salesInDateRange.length}`);
          
          // Process all sales in date range to extract both custom items and regular products
          salesInDateRange.forEach(sale => {
            if (!sale.items || !Array.isArray(sale.items)) return;
            
            // Extract custom products
            const customItems = sale.items.filter(item => item.isCustomItem);
            if (customItems.length > 0) {
              // Add this sale to sales with custom products
              salesWithCustomProducts.push(sale);
            }
            
            // Extract regular products (non-custom items)
            const regularItems = sale.items.filter(item => !item.isCustomItem && item.product);
            regularItems.forEach(item => {
              regularProductsFromSales.push({
                product: item.product,
                saleId: sale._id,
                invoiceNumber: sale.invoiceNumber,
                createdAt: sale.createdAt,
                quantity: item.quantity || 1,
                // Include any other needed information
                weight: item.weight,
                netWeight: item.netWeight
              });
            });
          });
          
          console.log(`Sales with custom products: ${salesWithCustomProducts.length}`);
          console.log(`Regular products from sales: ${regularProductsFromSales.length}`);
          
          if (salesWithCustomProducts.length > 0) {
            // Debug custom products structure
            const sampleSale = salesWithCustomProducts[0];
            const customItems = sampleSale.items.filter(item => item.isCustomItem);
            
            if (customItems.length > 0) {
              console.log("Sample custom item structure:", JSON.stringify(customItems[0], null, 2));
            }
          }
          
          if (regularProductsFromSales.length > 0) {
            console.log("Sample regular product from sales:", JSON.stringify(regularProductsFromSales[0], null, 2));
          }
        }
      } catch (err) {
        console.error('Error with sales filtering:', err);
        salesResponse = { data: { data: [], count: 0 } };
      }
      
      // Ensure we have data arrays even if the response is malformed
      const productsData = Array.isArray(productsResponse?.data?.data) 
        ? productsResponse.data.data 
        : [];
        
      const salesData = Array.isArray(salesWithCustomProducts) 
        ? salesWithCustomProducts 
        : [];
      
      const regularProductsData = Array.isArray(regularProductsFromSales)
        ? regularProductsFromSales
        : [];
      
      // Save data to state
      const inventoryDataToUse = {
        products: productsData,
        sales: salesData,
        regularProductsFromSales: regularProductsData
      };
      
      console.log("Final data to use:", {
        productsCount: productsData.length,
        salesCount: salesData.length,
        regularProductsCount: regularProductsData.length
      });
      
      // Set state for component
      setInventoryData(inventoryDataToUse);
      
      // Additional check to ensure we have data before proceeding
      if ((!productsData || productsData.length === 0) && (!salesData || salesData.length === 0)) {
        console.error("Both products and sales arrays are empty or invalid");
        setError("No data available for the inventory report");
        setOpenDialog(true);
        setLoading(false);
        return false;
      }
      
      // Debug output for the first few products and sales
      if (productsData && productsData.length > 0) {
        console.log("First 2 products for PDF:", productsData.slice(0, 2).map(p => ({
          id: p._id,
          name: p.name,
          createdAt: p.createdAt, 
          category: p.category
        })));
      } else {
        console.log("No products available for PDF generation");
      }
      
      if (salesData && salesData.length > 0) {
        console.log("First sale with custom items for PDF:", {
          id: salesData[0]._id,
          invoiceNumber: salesData[0].invoiceNumber,
          customItemsCount: salesData[0].items?.filter(i => i.isCustomItem)?.length || 0
        });
      } else {
        console.log("No sales with custom products available for PDF generation");
      }
      
      // Return the data directly, don't wait for state update
      return inventoryDataToUse;
    } catch (err) {
      console.error("Error fetching inventory inward data:", err);
      setError(`Failed to fetch inventory inward data: ${err.message || 'Unknown error'}`);
      setOpenDialog(true);
      return false;
    }
  };

  // Function to generate inventory inward PDF
  const generateInventoryInwardPDF = async (data) => {
    try {
      console.log("Inventory data state:", JSON.stringify(data, null, 2));
      console.log("Generating PDF with data:", { 
        productsCount: data?.products?.length || 0, 
        salesCount: data?.sales?.length || 0 
      });
      
      // Additional check to ensure we have data before proceeding
      if ((!data || !data.products || data.products.length === 0) && (!data || !data.sales || data.sales.length === 0)) {
        console.error("Both products and sales arrays are empty or invalid");
        setError("No data available for the inventory report");
        setOpenDialog(true);
        setLoading(false);
        return;
      }
      
      // Debug output for the first few products and sales
      if (data && data.products && data.products.length > 0) {
        console.log("First 2 products for PDF:", data.products.slice(0, 2).map(p => ({
          id: p._id,
          name: p.name,
          createdAt: p.createdAt, 
          category: p.category
        })));
      } else {
        console.log("No products available for PDF generation");
      }
      
      if (data && data.sales && data.sales.length > 0) {
        console.log("First sale with custom items for PDF:", {
          id: data.sales[0]._id,
          invoiceNumber: data.sales[0].invoiceNumber,
          customItemsCount: data.sales[0].items?.filter(i => i.isCustomItem)?.length || 0
        });
      } else {
        console.log("No sales with custom products available for PDF generation");
      }
      
      // Create a new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Create header function that will be used in autoTable
      const addHeader = (data) => {
        // Add report title
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Inventory Inward Report - ${months.find(m => m.value === month).label} ${year}`, 14, 10);
        
        // Add generation date
        const today = new Date();
        doc.text(`Generated: ${format(today, 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, 10, { align: 'right' });
        
        // Add page divider
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 12, pageWidth - 14, 12);
      };
      
      // Add title on first page
      const today = new Date();
      const title = `Inventory Inward Report - ${months.find(m => m.value === month).label} ${year}`;
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(title, pageWidth / 2, 20, { align: 'center' });
      
      // Add generation date on first page
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${format(today, 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, 10, { align: 'right' });
      
      // Add summary section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Summary', 14, 30);
      
      // Extract custom products from sales
      const customProducts = [];
      
      if (data && data.sales && Array.isArray(data.sales)) {
        console.log(`Processing ${data.sales.length} sales for custom products`);
        
        data.sales.forEach((sale, saleIndex) => {
          console.log(`Processing sale #${saleIndex + 1} (${sale.invoiceNumber}) for custom products`);
          
          if (!sale.items || !Array.isArray(sale.items)) {
            console.log(`No items found in sale ${sale.invoiceNumber}`);
            return;
          }
          
          // Find custom items in this sale
          const customItemsInSale = sale.items.filter(item => item.isCustomItem);
          console.log(`Found ${customItemsInSale.length} custom items in sale ${sale.invoiceNumber}`);
          
          customItemsInSale.forEach((item, itemIndex) => {
            // Log detailed information about the custom product structure
            console.log(`Custom item #${itemIndex + 1} in sale ${sale.invoiceNumber}:`, 
              JSON.stringify({
                isCustomItem: item.isCustomItem,
                hasCustomDetails: !!item.customProductDetails,
                customDetailsKeys: item.customProductDetails ? Object.keys(item.customProductDetails) : [],
                name: item.customProductDetails?.name,
                category: item.customProductDetails?.category,
                quantity: item.quantity
              }, null, 2)
            );
            
            // Ensure we have the customProductDetails object
            const customProductDetails = item.customProductDetails || {};
            
            customProducts.push({
              ...item,
              customProductDetails: {
                ...customProductDetails,
                // Ensure name is always set
                name: customProductDetails.name || 'Custom Product',
                // Ensure category is always set
                category: customProductDetails.category || 'Uncategorized'
              },
              saleId: sale._id,
              invoiceNumber: sale.invoiceNumber,
              createdAt: sale.createdAt,
              // Include quantity from the item
              quantity: item.quantity || 1
            });
          });
        });
        
        console.log(`Total custom products extracted: ${customProducts.length}`);
      }
      
      // Summary statistics
      const totalRegularProducts = data?.products?.length || 0;
      const totalCustomProducts = customProducts.length;
      const totalRegularProductsFromSales = data?.regularProductsFromSales?.length || 0;
      const totalProducts = totalRegularProducts + totalCustomProducts + totalRegularProductsFromSales;
      
      // Print summary information
      doc.setFontSize(12);
      doc.text(`Total Inventory Inward Entries: ${totalProducts}`, 14, 40);
      doc.text(`Regular Products: ${totalRegularProducts + totalRegularProductsFromSales}`, 14, 47);
      doc.text(`Custom Products: ${totalCustomProducts}`, 14, 54);
      
      // Only proceed if we have data to show
      if (totalProducts === 0) {
        doc.setFontSize(12);
        doc.text('No inventory inward data for the selected period.', 14, 65);
        doc.save(`inventory_inward_report_${year}_${month}.pdf`);
        return;
      }
      
      let currentY = 65;
      
      // Create a combined list of all regular products (from inventory and sales)
      let allRegularProducts = [];

      // Add products from inventory
      if (data && data.products && data.products.length > 0) {
        allRegularProducts = data.products.map(product => ({
          source: 'inventory',
          createdAt: product.createdAt,
          name: product.name || '-',
          category: product.category || '-',
          type: product.type || '-',
          weight: product.netWeight ? `${product.netWeight} ${product.weightType || 'Gram'}` : '-',
          quantity: product.stock || 0,
          invoiceNumber: '-'
        }));
      }

      // Add products from sales
      if (data && data.regularProductsFromSales && data.regularProductsFromSales.length > 0) {
        const soldProducts = data.regularProductsFromSales.map(item => {
          if (!item || typeof item !== 'object' || !item.product) {
            return null;
          }
          return {
            source: 'sale',
            createdAt: item.createdAt,
            invoiceNumber: item.invoiceNumber || '-',
            name: item.product.name || 'Unknown Product',
            category: item.product.category || '-',
            type: '-',
            weight: item.netWeight ? 
              `${item.netWeight} ${item.product.weightType || 'Gram'}` : 
              (item.weight ? `${item.weight} Gram` : '-'),
            quantity: item.quantity || 1
          };
        }).filter(item => item !== null);
        
        allRegularProducts = [...allRegularProducts, ...soldProducts];
      }

      // Sort all regular products by date
      allRegularProducts.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

      // Consolidate products by name, category, and weight
      const consolidatedProducts = {};
      
      allRegularProducts.forEach(product => {
        // Create a unique key for each product type
        const key = `${product.name}_${product.category}_${product.weight}`;
        
        if (!consolidatedProducts[key]) {
          consolidatedProducts[key] = {
            name: product.name,
            category: product.category,
            type: product.type,
            weight: product.weight,
            quantity: 0,
            // Use the earliest date for the consolidated product
            createdAt: product.createdAt
          };
        }
        
        // Update quantity
        consolidatedProducts[key].quantity += Number(product.quantity || 0);
        
        // Always keep the earliest date
        if (product.createdAt && new Date(product.createdAt) < new Date(consolidatedProducts[key].createdAt)) {
          consolidatedProducts[key].createdAt = product.createdAt;
        }
      });
      
      // Convert back to array
      const consolidatedProductsArray = Object.values(consolidatedProducts);
      
      // Sort consolidated products by date
      consolidatedProductsArray.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

      // Regular Products Table (Consolidated)
      if (consolidatedProductsArray.length > 0) {
        doc.setFontSize(14);
        doc.text('All Regular Products', 14, currentY);
        currentY += 10;
        
        // Define columns for regular products (removed invoice column)
        const consolidatedColumns = [
          { header: 'Date', dataKey: 'date' },
          { header: 'Product Name', dataKey: 'name' },
          { header: 'Category', dataKey: 'category' },
          { header: 'Type', dataKey: 'type' },
          { header: 'Weight', dataKey: 'weight' },
          { header: 'Quantity', dataKey: 'quantity' }
        ];
        
        console.log(`Preparing data for ${consolidatedProductsArray.length} consolidated products table rows`);
        
        // Create data rows for consolidated products
        const consolidatedRows = consolidatedProductsArray.map((product, index) => {
          const row = {
            date: product.createdAt ? format(new Date(product.createdAt), 'dd/MM/yyyy') : '-',
            name: product.name,
            category: product.category,
            type: product.type,
            weight: product.weight,
            quantity: product.quantity
          };
          
          if (index < 5) {
            console.log(`Consolidated product table row ${index}:`, row);
          }
          
          return row;
        });
        
        // Generate consolidated products table
        try {
          console.log("Consolidated table setup: columns =", consolidatedColumns.length, "rows =", consolidatedRows.length);
          
          // Create arrays for the table body with proper error checking
          const consolidatedTableBody = consolidatedRows.map(row => {
            try {
              return consolidatedColumns.map(col => {
                // Return empty string if value is undefined (prevents PDF generation issues)
                return row[col.dataKey] !== undefined ? row[col.dataKey] : '';
              });
            } catch (rowErr) {
              console.error("Error processing row for consolidated table:", rowErr);
              return consolidatedColumns.map(() => ''); // Return empty values if row processing fails
            }
          });
          
          console.log("Consolidated table body prepared with", consolidatedTableBody.length, "rows");
          
          const regularTable = doc.autoTable({
            startY: currentY,
            head: [consolidatedColumns.map(col => col.header)],
            body: consolidatedTableBody,
            theme: 'striped',
            headStyles: { fillColor: [52, 152, 219], textColor: 255 }, // Blue header
            didDrawPage: (data) => {
              // Add header on each page
              addHeader(data);
            }
          });
          
          console.log("Consolidated products table created successfully");
          currentY = regularTable.lastAutoTable.finalY + 15;
        } catch (err) {
          console.error("Error generating consolidated products table:", err);
          console.error("Error details:", err.message, err.stack);
        }
      }
      
      // Custom Products Table
      if (customProducts.length > 0) {
        doc.setFontSize(14);
        doc.text('Custom Products Added', 14, currentY);
        currentY += 10;
        
        // Consolidate custom products by name, category, and weight
        const consolidatedCustomProducts = {};
        
        customProducts.forEach(product => {
          // Check if the product has valid data
          if (!product || typeof product !== 'object') {
            return;
          }
          
          // Get product name from customProductDetails, with fallback
          const productName = product.customProductDetails?.name || 'Custom Product';
          const productCategory = product.customProductDetails?.category || '-';
          
          // Handle weight display with proper checks
          let weightDisplay = '-';
          if (product.customProductDetails?.netWeight) {
            const weightValue = product.customProductDetails.netWeight;
            const weightUnit = product.customProductDetails.weightType || 'Gram';
            weightDisplay = `${weightValue} ${weightUnit}`;
          } else if (product.weight) {
            // Fallback to item weight if netWeight is not in customProductDetails
            weightDisplay = `${product.weight} Gram`;
          }
          
          // Create a unique key for each product type
          const key = `${productName}_${productCategory}_${weightDisplay}`;
          
          if (!consolidatedCustomProducts[key]) {
            consolidatedCustomProducts[key] = {
              name: productName,
              category: productCategory,
              weight: weightDisplay,
              quantity: 0,
              // Use the earliest date for the consolidated product
              createdAt: product.createdAt
            };
          }
          
          // Update quantity
          consolidatedCustomProducts[key].quantity += Number(product.quantity || 1);
          
          // Always keep the earliest date
          if (product.createdAt && new Date(product.createdAt) < new Date(consolidatedCustomProducts[key].createdAt)) {
            consolidatedCustomProducts[key].createdAt = product.createdAt;
          }
        });
        
        // Convert back to array
        const consolidatedCustomArray = Object.values(consolidatedCustomProducts);
        
        // Sort consolidated custom products by date
        consolidatedCustomArray.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(a.createdAt) - new Date(b.createdAt);
        });
        
        // Define columns for consolidated custom products (removed invoice column)
        const consolidatedCustomColumns = [
          { header: 'Date', dataKey: 'date' },
          { header: 'Product Name', dataKey: 'name' },
          { header: 'Category', dataKey: 'category' },
          { header: 'Weight', dataKey: 'weight' },
          { header: 'Quantity', dataKey: 'quantity' }
        ];
        
        console.log(`Preparing data for ${consolidatedCustomArray.length} consolidated custom products table rows`);
        
        // Create data rows for consolidated custom products
        const consolidatedCustomRows = consolidatedCustomArray.map((product, index) => {
          const row = {
            date: product.createdAt ? format(new Date(product.createdAt), 'dd/MM/yyyy') : '-',
            name: product.name,
            category: product.category,
            weight: product.weight,
            quantity: product.quantity
          };
          
          if (index < 5) {
            console.log(`Consolidated custom product table row ${index}:`, row);
          }
          
          return row;
        });
        
        // Generate custom products table
        try {
          console.log("Custom table setup: columns =", consolidatedCustomColumns.length, "rows =", consolidatedCustomRows.length);
          
          // Create arrays for the table body with proper error checking
          const customTableBody = consolidatedCustomRows.map(row => {
            try {
              return consolidatedCustomColumns.map(col => {
                // Return empty string if value is undefined (prevents PDF generation issues)
                return row[col.dataKey] !== undefined ? row[col.dataKey] : '';
              });
            } catch (rowErr) {
              console.error("Error processing custom row for table:", rowErr);
              return consolidatedCustomColumns.map(() => ''); // Return empty values if row processing fails
            }
          });
          
          console.log("Custom table body prepared with", customTableBody.length, "rows");
          
          const customTable = doc.autoTable({
            startY: currentY,
            head: [consolidatedCustomColumns.map(col => col.header)],
            body: customTableBody,
            theme: 'striped',
            headStyles: { fillColor: [46, 204, 113], textColor: 255 }, // Green header
            didDrawPage: (data) => {
              // Add header on each page
              addHeader(data);
            }
          });
          
          console.log("Custom products table created successfully");
        } catch (err) {
          console.error("Error generating custom products table:", err);
          console.error("Error details:", err.message, err.stack);
        }
      }
      
      // Save PDF
      doc.save(`inventory_inward_report_${year}_${month}.pdf`);
      console.log("PDF generated successfully");
    } catch (err) {
      console.error('Error generating inventory inward PDF:', err);
      setError(`Failed to generate inventory inward report: ${err.message || 'Unknown error'}`);
      setOpenDialog(true);
      setLoading(false);
    }
  };
  
  return (
    <>
      <PageHeader 
        title="Reports" 
        subtitle="View business analytics and reports"
        breadcrumbs={[{ label: 'Reports' }]}
      />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PdfIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Monthly Reports</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="report-type-label">Report Type</InputLabel>
                <Select
                  labelId="report-type-label"
                  value={reportType}
                  label="Report Type"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <MenuItem value="sales">Sales Report</MenuItem>
                  <MenuItem value="purchases">Purchases Report</MenuItem>
                  <MenuItem value="inventory_inward">Inventory Inward Report</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="month-label">Month</InputLabel>
                <Select
                  labelId="month-label"
                  value={month}
                  label="Month"
                  onChange={(e) => setMonth(e.target.value)}
                >
                  {months.map((m) => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="year-label">Year</InputLabel>
                <Select
                  labelId="year-label"
                  value={year}
                  label="Year"
                  onChange={(e) => setYear(e.target.value)}
                >
                  <MenuItem value={currentYear - 1}>{currentYear - 1}</MenuItem>
                  <MenuItem value={currentYear}>{currentYear}</MenuItem>
                </Select>
              </FormControl>
              
              <Button 
                variant="contained" 
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                onClick={handleGenerateReport}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Generating...' : 'Generate PDF Report'}
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BarChartIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Sales Reports</Typography>
            </Box>
            <Typography variant="body1">
              This is a placeholder for sales reports. This functionality will be implemented in future updates.
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PieChartIcon sx={{ mr: 1, color: 'secondary.main' }} />
              <Typography variant="h6">Inventory Reports</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Generate detailed inventory inward report to track new product additions:
              </Typography>
              
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<InwardIcon />}
                onClick={() => {
                  setReportType('inventory_inward');
                  handleGenerateReport();
                }}
                sx={{ justifyContent: 'flex-start' }}
              >
                Inventory Inward Report
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">Financial Reports</Typography>
            </Box>
            <Typography variant="body1">
              This is a placeholder for financial reports. This functionality will be implemented in future updates.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Error Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Report Generation</DialogTitle>
        <DialogContent>
          <Typography color="error">{error}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Reports; 