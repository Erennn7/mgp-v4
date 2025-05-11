import React, { useState, useCallback, useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarDensitySelector,
} from '@mui/x-data-grid';

import SearchBox from './SearchBox';

// Memoize the toolbar to prevent re-renders
const CustomToolbar = memo(({ title, onQuickSearch, loading }) => {
  return (
    <GridToolbarContainer sx={{ px: 2, py: 1.5 }}>
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
        {title && (
          <Typography variant="h6" component="div" sx={{ mr: 3 }}>
            {title}
          </Typography>
        )}
        {onQuickSearch && (
          <Box sx={{ minWidth: 300 }}>
            <SearchBox
              placeholder="Quick Search"
              onSearch={onQuickSearch}
              loading={loading}
            />
          </Box>
        )}
      </Box>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
    </GridToolbarContainer>
  );
});

CustomToolbar.displayName = 'CustomToolbar';

const DataTable = ({
  title,
  rows = [],
  columns = [],
  loading = false,
  error = null,
  pagination = true,
  pageSize = 10,
  rowsPerPageOptions = [5, 10, 25, 50],
  checkboxSelection = false,
  disableSelectionOnClick = true,
  onSelectionChange = () => {},
  getRowId = (row) => row.id || row._id,
  height = 'auto',
  quickSearch = true,
  quickSearchField = 'all',
  customSearchFunction = null,
  customLoadingOverlay = null,
  customNoRowsOverlay = null,
  toolbarComponents = null,
  sx = {},
  ...props
}) => {
  const [quickSearchValue, setQuickSearchValue] = useState('');
  const [selectionModel, setSelectionModel] = useState([]);
  const [paginationModel, setPaginationModel] = useState({
    pageSize,
    page: 0,
  });

  // Handle search with a stable callback reference
  const handleQuickSearch = useCallback((searchTerm) => {
    setQuickSearchValue(searchTerm);
  }, []);

  // Memoize filtered rows for performance
  const filteredRows = useMemo(() => {
    if (!quickSearch || !quickSearchValue) return rows;
    
    // If a custom search function is provided, use it
    if (customSearchFunction && typeof customSearchFunction === 'function') {
      return rows.filter(row => customSearchFunction(row, quickSearchValue));
    }
    
    // Otherwise use the default search logic
    return rows.filter((row) => {
      if (quickSearchField === 'all') {
        // Search across all string and number fields
        return Object.keys(row).some((key) => {
          const value = row[key];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(quickSearchValue.toLowerCase());
        });
      } else if (quickSearchField === 'custom') {
        // This is for backward compatibility - should use customSearchFunction instead
        return Object.keys(row).some((key) => {
          const value = row[key];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(quickSearchValue.toLowerCase());
        });
      } else {
        // Search only the specified field
        const value = row[quickSearchField];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(quickSearchValue.toLowerCase());
      }
    });
  }, [rows, quickSearch, quickSearchValue, quickSearchField, customSearchFunction]);

  // Handle selection with a stable callback
  const handleSelectionChange = useCallback((newSelectionModel) => {
    setSelectionModel(newSelectionModel);
    onSelectionChange(newSelectionModel);
  }, [onSelectionChange]);

  // Error state
  if (error) {
    return (
      <Paper
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please try again later.
        </Typography>
      </Paper>
    );
  }
  
  // Create a stable toolbar component
  const ToolbarComponent = useCallback(() => (
    <CustomToolbar
      title={title}
      onQuickSearch={quickSearch ? handleQuickSearch : null}
      loading={loading}
    />
  ), [title, quickSearch, handleQuickSearch, loading]);

  return (
    <Paper
      sx={{
        height: height,
        width: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        ...sx,
      }}
    >
      <DataGrid
        rows={filteredRows}
        columns={columns}
        getRowId={getRowId}
        loading={loading}
        checkboxSelection={checkboxSelection}
        disableRowSelectionOnClick={disableSelectionOnClick}
        pagination={pagination}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={rowsPerPageOptions}
        slots={{
          toolbar: ToolbarComponent,
          loadingOverlay: customLoadingOverlay || undefined,
          noRowsOverlay: customNoRowsOverlay || undefined,
          ...toolbarComponents,
        }}
        onRowSelectionModelChange={handleSelectionChange}
        rowSelectionModel={selectionModel}
        sx={{
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: (theme) => theme.palette.mode === 'light' 
              ? 'rgba(92, 107, 192, 0.08)' 
              : 'rgba(121, 134, 203, 0.12)',
          },
          '& .MuiDataGrid-toolbarContainer': {
            borderBottom: '1px solid',
            borderColor: 'divider',
          },
          border: 'none',
        }}
        {...props}
      />
    </Paper>
  );
};

CustomToolbar.propTypes = {
  title: PropTypes.string,
  onQuickSearch: PropTypes.func,
  loading: PropTypes.bool,
};

DataTable.propTypes = {
  title: PropTypes.string,
  rows: PropTypes.array,
  columns: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  pagination: PropTypes.bool,
  pageSize: PropTypes.number,
  rowsPerPageOptions: PropTypes.array,
  checkboxSelection: PropTypes.bool,
  disableSelectionOnClick: PropTypes.bool,
  onSelectionChange: PropTypes.func,
  getRowId: PropTypes.func,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  quickSearch: PropTypes.bool,
  quickSearchField: PropTypes.string,
  customSearchFunction: PropTypes.func,
  customLoadingOverlay: PropTypes.node,
  customNoRowsOverlay: PropTypes.node,
  toolbarComponents: PropTypes.object,
  sx: PropTypes.object,
};

export default DataTable; 