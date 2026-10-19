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
    <div className={`flex flex-col items-center justify-center p-8 text-center border border-border-default rounded-lg bg-canvas-subtle ${className}`}>
      <div className="w-12 h-12 rounded-full bg-canvas-raised flex items-center justify-center text-fg-muted mb-3">
        {icon || <FolderGit2 className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-fg-default mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-fg-muted max-w-sm mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
