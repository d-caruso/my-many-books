/**
 * Platform-agnostic LoadingSpinner component
 */

import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  testID?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = '#3B82F6',
  testID,
}) => {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const spinnerSize = sizeMap[size];

  // Base implementation for web - platform-specific versions should override
  return React.createElement('div', {
    'data-testid': testID,
    style: {
      width: spinnerSize,
      height: spinnerSize,
      border: `2px solid ${color}`,
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
  });
};

export type { LoadingSpinnerProps };