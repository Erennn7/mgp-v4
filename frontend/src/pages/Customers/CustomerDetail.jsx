import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Divider,
  Button,
  Avatar,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  CardGiftcard as GiftIcon,
  Loyalty as LoyaltyIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import PageHeader from '../../components/Common/PageHeader';
import DataTable from '../../components/Common/DataTable';
import FormDialog from '../../components/Common/FormDialog';
import CustomerForm from './CustomerForm';
import StatusChip from '../../components/Common/StatusChip';
import api from '../../services/api';
import { toast } from 'react-toastify';

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customer-tabpanel-${index}`}
      aria-labelledby={`customer-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [savings, setSavings] = useState([]);
  const [savingsLoading, setSavingsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [openEditForm, setOpenEditForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Fetch customer data
  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/customers/${id}`);
      setCustomer(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load customer data');
      console.error('Customer fetch error:', err);
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch customer's sales
  const fetchSales = async () => {
    setSalesLoading(true);
    try {
      const response = await api.get(`/sales/customer/${id}`);
      setSales(response.data.data);
    } catch (err) {
      console.error('Sales fetch error:', err);
    } finally {
      setSalesLoading(false);
    }
  };

  // Fetch customer's loans
  const fetchLoans = async () => {
    setLoansLoading(true);
    try {
      const response = await api.get(`/loans/customer/${id}`);
      setLoans(response.data.data);
    } catch (err) {
      console.error('Loans fetch error:', err);
    } finally {
      setLoansLoading(false);
    }
  };

  // Fetch customer's savings
  const fetchSavings = async () => {
    setSavingsLoading(true);
    try {
      const response = await api.get(`/savings/customer/${id}`);
      setSavings(response.data.data);
    } catch (err) {
      console.error('Savings fetch error:', err);
    } finally {
      setSavingsLoading(false);
    }
  };

  // Fetch all customer-related data
  const fetchAllData = () => {
    fetchCustomer();
    fetchSales();
    fetchLoans();
    fetchSavings();
  };

  useEffect(() => {
    fetchAllData();
  }, [id]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle edit customer
  const handleEditCustomer = () => {
    setOpenEditForm(true);
  };

  // Handle delete customer
  const handleDeleteCustomer = () => {
    setConfirmDelete(true);
  };

  // Handle form submit for edit
  const handleFormSubmit = async (formData) => {
    setFormSubmitting(true);
    try {
      await api.put(`/customers/${id}`, formData);
      toast.success('Customer updated successfully');
      fetchCustomer();
      setOpenEditForm(false);
    } catch (err) {
      toast.error(
        err.response?.data?.error || 'Failed to update customer'
      );
      console.error('Customer update error:', err);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Confirm delete customer
  const confirmDeleteCustomer = async () => {
    setFormSubmitting(true);
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deleted successfully');
      navigate('/customers');
    } catch (err) {
      toast.error('Failed to delete customer');
      console.error('Customer delete error:', err);
    } finally {
      setFormSubmitting(false);
      setConfirmDelete(false);
    }
  };

  // Format value for display with fallback
  const formatValue = (value, fallback = '-') => {
    return value || fallback;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'PPP');
    } catch (err) {
      return '-';
    }
  };

  // Sales columns for data table
  const salesColumns = [
    {
      field: 'invoiceNumber',
      headerName: 'Invoice #',
      width: 150,
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 120,
      valueFormatter: (params) =>
        params.value ? format(new Date(params.value), 'MM/dd/yyyy') : '-',
    },
    {
      field: 'total',
      headerName: 'Amount',
      width: 120,
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
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <StatusChip status={params.value} />
      ),
    },
    {
      field: 'items',
      headerName: 'Items',
      width: 100,
      valueGetter: (params) => params.value ? params.value.length : 0,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => navigate(`/sales/${params.row._id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  // Loans columns for data table
  const loansColumns = [
    {
      field: 'loanNumber',
      headerName: 'Loan #',
      width: 150,
    },
    {
      field: 'issuedDate',
      headerName: 'Issue Date',
      width: 120,
      valueFormatter: (params) =>
        params.value ? format(new Date(params.value), 'MM/dd/yyyy') : '-',
    },
    {
      field: 'principal',
      headerName: 'Principal',
      width: 120,
      valueFormatter: (params) =>
        params.value
          ? new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
            }).format(params.value)
          : '-',
    },
    {
      field: 'totalDue',
      headerName: 'Due Amount',
      width: 120,
      valueFormatter: (params) =>
        params.value
          ? new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
            }).format(params.value)
          : '-',
    },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      width: 120,
      valueFormatter: (params) =>
        params.value ? format(new Date(params.value), 'MM/dd/yyyy') : '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <StatusChip status={params.value} />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => navigate(`/loans/${params.row._id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  // Savings columns for data table
  const savingsColumns = [
    {
      field: 'schemeNumber',
      headerName: 'Scheme #',
      width: 150,
    },
    {
      field: 'schemeName',
      headerName: 'Scheme Name',
      width: 180,
    },
    {
      field: 'totalAmount',
      headerName: 'Total Amount',
      width: 140,
      valueFormatter: (params) =>
        params.value
          ? new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
            }).format(params.value)
          : '-',
    },
    {
      field: 'totalPaid',
      headerName: 'Paid Amount',
      width: 140,
      valueFormatter: (params) =>
        params.value
          ? new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
            }).format(params.value)
          : '-',
    },
    {
      field: 'installmentAmount',
      headerName: 'Monthly',
      width: 120,
      valueFormatter: (params) =>
        params.value
          ? new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
            }).format(params.value)
          : '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <StatusChip status={params.value} />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => navigate(`/savings/${params.row._id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  // Error state
  if (error || !customer) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error || 'Customer not found'}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/customers')} startIcon={<ArrowBackIcon />}>
          Back to Customers
        </Button>
      </Box>
    );
  }

  return (
    <>
      <PageHeader
        title="Customer Details"
        breadcrumbs={[
          { label: 'Customers', link: '/customers' },
          { label: customer.name },
        ]}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/customers')}
          >
            Back
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={handleEditCustomer}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteCustomer}
          >
            Delete
          </Button>
        </Box>
      </PageHeader>

      <Grid container spacing={3}>
        {/* Customer Information */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={1}
            sx={{
              p: 3,
              borderRadius: 2,
              height: '100%',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  fontSize: 40,
                  mb: 2,
                  bgcolor: 'primary.main',
                }}
              >
                {customer.name ? customer.name.charAt(0) : 'C'}
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {customer.name}
              </Typography>
              <Chip 
                icon={<PersonIcon fontSize="small" />} 
                label={`Customer since ${formatDate(customer.createdAt)}`} 
                variant="outlined" 
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Contact Information
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{formatValue(customer.phone)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{formatValue(customer.email)}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Address
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                <HomeIcon fontSize="small" sx={{ mr: 1, mt: 0.5, color: 'text.secondary' }} />
                <Typography>
                  {customer.address?.street ? (
                    <>
                      {customer.address.street}
                      <br />
                      {customer.address.city && `${customer.address.city}, `}
                      {customer.address.state && `${customer.address.state} `}
                      {customer.address.pincode && customer.address.pincode}
                    </>
                  ) : (
                    'No address provided'
                  )}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                ID Information
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Typography variant="body2">
                    <strong>ID Type:</strong> {formatValue(customer.idType)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2">
                    <strong>ID Number:</strong> {formatValue(customer.idNumber)}
                  </Typography>
                </Grid>
                {customer.dob && (
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Date of Birth:</strong> {formatDate(customer.dob)}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Transactions and History */}
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ borderRadius: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                variant="fullWidth"
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab 
                  icon={<MoneyIcon />} 
                  iconPosition="start" 
                  label={`Sales (${sales.length})`} 
                  id="customer-tab-0" 
                />
                <Tab 
                  icon={<LoyaltyIcon />} 
                  iconPosition="start" 
                  label={`Loans (${loans.length})`} 
                  id="customer-tab-1" 
                />
                <Tab 
                  icon={<GiftIcon />} 
                  iconPosition="start" 
                  label={`Savings (${savings.length})`} 
                  id="customer-tab-2" 
                />
              </Tabs>
            </Box>

            {/* Sales Tab */}
            <TabPanel value={tabValue} index={0}>
              <DataTable
                rows={sales}
                columns={salesColumns}
                loading={salesLoading}
                getRowId={(row) => row._id}
                height={400}
                quickSearch={false}
              />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate('/sales/new', { state: { customerId: id } })}
                >
                  Create New Sale
                </Button>
              </Box>
            </TabPanel>

            {/* Loans Tab */}
            <TabPanel value={tabValue} index={1}>
              <DataTable
                rows={loans}
                columns={loansColumns}
                loading={loansLoading}
                getRowId={(row) => row._id}
                height={400}
                quickSearch={false}
              />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate('/loans/new', { state: { customerId: id } })}
                >
                  Create New Loan
                </Button>
              </Box>
            </TabPanel>

            {/* Savings Tab */}
            <TabPanel value={tabValue} index={2}>
              <DataTable
                rows={savings}
                columns={savingsColumns}
                loading={savingsLoading}
                getRowId={(row) => row._id}
                height={400}
                quickSearch={false}
              />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate('/savings/new', { state: { customerId: id } })}
                >
                  Create New Savings Scheme
                </Button>
              </Box>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Customer Form */}
      {openEditForm && (
        <FormDialog
          open={openEditForm}
          onClose={() => setOpenEditForm(false)}
          title="Edit Customer"
          onSubmit={handleFormSubmit}
          loading={formSubmitting}
          submitLabel="Update"
        >
          <CustomerForm
            initialData={customer}
            loading={formSubmitting}
          />
        </FormDialog>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <FormDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="Delete Customer"
          subtitle="Are you sure you want to delete this customer? This action cannot be undone."
          onSubmit={confirmDeleteCustomer}
          loading={formSubmitting}
          submitLabel="Delete"
          maxWidth="xs"
        >
          <Box sx={{ py: 1 }}>
            <strong>Name:</strong> {customer.name}
            <br />
            <strong>Phone:</strong> {customer.phone}
            <br />
            {customer.email && (
              <>
                <strong>Email:</strong> {customer.email}
                <br />
              </>
            )}
          </Box>
        </FormDialog>
      )}
    </>
  );
};

export default CustomerDetail; 