import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSinglePull, useIssueComments } from '../../hooks/useForgejo'
import { createIssueComment, getStoredUser, getAuthToken } from '../../lib/forgejo'
import { MarkdownViewer } from '../ui/MarkdownViewer'
import { Octicon } from '../ui/Octicon'
import { Skeleton } from '../ui/Skeleton'
import { ErrorState } from '../ui/ErrorState'

export interface PullRequestDetailProps {
  owner: string
  repo: string
  index: string | number
}

export function PullRequestDetail({ owner, repo, index }: PullRequestDetailProps) {
  const [commentBody, setCommentBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  const navigate = useNavigate()
  const currentUser = getStoredUser()
  const authToken = getAuthToken()
  const isLoggedIn = Boolean(currentUser && authToken)

  const {
    data: pr,
    isLoading: isPrLoading,
    isError: isPrError,
    error: prError,
    refetch: refetchPr,
  } = useSinglePull(owner, repo, index)

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
      refetchPr()
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

  if (isPrLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-48 w-full rounded-md" />
      </div>
    )
  }

  if (isPrError || !pr) {
    return (
      <ErrorState
        title="Could not load pull request"
        message={prError instanceof Error ? prError.message : 'Pull request not found'}
        onRetry={() => refetchPr()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 pb-4 border-b border-[#21262d]">
        <div className="flex items-center justify-between gap-4">
          <Link
            to={`/${owner}/${repo}/pulls`}
            className="inline-flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-[#58a6ff]"
          >
            <Octicon name="arrow-left" size={12} />
            <span>Back to pull requests</span>
          </Link>
        </div>

        <h1 className="text-2xl font-normal text-[#e6edf3] leading-tight">
          {pr.title}{' '}
          <span className="text-[#8b949e] font-light">#{pr.number}</span>
        </h1>

        <div className="flex items-center gap-3 text-xs flex-wrap">
          {pr.merged ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-[#8957e5]">
              <Octicon name="git-merge" size={14} />
              <span>Merged</span>
            </span>
          ) : pr.state === 'open' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-[#238636]">
              <Octicon name="git-pull-request" size={14} />
              <span>Open</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-[#cf222e]">
              <Octicon name="git-pull-request-closed" size={14} />
              <span>Closed</span>
            </span>
          )}

          <span className="text-[#8b949e]">
            <Link
              to={`/${pr.user.login}`}
              className="font-semibold text-[#e6edf3] hover:text-[#58a6ff]"
            >
              {pr.user.login}
            </Link>{' '}
            wants to merge commits into{' '}
            <span className="font-mono text-[#e6edf3] bg-[#21262d] px-1.5 py-0.5 rounded">
              {pr.base?.ref || 'main'}
            </span>{' '}
            from{' '}
            <span className="font-mono text-[#e6edf3] bg-[#21262d] px-1.5 py-0.5 rounded">
              {pr.head?.ref || 'branch'}
            </span>{' '}
            · {formatTime(pr.created_at)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] text-xs">
              <div className="flex items-center gap-2">
                <img
                  src={pr.user.avatar_url || '/default-avatar.jpg'}
                  alt={pr.user.login}
                  className="w-5 h-5 rounded-full border border-[#30363d] object-cover"
                />
                <Link
                  to={`/${pr.user.login}`}
                  className="font-semibold text-[#e6edf3] hover:text-[#58a6ff]"
                >
                  {pr.user.login}
                </Link>
                <span className="text-[#8b949e]">commented on {formatTime(pr.created_at)}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full border border-[#30363d] text-[10px] text-[#8b949e]">
                Author
              </span>
            </div>
            <div className="p-4 text-sm text-[#e6edf3]">
              {pr.body ? (
                <MarkdownViewer content={pr.body} />
              ) : (
                <p className="text-xs text-[#8b949e] italic">No description provided.</p>
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
                className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={comment.user.avatar_url || '/default-avatar.jpg'}
                      alt={comment.user.login}
                      className="w-5 h-5 rounded-full border border-[#30363d] object-cover"
                    />
                    <Link
                      to={`/${comment.user.login}`}
                      className="font-semibold text-[#e6edf3] hover:text-[#58a6ff]"
                    >
                      {comment.user.login}
                    </Link>
                    <span className="text-[#8b949e]">
                      commented on {formatTime(comment.created_at)}
                    </span>
                  </div>
                </div>
                <div className="p-4 text-sm text-[#e6edf3]">
                  <MarkdownViewer content={comment.body} />
                </div>
              </div>
            ))
          )}

          <div className="p-4 border border-[#30363d] rounded-md bg-[#161b22] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                  pr.merged
                    ? 'bg-[#8957e5]'
                    : pr.state === 'open'
                    ? 'bg-[#238636]'
                    : 'bg-[#cf222e]'
                }`}
              >
                <Octicon
                  name={
                    pr.merged
                      ? 'git-merge'
                      : pr.state === 'open'
                      ? 'git-pull-request'
                      : 'git-pull-request-closed'
                  }
                  size={16}
                />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-[#e6edf3] block">
                  {pr.merged
                    ? 'Pull request successfully merged'
                    : pr.state === 'open'
                    ? 'This branch has no conflicts with the base branch'
                    : 'This pull request is closed'}
                </span>
                <span className="text-[#8b949e]">
                  {pr.merged
                    ? `Merged into ${pr.base?.ref} on ${formatTime(pr.merged_at || pr.updated_at)}`
                    : pr.state === 'open'
                    ? `Merging into ${pr.base?.ref} from ${pr.head?.ref}`
                    : 'Changes were not merged into the base branch'}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] text-xs font-semibold text-[#e6edf3]">
              Add a comment
            </div>
            {isLoggedIn ? (
              <form onSubmit={handleAddComment} className="p-4 space-y-3">
                {commentError && (
                  <div className="p-2.5 rounded border border-[#f85149]/40 bg-[#f85149]/10 text-xs text-[#f85149]">
                    {commentError}
                  </div>
                )}
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Leave a comment (Markdown supported)..."
                  rows={4}
                  required
                  className="w-full px-3 py-2 text-xs bg-[#161b22] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] resize-y"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !commentBody.trim()}
                    className="px-4 py-1.5 text-xs font-semibold text-white rounded-md bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Posting...' : 'Comment'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 text-center text-xs text-[#8b949e] space-y-2">
                <p>Sign in to join this conversation and add comments.</p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 text-xs text-[#8b949e]">
          <div className="space-y-2 border-b border-[#21262d] pb-4">
            <h4 className="font-semibold text-[#e6edf3]">Reviewers</h4>
            <p className="italic">No reviews requested</p>
          </div>

          <div className="space-y-2 border-b border-[#21262d] pb-4">
            <h4 className="font-semibold text-[#e6edf3]">Assignees</h4>
            <p className="italic">No one assigned</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-[#e6edf3]">Branches</h4>
            <div className="space-y-1 font-mono text-[11px]">
              <div>Base: <span className="text-[#e6edf3]">{pr.base?.ref}</span></div>
              <div>Head: <span className="text-[#e6edf3]">{pr.head?.ref}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
