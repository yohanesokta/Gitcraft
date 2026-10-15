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
    default: 'bg-[#21262d] text-[#e6edf3] border border-[#30363d]',
    secondary: 'bg-[#161b22] text-[#9198a1] border border-[#30363d]',
    success: 'bg-[#1f3526] text-[#3fb950] border border-[#238636]/40',
    warning: 'bg-[#3b2d14] text-[#d29922] border border-[#9e6a03]/40',
    danger: 'bg-[#3c1e21] text-[#f85149] border border-[#da3633]/40',
    purple: 'bg-[#271d3b] text-[#a371f7] border border-[#8957e5]/40',
    outline: 'bg-transparent text-[#9198a1] border border-[#30363d]',
  }[variant]

  return (
    <span className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </span>
  )
}
