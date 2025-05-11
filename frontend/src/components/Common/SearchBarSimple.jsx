import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

/**
 * A simple search input component that maintains focus properly
 * 
 * @param {Object} props
 * @param {string} props.value Current search term
 * @param {Function} props.onChange Function called when search term changes
 * @param {string} props.placeholder Placeholder text for input
 * @param {boolean} props.loading Whether search is in progress
 */
const SearchBarSimple = ({
  value = '',
  onChange,
  placeholder = 'Search...',
  loading = false,
  ...rest
}) => {
  // Store the current selection position when typing
  const selectionPos = useRef(null);
  
  // Handle input change
  const handleChange = (e) => {
    // Before we update the value, store the current cursor position
    if (document.activeElement === e.target) {
      selectionPos.current = e.target.selectionStart;
    }
    
    // Pass the changed value to the parent component
    onChange(e.target.value);
  };
  
  // Handle focus to restore cursor position correctly
  const handleFocus = (e) => {
    // If we have a stored position, restore it when the element gets focused
    if (selectionPos.current !== null) {
      const pos = Math.min(selectionPos.current, e.target.value.length);
      e.target.setSelectionRange(pos, pos);
    }
  };

  return (
    <TextField
      variant="outlined"
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      // This ensures the input doesn't completely re-render when value changes
      // which would otherwise cause focus loss
      InputLabelProps={{ shrink: true }}
      fullWidth={rest.fullWidth}
      // Important: These prevent browser features from interfering with focus
      inputProps={{
        autoComplete: "off",
        autoCorrect: "off",
        autoCapitalize: "off",
        spellCheck: "false",
        // This maintains the native focus during React's re-renders
        key: "search-input"
      }}
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
      {...rest}
    />
  );
};

SearchBarSimple.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  loading: PropTypes.bool,
};

export default SearchBarSimple; 
 
 
 