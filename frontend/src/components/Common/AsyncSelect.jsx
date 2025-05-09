import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Autocomplete, 
  CircularProgress, 
  FormHelperText,
  FormControl,
  InputLabel
} from '@mui/material';
import { debounce } from 'lodash';

/**
 * AsyncSelect component for searching and selecting items from an API
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Input label
 * @param {string} props.placeholder - Input placeholder
 * @param {Function} props.loadOptions - Function that returns a Promise with options
 * @param {Function} props.onChange - Function called when selection changes
 * @param {string|Object} props.value - Selected value
 * @param {boolean} props.required - Whether the field is required
 * @param {boolean} props.error - Whether the field has an error
 * @param {string} props.helperText - Helper text for the field
 */
const AsyncSelect = ({
  label,
  placeholder,
  loadOptions,
  onChange,
  value,
  required = false,
  error = false,
  helperText = '',
  ...rest
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  // Load options when input value changes
  useEffect(() => {
    const fetchOptions = async () => {
      if (!inputValue) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await loadOptions(inputValue);
        setOptions(results);
      } catch (error) {
        console.error('Error loading options:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce to avoid too many API calls
    const debouncedFetch = debounce(fetchOptions, 300);
    debouncedFetch();

    return () => {
      debouncedFetch.cancel();
    };
  }, [inputValue, loadOptions]);

  // Fetch the selected option when value changes
  useEffect(() => {
    const fetchSelectedOption = async () => {
      if (!value) {
        setSelectedOption(null);
        return;
      }
      
      // If the value is already an option object, use it
      if (typeof value === 'object' && value.value) {
        setSelectedOption(value);
        return;
      }
      
      // Otherwise, try to fetch the option
      setLoading(true);
      try {
        const results = await loadOptions(value);
        const selectedOpt = results.find(option => option.value === value);
        setSelectedOption(selectedOpt || null);
      } catch (error) {
        console.error('Error loading selected option:', error);
        setSelectedOption(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSelectedOption();
  }, [value, loadOptions]);

  const handleChange = (event, newValue) => {
    setSelectedOption(newValue);
    onChange(newValue ? newValue.value : null);
  };

  return (
    <FormControl fullWidth error={error}>
      <Autocomplete
        options={options}
        loading={loading}
        value={selectedOption}
        onChange={handleChange}
        onInputChange={(event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        getOptionLabel={(option) => option.label || ''}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            required={required}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        {...rest}
      />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default AsyncSelect; 