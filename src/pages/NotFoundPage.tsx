import { Link } from 'react-router-dom'
import { Octicon } from '../components/ui/Octicon'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-canvas-subtle border border-border-default flex items-center justify-center text-fg-muted mb-4">
        <Octicon name="mark-github" size={36} />
      </div>
      <div className="text-5xl font-extrabold text-border-default mb-2 font-mono">404</div>
      <h1 className="text-xl font-bold text-fg-default mb-2">
        This is not the web page you are looking for
      </h1>
      <p className="text-xs text-fg-muted max-w-sm mb-6 leading-relaxed">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-control)] text-xs font-medium bg-canvas-subtle hover:bg-canvas-hover active:scale-[0.97] text-fg-default border border-border-default transition-all"
      >
        <span>Back to homepage</span>
      </Link>
    </div>
  )
}
