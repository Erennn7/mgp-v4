import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Button,
  Breadcrumbs,
  Link,
  Divider,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';

const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  action,
  actionText,
  actionIcon,
  onActionClick,
  children,
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
          sx={{ mb: 2 }}
        >
          <Link 
            component={RouterLink} 
            to="/"
            underline="hover"
            color="inherit"
          >
            Dashboard
          </Link>
          {breadcrumbs.map((breadcrumb, index) => (
            <Link
              key={index}
              component={RouterLink}
              to={breadcrumb.link || '#'}
              underline="hover"
              color={index === breadcrumbs.length - 1 ? 'text.primary' : 'inherit'}
              sx={{ 
                fontWeight: index === breadcrumbs.length - 1 ? 'medium' : 'normal',
                pointerEvents: !breadcrumb.link && 'none'
              }}
            >
              {breadcrumb.label}
            </Link>
          ))}
        </Breadcrumbs>
      )}

      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="subtitle1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {(action || actionText) && (
          <Box sx={{ mt: { xs: 2, sm: 0 } }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={actionIcon}
              onClick={onActionClick}
            >
              {actionText || 'Action'}
            </Button>
          </Box>
        )}

        {children && (
          <Box sx={{ ml: 'auto', mt: { xs: 2, sm: 0 } }}>
            {children}
          </Box>
        )}
      </Box>
      
      <Divider sx={{ mt: 3, mb: 3 }} />
    </Box>
  );
};

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      link: PropTypes.string,
    })
  ),
  action: PropTypes.node,
  actionText: PropTypes.string,
  actionIcon: PropTypes.node,
  onActionClick: PropTypes.func,
  children: PropTypes.node,
};

export default PageHeader; 