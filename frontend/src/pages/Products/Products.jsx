import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Tooltip,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  Typography,
  Chip,
  Grid,
  Divider,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  FilterAlt as FilterIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import PageHeader from '../../components/Common/PageHeader';
import DataTable from '../../components/Common/DataTable';
import FormDialog from '../../components/Common/FormDialog';
import StatusChip from '../../components/Common/StatusChip';
import ProductForm from './ProductForm';
import api from '../../services/api';
import { toast } from 'react-toastify';

// Default product types
const DEFAULT_PRODUCT_TYPES = [
  { value: 'All', label: 'All Products' },
  { value: 'Ring', label: 'Rings' },
  { value: 'Necklace', label: 'Necklaces' },
  { value: 'Bracelet', label: 'Bracelets' },
  { value: 'Earring', label: 'Earrings' },
  { value: 'Pendant', label: 'Pendants' },
  { value: 'Chain', label: 'Chains' },
  { value: 'Bangle', label: 'Bangles' },
  { value: 'Coin', label: 'Coins' },
  { value: 'Other', label: 'Other Items' },
];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [productFormData, setProductFormData] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 100,
    page: 0,
  });
  // Add product type filter
  const [selectedType, setSelectedType] = useState('All');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [typeCounts, setTypeCounts] = useState({});
  const [productTypes, setProductTypes] = useState(DEFAULT_PRODUCT_TYPES);
  const [sortedProductTypes, setSortedProductTypes] = useState(DEFAULT_PRODUCT_TYPES);
  const navigate = useNavigate();
  const [totalNetWeight, setTotalNetWeight] = useState(0); // New state for total net weight

  // Fetch custom product types
  const fetchProductTypes = async () => {
    try {
      const response = await api.get('/product-types');
      if (response.data.success) {
        const customTypes = response.data.data.map(type => ({
          value: type.value,
          label: type.label
        }));
        
        // Combine default types with custom types, avoiding duplicates
        const defaultTypeValues = DEFAULT_PRODUCT_TYPES.map(t => t.value);
        const filteredCustomTypes = customTypes.filter(type => 
          !defaultTypeValues.includes(type.value) && type.value !== 'All'
        );
        
        // Create combined list (keep All at the top, then default types, then custom types)
        const newProductTypes = [
          DEFAULT_PRODUCT_TYPES[0], // All Products
          ...DEFAULT_PRODUCT_TYPES.slice(1), // Default types except All
          ...filteredCustomTypes // Custom types
        ];
        
        setProductTypes(newProductTypes);
        // Initialize sortedProductTypes with the same order initially
        setSortedProductTypes(newProductTypes);
      }
    } catch (err) {
      console.error('Error fetching product types:', err);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products', {
        params: {
          limit: paginationModel.pageSize,
          page: paginationModel.page + 1 // API uses 1-based pagination
        }
      });
      
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
      
      // Calculate total net weight - sum of netWeight of ALL products in inventory
      // Each product's weight is multiplied by its stock quantity
      const calculatedTotalNetWeight = productsWithRates.reduce((sum, product) => {
        const netWeight = parseFloat(product.netWeight) || 0;
        const stock = parseInt(product.stock);
        const weightType = product.weightType || 'Gram';
        
        // If stock is 0 or undefined, treat as 1 item in inventory
        const actualStock = (stock === undefined || stock === 0) ? 1 : stock;
        
        // Calculate total weight for this product (netWeight * actualStock)
        const productTotalWeight = netWeight * actualStock;

        // Convert all weights to grams for summation
        if (weightType === 'Milligram') {
          return sum + (productTotalWeight / 1000);
        } else if (weightType === 'Carat') {
          return sum + (productTotalWeight * 0.2);
        } else if (weightType === 'Piece') {
          // For 'Piece' weightType, don't include in weight calculation
          return sum;
        } else {
          // Default to Gram
          return sum + productTotalWeight;
        }
      }, 0);
      setTotalNetWeight(calculatedTotalNetWeight);

      // Count products by type
      const counts = { 'All': productsWithRates.length };
      productTypes.slice(1).forEach(type => {
        counts[type.value] = productsWithRates.filter(p => p.type === type.value).length;
      });
      setTypeCounts(counts);
      
      // Apply type filter
      applyTypeFilter(productsWithRates, selectedType);
      
      // Set total count from pagination data
      if (response.data.pagination) {
        setTotalProducts(response.data.total || response.data.data.length);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error('Product fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply type filter to products
  const applyTypeFilter = (products, type) => {
    if (type === 'All') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(product => product.type === type));
    }
  };

  // Handle type change
  const handleTypeChange = (event, newType) => {
    setSelectedType(newType);
    applyTypeFilter(products, newType);
  };

  useEffect(() => {
    // First fetch the product types, then fetch the products
    fetchProductTypes().then(() => {
      fetchProducts();
    });
  }, [paginationModel.page, paginationModel.pageSize]);

  // Apply filter when selectedType changes
  useEffect(() => {
    applyTypeFilter(products, selectedType);
  }, [selectedType, products]);

  // Update counts when product types or products change
  useEffect(() => {
    if (products.length > 0 && productTypes.length > 0) {
      const counts = { 'All': products.length };
      productTypes.slice(1).forEach(type => {
        counts[type.value] = products.filter(p => p.type === type.value).length;
      });
      setTypeCounts(counts);
      
      // Sort product types by count (descending order)
      // Keep "All Products" at the top, then sort the rest by count
      const allProductsType = productTypes.find(t => t.value === 'All');
      const otherTypes = productTypes.filter(t => t.value !== 'All');
      
      // Sort by product count (descending)
      const sortedTypes = otherTypes.sort((a, b) => {
        const countA = counts[a.value] || 0;
        const countB = counts[b.value] || 0;
        return countB - countA; // Descending order
      });
      
      // Set the sorted types with "All" at the top
      setSortedProductTypes([allProductsType, ...sortedTypes]);
    }
  }, [products, productTypes]);

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
      
      // Refresh product types first, then fetch products
      await fetchProductTypes();
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
      width: 140,
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
    },
    {
      field: 'weights',
      headerName: 'Net Wt/Gross Wt',
      width: 140,
      valueGetter: (params) => {
        return { 
          netWeight: params.row.netWeight || 0, 
          grossWeight: params.row.grossWeight || 0,
          weightType: params.row.weightType || 'Gram'
        };
      },
      renderCell: (params) => {
        const { netWeight, grossWeight, weightType } = params.value;
        const unit = weightType === 'Gram' ? 'g' : 
                    weightType === 'Milligram' ? 'mg' : 
                    weightType === 'Carat' ? 'ct' : '';
        
        return (
          <Typography variant="body2">
            {`${netWeight}${unit}/${grossWeight}${unit}`}
          </Typography>
        );
      },
    },
    {
      field: 'stock',
      headerName: 'Stock',
      width: 100,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <StatusChip 
          status={params.row.stock > 0 ? 'In Stock' : 'Out of Stock'} 
        />
      ),
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

        <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <FilterIcon sx={{ mr: 1 }} /> Filter by Type
        </Typography>

        <Box sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          pb: 2
        }}>
          {sortedProductTypes.map((type) => (
            <Chip
              key={type.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {type.label}
                  {typeCounts[type.value] > 0 && (
                    <Box 
                      component="span"
                      sx={{ 
                        ml: 0.5,
                        bgcolor: selectedType === type.value ? 'primary.dark' : 'action.selected',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                      }}
                    >
                      {typeCounts[type.value]}
                    </Box>
                  )}
                </Box>
              }
              onClick={() => handleTypeChange(null, type.value)}
              color={selectedType === type.value ? "primary" : "default"}
              variant={selectedType === type.value ? "filled" : "outlined"}
              sx={{
                m: 0.5,
                '& .MuiChip-label': {
                  display: 'flex',
                  alignItems: 'center',
                }
              }}
            />
          ))}
        </Box>

        <Box sx={{ mt: 2 }}>
          <DataTable
            title="Products List"
            rows={filteredProducts}
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
            rowCount={totalProducts}
            quickSearchField="custom"
            customSearchFunction={(row, searchTerm) => {
              // If no search term, include the row
              if (!searchTerm) return true;
              
              // Convert search term to lowercase
              const lowerSearchTerm = searchTerm.toLowerCase();
              
              // Check if search includes 'g', 'mg', or 'ct' - indicating a weight search
              const isWeightSearch = /\d+(\.\d+)?g|\d+(\.\d+)?mg|\d+(\.\d+)?ct/i.test(searchTerm);
              
              if (isWeightSearch) {
                // Extract the number and unit from the search
                const match = searchTerm.match(/(\d+(\.\d+)?)([gmct]+)/i);
                if (match) {
                  const searchValue = parseFloat(match[1]);
                  const searchUnit = match[3].toLowerCase();
                  
                  // Get the product's weight values
                  const netWeight = parseFloat(row.netWeight) || 0;
                  const grossWeight = parseFloat(row.grossWeight) || 0;
                  const weightUnit = (row.weightType || 'Gram').toLowerCase();
                  
                  // Normalize units for comparison
                  const normalizedSearchUnit = 
                    searchUnit === 'g' ? 'gram' : 
                    searchUnit === 'mg' ? 'milligram' : 
                    searchUnit === 'ct' ? 'carat' : 'gram';
                  
                  // Check if the search weight matches either net or gross weight
                  return (
                    (Math.abs(netWeight - searchValue) < 0.01 && normalizedSearchUnit === weightUnit.toLowerCase()) ||
                    (Math.abs(grossWeight - searchValue) < 0.01 && normalizedSearchUnit === weightUnit.toLowerCase())
                  );
                }
              }
              
              // Otherwise fall back to standard search across all fields
              return Object.keys(row).some(key => {
                const value = row[key];
                if (value === null || value === undefined) return false;
                
                // Special handling for the weights
                if (key === 'netWeight' || key === 'grossWeight') {
                  return String(value).includes(lowerSearchTerm);
                }
                
                return String(value).toLowerCase().includes(lowerSearchTerm);
              });
            }}
          />
        </Box>

        {/* New section for Total Inventory Weight */}
        <Paper sx={{ mb: 3, p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
            <InventoryIcon sx={{ mr: 1 }} /> Total Inventory Weight
          </Typography>
          <Typography variant="h5" color="primary">
            {totalNetWeight.toFixed(3)} grams
          </Typography>
        </Paper>



        {/* Add/Edit Product Form */}
        {openForm && (
          <FormDialog
            open={openForm}
            onClose={() => {
              setOpenForm(false);
              // Refresh product types when the form is closed
              fetchProductTypes();
            }}
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
              <strong>Net Wt/Gross Wt:</strong> {confirmDelete.netWeight || 0}
              {confirmDelete.weightType === 'Gram' ? 'g' : 
               confirmDelete.weightType === 'Milligram' ? 'mg' : 
               confirmDelete.weightType === 'Carat' ? 'ct' : ''}
              /{confirmDelete.grossWeight || 0}
              {confirmDelete.weightType === 'Gram' ? 'g' : 
               confirmDelete.weightType === 'Milligram' ? 'mg' : 
               confirmDelete.weightType === 'Carat' ? 'ct' : ''}
            </Box>
          </FormDialog>
        )}
      </>
    );
};

export default Products;
