import React, { useState } from 'react';
import { IconButton, InputAdornment, TextField, TextFieldProps } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface ResponsiveInputProps
  extends Omit<TextFieldProps, 'error' | 'helperText' | 'variant'> {
  label?: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
}

export const ResponsiveInput: React.FC<ResponsiveInputProps> = ({
  label,
  error,
  helperText,
  isRequired,
  required,
  type,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const displayHelper = error ?? helperText;
  const shouldShrink = type === 'date' || props.InputLabelProps?.shrink;
  const isPassword = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;

  return (
    <TextField
      {...props}
      fullWidth
      label={label}
      variant="outlined"
      required={isRequired ?? required}
      error={Boolean(error)}
      helperText={displayHelper}
      type={resolvedType}
      InputLabelProps={{
        ...props.InputLabelProps,
        shrink: shouldShrink,
      }}
      InputProps={{
        ...props.InputProps,
        endAdornment: isPassword ? (
          <InputAdornment position="end">
            <IconButton
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
              edge="end"
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ) : (props.InputProps?.endAdornment ?? undefined),
      }}
    />
  );
};
