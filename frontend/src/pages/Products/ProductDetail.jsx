import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Divider,
  Button,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Avatar,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  ShoppingBasket as ShoppingBasketIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import PageHeader from '../../components/Common/PageHeader';
import DataTable from '../../components/Common/DataTable';
import FormDialog from '../../components/Common/FormDialog';
import StatusChip from '../../components/Common/StatusChip';
import ProductForm from './ProductForm';
import api from '../../services/api';
import { toast } from 'react-toastify';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openEditForm, setOpenEditForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [productFormData, setProductFormData] = useState(null);

  // Fetch product data
  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/products/${id}`);
      
      // Get latest rates for price calculation
      const ratesResponse = await api.get('/rates/latest');
      const latestRates = ratesResponse.data.success ? ratesResponse.data.data : [];
      
      const product = response.data.data;
      
      // Calculate rate per gram only
      let ratePerGram = 0;
      
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
      
      // Add rate per gram to product object
      const productWithRate = {
        ...product,
        ratePerGram: ratePerGram
      };
      
      setProduct(productWithRate);
      setError(null);
    } catch (err) {
      setError('Failed to load product data');
      console.error('Product fetch error:', err);
      toast.error('Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch product's sales history
  const fetchSales = async () => {
    setSalesLoading(true);
    try {
      const response = await api.get(`/sales/product/${id}`);
      setSales(response.data.data);
    } catch (err) {
      console.error('Sales fetch error:', err);
    } finally {
      setSalesLoading(false);
    }
  };

  // Fetch all product-related data
  const fetchAllData = () => {
    fetchProduct();
    fetchSales();
  };

  useEffect(() => {
    fetchAllData();
  }, [id]);

  // Handle edit product
  const handleEditProduct = () => {
    setOpenEditForm(true);
  };

  // Handle form data change
  const handleFormDataChange = (formData) => {
    setProductFormData(formData);
  };

  // Handle delete product
  const handleDeleteProduct = () => {
    setConfirmDelete(true);
  };

  // Handle form submit for edit
  const handleFormSubmit = async () => {
    if (!productFormData) {
      toast.error('No form data available');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.put(`/products/${id}`, productFormData);
      toast.success('Product updated successfully');
      fetchProduct();
      setOpenEditForm(false);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to update product';
      toast.error(errorMessage);
      console.error('Product update error:', err);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Confirm delete product
  const confirmDeleteProduct = async () => {
    setFormSubmitting(true);
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      navigate('/products');
    } catch (err) {
      toast.error('Failed to delete product');
      console.error('Product delete error:', err);
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

  // Format currency
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
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
      field: 'customer',
      headerName: 'Customer',
      width: 180,
      valueGetter: (params) => params.row.customer?.name || '-',
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 100,
      valueGetter: (params) => {
        const items = params.row.items || [];
        const productItems = items.filter(item => item.product?._id === id || item.product === id);
        return productItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      },
    },
    {
      field: 'total',
      headerName: 'Total',
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

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error || 'Product not found'}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/products')} startIcon={<ArrowBackIcon />}>
          Back to Products
        </Button>
      </Box>
    );
  }

  return (
    <>
      <PageHeader
        title="Product Details"
        breadcrumbs={[
          { label: 'Products', link: '/products' },
          { label: product.name },
        ]}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/products')}
          >
            Back
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={handleEditProduct}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteProduct}
          >
            Delete
          </Button>
        </Box>
      </PageHeader>

      <Grid container spacing={3}>
        {/* Product Information */}
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
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
                <InventoryIcon fontSize="large" />
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {product.name}
              </Typography>
              <StatusChip 
                status={product.stock > 0 ? 'In Stock' : 'Out of Stock'} 
                size="medium"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Category
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>{formatValue(product.category)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Rate Per Gram
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <MoneyIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>{formatCurrency(product.ratePerGram)}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Current daily rate for {product.purity}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Current Stock
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <InventoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>{formatValue(product.stock)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>{formatDate(product.createdAt)}</Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Description
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {formatValue(product.description, 'No description available')}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Product Details
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {product.huidNumber && (
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>HUID Number:</strong> {product.huidNumber}
                  </Typography>
                </Grid>
              )}
              {product.netWeight && (
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Net Weight:</strong> {product.netWeight} {product.weightType || 'g'}
                  </Typography>
                </Grid>
              )}
              {product.grossWeight && (
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Gross Weight:</strong> {product.grossWeight} {product.weightType || 'g'}
                  </Typography>
                </Grid>
              )}
              {product.purity && (
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Purity:</strong> {product.purity}
                  </Typography>
                </Grid>
              )}
              {product.type && (
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Type:</strong> {product.type}
                  </Typography>
                </Grid>
              )}
              {product.makingCharges > 0 && (
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Making Charges:</strong> {product.makingCharges}%
                  </Typography>
                </Grid>
              )}
              {product.hasStone && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                      Stone/Beeds Information:
                    </Typography>
                  </Grid>
                  {product.stoneDetails && (
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Details:</strong> {product.stoneDetails}
                      </Typography>
                    </Grid>
                  )}
                  {product.stonePrice > 0 && (
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Stone Price:</strong> {formatCurrency(product.stonePrice)}
                      </Typography>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Sales History */}
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Sales History
              </Typography>
              <Chip
                icon={<ShoppingBasketIcon fontSize="small" />}
                label={`${sales.length} Transaction${sales.length !== 1 ? 's' : ''}`}
                color="primary"
                variant="outlined"
              />
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <DataTable
              rows={sales}
              columns={salesColumns}
              loading={salesLoading}
              getRowId={(row) => row._id}
              height={400}
              quickSearch={false}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Product Form */}
      {openEditForm && (
        <FormDialog
          open={openEditForm}
          onClose={() => setOpenEditForm(false)}
          title="Edit Product"
          onSubmit={handleFormSubmit}
          loading={formSubmitting}
          submitLabel="Update"
        >
          <ProductForm
            initialData={product}
            loading={formSubmitting}
            onFormDataChange={handleFormDataChange}
          />
        </FormDialog>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <FormDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="Delete Product"
          subtitle="Are you sure you want to delete this product? This action cannot be undone."
          onSubmit={confirmDeleteProduct}
          loading={formSubmitting}
          submitLabel="Delete"
          maxWidth="xs"
        >
          <Box sx={{ py: 1 }}>
            <strong>Name:</strong> {product.name}
            <br />
            <strong>Category:</strong> {formatValue(product.category)}
            <br />
            <strong>Rate Per Gram:</strong> {formatCurrency(product.ratePerGram)}
            <br />
            <strong>Current Stock:</strong> {product.stock}
          </Box>
        </FormDialog>
      )}
    </>
  );
};

export default ProductDetail; 