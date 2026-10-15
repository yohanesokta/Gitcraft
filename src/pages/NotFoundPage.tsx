import { Link } from 'react-router-dom'
import { Octicon } from '../components/ui/Octicon'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[#8b949e] mb-4">
        <Octicon name="mark-github" size={36} />
      </div>
      <div className="text-5xl font-extrabold text-[#30363d] mb-2 font-mono">404</div>
      <h1 className="text-xl font-bold text-[#e6edf3] mb-2">
        This is not the web page you are looking for
      </h1>
      <p className="text-xs text-[#8b949e] max-w-sm mb-6 leading-relaxed">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors"
      >
        <span>Back to homepage</span>
      </Link>
    </div>
  )
}
