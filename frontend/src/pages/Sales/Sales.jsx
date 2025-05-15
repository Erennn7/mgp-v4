import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Tooltip,
  IconButton,
  CircularProgress,
  Paper,
  Grid,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import PageHeader from '../../components/Common/PageHeader';
import DataTable from '../../components/Common/DataTable';
import FormDialog from '../../components/Common/FormDialog';
import StatusChip from '../../components/Common/StatusChip';
import SaleForm from './SaleForm';
import api from '../../services/api';
import { toast } from 'react-toastify';
import SearchBox from '../../components/Common/SearchBox';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saleFormData, setSaleFormData] = useState(null);
  const [totalSales, setTotalSales] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 100,
    page: 0,
  });
  const [gstBillsCount, setGstBillsCount] = useState(0);
  const [nonGstBillsCount, setNonGstBillsCount] = useState(0);
  const [currentTab, setCurrentTab] = useState(0); // 0 = All, 1 = GST, 2 = Non-GST
  const [filteredSales, setFilteredSales] = useState([]);
  const navigate = useNavigate();

  // Fetch sales
  const fetchSales = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sales', {
        params: {
          limit: paginationModel.pageSize,
          page: paginationModel.page + 1 // API uses 1-based pagination
        }
      });
      
      const salesData = response.data.data;
      
      // Group sales by GST and non-GST
      const gstBills = salesData.filter(sale => sale.tax > 0);
      const nonGstBills = salesData.filter(sale => sale.tax === 0);
      
      // Set counts
      setGstBillsCount(gstBills.length);
      setNonGstBillsCount(nonGstBills.length);
      
      // Assign sequential numbers to each category separately
      // GST Bills - Sort by creation date first
      const sortedGstBills = [...gstBills].sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      // Assign serial numbers to GST bills
      const gstBillsWithSerialNumbers = sortedGstBills.map((sale, index) => ({
        ...sale,
        serialNumber: index + 1,
        serialType: 'GST'
      }));
      
      // Non-GST Bills - Sort by creation date first
      const sortedNonGstBills = [...nonGstBills].sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      // Assign serial numbers to non-GST bills
      const nonGstBillsWithSerialNumbers = sortedNonGstBills.map((sale, index) => ({
        ...sale,
        serialNumber: index + 1,
        serialType: 'REG'
      }));
      
      // Combine all sales with their respective serial numbers
      const allSalesWithSerialNumbers = [
        ...gstBillsWithSerialNumbers,
        ...nonGstBillsWithSerialNumbers
      ];
      
      // Store all sales
      setSales(allSalesWithSerialNumbers);
      
      // Update filtered sales based on current tab
      updateFilteredSales(allSalesWithSerialNumbers, currentTab);
      
      // Set total count from pagination data
      if (response.data.pagination) {
        setTotalSales(response.data.total || response.data.data.length);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load sales');
      console.error('Sales fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to update filtered sales based on tab
  const updateFilteredSales = (allSales, tabIndex) => {
    switch (tabIndex) {
      case 0: // All sales
        setFilteredSales(allSales);
        break;
      case 1: // GST sales
        setFilteredSales(allSales.filter(sale => sale.tax > 0));
        break;
      case 2: // Non-GST sales
        setFilteredSales(allSales.filter(sale => sale.tax === 0));
        break;
      default:
        setFilteredSales(allSales);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    updateFilteredSales(sales, newValue);
  };

  useEffect(() => {
    fetchSales();
  }, [paginationModel.page, paginationModel.pageSize]);

  // Handle view sale
  const handleViewSale = (saleId) => {
    navigate(`/sales/${saleId}`);
  };

  // Handle add sale
  const handleAddSale = () => {
    setSelectedSale(null);
    setSaleFormData(null);
    setOpenForm(true);
  };

  // Handle edit sale
  const handleEditSale = (sale) => {
    setSelectedSale(sale);
    setOpenForm(true);
  };

  // Handle form data change
  const handleFormDataChange = (formData) => {
    setSaleFormData(formData);
  };

  // Handle delete sale
  const handleDeleteSale = (sale) => {
    setConfirmDelete(sale);
  };

  // Confirm delete sale
  const confirmDeleteSale = async () => {
    if (!confirmDelete) return;
    
    setFormSubmitting(true);
    try {
      await api.delete(`/sales/${confirmDelete._id}`);
      toast.success('Sale deleted successfully');
      fetchSales();
    } catch (err) {
      toast.error('Failed to delete sale');
      console.error('Sale delete error:', err);
    } finally {
      setFormSubmitting(false);
      setConfirmDelete(null);
    }
  };

  // Handle form submit
  const handleFormSubmit = async () => {
    if (!saleFormData) {
      toast.error('No form data available');
      return;
    }

    // Validate form data
    if (!saleFormData.customer) {
      toast.error('Please select a customer');
      return;
    }

    if (saleFormData.items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    // Prepare data for API
    const saleData = {
      ...saleFormData,
      // Include invoice number (backend will generate one if empty)
      invoiceNumber: saleFormData.invoiceNumber,
      // Tax is percentage, discount is now absolute amount in rupees
      tax: parseFloat(saleFormData.tax) || 0,
      discount: parseFloat(saleFormData.discount) || 0,
      // Calculate the total correctly with discount as absolute amount
      total: calculateTotal(saleFormData),
      // Map items to format expected by API
      items: saleFormData.items.map(item => {
        // Handle custom items differently
        if (item.isCustomItem) {
          return {
            isCustomItem: true,
            customProductDetails: item.customProductDetails,
            quantity: item.quantity,
            rate: item.rate,
            weight: item.weight,
            makingCharges: item.makingCharges,
            total: item.total
          };
        } else {
          // Regular products with ObjectId reference
          return {
            product: item.product._id,
            quantity: item.quantity,
            rate: item.rate,
            weight: item.weight,
            makingCharges: item.makingCharges,
            total: item.total
          };
        }
      })
    };

    setFormSubmitting(true);
    try {
      if (selectedSale) {
        // Update existing sale
        await api.put(`/sales/${selectedSale._id}`, saleData);
        toast.success('Sale updated successfully');
      } else {
        // Create new sale
        await api.post('/sales', saleData);
        toast.success('Sale added successfully');
      }
      fetchSales();
      setOpenForm(false);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save sale';
      toast.error(errorMessage);
      console.error('Sale save error:', err);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Helper function to calculate total including GST and discount
  const calculateTotal = (data) => {
    const subTotal = data.subTotal || 0;
    const gstAmount = subTotal * (data.tax / 100) || 0;
    // Treat discount as absolute amount
    const discountAmount = parseFloat(data.discount) || 0;
    return Math.max(0, subTotal + gstAmount - discountAmount);
  };

  // Table columns
  const columns = [
    {
      field: 'serialNumber',
      headerName: 'Serial #',
      width: 90,
      renderCell: (params) => {
        const prefix = params.row.serialType === 'GST' ? 'GST-' : 'REG-';
        const number = params.row.serialType === 'GST' 
          ? Number(params.row.serialNumber) + 54 
          : Number(params.row.serialNumber);
        return `${prefix}${number}`;
      }
    },
    {
      field: 'invoiceNumber',
      headerName: 'Invoice #',
      width: 150,
    },
    {
      field: 'customer',
      headerName: 'Customer',
      width: 200,
      valueGetter: (params) => params.row.customer?.name || '-',
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 150,
      valueFormatter: (params) =>
        params.value
          ? new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
            }).format(params.value)
          : '-',
    },
    {
      field: 'paymentStatus',
      headerName: 'Payment Status',
      width: 150,
      renderCell: (params) => (
        <StatusChip status={params.row.paymentStatus} />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 150,
      valueFormatter: (params) =>
        params.value ? format(new Date(params.value), 'MM/dd/yyyy') : '-',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 170,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View">
            <IconButton
              size="small"
              onClick={() => handleViewSale(params.row._id)}
              color="primary"
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => handleEditSale(params.row)}
              color="secondary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDeleteSale(params.row)}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Sales"
        subtitle="Manage your sales records"
        breadcrumbs={[{ label: 'Sales' }]}
        actionText="Add Sale"
        actionIcon={<AddIcon />}
        onActionClick={handleAddSale}
      />

      {/* Stats Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
            }}
          >
            <Typography variant="h6">Total Sales</Typography>
            <Typography variant="h4">{totalSales}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Typography variant="h6">GST Bills</Typography>
            <Typography variant="h4">{gstBillsCount}</Typography>
            <Typography variant="caption">With GST tax applied</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'success.main',
              color: 'success.contrastText',
            }}
          >
            <Typography variant="h6">Non-GST Bills</Typography>
            <Typography variant="h4">{nonGstBillsCount}</Typography>
            <Typography variant="caption">Without GST tax</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={currentTab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="All Sales" />
          <Tab label="GST Bills" />
          <Tab label="Non-GST Bills" />
        </Tabs>
      </Paper>

      {/* Action Bar */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddSale}
        >
          Add Sale
        </Button>
        <SearchBox
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search sales..."
        />
      </Box>

      <DataTable
        title={currentTab === 0 ? "All Sales" : (currentTab === 1 ? "GST Bills" : "Non-GST Bills")}
        rows={filteredSales}
        columns={columns}
        loading={loading}
        error={error}
        getRowId={(row) => row._id}
        height={600}
        pageSize={paginationModel.pageSize}
        pagination={true}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[25, 50, 100]}
        rowCount={totalSales}
        quickSearch={true}
        quickSearchField="custom"
        customSearchFunction={(row, term) => {
          // If no search term, include the row
          if (!term) return true;
          
          // Use the component's search term state
          const lowerSearchTerm = term.toLowerCase();
          
          // Check in invoice number
          if (row.invoiceNumber && row.invoiceNumber.toLowerCase().includes(lowerSearchTerm)) {
            return true;
          }
          
          // Check in customer name
          if (row.customer && row.customer.name && 
              row.customer.name.toLowerCase().includes(lowerSearchTerm)) {
            return true;
          }
          
          // Check in payment status
          if (row.paymentStatus && row.paymentStatus.toLowerCase().includes(lowerSearchTerm)) {
            return true;
          }
          
          // Check for amount matches
          const totalStr = row.total?.toString();
          if (totalStr && totalStr.includes(term)) {
            return true;
          }
          
          // No matches found
          return false;
        }}
      />

      {/* Add/Edit Sale Form */}
      {openForm && (
        <FormDialog
          open={openForm}
          onClose={() => setOpenForm(false)}
          title={selectedSale ? 'Edit Sale' : 'Add New Sale'}
          onSubmit={handleFormSubmit}
          loading={formSubmitting}
          submitLabel={selectedSale ? 'Update' : 'Save'}
          maxWidth="lg"
          fullWidth
        >
          <SaleForm
            initialData={selectedSale}
            loading={formSubmitting}
            onFormDataChange={handleFormDataChange}
          />
        </FormDialog>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <FormDialog
          open={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          title="Delete Sale"
          subtitle="Are you sure you want to delete this sale? This action cannot be undone."
          onSubmit={confirmDeleteSale}
          loading={formSubmitting}
          submitLabel="Delete"
          maxWidth="xs"
        >
          <Box sx={{ py: 1 }}>
            <strong>Invoice #:</strong> {confirmDelete.invoiceNumber}
            <br />
            <strong>Customer:</strong> {confirmDelete.customer?.name}
            <br />
            <strong>Total:</strong> {
              new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
              }).format(confirmDelete.total || 0)
            }
          </Box>
        </FormDialog>
      )}
    </>
  );
};

export default Sales; 
