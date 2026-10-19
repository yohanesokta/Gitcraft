import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Octicon } from '../ui/Octicon'
import { ForgejoBranch, ForgejoTag } from '../../types/forgejo'

export interface BranchSelectorProps {
  owner: string
  repo: string
  currentRef: string
  branches?: ForgejoBranch[]
  tags?: ForgejoTag[]
  basePath: string
}

export function BranchSelector({
  owner,
  repo,
  currentRef,
  branches = [],
  tags = [],
}: BranchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'branches' | 'tags'>('branches')
  const [filterQuery, setFilterQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(filterQuery.toLowerCase())
  )

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(filterQuery.toLowerCase())
  )

  const branchCount = branches.length > 0 ? branches.length : 1
  const tagCount = tags.length

  function handleSelect(refName: string) {
    setIsOpen(false)
    navigate(`/${owner}/${repo}/tree/${encodeURIComponent(refName)}`)
  }

  return (
    <div className="flex items-center gap-3" ref={dropdownRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-canvas-subtle hover:bg-canvas-hover text-fg-default border border-border-default transition-colors cursor-pointer active:scale-[0.97]"
        >
          <Octicon name="git-branch" size={13} className="text-fg-muted" />
          <span className="max-w-[140px] truncate font-mono">{currentRef}</span>
          <Octicon name="triangle-down" size={11} className="text-fg-muted ml-0.5" />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-1.5 w-72 bg-canvas-raised border border-border-default rounded-lg shadow-xl z-50 overflow-hidden text-xs">
            <div className="p-2.5 border-b border-border-default flex items-center justify-between">
              <span className="font-semibold text-fg-default">Switch branches/tags</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-fg-muted hover:text-fg-default p-0.5 rounded cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-2 border-b border-border-default">
              <input
                type="text"
                autoFocus
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter branches/tags"
                className="w-full px-2.5 py-1.5 bg-canvas-default text-fg-default placeholder-fg-subtle border border-border-default rounded-md focus:outline-none focus:border-accent-fg text-xs"
              />
            </div>

            <div className="flex border-b border-border-default bg-canvas-subtle">
              <button
                type="button"
                onClick={() => setActiveTab('branches')}
                className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'branches'
                    ? 'border-accent-fg text-fg-default font-semibold'
                    : 'border-transparent text-fg-muted hover:text-fg-default'
                }`}
              >
                Branches
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tags')}
                className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'tags'
                    ? 'border-accent-fg text-fg-default font-semibold'
                    : 'border-transparent text-fg-muted hover:text-fg-default'
                }`}
              >
                Tags
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-border-default">
              {activeTab === 'branches' && (
                <>
                  {filteredBranches.length === 0 ? (
                    <div className="p-4 text-center text-fg-muted">
                      No branches found
                    </div>
                  ) : (
                    filteredBranches.map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => handleSelect(b.name)}
                        className="w-full text-left px-3 py-2 hover:bg-canvas-hover flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {b.name === currentRef && (
                            <Octicon name="check" size={14} className="text-fg-default shrink-0" />
                          )}
                          <span
                            className={`truncate font-mono ${
                              b.name === currentRef ? 'font-semibold text-fg-default' : 'text-fg-muted group-hover:text-fg-default'
                            }`}
                          >
                            {b.name}
                          </span>
                        </div>
                        {b.name === 'main' || b.name === 'master' ? (
                          <span className="px-1.5 py-0.5 rounded-full border border-border-default text-[10px] text-fg-muted bg-canvas-subtle">
                            default
                          </span>
                        ) : null}
                      </button>
                    ))
                  )}
                </>
              )}

              {activeTab === 'tags' && (
                <>
                  {filteredTags.length === 0 ? (
                    <div className="p-4 text-center text-fg-muted">
                      No tags found
                    </div>
                  ) : (
                    filteredTags.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => handleSelect(t.name)}
                        className="w-full text-left px-3 py-2 hover:bg-canvas-hover flex items-center gap-2 group transition-colors cursor-pointer"
                      >
                        {t.name === currentRef && (
                          <Octicon name="check" size={14} className="text-fg-default shrink-0" />
                        )}
                        <span
                          className={`truncate font-mono ${
                            t.name === currentRef ? 'font-semibold text-fg-default' : 'text-fg-muted group-hover:text-fg-default'
                          }`}
                        >
                          {t.name}
                        </span>
                      </button>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-3 text-xs text-fg-muted">
        <Link
          to={`/${owner}/${repo}/branches`}
          className="flex items-center gap-1.5 hover:text-accent-fg transition-colors"
        >
          <Octicon name="git-branch" size={13} />
          <span className="font-semibold text-fg-default font-mono">{branchCount}</span>
          <span>{branchCount === 1 ? 'Branch' : 'Branches'}</span>
        </Link>
        <Link
          to={`/${owner}/${repo}/tags`}
          className="flex items-center gap-1.5 hover:text-accent-fg transition-colors"
        >
          <Octicon name="tag" size={13} />
          <span className="font-semibold text-fg-default font-mono">{tagCount}</span>
          <span>{tagCount === 1 ? 'Tag' : 'Tags'}</span>
        </Link>
      </div>
    </div>
  )
}
