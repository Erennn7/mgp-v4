import React from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent } from '@mui/material';
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TrendingUp as TrendingUpIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';

const Reports = () => {
  return (
    <>
      <PageHeader 
        title="Reports" 
        subtitle="View business analytics and reports"
        breadcrumbs={[{ label: 'Reports' }]}
      />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BarChartIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Sales Reports</Typography>
            </Box>
            <Typography variant="body1">
              This is a placeholder for sales reports. This functionality will be implemented in future updates.
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PieChartIcon sx={{ mr: 1, color: 'secondary.main' }} />
              <Typography variant="h6">Inventory Reports</Typography>
            </Box>
            <Typography variant="body1">
              This is a placeholder for inventory reports. This functionality will be implemented in future updates.
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">Financial Reports</Typography>
            </Box>
            <Typography variant="body1">
              This is a placeholder for financial reports. This functionality will be implemented in future updates.
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DescriptionIcon sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">Custom Reports</Typography>
            </Box>
            <Typography variant="body1">
              This is a placeholder for custom reports. This functionality will be implemented in future updates.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
};

export default Reports; 