import React from 'react';
import { Button, ButtonProps, CircularProgress } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

type ResponsiveVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ResponsiveSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ResponsiveButtonProps
  extends Omit<ButtonProps, 'variant' | 'color' | 'size' | 'startIcon'> {
  variant?: ResponsiveVariant;
  size?: ResponsiveSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantConfig: Record<
  ResponsiveVariant,
  { muiVariant: ButtonProps['variant']; muiColor?: ButtonProps['color']; sx?: SxProps<Theme> }
> = {
  primary: {
    muiVariant: 'contained',
    muiColor: 'primary',
    sx: { fontWeight: 600 },
  },
  secondary: {
    muiVariant: 'outlined',
    muiColor: 'secondary',
    sx: { fontWeight: 600 },
  },
  danger: {
    muiVariant: 'contained',
    muiColor: 'error',
    sx: { fontWeight: 600 },
  },
  ghost: {
    muiVariant: 'text',
    muiColor: 'inherit',
    sx: {
      color: 'text.secondary',
      fontWeight: 600,
      '&:hover': {
        backgroundColor: 'action.hover',
      },
    },
  },
};

const sizeConfig: Record<
  ResponsiveSize,
  { muiSize: ButtonProps['size']; sx: SxProps<Theme> }
> = {
  xs: { muiSize: 'small', sx: { px: 1.5, py: 0.75, minHeight: 32, fontSize: '0.75rem' } },
  sm: { muiSize: 'small', sx: { px: 2, py: 1, minHeight: 36 } },
  md: { muiSize: 'medium', sx: { px: 2.5, py: 1.25, minHeight: 44 } },
  lg: { muiSize: 'large', sx: { px: 3, py: 1.5, minHeight: 48 } },
  xl: { muiSize: 'large', sx: { px: 3.5, py: 1.75, minHeight: 52, fontSize: '1.05rem' } },
};

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  sx: sxProp,
  ...props
}) => {
  const variantStyles = variantConfig[variant];
  const sizeStyles = sizeConfig[size];
  const isDisabled = disabled || loading;

  const normalizedSx = Array.isArray(sxProp) ? sxProp : sxProp ? [sxProp] : [];
  const mergedSx: SxProps<Theme> = [
    { textTransform: 'none', display: 'inline-flex', gap: 1 },
    variantStyles.sx || {},
    sizeStyles.sx,
    ...normalizedSx,
  ];

  return (
    <Button
      {...props}
      data-variant={variant}
      data-size={size}
      data-loading={loading ? 'true' : undefined}
      aria-busy={loading || undefined}
      variant={variantStyles.muiVariant}
      color={variantStyles.muiColor}
      size={sizeStyles.muiSize}
      disabled={isDisabled}
      startIcon={loading ? <CircularProgress size={16} /> : icon}
      sx={mergedSx}
    >
      {children}
    </Button>
  );
};
