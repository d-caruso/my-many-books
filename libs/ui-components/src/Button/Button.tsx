/**
 * Platform-agnostic Button component
 * Note: This provides the base logic. Platform-specific implementations 
 * (web with HTML/CSS, mobile with React Native) should extend this.
 */

import React from 'react';
import { ButtonProps } from './Button.types';
import { buttonStyles } from './Button.styles';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  onPress,
  testID,
  accessibilityLabel,
}) => {
  const isDisabled = disabled || loading;

  const containerStyle = {
    ...buttonStyles.base,
    ...buttonStyles.sizes[size],
    ...buttonStyles.variants[variant],
    ...(isDisabled && buttonStyles.states.disabled),
    ...(loading && buttonStyles.states.loading),
  };

  // This is a base implementation. Platform-specific versions should override the rendering.
  return React.createElement(
    'button', // Web implementation
    {
      disabled: isDisabled,
      onClick: onPress,
      'data-testid': testID,
      'aria-label': accessibilityLabel,
      style: containerStyle,
    },
    loading && React.createElement('div', { 
      style: { 
        width: 16, 
        height: 16, 
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginRight: 8,
      }
    }),
    children
  );
};

// Re-export types for convenience
export type { ButtonProps } from './Button.types';