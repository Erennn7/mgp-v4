import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  DataGrid,
  GridToolbar,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarDensitySelector,
} from '@mui/x-data-grid';
import { Search as SearchIcon } from '@mui/icons-material';

const CustomToolbar = ({ title, quickSearchValue, onQuickSearchChange, loading }) => {
  return (
    <GridToolbarContainer sx={{ px: 2, py: 1.5 }}>
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
        {title && (
          <Typography variant="h6" component="div" sx={{ mr: 3 }}>
            {title}
          </Typography>
        )}
        {onQuickSearchChange && (
          <TextField
            variant="outlined"
            size="small"
            placeholder="Quick Search"
            value={quickSearchValue}
            onChange={(e) => onQuickSearchChange(e.target.value)}
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: loading ? (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ) : null,
            }}
          />
        )}
      </Box>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
    </GridToolbarContainer>
  );
};

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

  // Handle quick search
  const filteredRows = quickSearch && quickSearchValue
    ? rows.filter((row) => {
        if (quickSearchField === 'all') {
          // Search across all string and number fields
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
      })
    : rows;

  // Handle selection change
  const handleSelectionChange = (newSelectionModel) => {
    setSelectionModel(newSelectionModel);
    onSelectionChange(newSelectionModel);
  };

  // Custom toolbar with quick search
  const CustomDataGridToolbar = (props) => (
    <CustomToolbar
      {...props}
      title={title}
      quickSearchValue={quickSearchValue}
      onQuickSearchChange={quickSearch ? setQuickSearchValue : null}
      loading={loading}
    />
  );

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
          toolbar: CustomDataGridToolbar,
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
  quickSearchValue: PropTypes.string,
  onQuickSearchChange: PropTypes.func,
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
  customLoadingOverlay: PropTypes.node,
  customNoRowsOverlay: PropTypes.node,
  toolbarComponents: PropTypes.object,
  sx: PropTypes.object,
};

export default DataTable; 