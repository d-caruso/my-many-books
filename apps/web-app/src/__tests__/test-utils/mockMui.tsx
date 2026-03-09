import React from 'react';

const noop = () => {};

type CommonProps = { children?: React.ReactNode; [key: string]: unknown };

const createSimpleWrapper = (testId: string, element: keyof JSX.IntrinsicElements = 'div') => {
  const Wrapper = ({ children, ...props }: CommonProps) =>
    React.createElement(element, { 'data-testid': testId, ...props }, children);
  Wrapper.displayName = testId;
  return Wrapper;
};

const Autocomplete = ({
  value,
  inputValue,
  options = [],
  open,
  _loading,
  disabled,
  renderInput,
  renderOption,
  getOptionLabel,
  onChange,
  onInputChange,
  onOpen,
  onClose,
  _noOptionsText,
  ListboxProps,
  size,
}: {
  value?: unknown;
  inputValue?: string;
  options?: unknown[];
  open?: boolean;
  _loading?: boolean;
  disabled?: boolean;
  renderInput: (params: unknown) => React.ReactNode;
  renderOption?: (props: unknown, option: unknown, state: unknown) => React.ReactNode;
  getOptionLabel?: (option: unknown) => string;
  onChange?: (event: unknown, value: unknown, reason: string, details?: unknown) => void;
  onInputChange?: (event: unknown, value: string, reason: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  _noOptionsText?: string;
  ListboxProps?: Record<string, unknown>;
  size?: string;
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChange?.(e, e.target.value, 'input');
  };

  const handleFocus = () => onOpen?.();
  const handleBlur = () => onClose?.();

  const labelValue = value ? getOptionLabel?.(value) ?? '' : '';
  const displayValue = inputValue ?? labelValue;

  const inputElement = renderInput({
    inputProps: {
      value: displayValue,
      onChange: handleInputChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      disabled,
      'data-size': size,
    },
    InputProps: { endAdornment: null },
  });

  return (
    <div>
      {inputElement}
      {open && options.length > 0 && (
        <ul data-testid="options-list" {...(ListboxProps as React.HTMLAttributes<HTMLUListElement>)}>
          {options.map((option, index: number) => {
            const optionId = (option as Record<string, unknown>).id;
            const optionProps = {
              key: optionId != null ? String(optionId) : index,
              'data-testid': `option-${index}`,
              onClick: () => onChange?.(null, option, 'selectOption', { option }),
            };
            return renderOption ? (
              renderOption(optionProps, option, { index, selected: false, inputValue: inputValue ?? '' })
            ) : (
              <li {...optionProps}>{getOptionLabel?.(option)}</li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const TextField = ({
  label,
  value = '',
  onChange = noop,
  type = 'text',
  id,
  error,
  helperText,
  inputProps = {} as Record<string, unknown>,
  InputProps = {} as { endAdornment?: React.ReactNode },
  placeholder,
  disabled,
  size,
  ...rest
}: {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  id?: string;
  error?: boolean | string;
  helperText?: string;
  inputProps?: Record<string, unknown>;
  InputProps?: { endAdornment?: React.ReactNode };
  placeholder?: string;
  disabled?: boolean;
  size?: string;
  [key: string]: unknown;
}) => {
  const inputId = id || label || 'text-field';
  return (
    <div data-testid="text-field-container">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        type={type}
        value={(inputProps.value as string) ?? value}
        onChange={(inputProps.onChange as React.ChangeEventHandler<HTMLInputElement>) ?? ((e) => onChange(e))}
        onFocus={inputProps.onFocus as React.FocusEventHandler<HTMLInputElement>}
        onBlur={inputProps.onBlur as React.FocusEventHandler<HTMLInputElement>}
        placeholder={placeholder}
        disabled={(inputProps.disabled as boolean) ?? disabled}
        aria-invalid={error ? 'true' : undefined}
        data-size={(inputProps['data-size'] as string) ?? size}
        data-testid={inputProps['data-testid'] as string}
        role="textbox"
        {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
      />
      {InputProps.endAdornment}
      {error && <div data-testid="text-field-error">{error}</div>}
      {helperText && !error && <div data-testid="text-field-helper">{helperText}</div>}
    </div>
  );
};

const Select = ({
  label,
  value = '',
  onChange = noop,
  children,
  id,
  ...props
}: {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children?: React.ReactNode;
  id?: string;
  [key: string]: unknown;
}) => {
  const selectId = id || label || 'select-field';
  return (
    <div data-testid="select-field">
      {label && <label htmlFor={selectId}>{label}</label>}
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e)}
        {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
      >
        {children}
      </select>
    </div>
  );
};

const MenuItem = ({ children, value }: { children?: React.ReactNode; value?: unknown }) => (
  <option value={value as string | number | readonly string[]}>{children}</option>
);

const Button = ({
  children,
  onClick = noop,
  disabled,
  type = 'button',
  ...props
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  [key: string]: unknown;
}) => (
  <button type={type} onClick={onClick} disabled={disabled} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
    {children}
  </button>
);

const IconButton = ({
  children,
  onClick = noop,
  disabled,
  ...props
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  [key: string]: unknown;
}) => (
  <button type="button" onClick={onClick} disabled={disabled} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
    {children}
  </button>
);

const Typography = ({
  children,
  variant,
  ...props
}: {
  children?: React.ReactNode;
  variant?: string;
  [key: string]: unknown;
}) => {
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

const Alert = ({
  children,
  severity,
  ...props
}: {
  children?: React.ReactNode;
  severity?: string;
  [key: string]: unknown;
}) => (
  <div role="alert" data-severity={severity} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
    {children}
  </div>
);

const Snackbar = ({ children }: { children?: React.ReactNode }) => (
  <div data-testid="snackbar">{children}</div>
);

const Chip = ({ label }: { label?: React.ReactNode }) => <span>{label}</span>;

const Divider = () => <hr />;

const LinearProgress = () => <div data-testid="linear-progress" />;

const Dialog = ({ children }: { children?: React.ReactNode }) => <div role="dialog">{children}</div>;
const DialogTitle = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
const DialogContent = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
const DialogActions = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;

export const createMuiMock = () => {
  const base: Record<string, React.ComponentType<CommonProps> | React.FC<Record<string, unknown>>> = {
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
    InputLabel: ({ children, htmlFor }: { children?: React.ReactNode; htmlFor?: string }) => (
      <label htmlFor={htmlFor}>{children}</label>
    ),
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress: () => <div data-testid="circular-progress" />,
    Autocomplete,
  };

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
