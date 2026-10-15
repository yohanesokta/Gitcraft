import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Octicon } from '../ui/Octicon'
import { GlobalSearch } from './GlobalSearch'
import { getStoredUser, getAuthToken, logoutUser } from '../../lib/forgejo'
import { ForgejoUser } from '../../types/forgejo'

export function GlobalHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathParts = location.pathname.split('/').filter(Boolean)

  const isRepoPage = pathParts.length >= 2 && pathParts[0] !== 'explore' && pathParts[0] !== 'login' && pathParts[0] !== 'signup'
  const isProfilePage = pathParts.length === 1 && pathParts[0] !== 'explore' && pathParts[0] !== 'login' && pathParts[0] !== 'signup'

  const owner = isRepoPage ? pathParts[0] : isProfilePage ? pathParts[0] : null
  const repo = isRepoPage ? pathParts[1] : null

  const [currentUser, setCurrentUser] = useState<ForgejoUser | null>(getStoredUser)
  const [authToken, setAuthTokenState] = useState<string | null>(getAuthToken)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function syncAuth() {
      setCurrentUser(getStoredUser())
      setAuthTokenState(getAuthToken())
    }
    window.addEventListener('gitcraft_auth_change', syncAuth)
    window.addEventListener('storage', syncAuth)
    return () => {
      window.removeEventListener('gitcraft_auth_change', syncAuth)
      window.removeEventListener('storage', syncAuth)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const isLoggedIn = Boolean(currentUser && authToken)
  const profileUsername = currentUser?.login || 'yohanesokta'

  function handleSignOut() {
    logoutUser()
    setIsUserMenuOpen(false)
    navigate('/login')
  }

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
            {!isLoggedIn ? (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center px-3 py-1 text-xs text-[#e6edf3] hover:text-[#58a6ff] transition-colors font-medium whitespace-nowrap"
                >
                  Sign in
                </Link>

                <Link
                  to="/signup"
                  className="inline-flex items-center px-3 py-1 text-xs text-[#e6edf3] border border-[#30363d] rounded-md hover:border-[#8b949e] transition-colors font-medium whitespace-nowrap"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
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

                <div className="relative ml-1 shrink-0" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    aria-label="User profile menu"
                    className="flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-[#58a6ff] cursor-pointer"
                  >
                    <img
                      src={currentUser?.avatar_url || '/default-avatar.jpg'}
                      alt={profileUsername}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/default-avatar.jpg'
                      }}
                      className="w-8 h-8 rounded-full border border-[#30363d] object-cover hover:opacity-90 transition-opacity"
                    />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl z-50 py-1 text-xs text-[#e6edf3]">
                      <div className="px-4 py-2 border-b border-[#30363d]">
                        <p className="text-[#8b949e]">Signed in as</p>
                        <p className="font-bold truncate text-[#e6edf3]">{currentUser?.login}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          to={`/${currentUser?.login}`}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-1.5 hover:bg-[#21262d] transition-colors"
                        >
                          Your profile
                        </Link>
                        <Link
                          to={`/${currentUser?.login}?tab=repositories`}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-1.5 hover:bg-[#21262d] transition-colors"
                        >
                          Your repositories
                        </Link>
                        <Link
                          to={`/${currentUser?.login}?tab=stars`}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-1.5 hover:bg-[#21262d] transition-colors"
                        >
                          Your stars
                        </Link>
                      </div>

                      <div className="border-t border-[#30363d] pt-1">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-1.5 hover:bg-[#21262d] text-[#f85149] hover:text-[#f85149] transition-colors cursor-pointer"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
