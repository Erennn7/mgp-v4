import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  TextField,
  InputAdornment,
  CircularProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Search as SearchIcon, Info as InfoIcon } from '@mui/icons-material';

/**
 * A completely self-contained search component that maintains its own state
 * and focus, notifying parent components only when needed.
 */
const SearchBox = ({
  placeholder = 'Search...',
  onSearch = () => {},
  loading = false,
  debounceMs = 300,
  showWeightSearchInfo = false,
  ...rest
}) => {
  // Internal state for the search text
  const [searchText, setSearchText] = useState('');
  const inputRef = useRef(null);
  const lastCursorPos = useRef(null);
  const debounceTimer = useRef(null);

  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Remember cursor position
    if (document.activeElement === e.target) {
      lastCursorPos.current = e.target.selectionStart;
    }
    
    // Update internal state
    setSearchText(newValue);
    
    // Debounce the search notification
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      onSearch(newValue);
    }, debounceMs);
  };
  
  // Restore cursor position whenever the component re-renders
  useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      const input = inputRef.current;
      const pos = lastCursorPos.current;
      
      if (pos !== null) {
        // Set timeout required to work around React's event handling
        setTimeout(() => {
          if (document.activeElement === input) {
            input.setSelectionRange(pos, pos);
          }
        }, 0);
      }
    }
  });

  return (
    <TextField
      variant="outlined"
      size="small"
      placeholder={placeholder}
      value={searchText}
      onChange={handleChange}
      fullWidth
      // Important: Use inputRef instead of ref to get direct access to the input DOM element
      inputRef={inputRef}
      // These props help prevent browser interference with focus
      inputProps={{
        autoComplete: "off",
        autoCorrect: "off",
        autoCapitalize: "off",
        spellCheck: "false"
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            {showWeightSearchInfo && (
              <Tooltip 
                title="You can search by weight (e.g., '10g' or '5.2ct')"
                placement="top"
              >
                <IconButton size="small" sx={{ mr: 0.5 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {loading && <CircularProgress size={20} />}
          </InputAdornment>
        ),
      }}
      helperText={showWeightSearchInfo ? "Search by name, category, or weight (e.g., '10g')" : null}
      {...rest}
    />
  );
};

SearchBox.propTypes = {
  placeholder: PropTypes.string,
  onSearch: PropTypes.func,
  loading: PropTypes.bool,
  debounceMs: PropTypes.number,
  showWeightSearchInfo: PropTypes.bool
};

export default SearchBox; 
 
 
 