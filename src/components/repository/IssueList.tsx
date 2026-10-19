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
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-fg-muted">
            <Octicon name="search" size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all issues..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-canvas-default text-fg-default placeholder-fg-subtle border border-border-default rounded-md focus:outline-none focus:border-accent-fg"
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent-fg hover:opacity-90 text-[var(--accent-text)] border border-accent-fg shadow-xs transition-opacity cursor-pointer self-start sm:self-auto active:scale-[0.97]"
        >
          <Octicon name="issue-opened" size={14} />
          <span>New issue</span>
        </button>
      </div>

      {isNewIssueOpen && (
        <form
          onSubmit={handleCreateIssue}
          className="p-4 border border-border-default rounded-lg bg-canvas-subtle space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg-default">Create a new issue</h3>
            <button
              type="button"
              onClick={() => setIsNewIssueOpen(false)}
              className="text-fg-muted hover:text-fg-default cursor-pointer p-1 rounded"
            >
              <Octicon name="x" size={14} />
            </button>
          </div>

          {submitError && (
            <div className="p-2.5 rounded-md border border-danger-fg/40 bg-danger-fg/10 text-xs text-danger-fg">
              {submitError}
            </div>
          )}

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            required
            className="w-full px-3 py-2 text-sm bg-canvas-default text-fg-default placeholder-fg-subtle border border-border-default rounded-md focus:outline-none focus:border-accent-fg"
          />

          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Leave a comment (Markdown supported)..."
            rows={5}
            className="w-full px-3 py-2 text-xs bg-canvas-default text-fg-default placeholder-fg-subtle border border-border-default rounded-md focus:outline-none focus:border-accent-fg resize-y"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewIssueOpen(false)}
              className="px-3 py-1.5 text-xs text-fg-muted hover:text-fg-default rounded-md border border-border-default bg-canvas-default cursor-pointer active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newTitle.trim()}
              className="px-4 py-1.5 text-xs font-semibold text-[var(--accent-text)] rounded-md bg-accent-fg hover:opacity-90 disabled:opacity-50 cursor-pointer active:scale-[0.97]"
            >
              {isSubmitting ? 'Submitting...' : 'Submit new issue'}
            </button>
          </div>
        </form>
      )}

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
              <Octicon name="issue-opened" size={14} className="text-success-fg" />
              <span>{openIssues?.length ?? 0} Open</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterState('closed')}
              className={`flex items-center gap-1.5 font-medium cursor-pointer ${
                filterState === 'closed' ? 'text-fg-default font-semibold' : 'text-fg-muted hover:text-fg-default'
              }`}
            >
              <Octicon name="check" size={14} className="text-done-fg" />
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
            <div className="w-12 h-12 mx-auto rounded-full bg-canvas-subtle border border-border-default flex items-center justify-center text-fg-muted">
              <Octicon name="issue-opened" size={24} />
            </div>
            <h4 className="text-base font-semibold text-fg-default">
              {filterState === 'open' ? 'There aren’t any open issues.' : 'There aren’t any closed issues.'}
            </h4>
            <p className="text-xs text-fg-muted max-w-sm mx-auto">
              Issues are used to track todos, bugs, feature requests, and more.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-default">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start justify-between gap-3 p-4 hover:bg-canvas-hover transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {issue.state === 'open' ? (
                    <Octicon
                      name="issue-opened"
                      size={16}
                      className="text-success-fg shrink-0 mt-0.5"
                    />
                  ) : (
                    <Octicon
                      name="issue-closed"
                      size={16}
                      className="text-done-fg shrink-0 mt-0.5"
                    />
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/${owner}/${repo}/issues/${issue.number}`}
                        className="text-sm font-semibold text-fg-default hover:text-accent-fg"
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
                    <div className="text-xs text-fg-muted">
                      #{issue.number} opened on {formatTime(issue.created_at)} by{' '}
                      <Link
                        to={`/${issue.user.login}`}
                        className="hover:text-accent-fg hover:underline"
                      >
                        {issue.user.login}
                      </Link>
                    </div>
                  </div>
                </div>

                {issue.comments > 0 && (
                  <div className="flex items-center gap-1 text-xs text-fg-muted shrink-0 mt-0.5">
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
