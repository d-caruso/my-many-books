import React from 'react';

interface ResponsiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg 
    transition-all duration-200 touch-manipulation
    focus:outline-none focus:ring-2 focus:ring-offset-1
    disabled:cursor-not-allowed
  `.trim().replace(/\s+/g, ' ');

  const variantClasses = {
    primary: `
      bg-primary-500 text-white 
      hover:bg-primary-600 active:bg-primary-700
      focus:ring-primary-500
      disabled:bg-secondary-300 disabled:text-text-muted
    `,
    secondary: `
      bg-secondary-100 text-text-primary border border-secondary-300
      hover:bg-secondary-200 active:bg-secondary-300
      focus:ring-secondary-500
      disabled:bg-secondary-50 disabled:text-text-muted
    `,
    danger: `
      bg-semantic-error text-white
      hover:bg-red-600 active:bg-red-700
      focus:ring-semantic-error
      disabled:bg-secondary-300 disabled:text-text-muted
    `,
    ghost: `
      text-text-secondary 
      hover:text-text-primary hover:bg-secondary-50
      active:bg-secondary-100
      focus:ring-secondary-500
      disabled:text-text-muted
    `
  };

  const sizeClasses = {
    xs: 'px-2 py-1.5 text-xs min-h-[32px] gap-1',
    sm: 'px-3 py-2 text-sm min-h-[36px] gap-1.5',
    md: 'px-4 py-2.5 text-sm sm:text-base min-h-[44px] gap-2',
    lg: 'px-6 py-3 text-base min-h-[48px] gap-2',
    xl: 'px-8 py-4 text-lg min-h-[52px] gap-3'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant].trim().replace(/\s+/g, ' ')}
        ${sizeClasses[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      
      {icon && !loading && icon}
      
      <span>{children}</span>
    </button>
  );
};