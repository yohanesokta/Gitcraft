import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Octicon } from '../ui/Octicon'

export interface GlobalSearchProps {
  initialQuery?: string
  placeholder?: string
  onOpenCommandPalette?: () => void
}

export function GlobalSearch({
  initialQuery = '',
  placeholder = 'Type / to search',
  onOpenCommandPalette,
}: GlobalSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      navigate(`/?q=${encodeURIComponent(trimmed)}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xs md:max-w-sm">
      <div className="relative flex items-center">
        <span className="absolute left-2.5 text-fg-muted pointer-events-none flex items-center">
          <Octicon name="search" size={14} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-12 py-1 text-xs bg-canvas-default text-fg-default placeholder-fg-subtle border border-border-default rounded-md focus:outline-none focus:border-accent-fg focus:ring-1 focus:ring-accent-fg transition-all h-8"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {onOpenCommandPalette ? (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              title="Open Command Palette (⌘K)"
              className="text-[10px] font-mono text-fg-subtle border border-border-default bg-canvas-subtle px-1.5 py-0.5 rounded hover:text-fg-default hover:bg-canvas-hover transition-colors cursor-pointer"
            >
              ⌘K
            </button>
          ) : (
            <kbd className="text-[10px] font-mono text-fg-subtle border border-border-default bg-canvas-subtle px-1.5 py-0.5 rounded pointer-events-none">
              /
            </kbd>
          )}
        </div>
      </div>
    </form>
  )
}
