import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  InputAdornment,
  Grid,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Container
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon,
  FilterAlt as FilterIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  ShoppingCart as RedeemIcon,
  Receipt as ReportIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { format } from 'date-fns';
import PageHeader from '../../components/Common/PageHeader';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';

const Savings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [savings, setSavings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [totalSavings, setTotalSavings] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const fetchSavings = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', paginationModel.page + 1);
      params.append('limit', paginationModel.pageSize);
      
      if (searchTerm) {
        params.append('schemeNumber', searchTerm);
      }
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      if (tabValue === 1) {
        params.append('isRedeemed', 'true');
      } else if (tabValue === 0) {
        params.append('isRedeemed', 'false');
      }
      
      const response = await api.get(`/savings?${params.toString()}`);
      setSavings(response.data.data || []);
      
      // Ensure totalSavings is always a valid number
      const total = response.data.pagination?.total || response.data.count || 0;
      setTotalSavings(total);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching savings:', err);
      setError('Failed to load savings. Please try again.');
      showSnackbar('Failed to load savings', 'error');
      // Set to 0 to prevent undefined rowCount
      setTotalSavings(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavings();
  }, [paginationModel.page, paginationModel.pageSize, searchTerm, statusFilter, tabValue]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPaginationModel({
      ...paginationModel,
      page: 0,
    });
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPaginationModel({
      ...paginationModel,
      page: 0,
    });
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPaginationModel({
      ...paginationModel,
      page: 0,
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPaginationModel({
      ...paginationModel,
      page: 0,
    });
  };

  const getStatusChipColor = (status) => {
    switch (status) {
      case 'Active':
        return { bg: '#e3f2fd', color: '#1565c0' }; // Blue
      case 'Completed':
        return { bg: '#e8f5e9', color: '#2e7d32' }; // Green
      case 'Redeemed':
        return { bg: '#e1f5fe', color: '#0277bd' }; // Light Blue
      case 'Cancelled':
        return { bg: '#ffebee', color: '#c62828' }; // Red
      case 'Defaulted':
        return { bg: '#fbe9e7', color: '#d84315' }; // Deep Orange
      default:
        return { bg: '#eeeeee', color: '#616161' }; // Grey
    }
  };

  const handleRedeem = (id) => {
    navigate(`/savings/${id}/redeem`);
  };

  const columns = [
    { 
      field: 'schemeNumber', 
      headerName: 'Scheme #', 
      flex: 1,
      minWidth: 120,
      maxWidth: 140
    },
    { 
      field: 'customer', 
      headerName: 'Customer', 
      flex: 1,
      minWidth: 140,
      maxWidth: 180,
      valueGetter: (params) => params.row.customer?.name || 'N/A',
    },
    { 
      field: 'schemeName', 
      headerName: 'Scheme Name', 
      flex: 1,
      minWidth: 140,
      maxWidth: 180,
    },
    { 
      field: 'installmentAmount', 
      headerName: 'Monthly', 
      flex: 0.8,
      minWidth: 90,
      maxWidth: 110,
      type: 'number',
      valueFormatter: (params) => params.value ? `₹${params.value.toLocaleString()}` : '₹0',
    },
    { 
      field: 'totalAmount', 
      headerName: 'Total', 
      flex: 0.8,
      minWidth: 90,
      maxWidth: 110,
      type: 'number',
      valueFormatter: (params) => params.value ? `₹${params.value.toLocaleString()}` : '₹0',
    },
    { 
      field: 'duration', 
      headerName: 'Duration', 
      flex: 0.6,
      minWidth: 70,
      maxWidth: 90,
      valueFormatter: (params) => params.value ? `${params.value} mo.` : 'N/A',
    },
    { 
      field: 'startDate', 
      headerName: 'Start Date', 
      flex: 0.8,
      minWidth: 90,
      maxWidth: 110,
      valueFormatter: (params) => params.value ? format(new Date(params.value), 'dd/MM/yy') : 'N/A',
    },
    { 
      field: 'maturityDate', 
      headerName: 'Maturity', 
      flex: 0.8,
      minWidth: 90,
      maxWidth: 110,
      valueFormatter: (params) => params.value ? format(new Date(params.value), 'dd/MM/yy') : 'N/A',
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      flex: 0.8,
      minWidth: 90,
      maxWidth: 110,
      renderCell: (params) => {
        const { bg, color } = getStatusChipColor(params.value);
        return (
          <Chip
            label={params.value}
            size="small"
            sx={{
              backgroundColor: bg,
              color: color,
              fontWeight: 'medium',
            }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 110,
      maxWidth: 130,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton 
              size="small" 
              onClick={() => navigate(`/savings/${params.row._id}`)}
              sx={{ mr: 0.5 }}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {params.row.status === 'Active' && (
            <Tooltip title="Edit">
              <IconButton 
                size="small" 
                onClick={() => navigate(`/savings/${params.row._id}/edit`)}
                sx={{ mr: 0.5 }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {(params.row.status === 'Completed' || params.row.status === 'Active') && 
           !params.row.isRedeemed && (
            <Tooltip title="Redeem">
              <IconButton 
                size="small" 
                onClick={() => handleRedeem(params.row._id)}
                sx={{ 
                  color: 'secondary.main',
                  bgcolor: 'secondary.light',
                }}
              >
                <RedeemIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  if (tabValue === 1) {
    // Replace some columns for redeemed schemes
    columns.splice(7, 1, { 
      field: 'redemptionDate', 
      headerName: 'Redeemed On', 
      flex: 0.8,
      minWidth: 90,
      maxWidth: 110,
      valueFormatter: (params) => params.value ? format(new Date(params.value), 'dd/MM/yy') : 'N/A',
    });
  }

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Redeemed', label: 'Redeemed' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'Defaulted', label: 'Defaulted' },
  ];

  return (
    <Box>
      <PageHeader 
        title="Savings Schemes" 
        subtitle="Manage customer savings plans"
        breadcrumbs={[{ label: 'Savings' }]}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/savings/new')}
          size="medium"
        >
          New Scheme
        </Button>
      </PageHeader>
      
      <Paper sx={{ p: 2, borderRadius: 2, mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="savings tabs">
            <Tab label="Active Schemes" id="savings-tab-0" />
            <Tab label="Redeemed Schemes" id="savings-tab-1" />
          </Tabs>
        </Box>
        
        <Grid container spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              label="Search Scheme Number"
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Status"
                startAdornment={
                  <InputAdornment position="start">
                    <FilterIcon fontSize="small" />
                  </InputAdornment>
                }
              >
                {statusOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            {(searchTerm || statusFilter) && (
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                size="small"
              >
                Clear
              </Button>
            )}
          </Grid>
          <Grid item xs={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              color="info"
              startIcon={<ReportIcon />}
              onClick={() => navigate('/reports/savings')}
              size="small"
            >
              Reports
            </Button>
          </Grid>
        </Grid>
        
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        
        <Box sx={{ height: 500 }}>
          <DataGrid
            rows={savings.map(s => ({ ...s, id: s._id || `temp-${s.schemeNumber}` }))}
            columns={columns}
            loading={loading}
            paginationMode="server"
            rowCount={totalSavings}
            pageSizeOptions={[5, 10, 25]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            disableRowSelectionOnClick
            getRowClassName={(params) => 
              params.row.isRedeemed ? 'redeemed-row' : ''
            }
            density="compact"
            sx={{
              '& .MuiDataGrid-columnHeader': {
                backgroundColor: 'primary.main',
                color: 'white',
                '& .MuiDataGrid-columnHeaderTitle': {
                  color: 'white',
                },
                '& .MuiIconButton-root': {
                  color: 'white',
                }
              },
              '& .redeemed-row': {
                bgcolor: '#f5f5f5',
              },
              border: 'none',
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              }
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default Savings; 