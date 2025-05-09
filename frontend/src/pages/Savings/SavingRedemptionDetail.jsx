import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Grid,
  Typography,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Receipt as ReceiptIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import PageHeader from '../../components/Common/PageHeader';

const SavingRedemptionDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showSnackbar } = useSnackbar();

  // State
  const [redemption, setRedemption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch redemption data
  useEffect(() => {
    const fetchRedemptionData = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/savings/redemptions/${id}`);
        setRedemption(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching redemption details:', err);
        setError('Failed to load redemption details');
        showSnackbar('Error loading redemption details', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchRedemptionData();
  }, [id, showSnackbar]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!redemption) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="error">{error || 'Redemption not found'}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/savings')}
          sx={{ mt: 2 }}
        >
          Back to Savings
        </Button>
      </Box>
    );
  }

  return (
    <>
      <PageHeader 
        title="Redemption Details" 
        subtitle={`Redemption #${redemption.redemptionNumber}`}
        breadcrumbs={[
          { label: 'Savings', link: '/savings' },
          { label: redemption.saving?.schemeNumber, link: `/savings/${redemption.saving?._id}` },
          { label: 'Redemption Details' },
        ]}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/savings/${redemption.saving?._id}`)}
        >
          Back to Scheme
        </Button>
      </PageHeader>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Redemption & Customer Info */}
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Redemption Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Redemption #:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {redemption.redemptionNumber}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Date:
                </Typography>
                <Typography variant="body1">
                  {format(new Date(redemption.redemptionDate), 'dd/MM/yyyy')}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Customer:
                </Typography>
                <Typography variant="body1">
                  {redemption.customer?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {redemption.customer?.phone}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Scheme:
                </Typography>
                <Typography variant="body1">
                  {redemption.saving?.schemeName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  #{redemption.saving?.schemeNumber}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Maturity Amount:
                </Typography>
                <Typography variant="h6" color="primary.main" fontWeight="bold">
                  ₹{redemption.maturityAmount?.toLocaleString()}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status:
                </Typography>
                <Chip
                  label={redemption.additionalPaymentRequired ? 'Additional Payment Required' : 'Fully Paid'}
                  color={redemption.additionalPaymentRequired ? 'warning' : 'success'}
                  size="small"
                />
              </Grid>
              
              {redemption.sale && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Related Sale:
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<ReceiptIcon />}
                    variant="outlined"
                    onClick={() => navigate(`/sales/${redemption.sale._id}`)}
                  >
                    View Sale #{redemption.sale.invoiceNumber}
                  </Button>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>
        
        {/* Redeemed Items */}
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Redeemed Items
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'primary.main', '& .MuiTableCell-root': { color: 'white' } }}>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Rate</TableCell>
                    <TableCell>Weight</TableCell>
                    <TableCell>Making</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {redemption.items && redemption.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2">{item.product?.name || 'Product'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.product?.category || 'Category'}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₹{item.rate}/g</TableCell>
                      <TableCell>{item.weight}g</TableCell>
                      <TableCell>₹{item.makingCharges}</TableCell>
                      <TableCell align="right">₹{item.total?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        {/* Summary */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Purchase Amount:
                    </Typography>
                    <Typography variant="h6">
                      ₹{redemption.totalPurchaseAmount?.toLocaleString()}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Scheme Maturity Amount:
                    </Typography>
                    <Typography variant="h6">
                      ₹{redemption.maturityAmount?.toLocaleString()}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Additional Payment Amount:
                    </Typography>
                    <Typography 
                      variant="h6" 
                      color={redemption.additionalPaymentRequired ? 'error.main' : 'success.main'}
                      fontWeight="bold"
                    >
                      ₹{redemption.additionalPaymentAmount?.toLocaleString() || '0'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    {redemption.additionalPaymentRequired ? (
                      <Chip 
                        icon={<ReceiptIcon />}
                        label="Payment details in Sale Record" 
                        color="info" 
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    ) : (
                      <Chip 
                        icon={<CheckIcon />}
                        label="No additional payment needed" 
                        color="success" 
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  This redemption was processed on {format(new Date(redemption.redemptionDate), 'dd/MM/yyyy')} by {redemption.createdBy?.name || 'staff'}.
                </Typography>
                
                {redemption.notes && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">
                      Notes:
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {redemption.notes}
                    </Typography>
                  </>
                )}
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
};

export default SavingRedemptionDetail; 