import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Tooltip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import PageHeader from '../../components/Common/PageHeader';
import DataTable from '../../components/Common/DataTable';
import FormDialog from '../../components/Common/FormDialog';
import CustomerForm from './CustomerForm';
import api from '../../services/api';
import { toast } from 'react-toastify';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [customerFormData, setCustomerFormData] = useState(null);
  const navigate = useNavigate();

  // Fetch customers
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/customers');
      setCustomers(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load customers');
      console.error('Customer fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Handle view customer
  const handleViewCustomer = (customerId) => {
    navigate(`/customers/${customerId}`);
  };

  // Handle add customer
  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setCustomerFormData(null);
    setOpenForm(true);
  };

  // Handle edit customer
  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setOpenForm(true);
  };

  // Handle form data change
  const handleFormDataChange = (formData) => {
    setCustomerFormData(formData);
  };

  // Handle delete customer
  const handleDeleteCustomer = (customer) => {
    setConfirmDelete(customer);
  };

  // Confirm delete customer
  const confirmDeleteCustomer = async () => {
    if (!confirmDelete) return;
    
    setFormSubmitting(true);
    try {
      await api.delete(`/customers/${confirmDelete._id}`);
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (err) {
      toast.error('Failed to delete customer');
      console.error('Customer delete error:', err);
    } finally {
      setFormSubmitting(false);
      setConfirmDelete(null);
    }
  };

  // Handle form submit
  const handleFormSubmit = async () => {
    if (!customerFormData) {
      toast.error('No form data available');
      return;
    }

    setFormSubmitting(true);
    try {
      // Prepare data for API
      const customerData = {
        name: customerFormData.name,
        phone: customerFormData.phone,
        email: customerFormData.email,
        idType: customerFormData.idType,
        idNumber: customerFormData.idNumber,
        dob: customerFormData.dob ? customerFormData.dob.toISOString() : null,
        address: customerFormData.address
      };
  
      if (selectedCustomer) {
        // Update existing customer
        await api.put(`/customers/${selectedCustomer._id}`, customerData);
        toast.success('Customer updated successfully');
      } else {
        // Create new customer
        await api.post('/customers', customerData);
        toast.success('Customer added successfully');
      }
      fetchCustomers();
      setOpenForm(false);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save customer';
      toast.error(errorMessage);
      console.error('Customer save error:', err);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Table columns
  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 150,
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 200,
      valueGetter: (params) => params.row.email || '-',
    },
    {
      field: 'idNumber',
      headerName: 'ID Number',
      width: 150,
      valueGetter: (params) => params.row.idNumber || '-',
    },
    {
      field: 'address',
      headerName: 'City',
      width: 120,
      valueGetter: (params) => params.row.address?.city || '-',
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 120,
      valueFormatter: (params) =>
        params.value ? format(new Date(params.value), 'MM/dd/yyyy') : '-',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View">
            <IconButton
              size="small"
              onClick={() => handleViewCustomer(params.row._id)}
              color="primary"
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => handleEditCustomer(params.row)}
              color="secondary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDeleteCustomer(params.row)}
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
        title="Customers"
        subtitle="Manage your customer database"
        breadcrumbs={[{ label: 'Customers' }]}
        actionText="Add Customer"
        actionIcon={<AddIcon />}
        onActionClick={handleAddCustomer}
      />

      <DataTable
        title="Customers List"
        rows={customers}
        columns={columns}
        loading={loading}
        error={error}
        getRowId={(row) => row._id}
        height={600}
      />

      {/* Add/Edit Customer Form */}
      {openForm && (
        <FormDialog
          open={openForm}
          onClose={() => setOpenForm(false)}
          title={selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
          onSubmit={handleFormSubmit}
          loading={formSubmitting}
          submitLabel={selectedCustomer ? 'Update' : 'Save'}
        >
          <CustomerForm
            initialData={selectedCustomer}
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
          title="Delete Customer"
          subtitle="Are you sure you want to delete this customer? This action cannot be undone."
          onSubmit={confirmDeleteCustomer}
          loading={formSubmitting}
          submitLabel="Delete"
          maxWidth="xs"
        >
          <Box sx={{ py: 1 }}>
            <strong>Name:</strong> {confirmDelete.name}
            <br />
            <strong>Phone:</strong> {confirmDelete.phone}
            <br />
            <strong>Email:</strong> {confirmDelete.email || 'N/A'}
          </Box>
        </FormDialog>
      )}
    </>
  );
};

export default Customers; 