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
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import PageHeader from '../../components/Common/PageHeader';
import DataTable from '../../components/Common/DataTable';
import FormDialog from '../../components/Common/FormDialog';
import StatusChip from '../../components/Common/StatusChip';
import ProductForm from './ProductForm';
import api from '../../services/api';
import { toast } from 'react-toastify';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [productFormData, setProductFormData] = useState(null);
  const navigate = useNavigate();

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products');
      
      // Get latest rates for price calculation
      const ratesResponse = await api.get('/rates/latest');
      const latestRates = ratesResponse.data.success ? ratesResponse.data.data : [];
      
      // Calculate rate per gram for each product
      const productsWithRates = response.data.data.map(product => {
        let ratePerGram = 0; // Store the rate per gram
        
        // Only calculate for products with both category and purity
        if (product.category && product.purity && product.netWeight) {
          // Determine metal type from category
          const metal = product.category.includes('Gold') ? 'Gold' : 'Silver';
          
          // Find matching rate
          const rateInfo = latestRates.find(r => r.metal === metal && r.purity === product.purity);
          
          if (rateInfo) {
            // Store the rate per gram
            ratePerGram = rateInfo.ratePerGram;
          }
        }
        
        // Return product with rate per gram only
        return {
          ...product,
          ratePerGram: ratePerGram
        };
      });
      
      setProducts(productsWithRates);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error('Product fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle view product
  const handleViewProduct = (productId) => {
    navigate(`/products/${productId}`);
  };

  // Handle add product
  const handleAddProduct = () => {
    setSelectedProduct(null);
    setProductFormData(null);
    setOpenForm(true);
  };

  // Handle edit product
  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setOpenForm(true);
  };

  // Handle form data change
  const handleFormDataChange = (formData) => {
    setProductFormData(formData);
  };

  // Handle delete product
  const handleDeleteProduct = (product) => {
    setConfirmDelete(product);
  };

  // Confirm delete product
  const confirmDeleteProduct = async () => {
    if (!confirmDelete) return;
    
    setFormSubmitting(true);
    try {
      await api.delete(`/products/${confirmDelete._id}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete product');
      console.error('Product delete error:', err);
    } finally {
      setFormSubmitting(false);
      setConfirmDelete(null);
    }
  };

  // Handle form submit
  const handleFormSubmit = async () => {
    if (!productFormData) {
      toast.error('No form data available');
      return;
    }

    setFormSubmitting(true);
    try {
      if (selectedProduct) {
        // Update existing product
        await api.put(`/products/${selectedProduct._id}`, productFormData);
        toast.success('Product updated successfully');
      } else {
        // Create new product
        await api.post('/products', productFormData);
        toast.success('Product added successfully');
      }
      fetchProducts();
      setOpenForm(false);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save product';
      toast.error(errorMessage);
      console.error('Product save error:', err);
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
      field: 'category',
      headerName: 'Category',
      width: 150,
    },
    {
      field: 'ratePerGram',
      headerName: 'Rate Per Gram',
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
      field: 'stock',
      headerName: 'Stock',
      width: 120,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <StatusChip 
          status={params.row.stock > 0 ? 'In Stock' : 'Out of Stock'} 
        />
      ),
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
              onClick={() => handleViewProduct(params.row._id)}
              color="primary"
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => handleEditProduct(params.row)}
              color="secondary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDeleteProduct(params.row)}
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
        title="Products"
        subtitle="Manage your product inventory"
        breadcrumbs={[{ label: 'Products' }]}
        actionText="Add Product"
        actionIcon={<AddIcon />}
        onActionClick={handleAddProduct}
      />

      <DataTable
        title="Products List"
        rows={products}
        columns={columns}
        loading={loading}
        error={error}
        getRowId={(row) => row._id}
        height={600}
      />

      {/* Add/Edit Product Form */}
      {openForm && (
        <FormDialog
          open={openForm}
          onClose={() => setOpenForm(false)}
          title={selectedProduct ? 'Edit Product' : 'Add New Product'}
          onSubmit={handleFormSubmit}
          loading={formSubmitting}
          submitLabel={selectedProduct ? 'Update' : 'Save'}
        >
          <ProductForm
            initialData={selectedProduct}
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
          title="Delete Product"
          subtitle="Are you sure you want to delete this product? This action cannot be undone."
          onSubmit={confirmDeleteProduct}
          loading={formSubmitting}
          submitLabel="Delete"
          maxWidth="xs"
        >
          <Box sx={{ py: 1 }}>
            <strong>Name:</strong> {confirmDelete.name}
            <br />
            <strong>Category:</strong> {confirmDelete.category}
            <br />
            <strong>Rate Per Gram:</strong> {
              new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
              }).format(confirmDelete.ratePerGram || 0)
            }
          </Box>
        </FormDialog>
      )}
    </>
  );
};

export default Products; 