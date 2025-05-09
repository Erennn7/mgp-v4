import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Divider,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  People as PeopleIcon,
  Inventory as InventoryIcon,
  PriceChange as RateIcon,
  PointOfSale as SaleIcon,
  Money as LoanIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowForwardIcon,
  Warning as WarningIcon,
  AccessTime as AccessTimeIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { format, parseISO } from 'date-fns';

import useAuthStore from '../../store/authStore';
import api from '../../services/api';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/dashboard');
      setDashboardData(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Loading state
  if (loading && !dashboardData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={handleRefresh} startIcon={<RefreshIcon />}>
          Try Again
        </Button>
      </Box>
    );
  }

  // Dashboard content
  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header with welcome message and refresh button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome, {user?.name || 'User'}
        </Typography>
        <Tooltip title="Refresh Dashboard">
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Customers Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" color="text.secondary">
                Customers
              </Typography>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <PeopleIcon />
              </Avatar>
            </Box>
            <Typography component="p" variant="h4" sx={{ mt: 2 }}>
              {dashboardData?.counts?.customers || 0}
            </Typography>
            <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/customers')}
              >
                View All
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Products Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" color="text.secondary">
                Products
              </Typography>
              <Avatar sx={{ bgcolor: 'success.main' }}>
                <InventoryIcon />
              </Avatar>
            </Box>
            <Typography component="p" variant="h4" sx={{ mt: 2 }}>
              {dashboardData?.counts?.products || 0}
            </Typography>
            <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/products')}
              >
                View All
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Sales Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.1),
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" color="text.secondary">
                Total Sales
              </Typography>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                <SaleIcon />
              </Avatar>
            </Box>
            <Typography component="p" variant="h4" sx={{ mt: 2 }}>
              {dashboardData?.counts?.sales || 0}
            </Typography>
            <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/sales')}
              >
                View All
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Loans Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" color="text.secondary">
                Active Loans
              </Typography>
              <Avatar sx={{ bgcolor: 'info.main' }}>
                <LoanIcon />
              </Avatar>
            </Box>
            <Typography component="p" variant="h4" sx={{ mt: 2 }}>
              {dashboardData?.counts?.loans || 0}
            </Typography>
            <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/loans')}
              >
                View All
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Today's summary */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Today's Summary</Typography>
          <Chip
            icon={<AccessTimeIcon fontSize="small" />}
            label={format(new Date(), "MMM dd, yyyy")}
            variant="outlined"
          />
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography color="text.secondary">Sales</Typography>
            <Typography variant="h4">
              {dashboardData?.counts?.todaySales || 0}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography color="text.secondary">Revenue</Typography>
            <Typography variant="h4">
              {formatCurrency(dashboardData?.counts?.todayRevenue || 0)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Charts and Lists Section */}
      <Grid container spacing={3}>
        {/* Sales Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Sales Trend (Current Year)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {dashboardData?.salesData && (
              <Box sx={{ height: 300, mt: 2 }}>
                <BarChart
                  series={[
                    {
                      data: dashboardData.salesData.map(item => item.revenue),
                      label: 'Revenue',
                      color: '#7986cb',
                    }
                  ]}
                  xAxis={[
                    {
                      data: [
                        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                      ],
                      scaleType: 'band',
                    }
                  ]}
                  height={300}
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Low Stock List */}
        <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              height: '100%',
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? alpha(theme.palette.warning.dark, 0.1)
                : alpha(theme.palette.warning.light, 0.2),
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Low Stock Items
              </Typography>
              <Chip
                icon={<WarningIcon fontSize="small" />}
                label="Attention Needed"
                color="warning"
                variant="outlined"
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {dashboardData?.lowStockProducts?.length > 0 ? (
              <List sx={{ maxHeight: 250, overflow: 'auto', '& .MuiListItem-root': { px: 0 } }}>
                {dashboardData.lowStockProducts.map((product) => (
                  <ListItem 
                    key={product._id}
                    secondaryAction={
                      <Chip 
                        label={`${product.stock} left`} 
                        size="small" 
                        color={product.stock === 0 ? "error" : "warning"}
                      />
                    }
                    sx={{ mb: 1 }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: product.stock === 0 ? 'error.main' : 'warning.main' }}>
                        <InventoryIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={product.name} 
                      secondary={product.category} 
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                All products are well-stocked
              </Typography>
            )}
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/products')}
              >
                Manage Inventory
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Sales */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Sales
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {dashboardData?.recentSales?.length > 0 ? (
              <List sx={{ maxHeight: 280, overflow: 'auto' }}>
                {dashboardData.recentSales.map((sale) => (
                  <ListItem
                    key={sale._id}
                    alignItems="flex-start"
                    secondaryAction={
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(sale.total)}
                      </Typography>
                    }
                    sx={{ mb: 1 }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>
                        <SaleIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={sale.customer?.name || 'Customer'}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {sale.invoiceNumber}
                          </Typography>
                          {" — "}
                          {format(new Date(sale.createdAt), "MMM dd, yyyy")}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                No recent sales
              </Typography>
            )}
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/sales')}
              >
                View All Sales
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Overdue Loans */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? alpha(theme.palette.error.dark, 0.1)
                : alpha(theme.palette.error.light, 0.1),
            }}
          >
            <Typography variant="h6" gutterBottom>
              Overdue Loans
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {dashboardData?.overdueLoans?.length > 0 ? (
              <List sx={{ maxHeight: 280, overflow: 'auto' }}>
                {dashboardData.overdueLoans.map((loan) => (
                  <ListItem
                    key={loan._id}
                    alignItems="flex-start"
                    secondaryAction={
                      <Chip 
                        label="Overdue" 
                        size="small" 
                        color="error"
                      />
                    }
                    sx={{ mb: 1 }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'error.main' }}>
                        <LoanIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={loan.customer?.name || 'Customer'}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {loan.loanNumber} - {formatCurrency(loan.principal)}
                          </Typography>
                          {" — Due: "}
                          {format(new Date(loan.dueDate), "MMM dd, yyyy")}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                No overdue loans
              </Typography>
            )}
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="outlined"
                color="error"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/loans')}
              >
                Manage Loans
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 