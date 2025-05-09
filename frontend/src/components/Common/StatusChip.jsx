import React from 'react';
import PropTypes from 'prop-types';
import { Chip } from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Cancel as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Pending as PendingIcon,
  HourglassEmpty as HourglassIcon,
  Done as DoneIcon,
  Close as CloseIcon,
  Sync as ProcessingIcon,
  Schedule as ScheduledIcon,
  MoneyOff as UnpaidIcon,
  AttachMoney as PaidIcon,
} from '@mui/icons-material';

const StatusChip = ({ status, variant = 'outlined', size = 'small', ...props }) => {
  // Define status configurations
  const statusConfigs = {
    // General status types
    active: { color: 'success', icon: <SuccessIcon fontSize="small" /> },
    inactive: { color: 'default', icon: <CloseIcon fontSize="small" /> },
    pending: { color: 'warning', icon: <PendingIcon fontSize="small" /> },
    processing: { color: 'info', icon: <ProcessingIcon fontSize="small" /> },
    completed: { color: 'success', icon: <DoneIcon fontSize="small" /> },
    cancelled: { color: 'error', icon: <ErrorIcon fontSize="small" /> },
    expired: { color: 'error', icon: <HourglassIcon fontSize="small" /> },
    
    // Payment status types
    paid: { color: 'success', icon: <PaidIcon fontSize="small" /> },
    partial: { color: 'warning', icon: <PendingIcon fontSize="small" /> },
    unpaid: { color: 'error', icon: <UnpaidIcon fontSize="small" /> },
    
    // Loan/Savings status types
    defaulted: { color: 'error', icon: <ErrorIcon fontSize="small" /> },
    missed: { color: 'error', icon: <CloseIcon fontSize="small" /> },
    waived: { color: 'info', icon: <InfoIcon fontSize="small" /> },
    written_off: { color: 'default', icon: <CloseIcon fontSize="small" /> },
    
    // Inventory status types
    in_stock: { color: 'success', icon: <SuccessIcon fontSize="small" /> },
    low_stock: { color: 'warning', icon: <WarningIcon fontSize="small" /> },
    out_of_stock: { color: 'error', icon: <ErrorIcon fontSize="small" /> },
    on_order: { color: 'info', icon: <ScheduledIcon fontSize="small" /> },
  };
  
  // Convert status string to lowercase and replace spaces with underscores
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_');
  
  // Get config for the status or use a default
  const statusConfig = statusConfigs[normalizedStatus] || {
    color: 'default',
    icon: <InfoIcon fontSize="small" />
  };
  
  // Handle custom status labels (capitalize first letter of each word)
  const formattedLabel = status
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return (
    <Chip
      label={formattedLabel}
      color={statusConfig.color}
      icon={statusConfig.icon}
      variant={variant}
      size={size}
      {...props}
    />
  );
};

StatusChip.propTypes = {
  status: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['filled', 'outlined']),
  size: PropTypes.oneOf(['small', 'medium']),
};

export default StatusChip; 