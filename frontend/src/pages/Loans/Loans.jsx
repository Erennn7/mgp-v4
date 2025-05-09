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
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon,
  FilterAlt as FilterIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { format } from 'date-fns';
import PageHeader from '../../components/Common/PageHeader';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';

const Loans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [totalLoans, setTotalLoans] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const fetchLoans = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', paginationModel.page + 1);
      params.append('limit', paginationModel.pageSize);
      
      if (searchTerm) {
        params.append('loanNumber', searchTerm);
      }
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      const response = await api.get(`/loans?${params.toString()}`);
      setLoans(response.data.data);
      setTotalLoans(response.data.pagination ? response.data.pagination.total : response.data.count);
      setError(null);
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError('Failed to load loans. Please try again.');
      showSnackbar('Failed to load loans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [paginationModel.page, paginationModel.pageSize, searchTerm, statusFilter]);

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
      case 'Closed':
        return { bg: '#e8f5e9', color: '#2e7d32' }; // Green
      case 'Defaulted':
        return { bg: '#ffebee', color: '#c62828' }; // Red
      case 'Extended':
        return { bg: '#fff8e1', color: '#f57f17' }; // Amber
      default:
        return { bg: '#eeeeee', color: '#616161' }; // Grey
    }
  };

  const columns = [
    { 
      field: 'loanNumber', 
      headerName: 'Loan Number', 
      flex: 1,
      minWidth: 150,
    },
    { 
      field: 'customer', 
      headerName: 'Customer', 
      flex: 1.5,
      minWidth: 180,
      valueGetter: (params) => params.row.customer?.name || 'N/A',
    },
    { 
      field: 'startDate', 
      headerName: 'Start Date', 
      flex: 1,
      minWidth: 120,
      valueFormatter: (params) => params.value ? format(new Date(params.value), 'dd/MM/yyyy') : 'N/A',
    },
    { 
      field: 'dueDate', 
      headerName: 'Due Date', 
      flex: 1,
      minWidth: 120,
      valueFormatter: (params) => params.value ? format(new Date(params.value), 'dd/MM/yyyy') : 'N/A',
    },
    { 
      field: 'totalLoanAmount', 
      headerName: 'Amount', 
      flex: 1,
      minWidth: 120,
      type: 'number',
      valueFormatter: (params) => params.value ? `₹${params.value.toLocaleString()}` : '₹0',
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      flex: 1,
      minWidth: 120,
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
      flex: 1,
      minWidth: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton 
              size="small" 
              onClick={() => navigate(`/loans/${params.row._id}`)}
              sx={{ mr: 1 }}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Loan">
            <IconButton 
              size="small" 
              onClick={() => navigate(`/loans/${params.row._id}/edit`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <>
      <PageHeader 
        title="Loans" 
        subtitle="Manage customer loans"
        breadcrumbs={[{ label: 'Loans' }]}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/loans/new')}
        >
          New Loan
        </Button>
      </PageHeader>
      
      <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              label="Search Loan Number"
              value={searchTerm}
              onChange={handleSearchChange}
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
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
                <MenuItem value="Defaulted">Defaulted</MenuItem>
                <MenuItem value="Extended">Extended</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              disabled={!searchTerm && !statusFilter}
              fullWidth
              size="medium"
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ height: 500, width: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="error">{error}</Typography>
              <Button 
                variant="outlined" 
                sx={{ mt: 2 }} 
                onClick={fetchLoans}
              >
                Retry
              </Button>
            </Box>
          ) : (
            <DataGrid
              rows={loans}
              columns={columns}
              pagination
              paginationMode="server"
              rowCount={totalLoans}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[5, 10, 25, 50]}
              getRowId={(row) => row._id}
              loading={loading}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'rgba(92, 107, 192, 0.08)',
                },
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
              }}
            />
          )}
        </Box>
      </Paper>
    </>
  );
};

export default Loans; 