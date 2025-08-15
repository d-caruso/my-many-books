import React from 'react';

interface ResponsiveSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
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
  className = '',
  children,
  ...props
}) => {
  const baseClasses = `
    w-full px-3 py-3 border rounded-lg 
    focus:outline-none focus:ring-2 focus:ring-primary-500 
    text-base sm:text-sm min-h-[44px] touch-manipulation
    transition-colors duration-200
    cursor-pointer appearance-none
    bg-background
  `.trim().replace(/\s+/g, ' ');

  const stateClasses = error
    ? 'border-semantic-error bg-red-50'
    : 'border-secondary-300 hover:border-secondary-400';

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
      
      <div className="relative">
        <select
          {...props}
          className={`${baseClasses} ${stateClasses} ${className}`}
        >
          {children}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-text-muted" style={{fontSize: '16px'}}>▼</span>
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-semantic-error">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-text-muted">{helperText}</p>
      )}
    </div>
  );
};