import React from 'react';

const noop = () => {};

const createSimpleWrapper = (testId: string, element: keyof JSX.IntrinsicElements = 'div') => {
  return ({ children, ...props }: any) =>
    React.createElement(element, { 'data-testid': testId, ...props }, children);
};

const TextField = ({ label, value = '', onChange = noop, type = 'text', id, error, helperText, ...props }: any) => {
  const inputId = id || label || 'text-field';
  return (
    <div data-testid="text-field-container">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e)}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {error && <div data-testid="text-field-error">{error}</div>}
      {helperText && !error && <div data-testid="text-field-helper">{helperText}</div>}
    </div>
  );
};

const Select = ({ label, value = '', onChange = noop, children, id, ...props }: any) => {
  const selectId = id || label || 'select-field';
  return (
    <div data-testid="select-field">
      {label && <label htmlFor={selectId}>{label}</label>}
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e)}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};

const MenuItem = ({ children, value }: any) => (
  <option value={value}>{children}</option>
);

const Button = ({ children, onClick = noop, disabled, type = 'button', ...props }: any) => (
  <button type={type} onClick={onClick} disabled={disabled} {...props}>
    {children}
  </button>
);

const IconButton = ({ children, onClick = noop, disabled, ...props }: any) => (
  <button type="button" onClick={onClick} disabled={disabled} {...props}>
    {children}
  </button>
);

const Typography = ({ children, variant, ...props }: any) => {
  const headingMap: Record<string, keyof JSX.IntrinsicElements> = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
  };
  const Component = (variant && headingMap[variant]) || 'p';
  return React.createElement(Component, props, children);
};

const Alert = ({ children, severity, ...props }: any) => (
  <div role="alert" data-severity={severity} {...props}>
    {children}
  </div>
);

const Snackbar = ({ children }: any) => <div data-testid="snackbar">{children}</div>;

const Chip = ({ label }: any) => <span>{label}</span>;

const Divider = () => <hr />;

const LinearProgress = () => <div data-testid="linear-progress" />;

const Dialog = ({ children }: any) => <div role="dialog">{children}</div>;
const DialogTitle = ({ children }: any) => <div>{children}</div>;
const DialogContent = ({ children }: any) => <div>{children}</div>;
const DialogActions = ({ children }: any) => <div>{children}</div>;

export const createMuiMock = () => {
  const base = {
    Box: createSimpleWrapper('box'),
    Stack: createSimpleWrapper('stack'),
    Container: createSimpleWrapper('container'),
    Paper: createSimpleWrapper('paper'),
    Typography,
    TextField,
    Select,
    MenuItem,
    Button,
    IconButton,
    Link: Button,
    Alert,
    Snackbar,
    Chip,
    Divider,
    LinearProgress,
    Grid: createSimpleWrapper('grid'),
    FormControl: createSimpleWrapper('form-control'),
    InputLabel: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress: () => <div data-testid="circular-progress" />,
  } as Record<string, any>;

  return new Proxy(base, {
    get(target, prop: string) {
      if (prop in target) {
        return target[prop];
      }
      const component = createSimpleWrapper(`mui-${prop}`);
      target[prop] = component;
      return component;
    },
  });
};
