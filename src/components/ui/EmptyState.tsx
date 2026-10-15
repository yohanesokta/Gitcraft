import React from 'react'
import { FolderGit2 } from 'lucide-react'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center border border-[#30363d] rounded-lg bg-[#161b22] ${className}`}>
      <div className="w-12 h-12 rounded-full bg-[#21262d] flex items-center justify-center text-[#8b949e] mb-3">
        {icon || <FolderGit2 className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-[#e6edf3] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#8b949e] max-w-sm mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
