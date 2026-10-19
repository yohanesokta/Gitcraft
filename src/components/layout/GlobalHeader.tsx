import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Command } from 'lucide-react'
import { Octicon } from '../ui/Octicon'
import { GlobalSearch } from './GlobalSearch'
import { getStoredUser, getAuthToken, logoutUser } from '../../lib/forgejo'
import { ForgejoUser } from '../../types/forgejo'
import { useTheme } from '../../themes/ThemeContext'

export interface GlobalHeaderProps {
  onOpenCommandPalette?: () => void
}

export function GlobalHeader({ onOpenCommandPalette }: GlobalHeaderProps) {
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
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const createMenuRef = useRef<HTMLDivElement>(null)

  const { actualMode, toggleMode, themeId, setThemeId, themes } = useTheme()

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
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setIsCreateMenuOpen(false)
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
    <header className="sticky top-0 z-50 bg-canvas-subtle border-b border-border-default px-4 py-2 text-fg-default shadow-xs">
      <div className="flex items-center justify-between gap-3 h-8 max-w-[1280px] mx-auto">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={onOpenCommandPalette}
            className="w-8 h-8 rounded-md border border-border-default bg-canvas-raised/50 hover:bg-canvas-hover flex items-center justify-center text-fg-muted hover:text-fg-default transition-colors cursor-pointer"
            title="Open command palette (⌘K)"
          >
            <Octicon name="three-bars" size={16} />
          </button>

          <Link
            to="/"
            aria-label="Homepage"
            className="text-fg-default hover:text-accent-fg transition-colors flex items-center gap-2"
          >
            <Octicon name="mark-github" size={26} />
            <span className="font-semibold text-sm hidden sm:inline-block tracking-tight">Gitcraft</span>
          </Link>

          {isRepoPage && owner && repo ? (
            <div className="hidden sm:flex items-center gap-1.5 text-sm">
              <Link
                to={`/${owner}`}
                className="text-fg-muted hover:text-accent-fg hover:underline transition-colors"
              >
                {owner}
              </Link>
              <span className="text-fg-subtle">/</span>
              <Link
                to={`/${owner}/${repo}`}
                className="font-semibold text-fg-default hover:text-accent-fg hover:underline transition-colors"
              >
                {repo}
              </Link>
              <span className="ml-1 px-1.5 py-0.2 rounded-full border border-border-default text-[11px] text-fg-muted bg-canvas-raised">
                Public
              </span>
            </div>
          ) : isProfilePage && owner ? (
            <div className="hidden sm:flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-fg-default">
                {owner}
              </span>
            </div>
          ) : (
            <Link
              to="/"
              className="hidden sm:inline-block font-semibold text-sm text-fg-muted hover:text-fg-default transition-colors"
            >
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end max-w-2xl">
          <GlobalSearch onOpenCommandPalette={onOpenCommandPalette} />

          <div className="flex items-center gap-1.5 text-fg-default">
            {/* Theme Toggle Button (Light/Dark) */}
            <button
              type="button"
              onClick={toggleMode}
              aria-label={`Switch to ${actualMode === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${actualMode === 'dark' ? 'light' : 'dark'} mode`}
              className="w-8 h-8 rounded-md border border-border-default bg-canvas-raised/40 hover:bg-canvas-hover flex items-center justify-center text-fg-muted hover:text-fg-default transition-colors cursor-pointer"
            >
              {actualMode === 'dark' ? (
                <Octicon name="sun" size={15} />
              ) : (
                <Octicon name="moon" size={15} />
              )}
            </button>

            {!isLoggedIn ? (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center px-3 py-1 text-xs text-fg-default hover:text-accent-fg transition-colors font-medium whitespace-nowrap"
                >
                  Sign in
                </Link>

                <Link
                  to="/signup"
                  className="inline-flex items-center px-3 py-1 text-xs text-fg-default border border-border-default rounded-md hover:border-border-strong hover:bg-canvas-hover transition-colors font-medium whitespace-nowrap"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
                <div className="relative" ref={createMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                    aria-label="Create new"
                    className="h-8 px-2 rounded-md border border-border-default bg-canvas-raised/40 hover:bg-canvas-hover hidden sm:flex items-center gap-1 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Octicon name="plus" size={14} />
                    <Octicon name="triangle-down" size={10} className="text-fg-muted" />
                  </button>

                  {isCreateMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-canvas-raised border border-border-default rounded-md shadow-xl z-50 py-1 text-xs text-fg-default">
                      <Link
                        to="/new"
                        onClick={() => setIsCreateMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-canvas-hover transition-colors"
                      >
                        <Octicon name="repo" size={14} className="text-fg-muted" />
                        <span>New repository</span>
                      </Link>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  aria-label="Command palette"
                  title="Command palette (⌘K)"
                  className="w-8 h-8 rounded-md border border-border-default bg-canvas-raised/40 hover:bg-canvas-hover hidden md:flex items-center justify-center text-fg-muted hover:text-fg-default transition-colors cursor-pointer"
                >
                  <Command className="w-3.5 h-3.5" />
                </button>

                <div className="relative ml-1 shrink-0" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    aria-label="User profile menu"
                    className="flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-accent-fg cursor-pointer"
                  >
                    <img
                      src={currentUser?.avatar_url || '/default-avatar.jpg'}
                      alt={profileUsername}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/default-avatar.jpg'
                      }}
                      className="w-8 h-8 rounded-full border border-border-default object-cover hover:opacity-90 transition-opacity"
                    />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-canvas-raised border border-border-default rounded-md shadow-2xl z-50 py-1 text-xs text-fg-default">
                      <div className="px-4 py-2 border-b border-border-default">
                        <p className="text-fg-muted">Signed in as</p>
                        <p className="font-bold truncate text-fg-default">{currentUser?.login}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          to={`/${currentUser?.login}`}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-1.5 hover:bg-canvas-hover transition-colors"
                        >
                          Your profile
                        </Link>
                        <Link
                          to={`/${currentUser?.login}?tab=repositories`}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-1.5 hover:bg-canvas-hover transition-colors"
                        >
                          Your repositories
                        </Link>
                        <Link
                          to={`/${currentUser?.login}?tab=stars`}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-1.5 hover:bg-canvas-hover transition-colors"
                        >
                          Your stars
                        </Link>
                        <Link
                          to="/new"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-1.5 hover:bg-canvas-hover transition-colors"
                        >
                          New repository
                        </Link>
                      </div>

                      {/* Theme Palette Switcher Section */}
                      <div className="border-t border-border-default px-4 py-2">
                        <p className="text-fg-muted font-semibold mb-1 text-[11px] uppercase tracking-wider">
                          Theme Palette
                        </p>
                        <div className="space-y-1">
                          {themes.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setThemeId(t.id)}
                              className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between cursor-pointer ${
                                themeId === t.id
                                  ? 'bg-accent-subtle text-accent-fg font-semibold'
                                  : 'text-fg-muted hover:bg-canvas-hover hover:text-fg-default'
                              }`}
                            >
                              <span>{t.name}</span>
                              {themeId === t.id && <span>✓</span>}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-border-default pt-1">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-1.5 hover:bg-canvas-hover text-danger-fg transition-colors cursor-pointer"
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
