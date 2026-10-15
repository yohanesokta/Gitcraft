import React from 'react'
import { Link } from 'react-router-dom'
import { GlobalHeader } from './GlobalHeader'
import { Octicon } from '../ui/Octicon'

export interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#e6edf3]">
      <GlobalHeader />
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
      <footer className="mt-auto border-t border-[#30363d] py-10 px-4 text-xs text-[#8b949e]">
        <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
              <Octicon name="mark-github" size={24} />
            </Link>
            <span>&copy; 2026 Gitcraft</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[#58a6ff]">
            <a href="https://docs.github.com" target="_blank" rel="noreferrer" className="hover:underline">Terms</a>
            <a href="https://docs.github.com" target="_blank" rel="noreferrer" className="hover:underline">Privacy</a>
            <a href="https://docs.github.com" target="_blank" rel="noreferrer" className="hover:underline">Security</a>
            <a href="https://www.githubstatus.com" target="_blank" rel="noreferrer" className="hover:underline">Status</a>
            <a href="https://docs.github.com" target="_blank" rel="noreferrer" className="hover:underline">Docs</a>
            <a href="https://support.github.com" target="_blank" rel="noreferrer" className="hover:underline">Contact</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:underline">Manage cookies</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:underline">Do not share my personal information</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
