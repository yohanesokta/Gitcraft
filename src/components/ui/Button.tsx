import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'invisible'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'default',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-md transition-all duration-120 focus:outline-none focus:ring-2 focus:ring-accent-fg/40 disabled:opacity-50 disabled:pointer-events-none cursor-pointer border active:scale-[0.97]'

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 h-7',
    md: 'px-3 py-1.5 text-xs gap-2 h-8',
    lg: 'px-4 py-2 text-sm gap-2.5 h-9',
  }[size]

  const variantClasses = {
    default:
      'bg-canvas-subtle hover:bg-canvas-hover text-fg-default border-border-default hover:border-border-strong',
    primary:
      'bg-accent-emphasis hover:bg-accent-hover text-accent-text border-accent-emphasis shadow-sm font-semibold',
    secondary:
      'bg-canvas-raised hover:bg-canvas-hover text-fg-default border-border-default hover:border-border-strong',
    danger:
      'bg-canvas-subtle hover:bg-danger-fg text-danger-fg hover:text-white border-border-default hover:border-danger-fg',
    invisible:
      'bg-transparent hover:bg-canvas-hover text-fg-default border-transparent',
  }[variant]

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
