import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Octicon } from '../ui/Octicon'

export interface GlobalSearchProps {
  initialQuery?: string
  placeholder?: string
}

export function GlobalSearch({
  initialQuery = '',
  placeholder = 'Type / to search',
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
        <span className="absolute left-2.5 text-[#8b949e] pointer-events-none flex items-center">
          <Octicon name="search" size={14} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-1 text-xs bg-[#161b22] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all h-8"
        />
        <kbd className="absolute right-2 text-[10px] text-[#8b949e] border border-[#30363d] bg-[#21262d] px-1.5 py-0.5 rounded font-mono pointer-events-none">
          /
        </kbd>
      </div>
    </form>
  )
}
