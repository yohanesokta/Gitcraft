import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`p-6 border border-danger-fg/30 rounded-lg bg-danger-fg/10 flex flex-col items-center text-center ${className}`}>
      <div className="w-10 h-10 rounded-full bg-danger-fg/15 text-danger-fg flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-danger-fg mb-1">{title}</h3>
      <p className="text-xs text-fg-muted max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </Button>
      )}
    </div>
  )
}
