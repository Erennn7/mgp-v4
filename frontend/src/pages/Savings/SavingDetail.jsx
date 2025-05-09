import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  Divider, 
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  ShoppingCart as RedeemIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  CreditCard as CardIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import PageHeader from '../../components/Common/PageHeader';

const SavingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const installmentsRef = useRef(null);

  // State
  const [saving, setSaving] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [openRedemptionDialog, setOpenRedemptionDialog] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [paymentData, setPaymentData] = useState({
    paymentDate: dayjs().format('YYYY-MM-DD'),
    paymentMethod: 'Cash',
    notes: '',
  });
  const [cancelReason, setCancelReason] = useState('');

  // Fetch saving data
  useEffect(() => {
    const fetchSavingData = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/savings/${id}`);
        setSaving(response.data.data);
        console.log('Saving data loaded:', response.data.data);
        console.log('Redemption field:', response.data.data.redemption);
        console.log('Is redeemed:', response.data.data.isRedeemed);
        setError(null);
      } catch (err) {
        console.error('Error fetching saving:', err);
        setError('Failed to load saving scheme details');
        showSnackbar('Error loading saving scheme details', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSavingData();
  }, [id]);

  // Calculate progress
  const calculateProgress = () => {
    if (!saving) return 0;
    
    const paidInstallments = saving.installments.filter(inst => inst.status === 'Paid').length;
    const totalInstallments = saving.installments.length;
    
    return (paidInstallments / totalInstallments) * 100;
  };

  // Handle payment dialog
  const handleOpenPaymentDialog = (installment) => {
    setSelectedInstallment(installment);
    setPaymentData({
      paymentDate: dayjs().format('YYYY-MM-DD'),
      paymentMethod: 'Cash',
      notes: '',
    });
    setOpenPaymentDialog(true);
  };

  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
    setSelectedInstallment(null);
  };

  const handlePaymentDataChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({
      ...paymentData,
      [name]: value,
    });
  };

  const handlePaymentDateChange = (date) => {
    setPaymentData({
      ...paymentData,
      paymentDate: date ? dayjs(date).format('YYYY-MM-DD') : null,
    });
  };

  const handleProcessPayment = async () => {
    if (!selectedInstallment) return;
    
    try {
      const response = await api.post(`/savings/${id}/installments/${selectedInstallment._id}/pay`, {
        paidDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
        notes: paymentData.notes,
      });
      
      showSnackbar('Payment processed successfully', 'success');
      handleClosePaymentDialog();
      
      // Refresh saving data
      const updatedSaving = await api.get(`/savings/${id}`);
      setSaving(updatedSaving.data.data);
    } catch (err) {
      console.error('Error processing payment:', err);
      showSnackbar(err.response?.data?.error || 'Failed to process payment', 'error');
    }
  };

  // Handle scheme cancellation
  const handleOpenCancelDialog = () => {
    setOpenCancelDialog(true);
  };

  const handleCloseCancelDialog = () => {
    setOpenCancelDialog(false);
    setCancelReason('');
  };

  const handleCancelScheme = async () => {
    try {
      await api.put(`/savings/${id}/cancel`, { reason: cancelReason });
      showSnackbar('Scheme cancelled successfully', 'success');
      handleCloseCancelDialog();
      
      // Refresh saving data
      const updatedSaving = await api.get(`/savings/${id}`);
      setSaving(updatedSaving.data.data);
    } catch (err) {
      console.error('Error cancelling scheme:', err);
      showSnackbar(err.response?.data?.error || 'Failed to cancel scheme', 'error');
    }
  };

  // Handle redemption
  const handleRedeemScheme = () => {
    navigate(`/savings/${id}/redeem`);
  };

  // Get status chip color
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

  // Get installment status chip color
  const getInstallmentStatusChipColor = (status) => {
    switch (status) {
      case 'Paid':
        return { bg: '#e8f5e9', color: '#2e7d32' }; // Green
      case 'Pending':
        return { bg: '#fff8e1', color: '#f57f17' }; // Amber
      case 'Missed':
        return { bg: '#ffebee', color: '#c62828' }; // Red
      case 'Waived':
        return { bg: '#e0f2f1', color: '#00796b' }; // Teal
      default:
        return { bg: '#eeeeee', color: '#616161' }; // Grey
    }
  };

  // Calculate maturity details
  const calculateMaturityDetails = () => {
    if (!saving) return { totalContribution: 0, bonusAmount: 0, maturityAmount: 0 };
    
    const totalContribution = saving.installmentAmount * saving.duration;
    let bonusAmount = 0;
    
    if (saving.bonusAmount > 0) {
      bonusAmount = saving.bonusAmount;
    } else if (saving.bonusPercentage > 0) {
      bonusAmount = (totalContribution * saving.bonusPercentage) / 100;
    } else {
      bonusAmount = saving.installmentAmount;
    }
    
    const maturityAmount = totalContribution + bonusAmount;
    
    return { totalContribution, bonusAmount, maturityAmount };
  };

  // Scroll to installments section
  const scrollToInstallments = () => {
    installmentsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="error">{error}</Alert>
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

  if (!saving) {
    return null;
  }

  const { totalContribution, bonusAmount, maturityAmount } = calculateMaturityDetails();
  const progress = calculateProgress();
  const isCompleted = saving.status === 'Completed';
  const isActive = saving.status === 'Active';
  const isRedeemed = saving.status === 'Redeemed';
  const isCancelled = saving.status === 'Cancelled';

  console.log("Saving state for redemption button:", {
    isRedeemed: saving.isRedeemed,
    redemption: saving.redemption,
    redemptionExists: Boolean(saving.redemption),
    status: saving.status
  });

  return (
    <Box>
      <PageHeader 
        title="Saving Scheme Details" 
        subtitle={`Scheme #${saving.schemeNumber}`}
        breadcrumbs={[
          { label: 'Savings', link: '/savings' },
          { label: `${saving.schemeNumber}` },
        ]}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/savings')}
            size="small"
          >
            Back
          </Button>
          
          {isActive && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/savings/${id}/edit`)}
              size="small"
            >
              Edit
            </Button>
          )}
          
          <Button
            variant="outlined"
            color="info"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            size="small"
          >
            Print
          </Button>
        </Box>
      </PageHeader>
      
      {/* Status and Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={1} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} /> Customer Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Name:
                  </Typography>
                  <Typography variant="body1">
                    {saving.customer?.name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Phone:
                  </Typography>
                  <Typography variant="body1">
                    {saving.customer?.phone || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email:
                  </Typography>
                  <Typography variant="body1">
                    {saving.customer?.email || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => navigate(`/customers/${saving.customer?._id}`)}
                    >
                      View Customer
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card elevation={1} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TimeIcon sx={{ mr: 1 }} /> Scheme Status
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item>
                    <Chip
                      label={saving.status}
                      sx={{
                        backgroundColor: getStatusChipColor(saving.status).bg,
                        color: getStatusChipColor(saving.status).color,
                        fontWeight: 'medium',
                        fontSize: '0.9rem',
                        py: 0.5,
                      }}
                    />
                  </Grid>
                  <Grid item xs>
                    <Typography variant="body2" color="text.secondary">
                      Scheme: {saving.schemeName}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Completion Progress
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ 
                    height: 10, 
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: isCompleted || isRedeemed ? 'success.main' : 'primary.main',
                    },
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {saving.installments.filter(i => i.status === 'Paid').length} of {saving.installments.length} installments paid ({Math.round(progress)}%)
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                {isActive && (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<PaymentIcon />}
                      onClick={scrollToInstallments}
                    >
                      Record Payment
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<CancelIcon />}
                      onClick={handleOpenCancelDialog}
                    >
                      Cancel Scheme
                    </Button>
                  </>
                )}
                
                {(isCompleted || (isActive && progress > 70)) && !isRedeemed && (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    startIcon={<RedeemIcon />}
                    onClick={handleRedeemScheme}
                  >
                    Redeem Scheme
                  </Button>
                )}
                
                {saving.isRedeemed && (
                  <Button
                    variant="outlined"
                    color="info"
                    size="small"
                    startIcon={<ReceiptIcon />}
                    onClick={() => {
                      // Handle both cases - when redemption is an ID string or an object with _id
                      const redemptionId = typeof saving.redemption === 'string' 
                        ? saving.redemption 
                        : saving.redemption?._id;
                      
                      if (!redemptionId) {
                        showSnackbar('Redemption ID not found', 'error');
                        return;
                      }
                      
                      console.log('Navigating to redemption:', redemptionId);
                      navigate(`/savings/redemptions/${redemptionId}`);
                    }}
                  >
                    View Redemption
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Scheme Details */}
      <Paper sx={{ p: 2, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <CalendarIcon sx={{ mr: 1 }} /> Scheme Details
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Scheme Number:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {saving.schemeNumber}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Scheme Name:
                </Typography>
                <Typography variant="body1">
                  {saving.schemeName}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Start Date:
                </Typography>
                <Typography variant="body1">
                  {format(new Date(saving.startDate), 'dd/MM/yyyy')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Maturity Date:
                </Typography>
                <Typography variant="body1">
                  {format(new Date(saving.maturityDate), 'dd/MM/yyyy')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Duration:
                </Typography>
                <Typography variant="body1">
                  {saving.duration} months
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Installment Amount:
                </Typography>
                <Typography variant="body1">
                  ₹{saving.installmentAmount.toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                Maturity Summary
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Contribution:
                  </Typography>
                  <Typography variant="body1">
                    ₹{totalContribution.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Bonus:
                  </Typography>
                  <Typography variant="body1">
                    ₹{bonusAmount.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Maturity Amount:
                  </Typography>
                  <Typography variant="h6" color="primary.main" fontWeight="bold">
                    ₹{maturityAmount.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  {isRedeemed ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Redeemed"
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                  ) : null}
                </Grid>
              </Grid>
            </Paper>
            
            {isRedeemed && saving.redemptionDate && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Redemption Date:
                </Typography>
                <Typography variant="body1">
                  {format(new Date(saving.redemptionDate), 'dd/MM/yyyy')}
                </Typography>
              </Box>
            )}
            
            {saving.notes && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Notes:
                </Typography>
                <Typography variant="body2">
                  {saving.notes}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      {/* Installments */}
      <Paper sx={{ p: 2, borderRadius: 2, mb: 3 }} ref={installmentsRef}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <MoneyIcon sx={{ mr: 1 }} /> Installments
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'primary.main', '& .MuiTableCell-root': { color: 'white' } }}>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment Date</TableCell>
                <TableCell>Payment Method</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {saving.installments.map((installment, index) => (
                <TableRow
                  key={installment._id || index}
                  sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{format(new Date(installment.dueDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell align="right">₹{installment.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={installment.status}
                      size="small"
                      sx={{
                        backgroundColor: getInstallmentStatusChipColor(installment.status).bg,
                        color: getInstallmentStatusChipColor(installment.status).color,
                        fontWeight: 'medium',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {installment.paidDate
                      ? format(new Date(installment.paidDate), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>{installment.paymentMethod || '-'}</TableCell>
                  <TableCell>
                    {installment.status === 'Pending' && isActive ? (
                      <Tooltip title="Record Payment">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenPaymentDialog(installment)}
                        >
                          <PaymentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={handleClosePaymentDialog}>
        <DialogTitle>Record Installment Payment</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Record payment for installment #{saving.installments.indexOf(selectedInstallment) + 1}
          </DialogContentText>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <DatePicker
                label="Payment Date"
                value={paymentData.paymentDate ? dayjs(paymentData.paymentDate) : null}
                onChange={handlePaymentDateChange}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                  },
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="payment-method-label">Payment Method</InputLabel>
                <Select
                  labelId="payment-method-label"
                  name="paymentMethod"
                  value={paymentData.paymentMethod}
                  onChange={handlePaymentDataChange}
                  label="Payment Method"
                >
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Card">Card</MenuItem>
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="normal"
                label="Notes"
                name="notes"
                value={paymentData.notes}
                onChange={handlePaymentDataChange}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleProcessPayment}
            startIcon={<PaymentIcon />}
          >
            Process Payment
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Cancel Dialog */}
      <Dialog open={openCancelDialog} onClose={handleCloseCancelDialog}>
        <DialogTitle>Cancel Savings Scheme</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this savings scheme? This action cannot be undone.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for Cancellation"
            fullWidth
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog}>No, Keep Active</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleCancelScheme}
            startIcon={<CancelIcon />}
          >
            Yes, Cancel Scheme
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SavingDetail; 