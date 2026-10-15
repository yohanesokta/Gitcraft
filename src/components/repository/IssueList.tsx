import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRepositoryIssues } from '../../hooks/useForgejo'
import { createIssue, getStoredUser, getAuthToken } from '../../lib/forgejo'
import { Octicon } from '../ui/Octicon'
import { Skeleton } from '../ui/Skeleton'

export interface IssueListProps {
  owner: string
  repo: string
}

export function IssueList({ owner, repo }: IssueListProps) {
  const [filterState, setFilterState] = useState<'open' | 'closed'>('open')
  const [searchQuery, setSearchQuery] = useState('')
  const [isNewIssueOpen, setIsNewIssueOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const navigate = useNavigate()
  const currentUser = getStoredUser()
  const authToken = getAuthToken()
  const isLoggedIn = Boolean(currentUser && authToken)

  const {
    data: openIssues,
    isLoading: isOpenLoading,
    refetch: refetchOpen,
  } = useRepositoryIssues(owner, repo, 'open')

  const {
    data: closedIssues,
    isLoading: isClosedLoading,
  } = useRepositoryIssues(owner, repo, 'closed')

  const currentList = filterState === 'open' ? openIssues || [] : closedIssues || []
  const isLoading = filterState === 'open' ? isOpenLoading : isClosedLoading

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return currentList
    return currentList.filter(
      (issue) =>
        issue.title.toLowerCase().includes(q) ||
        String(issue.number).includes(q) ||
        issue.user.login.toLowerCase().includes(q)
    )
  }, [currentList, searchQuery])

  async function handleCreateIssue(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const created = await createIssue(owner, repo, newTitle.trim(), newBody)
      setIsNewIssueOpen(false)
      setNewTitle('')
      setNewBody('')
      refetchOpen()
      navigate(`/${owner}/${repo}/issues/${created.number}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create issue')
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <span className="absolute left-3 top-2.5 text-[#8b949e]">
            <Octicon name="search" size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all issues..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#161b22] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff]"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            if (isLoggedIn) {
              setIsNewIssueOpen(true)
            } else {
              navigate('/login')
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white border border-[#2ea043] shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Octicon name="issue-opened" size={14} />
          <span>New issue</span>
        </button>
      </div>

      {isNewIssueOpen && (
        <form
          onSubmit={handleCreateIssue}
          className="p-4 border border-[#30363d] rounded-md bg-[#161b22] space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#e6edf3]">Create a new issue</h3>
            <button
              type="button"
              onClick={() => setIsNewIssueOpen(false)}
              className="text-[#8b949e] hover:text-[#e6edf3] cursor-pointer"
            >
              <Octicon name="x" size={14} />
            </button>
          </div>

          {submitError && (
            <div className="p-2.5 rounded border border-[#f85149]/40 bg-[#f85149]/10 text-xs text-[#f85149]">
              {submitError}
            </div>
          )}

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            required
            className="w-full px-3 py-2 text-sm bg-[#0d1117] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff]"
          />

          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Leave a comment (Markdown supported)..."
            rows={5}
            className="w-full px-3 py-2 text-xs bg-[#0d1117] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] resize-y"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewIssueOpen(false)}
              className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] rounded-md border border-[#30363d] bg-[#21262d] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newTitle.trim()}
              className="px-4 py-1.5 text-xs font-semibold text-white rounded-md bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Submitting...' : 'Submit new issue'}
            </button>
          </div>
        </form>
      )}

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
              <Octicon name="issue-opened" size={14} className="text-[#3fb950]" />
              <span>{openIssues?.length ?? 0} Open</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterState('closed')}
              className={`flex items-center gap-1.5 font-medium cursor-pointer ${
                filterState === 'closed' ? 'text-[#e6edf3]' : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              <Octicon name="check" size={14} className="text-[#a371f7]" />
              <span>{closedIssues?.length ?? 0} Closed</span>
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
        ) : filteredIssues.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[#8b949e]">
              <Octicon name="issue-opened" size={24} />
            </div>
            <h4 className="text-base font-semibold text-[#e6edf3]">
              {filterState === 'open' ? 'There aren’t any open issues.' : 'There aren’t any closed issues.'}
            </h4>
            <p className="text-xs text-[#8b949e] max-w-sm mx-auto">
              Issues are used to track todos, bugs, feature requests, and more.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#21262d]">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start justify-between gap-3 p-4 hover:bg-[#161b22]/50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {issue.state === 'open' ? (
                    <Octicon
                      name="issue-opened"
                      size={16}
                      className="text-[#3fb950] shrink-0 mt-0.5"
                    />
                  ) : (
                    <Octicon
                      name="issue-closed"
                      size={16}
                      className="text-[#a371f7] shrink-0 mt-0.5"
                    />
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/${owner}/${repo}/issues/${issue.number}`}
                        className="text-sm font-semibold text-[#e6edf3] hover:text-[#58a6ff]"
                      >
                        {issue.title}
                      </Link>
                      {issue.labels?.map((label) => (
                        <span
                          key={label.id}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-transparent"
                          style={{
                            backgroundColor: label.color.startsWith('#')
                              ? `${label.color}33`
                              : `#${label.color}33`,
                            color: label.color.startsWith('#') ? label.color : `#${label.color}`,
                            borderColor: label.color.startsWith('#')
                              ? `${label.color}66`
                              : `#${label.color}66`,
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-[#8b949e]">
                      #{issue.number} opened on {formatTime(issue.created_at)} by{' '}
                      <Link
                        to={`/${issue.user.login}`}
                        className="hover:text-[#58a6ff] hover:underline"
                      >
                        {issue.user.login}
                      </Link>
                    </div>
                  </div>
                </div>

                {issue.comments > 0 && (
                  <div className="flex items-center gap-1 text-xs text-[#8b949e] shrink-0 mt-0.5">
                    <Octicon name="comment" size={14} />
                    <span>{issue.comments}</span>
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
