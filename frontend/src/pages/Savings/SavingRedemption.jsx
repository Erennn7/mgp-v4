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
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import PageHeader from '../../components/Common/PageHeader';

const SavingRedemption = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();

  // State
  const [saving, setSaving] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [redemptionDate, setRedemptionDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  
  // Fetch saving data
  useEffect(() => {
    const fetchSavingData = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/savings/${id}`);
        setSaving(response.data.data);
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

  const handleSubmitRedemption = async () => {
    if (!saving) return;
    
    setSubmitting(true);
    
    try {
      const { maturityAmount } = calculateMaturityDetails();
      
      const redemptionData = {
        saving: saving._id,
        customer: saving.customer._id,
        redemptionDate,
        notes,
        maturityAmount,
      };
      
      await api.post(`/savings/${id}/redeem`, redemptionData);
      
      showSnackbar('Savings scheme successfully redeemed', 'success');
      navigate(`/savings/${id}`);
    } catch (err) {
      console.error('Error redeeming saving scheme:', err);
      showSnackbar(err.response?.data?.error || 'Failed to redeem saving scheme', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
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
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Saving scheme not found</Alert>
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

  const { totalContribution, bonusAmount, maturityAmount } = calculateMaturityDetails();

  return (
    <Box>
      <PageHeader
        title="Redeem Savings Scheme"
        subtitle={`Scheme #${saving.schemeNumber}`}
        breadcrumbs={[
          { label: 'Savings', link: '/savings' },
          { label: saving.schemeNumber, link: `/savings/${id}` },
          { label: 'Redeem' },
        ]}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/savings/${id}`)}
        >
          Back
        </Button>
      </PageHeader>

      <Grid container spacing={3}>
        {/* Scheme Details */}
        <Grid item xs={12} md={6}>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Scheme Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Scheme Number:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {saving.schemeNumber}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Customer:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {saving.customer?.name || 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {saving.status}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Start Date:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {format(new Date(saving.startDate), 'dd/MM/yyyy')}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Maturity Date:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {format(new Date(saving.maturityDate), 'dd/MM/yyyy')}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Installment Amount:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    ₹{saving.installmentAmount.toLocaleString()}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Contribution:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    ₹{totalContribution.toLocaleString()}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Bonus Amount:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    ₹{bonusAmount.toLocaleString()}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Maturity Amount:
                  </Typography>
                  <Typography variant="h6" color="primary.main" gutterBottom>
                    ₹{maturityAmount.toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Redemption Form */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Redemption Details
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Redemption Date"
                    value={redemptionDate}
                    onChange={(newDate) => setRedemptionDate(newDate)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={4}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ mt: 2, textAlign: 'right' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={handleSubmitRedemption}
                    disabled={submitting}
                  >
                    {submitting ? 'Processing...' : 'Complete Redemption'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SavingRedemption; 