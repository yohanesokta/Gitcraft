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
    <div className={`p-6 border border-[#f85149]/30 rounded-lg bg-[#3c1e21]/20 flex flex-col items-center text-center ${className}`}>
      <div className="w-10 h-10 rounded-full bg-[#f85149]/10 text-[#f85149] flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-[#f85149] mb-1">{title}</h3>
      <p className="text-xs text-[#8b949e] max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </Button>
      )}
    </div>
  )
}
