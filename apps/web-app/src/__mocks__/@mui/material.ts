// Common Material-UI component mocks for testing
import React from 'react';

type ReactChildren = { children?: React.ReactNode };

export const Box = ({ children, sx, ...props }: ReactChildren & { sx?: React.CSSProperties; [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'box', style: sx, ...props }, children)
);

export const Typography = ({ children, variant, component, ...props }: ReactChildren & { variant?: string; component?: React.ElementType; [key: string]: unknown }) => {
  const Component = (component || 'div') as React.ElementType;
  return React.createElement(Component, { 'data-testid': `typography-${variant || 'default'}`, ...props }, children);
};

export const Button = ({ children, onClick, variant, color, size, disabled, ...props }: ReactChildren & { onClick?: React.MouseEventHandler; variant?: string; color?: string; size?: string; disabled?: boolean; [key: string]: unknown }) => (
  React.createElement('button', {
    'data-testid': `button-${variant || 'default'}`,
    onClick,
    disabled,
    'data-color': color,
    'data-size': size,
    ...props
  }, children)
);

export const IconButton = ({ children, onClick, size, color, disabled, ...props }: ReactChildren & { onClick?: React.MouseEventHandler; size?: string; color?: string; disabled?: boolean; [key: string]: unknown }) => (
  React.createElement('button', {
    'data-testid': 'icon-button',
    onClick,
    disabled,
    'data-size': size,
    'data-color': color,
    ...props
  }, children)
);

export const TextField = ({ label, value, onChange, placeholder, error, helperText, ...props }: { label?: React.ReactNode; value?: string; onChange?: React.ChangeEventHandler<HTMLInputElement>; placeholder?: string; error?: boolean | string; helperText?: React.ReactNode; [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'text-field-container' }, [
    label && React.createElement('label', { key: 'label', 'data-testid': 'text-field-label' }, label),
    React.createElement('input', {
      key: 'input',
      'data-testid': 'text-field',
      placeholder: placeholder || (typeof label === 'string' ? label : undefined),
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e),
      'data-error': !!error,
      ...props
    }),
    error && React.createElement('div', { key: 'error', 'data-testid': 'text-field-error' }, error),
    helperText && React.createElement('div', { key: 'helper', 'data-testid': 'text-field-helper' }, helperText)
  ])
);

export const Select = ({ children, value, onChange, ...props }: ReactChildren & { value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; [key: string]: unknown }) => (
  React.createElement('select', {
    'data-testid': 'select',
    value: value || '',
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange?.({ target: { value: e.target.value } } as React.ChangeEvent<HTMLSelectElement>),
    ...props
  }, children)
);

export const MenuItem = ({ children, value, ...props }: ReactChildren & { value?: string | number; [key: string]: unknown }) => (
  React.createElement('option', { 'data-testid': 'menu-item', value, ...props }, children)
);

export const FormControl = ({ children, ...props }: ReactChildren & { [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'form-control', ...props }, children)
);

export const InputLabel = ({ children, ...props }: ReactChildren & { [key: string]: unknown }) => (
  React.createElement('label', { 'data-testid': 'input-label', ...props }, children)
);

export const Chip = ({ label, onDelete, color, size, variant, ...props }: { label?: React.ReactNode; onDelete?: () => void; color?: string; size?: string; variant?: string; [key: string]: unknown }) => (
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

export const CircularProgress = (props: { [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'circular-progress', ...props })
);

export const Alert = ({ children, severity, ...props }: ReactChildren & { severity?: string; [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': `alert-${severity || 'info'}`, ...props }, children)
);

export const Dialog = ({ children, open, onClose, ...props }: ReactChildren & { open?: boolean; onClose?: () => void; [key: string]: unknown }) => (
  open ? React.createElement('div', { 'data-testid': 'dialog', ...props }, [
    React.createElement('div', {
      key: 'backdrop',
      onClick: onClose,
      'data-testid': 'dialog-backdrop'
    }),
    children
  ]) : null
);

export const DialogTitle = ({ children, ...props }: ReactChildren & { [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'dialog-title', ...props }, children)
);

export const DialogContent = ({ children, ...props }: ReactChildren & { [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'dialog-content', ...props }, children)
);

export const DialogActions = ({ children, ...props }: ReactChildren & { [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'dialog-actions', ...props }, children)
);

export const AppBar = ({ children, position, color, elevation, ...props }: ReactChildren & { position?: string; color?: string; elevation?: number; [key: string]: unknown }) => (
  React.createElement('div', {
    'data-testid': 'app-bar',
    'data-position': position,
    'data-color': color,
    'data-elevation': elevation,
    ...props
  }, children)
);

export const Toolbar = ({ children, ...props }: ReactChildren & { [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'toolbar', ...props }, children)
);

export const Menu = ({ children, open, ...props }: ReactChildren & { open?: boolean; anchorEl?: Element | null; onClose?: () => void; [key: string]: unknown }) => (
  open ? React.createElement('div', { 'data-testid': 'menu', ...props }, children) : null
);

export const Avatar = ({ children, ...props }: ReactChildren & { [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'avatar', ...props }, children)
);

export const Container = ({ children, ...props }: ReactChildren & { [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'container', ...props }, children)
);

export const Fab = ({ children, onClick, size, color, ...props }: ReactChildren & { onClick?: React.MouseEventHandler; size?: string; color?: string; [key: string]: unknown }) => (
  React.createElement('button', {
    'data-testid': `fab-${size || 'default'}`,
    onClick,
    'data-color': color,
    ...props
  }, children)
);

export const SpeedDial = ({ children, ...props }: ReactChildren & { [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'speed-dial', ...props }, children)
);

export const SpeedDialAction = ({ label, icon, onClick, ...props }: { label?: React.ReactNode; icon?: React.ReactNode; onClick?: React.MouseEventHandler; [key: string]: unknown }) => (
  React.createElement('button', {
    'data-testid': 'speed-dial-action',
    onClick,
    ...props
  }, [icon, ' ', label])
);

export const Card = ({ children, onClick, sx, ...props }: ReactChildren & { onClick?: React.MouseEventHandler; sx?: React.CSSProperties; [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'card', onClick, style: sx, ...props }, children)
);

export const CardContent = ({ children, sx, ...props }: ReactChildren & { sx?: React.CSSProperties; [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'card-content', style: sx, ...props }, children)
);

export const CardActions = ({ children, sx, ...props }: ReactChildren & { sx?: React.CSSProperties; [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'card-actions', style: sx, ...props }, children)
);

export const CardMedia = ({ children, sx, ...props }: ReactChildren & { sx?: React.CSSProperties; [key: string]: unknown }) => (
  React.createElement('div', { 'data-testid': 'card-media', style: sx, ...props }, children)
);

export const Stack = ({ children, direction, spacing, ...props }: ReactChildren & { direction?: string; spacing?: number | string; [key: string]: unknown }) => (
  React.createElement('div', {
    'data-testid': 'stack',
    'data-direction': direction,
    'data-spacing': spacing,
    ...props
  }, children)
);
