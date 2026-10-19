import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useRepositoryPulls } from '../../hooks/useForgejo'
import { Octicon } from '../ui/Octicon'
import { Skeleton } from '../ui/Skeleton'

export interface PullRequestListProps {
  owner: string
  repo: string
}

export function PullRequestList({ owner, repo }: PullRequestListProps) {
  const [filterState, setFilterState] = useState<'open' | 'closed'>('open')
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data: openPulls,
    isLoading: isOpenLoading,
  } = useRepositoryPulls(owner, repo, 'open')

  const {
    data: closedPulls,
    isLoading: isClosedLoading,
  } = useRepositoryPulls(owner, repo, 'closed')

  const currentList = filterState === 'open' ? openPulls || [] : closedPulls || []
  const isLoading = filterState === 'open' ? isOpenLoading : isClosedLoading

  const filteredPulls = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return currentList
    return currentList.filter(
      (pr) =>
        pr.title.toLowerCase().includes(q) ||
        String(pr.number).includes(q) ||
        pr.user.login.toLowerCase().includes(q)
    )
  }, [currentList, searchQuery])

  function formatTime(dateStr: string) {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-fg-muted">
            <Octicon name="search" size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all pull requests..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-canvas-default text-fg-default placeholder-fg-subtle border border-border-default rounded-md focus:outline-none focus:border-accent-fg"
          />
        </div>

        <Link
          to={`/${owner}/${repo}/pulls/new`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent-fg hover:opacity-90 text-[var(--accent-text)] border border-accent-fg shadow-xs transition-opacity cursor-pointer self-start sm:self-auto active:scale-[0.97]"
        >
          <Octicon name="git-pull-request" size={14} />
          <span>New pull request</span>
        </Link>
      </div>

      <div className="border border-border-default rounded-lg bg-canvas-default overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-canvas-subtle border-b border-border-default text-xs">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setFilterState('open')}
              className={`flex items-center gap-1.5 font-medium cursor-pointer ${
                filterState === 'open' ? 'text-fg-default font-semibold' : 'text-fg-muted hover:text-fg-default'
              }`}
            >
              <Octicon name="git-pull-request" size={14} className="text-success-fg" />
              <span>{openPulls?.length ?? 0} Open</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterState('closed')}
              className={`flex items-center gap-1.5 font-medium cursor-pointer ${
                filterState === 'closed' ? 'text-fg-default font-semibold' : 'text-fg-muted hover:text-fg-default'
              }`}
            >
              <Octicon name="check" size={14} className="text-done-fg" />
              <span>{closedPulls?.length ?? 0} Closed</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <Skeleton className="w-4 h-4 rounded-full mt-1" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPulls.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-canvas-subtle border border-border-default flex items-center justify-center text-fg-muted">
              <Octicon name="git-pull-request" size={24} />
            </div>
            <h4 className="text-base font-semibold text-fg-default">
              {filterState === 'open'
                ? 'There aren’t any open pull requests.'
                : 'There aren’t any closed pull requests.'}
            </h4>
            <p className="text-xs text-fg-muted max-w-sm mx-auto">
              Pull requests help you collaborate on code with other people. As pull requests are created by team members and contributors, they will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-default">
            {filteredPulls.map((pr) => (
              <div
                key={pr.id}
                className="flex items-start justify-between gap-3 p-4 hover:bg-canvas-hover transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {pr.merged ? (
                    <Octicon
                      name="git-merge"
                      size={16}
                      className="text-done-fg shrink-0 mt-0.5"
                    />
                  ) : pr.state === 'open' ? (
                    <Octicon
                      name="git-pull-request"
                      size={16}
                      className="text-success-fg shrink-0 mt-0.5"
                    />
                  ) : (
                    <Octicon
                      name="git-pull-request-closed"
                      size={16}
                      className="text-danger-fg shrink-0 mt-0.5"
                    />
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/${owner}/${repo}/pulls/${pr.number}`}
                        className="text-sm font-semibold text-fg-default hover:text-accent-fg"
                      >
                        {pr.title}
                      </Link>
                    </div>
                    <div className="text-xs text-fg-muted">
                      #{pr.number} opened on {formatTime(pr.created_at)} by{' '}
                      <Link
                        to={`/${pr.user.login}`}
                        className="hover:text-accent-fg hover:underline"
                      >
                        {pr.user.login}
                      </Link>
                      {pr.base?.ref && pr.head?.ref && (
                        <span> · <span className="font-mono">{pr.base.ref}</span> ← <span className="font-mono">{pr.head.ref}</span></span>
                      )}
                    </div>
                  </div>
                </div>

                {typeof pr.comments === 'number' && pr.comments > 0 && (
                  <div className="flex items-center gap-1 text-xs text-fg-muted shrink-0 mt-0.5">
                    <Octicon name="comment" size={14} />
                    <span>{pr.comments}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
