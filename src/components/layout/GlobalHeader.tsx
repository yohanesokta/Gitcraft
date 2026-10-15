import { Link, useLocation } from 'react-router-dom'
import { Octicon } from '../ui/Octicon'
import { GlobalSearch } from './GlobalSearch'
import { getStoredUser } from '../../lib/forgejo'

export function GlobalHeader() {
  const location = useLocation()
  const pathParts = location.pathname.split('/').filter(Boolean)

  const isRepoPage = pathParts.length >= 2 && pathParts[0] !== 'explore' && pathParts[0] !== 'login' && pathParts[0] !== 'signup'
  const isProfilePage = pathParts.length === 1 && pathParts[0] !== 'explore' && pathParts[0] !== 'login' && pathParts[0] !== 'signup'

  const owner = isRepoPage ? pathParts[0] : isProfilePage ? pathParts[0] : null
  const repo = isRepoPage ? pathParts[1] : null
  const currentUser = getStoredUser()
  const profileUsername = currentUser?.login || 'yohanesokta'

  return (
    <header className="sticky top-0 z-50 bg-[#010409] border-b border-[#21262d] px-4 py-2 text-[#e6edf3]">
      <div className="flex items-center justify-between gap-3 h-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            className="w-8 h-8 rounded-md border border-[#30363d] bg-[#21262d]/50 hover:bg-[#30363d] flex items-center justify-center text-[#e6edf3] transition-colors cursor-pointer"
          >
            <Octicon name="three-bars" size={16} />
          </button>

          <Link
            to="/"
            aria-label="Homepage"
            className="text-[#e6edf3] hover:text-[#58a6ff] transition-colors flex items-center"
          >
            <Octicon name="mark-github" size={32} />
          </Link>

          {isRepoPage && owner && repo ? (
            <div className="hidden sm:flex items-center gap-1.5 text-sm">
              <Link
                to={`/${owner}`}
                className="text-[#e6edf3] hover:text-[#58a6ff] hover:underline"
              >
                {owner}
              </Link>
              <span className="text-[#8b949e]">/</span>
              <Link
                to={`/${owner}/${repo}`}
                className="font-semibold text-[#e6edf3] hover:text-[#58a6ff] hover:underline"
              >
                {repo}
              </Link>
              <span className="ml-1 px-1.5 py-0.2 rounded-full border border-[#30363d] text-[11px] text-[#8b949e]">
                Public
              </span>
            </div>
          ) : isProfilePage && owner ? (
            <div className="hidden sm:flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-[#e6edf3]">
                {owner}
              </span>
            </div>
          ) : (
            <Link
              to="/"
              className="hidden sm:inline-block font-semibold text-sm text-[#e6edf3] hover:text-[#58a6ff]"
            >
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end max-w-2xl">
          <GlobalSearch />

          <div className="flex items-center gap-1 text-[#e6edf3]">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-2.5 py-1 text-xs text-[#e6edf3] hover:text-[#58a6ff] transition-colors font-medium"
            >
              Sign in
            </Link>

            <Link
              to="/signup"
              className="hidden sm:inline-flex items-center px-2.5 py-1 text-xs text-[#e6edf3] border border-[#30363d] rounded-md hover:border-[#8b949e] transition-colors font-medium"
            >
              Sign up
            </Link>

            <button
              type="button"
              aria-label="Create new"
              className="h-8 px-2 rounded-md border border-[#30363d] bg-[#21262d]/40 hover:bg-[#30363d] hidden sm:flex items-center gap-1 text-xs font-medium cursor-pointer transition-colors"
            >
              <Octicon name="plus" size={14} />
              <Octicon name="triangle-down" size={10} className="text-[#8b949e]" />
            </button>

            <Link
              to="/issues"
              aria-label="Issues"
              className="w-8 h-8 rounded-md border border-[#30363d] bg-[#21262d]/40 hover:bg-[#30363d] hidden md:flex items-center justify-center transition-colors"
            >
              <Octicon name="issue-opened" size={16} />
            </Link>

            <Link
              to="/pulls"
              aria-label="Pull requests"
              className="w-8 h-8 rounded-md border border-[#30363d] bg-[#21262d]/40 hover:bg-[#30363d] hidden md:flex items-center justify-center transition-colors"
            >
              <Octicon name="git-pull-request" size={16} />
            </Link>

            <button
              type="button"
              aria-label="Notifications"
              className="w-8 h-8 rounded-md border border-[#30363d] bg-[#21262d]/40 hover:bg-[#30363d] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Octicon name="bell" size={16} />
            </button>

            <Link
              to={`/${profileUsername}`}
              title={`${profileUsername} profile`}
              className="ml-1 shrink-0"
            >
              <img
                src={currentUser?.avatar_url || '/default-avatar.jpg'}
                alt={profileUsername}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/default-avatar.jpg'
                }}
                className="w-8 h-8 rounded-full border border-[#30363d] object-cover cursor-pointer hover:opacity-90 transition-opacity"
              />
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
