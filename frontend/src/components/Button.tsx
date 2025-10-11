import { type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles = {
  primary: 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20 hover:brightness-105',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
  outline: 'border border-gray-300 text-gray-900 hover:bg-gray-50',
  ghost: 'text-gray-600 hover:bg-gray-100'
};

const sizeStyles = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4',
  lg: 'h-12 px-6 text-lg'
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        // Base styles
        'inline-flex items-center justify-center',
        'rounded-xl font-medium',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        
        // Variant styles
        variantStyles[variant],
        
        // Size styles
        sizeStyles[size],
        
        // Width styles
        fullWidth ? 'w-full' : '',
        
        // Custom classes
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {/* Loading Spinner */}
      {loading && (
        <span className="mr-2">
          <span className="animate-spin material-symbols-rounded text-[18px]">
            progress_activity
          </span>
        </span>
      )}
      
      {/* Left Icon */}
      {icon && iconPosition === 'left' && !loading && (
        <span className="material-symbols-rounded mr-2 text-[20px]">
          {icon}
        </span>
      )}
      
      {/* Content */}
      {children}
      
      {/* Right Icon */}
      {icon && iconPosition === 'right' && !loading && (
        <span className="material-symbols-rounded ml-2 text-[20px]">
          {icon}
        </span>
      )}
    </button>
  );
}

// Icon-only variant
export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  className,
  ...props
}: Omit<ButtonProps, 'children'> & { icon: string }) {
  const sizeToIconSize = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center',
        'rounded-full',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeToIconSize[size],
        className
      )}
      {...props}
    >
      <span className="material-symbols-rounded">
        {icon}
      </span>
    </button>
  );
}