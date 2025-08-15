import React from 'react';

interface ResponsiveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
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
  className = '',
  ...props
}) => {
  const baseClasses = `
    w-full px-3 py-3 border rounded-lg 
    focus:outline-none focus:ring-2 focus:ring-primary-500 
    text-base sm:text-sm min-h-[44px] touch-manipulation
    transition-colors duration-200
  `.trim().replace(/\s+/g, ' ');

  const stateClasses = error
    ? 'border-semantic-error bg-red-50 text-text-primary'
    : 'border-secondary-300 bg-background text-text-primary hover:border-secondary-400';

  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={props.id} 
          className="block text-sm font-medium text-text-secondary"
        >
          {label} {isRequired && <span className="text-semantic-error">*</span>}
        </label>
      )}
      
      <input
        {...props}
        className={`${baseClasses} ${stateClasses} ${className}`}
      />
      
      {error && (
        <p className="text-sm text-semantic-error">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-text-muted">{helperText}</p>
      )}
    </div>
  );
};