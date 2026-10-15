import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}

export function Input({ icon, className = '', ...props }: InputProps) {
  if (icon) {
    return (
      <div className="relative flex items-center w-full">
        <span className="absolute left-2.5 text-[#8b949e] pointer-events-none flex items-center justify-center">
          {icon}
        </span>
        <input
          className={`w-full pl-8 pr-3 py-1.5 text-sm bg-[#161b22] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-colors ${className}`}
          {...props}
        />
      </div>
    )
  }

  return (
    <input
      className={`w-full px-3 py-1.5 text-sm bg-[#161b22] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-colors ${className}`}
      {...props}
    />
  )
}
