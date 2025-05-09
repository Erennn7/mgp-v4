import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField,
  InputAdornment,
  IconButton, 
  Button,
  Paper,
  Grid,
  Typography,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { 
  Search as SearchIcon, 
  FilterList as FilterIcon,
  Clear as ClearIcon 
} from '@mui/icons-material';

/**
 * A reusable search bar component with expandable filters
 * 
 * @param {Object} props
 * @param {Function} props.onSearch Function to call when search is submitted
 * @param {Array} props.filters Array of filter objects with: { name, label, type, options }
 * @param {String} props.placeholder Placeholder text for the search field
 * @param {Object} props.initialValues Initial values for the search
 */
const SearchBar = ({ onSearch, filters = [], placeholder = "Search...", initialValues = {} }) => {
  const [searchTerm, setSearchTerm] = useState(initialValues.searchTerm || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filterValues, setFilterValues] = useState(initialValues.filters || {});
  const inputRef = useRef(null);

  // This effect will forcibly focus the input any time searchTerm changes
  useEffect(() => {
    // Find the actual DOM input element
    if (inputRef.current) {
      const inputEl = inputRef.current.querySelector('input');
      if (inputEl) {
        setTimeout(() => {
          inputEl.focus();
          // Place cursor at end of text
          const len = searchTerm.length;
          inputEl.setSelectionRange(len, len);
        }, 0);
      }
    }
  }, [searchTerm]); // Re-run effect when searchTerm changes

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (name, value) => {
    setFilterValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = (e) => {
    if (e) e.preventDefault();
    setFilterValues({});
    setSearchTerm('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ searchTerm, filters: filterValues });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !showFilters) {
      e.preventDefault();
      onSearch({ searchTerm, filters: filterValues });
    }
  };

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              placeholder={placeholder}
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              autoComplete="off"
              // Disable browser features that might interfere with focus
              inputProps={{
                autoComplete: "off",
                autoCorrect: "off",
                autoCapitalize: "off",
                spellCheck: "false"
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowFilters(!showFilters)}
                      color={showFilters ? "primary" : "default"}
                      edge="end"
                      type="button"
                      disableFocusRipple
                    >
                      <FilterIcon />
                    </IconButton>
                    {(searchTerm || Object.keys(filterValues).length > 0) && (
                      <IconButton
                        onClick={handleClearFilters}
                        edge="end"
                        type="button"
                        disableFocusRipple
                      >
                        <ClearIcon />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Collapse in={showFilters}>
              <Box sx={{ pt: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Filters
                </Typography>
                <Grid container spacing={2}>
                  {filters.map((filter) => (
                    <Grid item xs={12} sm={6} md={4} key={filter.name}>
                      {filter.type === 'select' ? (
                        <FormControl fullWidth variant="outlined" size="small">
                          <InputLabel id={`${filter.name}-label`}>{filter.label}</InputLabel>
                          <Select
                            labelId={`${filter.name}-label`}
                            value={filterValues[filter.name] || ''}
                            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                            label={filter.label}
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {filter.options.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : filter.type === 'date' ? (
                        <TextField
                          fullWidth
                          label={filter.label}
                          type="date"
                          value={filterValues[filter.name] || ''}
                          onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                          size="small"
                          InputLabelProps={{ shrink: true }}
                        />
                      ) : (
                        <TextField
                          fullWidth
                          label={filter.label}
                          value={filterValues[filter.name] || ''}
                          onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                          size="small"
                        />
                      )}
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Collapse>
          </Grid>
          
          {showFilters && (
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button 
                variant="outlined" 
                onClick={handleClearFilters}
                type="button"
              >
                Clear
              </Button>
              <Button 
                variant="contained" 
                type="submit"
              >
                Apply Filters
              </Button>
            </Grid>
          )}
          
          {/* Display active filters */}
          {Object.keys(filterValues).length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(filterValues).map(([key, value]) => {
                  if (!value) return null;
                  const filterObj = filters.find(f => f.name === key);
                  const label = filterObj ? filterObj.label : key;
                  let displayValue = value;
                  
                  // For select filters, find the display label
                  if (filterObj && filterObj.type === 'select') {
                    const option = filterObj.options.find(o => o.value === value);
                    if (option) displayValue = option.label;
                  }
                  
                  return (
                    <Chip
                      key={key}
                      label={`${label}: ${displayValue}`}
                      onDelete={() => handleFilterChange(key, '')}
                      size="small"
                    />
                  );
                })}
              </Box>
            </Grid>
          )}
        </Grid>
      </form>
    </Paper>
  );
};

export default SearchBar; 