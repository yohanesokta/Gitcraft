import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { GlobalHeader } from './GlobalHeader'
import { CommandPalette } from './CommandPalette'
import { Octicon } from '../ui/Octicon'

export interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [isCmdOpen, setIsCmdOpen] = useState(false)
  const location = useLocation()
  const pathParts = location.pathname.split('/').filter(Boolean)
  const isRepoPage = pathParts.length >= 2 && pathParts[0] !== 'explore' && pathParts[0] !== 'login' && pathParts[0] !== 'signup'
  const owner = isRepoPage ? pathParts[0] : null
  const repo = isRepoPage ? pathParts[1] : null

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCmdOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-canvas-default text-fg-default font-sans antialiased">
      <GlobalHeader onOpenCommandPalette={() => setIsCmdOpen(true)} />
      
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      <footer className="mt-auto border-t border-border-default py-8 px-4 text-xs text-fg-muted bg-canvas-subtle">
        <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-fg-muted hover:text-fg-default transition-colors">
              <Octicon name="mark-github" size={20} />
            </Link>
            <span>&copy; {new Date().getFullYear()} Gitcraft • Powered by Forgejo</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-fg-muted">
            <a href="https://forgejo.org/docs/" target="_blank" rel="noreferrer" className="hover:text-accent-fg hover:underline">Forgejo Docs</a>
            <a href="https://codeberg.org/forgejo/forgejo" target="_blank" rel="noreferrer" className="hover:text-accent-fg hover:underline">Source</a>
            <button
              onClick={() => setIsCmdOpen(true)}
              className="text-fg-muted hover:text-accent-fg cursor-pointer text-xs"
            >
              Command Palette (⌘K)
            </button>
          </nav>
        </div>
      </footer>

      <CommandPalette
        isOpen={isCmdOpen}
        onClose={() => setIsCmdOpen(false)}
        owner={owner}
        repo={repo}
      />
    </div>
  )
}
