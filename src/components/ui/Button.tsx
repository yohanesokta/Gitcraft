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
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 disabled:opacity-50 disabled:pointer-events-none cursor-pointer border'

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 h-7',
    md: 'px-3 py-1.5 text-sm gap-2 h-8',
    lg: 'px-4 py-2 text-base gap-2.5 h-10',
  }[size]

  const variantClasses = {
    default: 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border-[#30363d] hover:border-[#8b949e]',
    primary: 'bg-[#238636] hover:bg-[#2ea043] text-white border-[#2ea043] shadow-sm',
    secondary: 'bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] border-[#30363d]',
    danger: 'bg-[#21262d] hover:bg-[#b62324] text-[#f85149] hover:text-white border-[#30363d] hover:border-[#b62324]',
    invisible: 'bg-transparent hover:bg-[#21262d] text-[#c9d1d9] border-transparent',
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
