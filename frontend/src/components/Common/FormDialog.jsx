import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const FormDialog = ({
  open,
  onClose,
  title,
  subtitle,
  onSubmit,
  children,
  maxWidth = 'sm',
  fullWidth = true,
  loading = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  disableSubmit = false,
  hideActions = false,
  ...props
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? null : onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      {...props}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" component="div">
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="subtitle2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            {!loading && (
              <IconButton
                aria-label="close"
                onClick={onClose}
                edge="end"
                size="small"
              >
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent dividers sx={{ p: 3 }}>
          {children}
        </DialogContent>
        
        {!hideActions && (
          <>
            <Divider />
            <DialogActions sx={{ p: 2 }}>
              <Button
                onClick={onClose}
                disabled={loading}
                color="inherit"
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading || disableSubmit}
                startIcon={loading && <CircularProgress size={20} />}
              >
                {loading ? 'Processing...' : submitLabel}
              </Button>
            </DialogActions>
          </>
        )}
      </form>
    </Dialog>
  );
};

FormDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  onSubmit: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  fullWidth: PropTypes.bool,
  loading: PropTypes.bool,
  submitLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  disableSubmit: PropTypes.bool,
  hideActions: PropTypes.bool,
};

export default FormDialog; 