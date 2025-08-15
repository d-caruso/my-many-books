// Common Material-UI component mocks for testing
import React from 'react';

export const Box = ({ children, sx, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'box', style: sx, ...props }, children)
);

export const Typography = ({ children, variant, component, ...props }: any) => {
  const Component = component || 'div';
  return React.createElement(Component, { 'data-testid': `typography-${variant || 'default'}`, ...props }, children);
};

export const Button = ({ children, onClick, variant, color, size, disabled, ...props }: any) => (
  React.createElement('button', {
    'data-testid': `button-${variant || 'default'}`,
    onClick,
    disabled,
    'data-color': color,
    'data-size': size,
    ...props
  }, children)
);

export const IconButton = ({ children, onClick, size, color, disabled, ...props }: any) => (
  React.createElement('button', {
    'data-testid': 'icon-button',
    onClick,
    disabled,
    'data-size': size,
    'data-color': color,
    ...props
  }, children)
);

export const TextField = ({ label, value, onChange, placeholder, error, helperText, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'text-field-container' }, [
    label && React.createElement('label', { key: 'label', 'data-testid': 'text-field-label' }, label),
    React.createElement('input', {
      key: 'input',
      'data-testid': 'text-field',
      placeholder: placeholder || label,
      value: value || '',
      onChange: (e: any) => onChange?.(e),
      'data-error': !!error,
      ...props
    }),
    error && React.createElement('div', { key: 'error', 'data-testid': 'text-field-error' }, error),
    helperText && React.createElement('div', { key: 'helper', 'data-testid': 'text-field-helper' }, helperText)
  ])
);

export const Select = ({ children, value, onChange, ...props }: any) => (
  React.createElement('select', {
    'data-testid': 'select',
    value: value || '',
    onChange: (e: any) => onChange?.({ target: { value: e.target.value } }),
    ...props
  }, children)
);

export const MenuItem = ({ children, value, ...props }: any) => (
  React.createElement('option', { 'data-testid': 'menu-item', value, ...props }, children)
);

export const FormControl = ({ children, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'form-control', ...props }, children)
);

export const InputLabel = ({ children, ...props }: any) => (
  React.createElement('label', { 'data-testid': 'input-label', ...props }, children)
);

export const Chip = ({ label, onDelete, color, size, variant, ...props }: any) => (
  React.createElement('span', { 
    'data-testid': 'chip',
    'data-color': color,
    'data-size': size,
    'data-variant': variant,
    ...props 
  }, [
    label,
    onDelete && React.createElement('button', { 
      key: 'delete',
      onClick: onDelete, 
      'data-testid': 'chip-delete' 
    }, '×')
  ])
);

export const CircularProgress = (props: any) => (
  React.createElement('div', { 'data-testid': 'circular-progress', ...props })
);

export const Alert = ({ children, severity, ...props }: any) => (
  React.createElement('div', { 'data-testid': `alert-${severity || 'info'}`, ...props }, children)
);

export const Dialog = ({ children, open, onClose, ...props }: any) => (
  open ? React.createElement('div', { 'data-testid': 'dialog', ...props }, [
    React.createElement('div', { 
      key: 'backdrop',
      onClick: onClose, 
      'data-testid': 'dialog-backdrop' 
    }),
    children
  ]) : null
);

export const DialogTitle = ({ children, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'dialog-title', ...props }, children)
);

export const DialogContent = ({ children, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'dialog-content', ...props }, children)
);

export const DialogActions = ({ children, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'dialog-actions', ...props }, children)
);

export const AppBar = ({ children, position, color, elevation, ...props }: any) => (
  React.createElement('div', { 
    'data-testid': 'app-bar',
    'data-position': position,
    'data-color': color,
    'data-elevation': elevation,
    ...props 
  }, children)
);

export const Toolbar = ({ children, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'toolbar', ...props }, children)
);

export const Menu = ({ children, open, anchorEl, onClose, ...props }: any) => (
  open ? React.createElement('div', { 'data-testid': 'menu', ...props }, children) : null
);

export const Avatar = ({ children, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'avatar', ...props }, children)
);

export const Container = ({ children, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'container', ...props }, children)
);

export const Fab = ({ children, onClick, size, color, ...props }: any) => (
  React.createElement('button', {
    'data-testid': `fab-${size || 'default'}`,
    onClick,
    'data-color': color,
    ...props
  }, children)
);

export const SpeedDial = ({ children, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'speed-dial', ...props }, children)
);

export const SpeedDialAction = ({ label, icon, onClick, ...props }: any) => (
  React.createElement('button', {
    'data-testid': 'speed-dial-action',
    onClick,
    ...props
  }, [icon, ' ', label])
);

export const Card = ({ children, onClick, sx, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'card', onClick, style: sx, ...props }, children)
);

export const CardContent = ({ children, sx, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'card-content', style: sx, ...props }, children)
);

export const CardActions = ({ children, sx, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'card-actions', style: sx, ...props }, children)
);

export const CardMedia = ({ children, sx, ...props }: any) => (
  React.createElement('div', { 'data-testid': 'card-media', style: sx, ...props }, children)
);

export const Stack = ({ children, direction, spacing, ...props }: any) => (
  React.createElement('div', { 
    'data-testid': 'stack',
    'data-direction': direction,
    'data-spacing': spacing,
    ...props 
  }, children)
);