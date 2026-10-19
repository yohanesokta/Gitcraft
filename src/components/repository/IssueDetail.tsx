import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSingleIssue, useIssueComments } from '../../hooks/useForgejo'
import { createIssueComment, getStoredUser, getAuthToken } from '../../lib/forgejo'
import { MarkdownViewer } from '../ui/MarkdownViewer'
import { Octicon } from '../ui/Octicon'
import { Skeleton } from '../ui/Skeleton'
import { ErrorState } from '../ui/ErrorState'

export interface IssueDetailProps {
  owner: string
  repo: string
  index: string | number
}

export function IssueDetail({ owner, repo, index }: IssueDetailProps) {
  const [commentBody, setCommentBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  const navigate = useNavigate()
  const currentUser = getStoredUser()
  const authToken = getAuthToken()
  const isLoggedIn = Boolean(currentUser && authToken)

  const {
    data: issue,
    isLoading: isIssueLoading,
    isError: isIssueError,
    error: issueError,
    refetch: refetchIssue,
  } = useSingleIssue(owner, repo, index)

  const {
    data: comments,
    isLoading: isCommentsLoading,
    refetch: refetchComments,
  } = useIssueComments(owner, repo, index)

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentBody.trim()) return
    setIsSubmitting(true)
    setCommentError(null)
    try {
      await createIssueComment(owner, repo, index, commentBody.trim())
      setCommentBody('')
      refetchComments()
      refetchIssue()
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  function formatTime(dateStr?: string) {
    if (!dateStr) return ''
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

  if (isIssueLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-48 w-full rounded-md" />
      </div>
    )
  }

  if (isIssueError || !issue) {
    return (
      <ErrorState
        title="Could not load issue"
        message={issueError instanceof Error ? issueError.message : 'Issue not found'}
        onRetry={() => refetchIssue()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 pb-4 border-b border-border-default">
        <div className="flex items-center justify-between gap-4">
          <Link
            to={`/${owner}/${repo}/issues`}
            className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-accent-fg transition-colors"
          >
            <Octicon name="arrow-left" size={12} />
            <span>Back to issues</span>
          </Link>
        </div>

        <h1 className="text-2xl font-normal text-fg-default leading-tight">
          {issue.title}{' '}
          <span className="text-fg-muted font-light">#{issue.number}</span>
        </h1>

        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white ${
              issue.state === 'open' ? 'bg-success-fg' : 'bg-done-fg'
            }`}
          >
            <Octicon
              name={issue.state === 'open' ? 'issue-opened' : 'issue-closed'}
              size={14}
            />
            <span className="capitalize">{issue.state}</span>
          </span>

          <span className="text-fg-muted">
            <Link
              to={`/${issue.user.login}`}
              className="font-semibold text-fg-default hover:text-accent-fg transition-colors"
            >
              {issue.user.login}
            </Link>{' '}
            opened this issue on {formatTime(issue.created_at)} ·{' '}
            {(comments?.length ?? 0) + (issue.body ? 1 : 0)} comments
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="border border-border-default rounded-md bg-canvas-default overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-canvas-subtle border-b border-border-default text-xs">
              <div className="flex items-center gap-2">
                <img
                  src={issue.user.avatar_url || '/default-avatar.jpg'}
                  alt={issue.user.login}
                  className="w-5 h-5 rounded-full border border-border-default object-cover"
                />
                <Link
                  to={`/${issue.user.login}`}
                  className="font-semibold text-fg-default hover:text-accent-fg transition-colors"
                >
                  {issue.user.login}
                </Link>
                <span className="text-fg-muted">commented on {formatTime(issue.created_at)}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full border border-border-default text-[10px] text-fg-muted bg-canvas-default">
                Author
              </span>
            </div>
            <div className="p-4 text-sm text-fg-default">
              {issue.body ? (
                <MarkdownViewer content={issue.body} />
              ) : (
                <p className="text-xs text-fg-muted italic">No description provided.</p>
              )}
            </div>
          </div>

          {isCommentsLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
          ) : (
            comments?.map((comment) => (
              <div
                key={comment.id}
                className="border border-border-default rounded-md bg-canvas-default overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2.5 bg-canvas-subtle border-b border-border-default text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={comment.user.avatar_url || '/default-avatar.jpg'}
                      alt={comment.user.login}
                      className="w-5 h-5 rounded-full border border-border-default object-cover"
                    />
                    <Link
                      to={`/${comment.user.login}`}
                      className="font-semibold text-fg-default hover:text-accent-fg transition-colors"
                    >
                      {comment.user.login}
                    </Link>
                    <span className="text-fg-muted">
                      commented on {formatTime(comment.created_at)}
                    </span>
                  </div>
                </div>
                <div className="p-4 text-sm text-fg-default">
                  <MarkdownViewer content={comment.body} />
                </div>
              </div>
            ))
          )}

          <div className="border border-border-default rounded-md bg-canvas-default overflow-hidden">
            <div className="px-4 py-2.5 bg-canvas-subtle border-b border-border-default text-xs font-semibold text-fg-default">
              Add a comment
            </div>
            {isLoggedIn ? (
              <form onSubmit={handleAddComment} className="p-4 space-y-3">
                {commentError && (
                  <div className="p-2.5 rounded border border-danger-fg/40 bg-danger-fg/10 text-xs text-danger-fg">
                    {commentError}
                  </div>
                )}
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Leave a comment (Markdown supported)..."
                  rows={4}
                  required
                  className="w-full px-3 py-2 text-xs bg-canvas-subtle text-fg-default placeholder-fg-muted border border-border-default rounded-md focus:outline-none focus:border-accent-fg resize-y"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !commentBody.trim()}
                    className="px-4 py-1.5 text-xs font-semibold text-white rounded-md bg-success-fg hover:opacity-90 active:scale-[0.97] disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {isSubmitting ? 'Posting...' : 'Comment'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 text-center text-xs text-fg-muted space-y-2">
                <p>Sign in to join this conversation and add comments.</p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-success-fg hover:opacity-90 active:scale-[0.97] text-white cursor-pointer transition-all"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 text-xs text-fg-muted">
          <div className="space-y-2 border-b border-border-default pb-4">
            <h4 className="font-semibold text-fg-default">Labels</h4>
            {issue.labels && issue.labels.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {issue.labels.map((label) => (
                  <span
                    key={label.id}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      backgroundColor: label.color.startsWith('#')
                        ? `${label.color}33`
                        : `#${label.color}33`,
                      color: label.color.startsWith('#') ? label.color : `#${label.color}`,
                    }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="italic">None yet</p>
            )}
          </div>

          <div className="space-y-2 border-b border-border-default pb-4">
            <h4 className="font-semibold text-fg-default">Assignees</h4>
            <p className="italic">No one assigned</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-fg-default">Notifications</h4>
            <p>You’re receiving notifications because you’re subscribed to this thread.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
