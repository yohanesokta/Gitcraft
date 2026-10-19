import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}

export function Input({ icon, className = '', ...props }: InputProps) {
  const baseInputClass =
    'w-full px-3 py-1.5 text-xs bg-canvas-default text-fg-default placeholder-fg-subtle border border-border-default rounded-md focus:outline-none focus:border-accent-fg focus:ring-1 focus:ring-accent-fg/40 transition-colors h-8'

  if (icon) {
    return (
      <div className="relative flex items-center w-full">
        <span className="absolute left-2.5 text-fg-muted pointer-events-none flex items-center justify-center">
          {icon}
        </span>
        <input className={`${baseInputClass} pl-8 pr-3 ${className}`} {...props} />
      </div>
    )
  }

  return <input className={`${baseInputClass} ${className}`} {...props} />
}
