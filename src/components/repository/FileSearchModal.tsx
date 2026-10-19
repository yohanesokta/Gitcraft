import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRepositoryTree } from '../../hooks/useForgejo'
import { Octicon } from '../ui/Octicon'

export interface FileSearchModalProps {
  isOpen: boolean
  onClose: () => void
  owner: string
  repo: string
  refName: string
}

export function FileSearchModal({
  isOpen,
  onClose,
  owner,
  repo,
  refName,
}: FileSearchModalProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: treeData, isLoading } = useRepositoryTree(owner, repo, refName, isOpen)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const fileBlobs = useMemo(() => {
    if (!treeData?.tree) return []
    return treeData.tree.filter((item) => item.type === 'blob')
  }, [treeData])

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return fileBlobs.slice(0, 50)
    return fileBlobs
      .filter((file) => file.path.toLowerCase().includes(q))
      .slice(0, 50)
  }, [fileBlobs, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1 < filteredFiles.length ? prev + 1 : prev))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === 'Enter') {
        if (filteredFiles[selectedIndex]) {
          e.preventDefault()
          handleSelectFile(filteredFiles[selectedIndex].path)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredFiles, selectedIndex])

  useEffect(() => {
    const activeEl = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    if (activeEl && listRef.current) {
      const parent = listRef.current
      const elTop = activeEl.offsetTop
      const elBottom = elTop + activeEl.clientHeight
      const parentTop = parent.scrollTop
      const parentBottom = parentTop + parent.clientHeight
      if (elTop < parentTop) {
        parent.scrollTop = elTop
      } else if (elBottom > parentBottom) {
        parent.scrollTop = elBottom - parent.clientHeight
      }
    }
  }, [selectedIndex])

  function handleSelectFile(path: string) {
    onClose()
    navigate(`/${owner}/${repo}/blob/${encodeURIComponent(refName)}/${path}`)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-xs">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-canvas-raised border border-border-default rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default bg-canvas-subtle">
          <Octicon name="search" size={16} className="text-fg-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Go to file in ${owner}/${repo}@${refName}...`}
            className="flex-1 bg-transparent text-sm text-fg-default placeholder-fg-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-fg-muted hover:text-fg-default active:scale-[0.97] rounded cursor-pointer transition-colors"
            aria-label="Close"
          >
            <Octicon name="x" size={16} />
          </button>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto divide-y divide-border-default max-h-96"
        >
          {isLoading && (
            <div className="p-8 text-center text-xs text-fg-muted">
              Loading file index...
            </div>
          )}

          {!isLoading && filteredFiles.length === 0 && (
            <div className="p-8 text-center text-xs text-fg-muted">
              No files found matching <span className="text-fg-default font-mono">"{query}"</span>
            </div>
          )}

          {!isLoading &&
            filteredFiles.map((item, idx) => {
              const isSelected = idx === selectedIndex
              const lastSlash = item.path.lastIndexOf('/')
              const dir = lastSlash >= 0 ? item.path.slice(0, lastSlash + 1) : ''
              const filename = lastSlash >= 0 ? item.path.slice(lastSlash + 1) : item.path

              return (
                <div
                  key={item.path}
                  onClick={() => handleSelectFile(item.path)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-accent text-accent-contrast'
                      : 'hover:bg-canvas-hover text-fg-default'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Octicon
                      name="file"
                      size={14}
                      className={isSelected ? 'text-accent-contrast shrink-0' : 'text-fg-muted shrink-0'}
                    />
                    <div className="truncate font-mono">
                      {dir && (
                        <span className={isSelected ? 'opacity-80' : 'text-fg-muted'}>
                          {dir}
                        </span>
                      )}
                      <span className="font-semibold">{filename}</span>
                    </div>
                  </div>
                  {item.size !== undefined && (
                    <span
                      className={`text-[11px] shrink-0 ${
                        isSelected ? 'opacity-80' : 'text-fg-muted'
                      }`}
                    >
                      {item.size < 1024
                        ? `${item.size} B`
                        : `${(item.size / 1024).toFixed(1)} KB`}
                    </span>
                  )}
                </div>
              )
            })}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border-default bg-canvas-subtle text-[11px] text-fg-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded border border-border-default bg-canvas-default text-[10px]">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 rounded border border-border-default bg-canvas-default text-[10px]">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border border-border-default bg-canvas-default text-[10px]">↵</kbd> to select
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border border-border-default bg-canvas-default text-[10px]">esc</kbd> to close
            </span>
          </div>
          <div>
            {fileBlobs.length > 0 && <span>{fileBlobs.length} files indexed</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
