import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  InputAdornment,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ButtonGroup
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Payment as PaymentIcon,
  Update as UpdateIcon,
  ReceiptLong as ReceiptIcon,
} from '@mui/icons-material';
import { format, compareAsc, addMonths } from 'date-fns';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import PageHeader from '../../components/Common/PageHeader';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';

const LoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();

  // State
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loanCalculation, setLoanCalculation] = useState(null);
  
  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Load loan data
  useEffect(() => {
    const fetchLoan = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/loans/${id}`);
        setLoan(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching loan details:', err);
        setError('Failed to load loan details. Please try again.');
        showSnackbar('Failed to load loan details', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchLoan();
  }, [id]);

  // Calculate loan statistics from the backend calculation
  useEffect(() => {
    if (loan) {
      // Use our loan model's calculation method through API
      const getLoanCalculation = async () => {
        try {
          // This assumes the backend has this endpoint - if not, we would need to create it
          const response = await api.get(`/loans/${id}/calculate`);
          setLoanCalculation(response.data.data);
        } catch (err) {
          // Fallback to frontend calculation if API not available
          console.error('Error getting loan calculation', err);
          
          // Calculate months elapsed
          const startDate = new Date(loan.startDate);
          const today = new Date();
          const monthsElapsed = (today.getFullYear() - startDate.getFullYear()) * 12 + 
                              today.getMonth() - startDate.getMonth();
          
          // Calculate using simple interest instead of compound
          const monthlyRate = loan.interestRate / 100;
          
          // Process payments chronologically
          const sortedPayments = [...loan.payments].sort((a, b) => new Date(a.date) - new Date(b.date));
          
          let remainingPrincipal = loan.totalLoanAmount;
          let accruedInterest = 0;
          let totalPaid = 0;
          let currentDate = new Date(startDate);
          
          for (const payment of sortedPayments) {
            const paymentDate = new Date(payment.date);
            
            // Calculate months between dates with partial month adjustment
            const paymentMonthsDiff = (paymentDate.getFullYear() - currentDate.getFullYear()) * 12 + 
                                paymentDate.getMonth() - currentDate.getMonth() +
                                (paymentDate.getDate() >= currentDate.getDate() ? 0 : -1);
            
            if (paymentMonthsDiff > 0) {
              // Add simple interest for this period
              const interestForPeriod = remainingPrincipal * monthlyRate * paymentMonthsDiff;
              accruedInterest += interestForPeriod;
            }
            
            // Add to total paid
            totalPaid += payment.amount;
            
            // Apply payment - first to interest, then principal
            if (payment.amount <= accruedInterest) {
              accruedInterest -= payment.amount;
            } else {
              const remainingPayment = payment.amount - accruedInterest;
              accruedInterest = 0;
              remainingPrincipal = Math.max(0, remainingPrincipal - remainingPayment);
            }
            
            currentDate = new Date(paymentDate);
          }
          
          // Calculate interest from last payment to today
          const finalMonthsDiff = (today.getFullYear() - currentDate.getFullYear()) * 12 + 
                               today.getMonth() - currentDate.getMonth() +
                               (today.getDate() >= currentDate.getDate() ? 0 : -1);
          
          if (finalMonthsDiff > 0 && remainingPrincipal > 0) {
            const finalInterest = remainingPrincipal * monthlyRate * finalMonthsDiff;
            accruedInterest += finalInterest;
          }
          
          const totalDue = remainingPrincipal + accruedInterest;
          
          // Create calculation object
          setLoanCalculation({
            originalPrincipal: loan.totalLoanAmount,
            remainingPrincipal,
            interestAccrued: accruedInterest, 
            totalDue,
            totalPaid,
            remainingBalance: totalDue,
            paidInFull: totalDue <= 0,
            monthsElapsed
          });
        }
      };
      
      getLoanCalculation();
    }
  }, [loan]);

  // Get status chip color
  const getStatusChipColor = (status) => {
    switch (status) {
      case 'Active':
        return { bg: '#e3f2fd', color: '#1565c0' }; // Blue
      case 'Closed':
        return { bg: '#e8f5e9', color: '#2e7d32' }; // Green
      case 'Defaulted':
        return { bg: '#ffebee', color: '#c62828' }; // Red
      default:
        return { bg: '#eeeeee', color: '#616161' }; // Grey
    }
  };

  // Handle partial payment presets
  const setPartialPayment = (percentage) => {
    if (!loanCalculation) return;
    
    const amount = loanCalculation.totalDue * (percentage / 100);
    setPaymentAmount(amount.toFixed(2));
    setPaymentType('Partial');
    setPaymentNotes(`${percentage}% partial payment`);
  };

  // Handle payment dialog
  const openPaymentDialog = () => {
    if (loanCalculation) {
      setPaymentAmount(loanCalculation.totalDue.toFixed(2));
    }
    setPaymentDialogOpen(true);
  };

  const closePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setPaymentAmount('');
    setPaymentType('Cash');
    setPaymentNotes('');
  };

  const handleSubmitPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      showSnackbar('Please enter a valid payment amount', 'error');
      return;
    }

    setIsSubmittingPayment(true);
    
    try {
      const response = await api.post(`/loans/${id}/payments`, {
        amount: parseFloat(paymentAmount),
        paymentType,
        notes: paymentNotes,
        paymentPercentage: paymentType === 'Partial' ? 
          (parseFloat(paymentAmount) / loanCalculation.totalDue * 100).toFixed(0) + '%' : undefined
      });
      
      // Refresh loan data
      const updatedLoan = await api.get(`/loans/${id}`);
      setLoan(updatedLoan.data.data);
      
      showSnackbar('Payment added successfully', 'success');
      closePaymentDialog();
    } catch (err) {
      console.error('Error adding payment:', err);
      showSnackbar(err.response?.data?.error || 'Failed to add payment', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !loan) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6" gutterBottom>
          {error || 'Loan not found'}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/loans')}
          sx={{ mt: 2 }}
        >
          Return to Loans
        </Button>
      </Box>
    );
  }

  const { bg: statusBg, color: statusColor } = getStatusChipColor(loan.status);

  return (
    <>
      <PageHeader 
        title={`Loan: ${loan.loanNumber}`}
        breadcrumbs={[
          { label: 'Loans', link: '/loans' },
          { label: loan.loanNumber },
        ]}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/loans')}
          sx={{ mr: 1 }}
        >
          Back
        </Button>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/loans/${id}/edit`)}
          sx={{ mr: 1 }}
        >
          Edit
        </Button>
        <Button
          variant="contained"
          startIcon={<PaymentIcon />}
          onClick={openPaymentDialog}
          color="primary"
          disabled={loan.status === 'Closed'}
        >
          Make Payment
        </Button>
      </PageHeader>
      
      <Grid container spacing={3}>
        {/* Loan Summary */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Loan Summary
              </Typography>
              <Chip 
                label={loan.status} 
                size="small"
                sx={{ backgroundColor: statusBg, color: statusColor, fontWeight: 'medium' }}
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Customer
                </Typography>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {loan.customer?.name || 'Unknown Customer'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Contact
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {loan.customer?.phone || 'No phone'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Start Date
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {format(new Date(loan.startDate), 'dd/MM/yyyy')}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Interest Rate
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {loan.interestRate}% per month
                </Typography>
              </Grid>
              
              {loan.notes && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    Notes
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {loan.notes}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
          
          {/* Financial Summary */}
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Financial Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {loanCalculation ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Original Loan Amount
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                    ₹{loanCalculation.originalPrincipal.toLocaleString()}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Remaining Principal
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    ₹{loanCalculation.remainingPrincipal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Monthly Interest Amount
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    ₹{(loanCalculation.remainingPrincipal * (loan.interestRate / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Simple interest on current principal
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Accrued Interest {loanCalculation.monthsElapsed && `(${loanCalculation.monthsElapsed} months)`}
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    ₹{loanCalculation.interestAccrued.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    Outstanding Amount
                  </Typography>
                  <Typography variant="h5" color={loanCalculation.totalDue > 0 ? "error" : "success.main"} sx={{ mb: 1, fontWeight: 'bold' }}>
                    ₹{loanCalculation.totalDue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Typography>
                </Grid>
                
                {loan.status !== 'Closed' && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                      <Button
                        variant="contained"
                        startIcon={<PaymentIcon />}
                        onClick={openPaymentDialog}
                        fullWidth
                        color="primary"
                      >
                        Make Payment
                      </Button>
                    </Box>
                  </Grid>
                )}
              </Grid>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Loan Items and History */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Loan Items
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ backgroundColor: 'rgba(92, 107, 192, 0.08)' }}>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Weight (g)</TableCell>
                    <TableCell align="right">Loan Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loan.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {item.name}
                        {item.description && (
                          <Typography variant="caption" display="block" color="textSecondary">
                            {item.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{item.itemType}</TableCell>
                      <TableCell align="right">{item.weight} g</TableCell>
                      <TableCell align="right">₹{item.loanAmount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {/* Payment History */}
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">
                Payment History
              </Typography>
              <Chip 
                label={`${loan.payments.length} Payments`} 
                size="small"
                sx={{ backgroundColor: '#e3f2fd', color: '#1565c0' }}
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {loan.payments.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: 'rgba(92, 107, 192, 0.08)' }}>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Allocation</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loan.payments.sort((a, b) => new Date(b.date) - new Date(a.date)).map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell>{format(new Date(payment.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                        <TableCell>{payment.paymentType}</TableCell>
                        <TableCell>
                          {payment.appliedToInterest !== undefined ? (
                            <>
                              <Typography variant="caption" display="block">
                                Interest: ₹{payment.appliedToInterest.toLocaleString()}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Principal: ₹{payment.appliedToPrincipal.toLocaleString()}
                              </Typography>
                            </>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{payment.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                No payments made yet
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={closePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Make Payment</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter payment details for loan {loan.loanNumber}
          </DialogContentText>
          
          {loanCalculation && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Quick Payment Options:
              </Typography>
              <ButtonGroup variant="outlined" fullWidth>
                <Button onClick={() => setPartialPayment(25)}>25%</Button>
                <Button onClick={() => setPartialPayment(50)}>50%</Button>
                <Button onClick={() => setPartialPayment(75)}>75%</Button>
                <Button onClick={() => setPaymentAmount(loanCalculation.totalDue.toFixed(2))}>Full</Button>
              </ButtonGroup>
            </Box>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Payment Amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                fullWidth
                required
                margin="normal"
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  label="Payment Method"
                >
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Card">Card</MenuItem>
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                  <MenuItem value="Partial">Partial Payment</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                fullWidth
                multiline
                rows={2}
                margin="normal"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePaymentDialog} disabled={isSubmittingPayment}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitPayment} 
            variant="contained" 
            color="primary"
            startIcon={<PaymentIcon />}
            disabled={isSubmittingPayment}
          >
            {isSubmittingPayment ? 'Processing...' : 'Make Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LoanDetail; 