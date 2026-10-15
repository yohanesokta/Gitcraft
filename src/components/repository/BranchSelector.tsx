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
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
        >
          <Octicon name="git-branch" size={14} className="text-[#8b949e]" />
          <span className="max-w-[120px] truncate">{currentRef}</span>
          <Octicon name="triangle-down" size={12} className="text-[#8b949e] ml-1" />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-1 w-72 bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl z-50 overflow-hidden text-xs">
            <div className="p-2 border-b border-[#30363d] flex items-center justify-between">
              <span className="font-semibold text-[#e6edf3]">Switch branches/tags</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#8b949e] hover:text-[#e6edf3]"
              >
                &times;
              </button>
            </div>

            <div className="p-2 border-b border-[#30363d]">
              <input
                type="text"
                autoFocus
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter branches/tags"
                className="w-full px-2.5 py-1 bg-[#0d1117] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] text-xs"
              />
            </div>

            <div className="flex border-b border-[#30363d] bg-[#0d1117]/50">
              <button
                type="button"
                onClick={() => setActiveTab('branches')}
                className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'branches'
                    ? 'border-[#f78166] text-[#e6edf3] font-semibold'
                    : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                Branches
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tags')}
                className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'tags'
                    ? 'border-[#f78166] text-[#e6edf3] font-semibold'
                    : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                Tags
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-[#21262d]">
              {activeTab === 'branches' && (
                <>
                  {filteredBranches.length === 0 ? (
                    <div className="p-3 text-center text-[#8b949e]">
                      No branches found
                    </div>
                  ) : (
                    filteredBranches.map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => handleSelect(b.name)}
                        className="w-full text-left px-3 py-2 hover:bg-[#21262d] flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {b.name === currentRef && (
                            <Octicon name="check" size={14} className="text-[#e6edf3] shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              b.name === currentRef ? 'font-semibold text-[#e6edf3]' : 'text-[#8b949e] group-hover:text-[#e6edf3]'
                            }`}
                          >
                            {b.name}
                          </span>
                        </div>
                        {b.name === 'main' || b.name === 'master' ? (
                          <span className="px-1.5 py-0.2 rounded-full border border-[#30363d] text-[10px] text-[#8b949e]">
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
                    <div className="p-3 text-center text-[#8b949e]">
                      No tags found
                    </div>
                  ) : (
                    filteredTags.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => handleSelect(t.name)}
                        className="w-full text-left px-3 py-2 hover:bg-[#21262d] flex items-center gap-2 group transition-colors cursor-pointer"
                      >
                        {t.name === currentRef && (
                          <Octicon name="check" size={14} className="text-[#e6edf3] shrink-0" />
                        )}
                        <span
                          className={`truncate ${
                            t.name === currentRef ? 'font-semibold text-[#e6edf3]' : 'text-[#8b949e] group-hover:text-[#e6edf3]'
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

      <div className="hidden sm:flex items-center gap-3 text-xs text-[#8b949e]">
        <Link
          to={`/${owner}/${repo}/branches`}
          className="flex items-center gap-1.5 hover:text-[#58a6ff]"
        >
          <Octicon name="git-branch" size={14} />
          <span className="font-semibold text-[#e6edf3]">{branchCount}</span>
          <span>{branchCount === 1 ? 'Branch' : 'Branches'}</span>
        </Link>
        <Link
          to={`/${owner}/${repo}/tags`}
          className="flex items-center gap-1.5 hover:text-[#58a6ff]"
        >
          <Octicon name="tag" size={14} />
          <span className="font-semibold text-[#e6edf3]">{tagCount}</span>
          <span>{tagCount === 1 ? 'Tag' : 'Tags'}</span>
        </Link>
      </div>
    </div>
  )
}
