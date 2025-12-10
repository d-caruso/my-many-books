import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

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
  const displayHelper = error ?? helperText;
  const shouldShrink = type === 'date' || props.InputLabelProps?.shrink;

  return (
    <TextField
      {...props}
      fullWidth
      label={label}
      variant="outlined"
      required={isRequired ?? required}
      error={Boolean(error)}
      helperText={displayHelper}
      type={type}
      InputLabelProps={{
        ...props.InputLabelProps,
        shrink: shouldShrink,
      }}
    />
  );
};
