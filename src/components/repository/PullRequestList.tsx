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
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8b949e]">
            <Octicon name="search" size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all pull requests..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#161b22] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff]"
          />
        </div>

        <Link
          to={`/${owner}/${repo}/pulls/new`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white border border-[#2ea043] shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Octicon name="git-pull-request" size={14} />
          <span>New pull request</span>
        </Link>
      </div>

      <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d] text-xs">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setFilterState('open')}
              className={`flex items-center gap-1.5 font-medium cursor-pointer ${
                filterState === 'open' ? 'text-[#e6edf3]' : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              <Octicon name="git-pull-request" size={14} className="text-[#3fb950]" />
              <span>{openPulls?.length ?? 0} Open</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterState('closed')}
              className={`flex items-center gap-1.5 font-medium cursor-pointer ${
                filterState === 'closed' ? 'text-[#e6edf3]' : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              <Octicon name="check" size={14} className="text-[#a371f7]" />
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
            <div className="w-12 h-12 mx-auto rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[#8b949e]">
              <Octicon name="git-pull-request" size={24} />
            </div>
            <h4 className="text-base font-semibold text-[#e6edf3]">
              {filterState === 'open'
                ? 'There aren’t any open pull requests.'
                : 'There aren’t any closed pull requests.'}
            </h4>
            <p className="text-xs text-[#8b949e] max-w-sm mx-auto">
              Pull requests help you collaborate on code with other people. As pull requests are created by team members and contributors, they will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#21262d]">
            {filteredPulls.map((pr) => (
              <div
                key={pr.id}
                className="flex items-start justify-between gap-3 p-4 hover:bg-[#161b22]/50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {pr.merged ? (
                    <Octicon
                      name="git-merge"
                      size={16}
                      className="text-[#a371f7] shrink-0 mt-0.5"
                    />
                  ) : pr.state === 'open' ? (
                    <Octicon
                      name="git-pull-request"
                      size={16}
                      className="text-[#3fb950] shrink-0 mt-0.5"
                    />
                  ) : (
                    <Octicon
                      name="git-pull-request-closed"
                      size={16}
                      className="text-[#f85149] shrink-0 mt-0.5"
                    />
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/${owner}/${repo}/pulls/${pr.number}`}
                        className="text-sm font-semibold text-[#e6edf3] hover:text-[#58a6ff]"
                      >
                        {pr.title}
                      </Link>
                    </div>
                    <div className="text-xs text-[#8b949e]">
                      #{pr.number} opened on {formatTime(pr.created_at)} by{' '}
                      <Link
                        to={`/${pr.user.login}`}
                        className="hover:text-[#58a6ff] hover:underline"
                      >
                        {pr.user.login}
                      </Link>
                      {pr.base?.ref && pr.head?.ref && (
                        <span> · {pr.base.ref} ← {pr.head.ref}</span>
                      )}
                    </div>
                  </div>
                </div>

                {typeof pr.comments === 'number' && pr.comments > 0 && (
                  <div className="flex items-center gap-1 text-xs text-[#8b949e] shrink-0 mt-0.5">
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
