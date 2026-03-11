import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  SelectProps,
  FormHelperText
} from '@mui/material';

interface ResponsiveSelectProps extends Omit<SelectProps, 'variant' | 'error'> {
  label?: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
  children: React.ReactNode;
}

export const ResponsiveSelect: React.FC<ResponsiveSelectProps> = ({
  label,
  error,
  helperText,
  isRequired,
  children,
  id,
  labelId,
  ...props
}) => {
  const computedLabelId = label ? labelId ?? (id ? `${id}-label` : undefined) : undefined;

  return (
    <FormControl fullWidth error={Boolean(error)}>
      {label && (
        <InputLabel id={computedLabelId} required={isRequired}>
          {label}
        </InputLabel>
      )}
      <Select
        {...props}
        id={id}
        labelId={computedLabelId}
        label={label}
      >
        {children}
      </Select>
      {(helperText || error) && (
        <FormHelperText>{error ?? helperText}</FormHelperText>
      )}
    </FormControl>
  );
};
