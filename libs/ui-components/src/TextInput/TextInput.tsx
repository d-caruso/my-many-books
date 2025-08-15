/**
 * Platform-agnostic TextInput component
 */

import React from 'react';
import { TextInputProps } from './TextInput.types';

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete,
  testID,
  accessibilityLabel,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChangeText(event.target.value);
  };

  const inputProps = {
    value,
    onChange: handleChange,
    placeholder,
    disabled,
    maxLength,
    'data-testid': testID,
    'aria-label': accessibilityLabel || label,
    autoComplete,
    style: {
      width: '100%',
      padding: 12,
      border: `1px solid ${error ? '#EF4444' : '#D1D5DB'}`,
      borderRadius: 6,
      fontSize: 16,
      backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
      color: disabled ? '#9CA3AF' : '#111827',
    },
  };

  // Base implementation for web
  return React.createElement(
    'div',
    { style: { marginBottom: 16 } },
    label && React.createElement(
      'label',
      { 
        style: { 
          display: 'block', 
          marginBottom: 4, 
          fontSize: 14, 
          fontWeight: 500,
          color: '#374151',
        }
      },
      label
    ),
    React.createElement(
      multiline ? 'textarea' : 'input',
      {
        ...inputProps,
        type: multiline ? undefined : getInputType(keyboardType),
        rows: multiline ? numberOfLines : undefined,
      }
    ),
    error && React.createElement(
      'span',
      {
        style: {
          display: 'block',
          marginTop: 4,
          fontSize: 12,
          color: '#EF4444',
        },
      },
      error
    )
  );
};

const getInputType = (keyboardType: string): string => {
  switch (keyboardType) {
    case 'email-address':
      return 'email';
    case 'numeric':
    case 'phone-pad':
      return 'tel';
    default:
      return 'text';
  }
};

export type { TextInputProps };