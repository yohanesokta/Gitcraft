import { useState, useMemo } from 'react'
import { ForgejoRepository } from '../../types/forgejo'
import { Octicon } from '../ui/Octicon'

export interface CustomizePinsModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
  repositories: ForgejoRepository[]
  initialPinned: string[]
  onSave: (pins: string[]) => void
}

export function CustomizePinsModal({
  isOpen,
  onClose,
  repositories,
  initialPinned,
  onSave,
}: CustomizePinsModalProps) {
  const [selected, setSelected] = useState<string[]>(initialPinned)
  const [filterQuery, setFilterQuery] = useState('')

  const filteredRepos = useMemo(() => {
    if (!filterQuery.trim()) return repositories
    const q = filterQuery.toLowerCase()
    return repositories.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    )
  }, [repositories, filterQuery])

  if (!isOpen) return null

  function togglePin(repoName: string) {
    if (selected.includes(repoName)) {
      setSelected(selected.filter((item) => item !== repoName))
    } else {
      if (selected.length >= 6) return
      setSelected([...selected, repoName])
    }
  }

  function handleSave() {
    onSave(selected)
    onClose()
  }

  const remaining = 6 - selected.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-canvas-raised border border-border-default rounded-lg shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-canvas-subtle">
          <div>
            <h2 className="text-sm font-semibold text-fg-default">Edit pinned items</h2>
            <p className="text-xs text-fg-muted">
              Select up to 6 repositories you would like to pin to your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg-default p-1 rounded-md hover:bg-canvas-hover active:scale-[0.97] transition-all cursor-pointer"
          >
            <Octicon name="x" size={16} />
          </button>
        </div>

        <div className="p-4 border-b border-border-default flex items-center justify-between gap-3 bg-canvas-default">
          <div className="relative flex-1">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter repositories"
              className="w-full px-3 py-1.5 text-xs bg-canvas-subtle text-fg-default placeholder-fg-muted border border-border-default rounded-md focus:outline-none focus:border-accent-fg h-8"
            />
          </div>
          <span className="text-xs text-fg-muted whitespace-nowrap font-medium">
            {remaining} of 6 remaining
          </span>
        </div>

        <div className="p-2 overflow-y-auto flex-1 divide-y divide-border-default space-y-1">
          {filteredRepos.length === 0 ? (
            <div className="p-6 text-center text-xs text-fg-muted">
              No repositories match your filter.
            </div>
          ) : (
            filteredRepos.map((repo) => {
              const isChecked = selected.includes(repo.name)
              const isDisabled = !isChecked && selected.length >= 6

              return (
                <label
                  key={repo.id}
                  className={`flex items-start gap-3 p-2.5 rounded-md transition-colors cursor-pointer ${
                    isChecked ? 'bg-accent-subtle/50' : 'hover:bg-canvas-hover'
                  } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => togglePin(repo.name)}
                    className="mt-0.5 rounded border-border-default text-success-fg focus:ring-0 bg-canvas-default cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-accent-fg truncate">
                        {repo.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full border border-border-default text-[10px] text-fg-muted">
                        {repo.private ? 'Private' : 'Public'}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="text-[11px] text-fg-muted truncate mt-0.5">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-fg-muted mt-1.5">
                      {repo.language && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-accent-fg" />
                          <span>{repo.language}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Octicon name="star" size={11} />
                        <span>{repo.stars_count}</span>
                      </div>
                    </div>
                  </div>
                </label>
              )
            })
          )}
        </div>

        <div className="p-3 border-t border-border-default bg-canvas-subtle flex items-center justify-between">
          <span className="text-xs text-fg-muted">
            {selected.length} pinned
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-border-default bg-canvas-raised hover:bg-canvas-hover active:scale-[0.97] text-fg-default text-xs font-medium transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 rounded-md bg-success-fg hover:opacity-90 active:scale-[0.97] text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Save pins
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
