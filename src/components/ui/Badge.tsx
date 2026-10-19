import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'purple' | 'outline'
  size?: 'sm' | 'md'
  children: React.ReactNode
}

export function Badge({
  variant = 'default',
  size = 'sm',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full leading-none'
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  const variantClasses = {
    default: 'bg-canvas-raised text-fg-default border border-border-default',
    secondary: 'bg-canvas-subtle text-fg-muted border border-border-default',
    success: 'bg-success-subtle text-success-fg border border-success-fg/30',
    warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/30',
    danger: 'bg-red-500/10 text-danger-fg border border-red-500/30',
    purple: 'bg-purple-500/10 text-done-fg border border-purple-500/30',
    outline: 'bg-transparent text-fg-muted border border-border-default',
  }[variant]

  return (
    <span className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </span>
  )
}
