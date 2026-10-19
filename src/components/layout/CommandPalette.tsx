import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Octicon, OcticonProps } from '../ui/Octicon'
import { useTheme } from '../../themes/ThemeContext'

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  owner?: string | null
  repo?: string | null
}

interface CommandItem {
  id: string
  title: string
  category: 'Navigation' | 'Files' | 'Theme' | 'Actions'
  icon: OcticonProps['name']
  shortcut?: string
  action: () => void
}

export function CommandPalette({ isOpen, onClose, owner, repo }: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { toggleMode, setThemeId, themes, actualMode } = useTheme()

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Build items dynamically
  const items: CommandItem[] = []

  // Navigation commands
  items.push({
    id: 'nav-home',
    title: 'Go to Dashboard / Explore',
    category: 'Navigation',
    icon: 'home',
    action: () => {
      navigate('/')
      onClose()
    },
  })

  items.push({
    id: 'nav-new',
    title: 'Create new repository',
    category: 'Navigation',
    icon: 'repo',
    shortcut: '⌘N',
    action: () => {
      navigate('/new')
      onClose()
    },
  })

  if (owner && repo) {
    items.push({
      id: 'repo-code',
      title: `View Code (${owner}/${repo})`,
      category: 'Navigation',
      icon: 'code',
      action: () => {
        navigate(`/${owner}/${repo}`)
        onClose()
      },
    })
    items.push({
      id: 'repo-issues',
      title: `View Issues (${owner}/${repo})`,
      category: 'Navigation',
      icon: 'issue-opened',
      action: () => {
        navigate(`/${owner}/${repo}/issues`)
        onClose()
      },
    })
    items.push({
      id: 'repo-pulls',
      title: `View Pull Requests (${owner}/${repo})`,
      category: 'Navigation',
      icon: 'git-pull-request',
      action: () => {
        navigate(`/${owner}/${repo}/pulls`)
        onClose()
      },
    })
    items.push({
      id: 'repo-commits',
      title: `View Commits (${owner}/${repo})`,
      category: 'Navigation',
      icon: 'git-commit',
      action: () => {
        navigate(`/${owner}/${repo}/commits`)
        onClose()
      },
    })
  }

  // Theme actions
  items.push({
    id: 'theme-toggle-mode',
    title: `Switch to ${actualMode === 'dark' ? 'Light' : 'Dark'} mode`,
    category: 'Theme',
    icon: actualMode === 'dark' ? 'sun' : 'moon',
    shortcut: '⌘T',
    action: () => {
      toggleMode()
      onClose()
    },
  })

  themes.forEach((t) => {
    items.push({
      id: `theme-set-${t.id}`,
      title: `Set Theme Palette: ${t.name}`,
      category: 'Theme',
      icon: 'paintcan',
      action: () => {
        setThemeId(t.id)
        onClose()
      },
    })
  })

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredItems, selectedIndex, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-100 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-canvas-raised border border-border-strong rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default">
          <Octicon name="search" size={16} className="text-fg-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Type a command, file, or action..."
            className="flex-1 bg-transparent border-none text-sm text-fg-default placeholder-fg-subtle outline-none"
          />
          <kbd className="text-[10px] font-mono border border-border-default bg-canvas-subtle px-1.5 py-0.5 rounded text-fg-subtle">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-fg-muted">
              No matching commands found.
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={item.action}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-xs cursor-pointer transition-colors ${
                  selectedIndex === idx
                    ? 'bg-canvas-hover text-fg-default'
                    : 'text-fg-muted hover:bg-canvas-hover hover:text-fg-default'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Octicon name={item.icon} size={14} className="shrink-0 text-fg-subtle" />
                  <span className="font-medium text-fg-default">{item.title}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded border border-border-default bg-canvas-subtle text-fg-subtle">
                    {item.category}
                  </span>
                </div>
                {item.shortcut && (
                  <kbd className="text-[10px] font-mono border border-border-default bg-canvas-subtle px-1 py-0.5 rounded text-fg-subtle">
                    {item.shortcut}
                  </kbd>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 bg-canvas-subtle border-t border-border-default text-[11px] text-fg-subtle flex items-center justify-between">
          <span>Navigate with <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd></span>
          <span>Select with <kbd className="font-mono">↵</kbd></span>
        </div>
      </div>
    </div>
  )
}
