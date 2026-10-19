import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  useSinglePull,
  useIssueComments,
  usePullRequestCommits,
  usePullRequestFiles,
  usePullRequestDiff,
} from '../../hooks/useForgejo'
import {
  createIssueComment,
  mergePullRequest,
  getStoredUser,
  getAuthToken,
} from '../../lib/forgejo'
import type { MergeStyle } from '../../types/forgejo'
import { MarkdownViewer } from '../ui/MarkdownViewer'
import { Octicon } from '../ui/Octicon'
import { Skeleton } from '../ui/Skeleton'
import { ErrorState } from '../ui/ErrorState'

export interface PullRequestDetailProps {
  owner: string
  repo: string
  index: string | number
}

interface DiffLine {
  type: 'add' | 'delete' | 'context' | 'header'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

interface ParsedHunk {
  header: string
  lines: DiffLine[]
}

interface ParsedDiffFile {
  oldPath: string
  newPath: string
  hunks: ParsedHunk[]
  additions: number
  deletions: number
}

function parseUnifiedDiff(diffText: string): ParsedDiffFile[] {
  if (!diffText || !diffText.trim()) return []

  const lines = diffText.split('\n')
  const files: ParsedDiffFile[] = []

  let currentFile: ParsedDiffFile | null = null
  let currentHunk: ParsedHunk | null = null
  let oldLine = 0
  let newLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('diff --git ')) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk)
        currentHunk = null
      }
      if (currentFile) {
        files.push(currentFile)
      }

      const match = line.match(/^diff --git a\/(.+) b\/(.+)$/)
      const oldPath = match ? match[1] : ''
      const newPath = match ? match[2] : ''

      currentFile = {
        oldPath,
        newPath: newPath || oldPath,
        hunks: [],
        additions: 0,
        deletions: 0,
      }
      continue
    }

    if (!currentFile) {
      if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
        const filePath = line.slice(6)
        currentFile = {
          oldPath: filePath,
          newPath: filePath,
          hunks: [],
          additions: 0,
          deletions: 0,
        }
      } else {
        continue
      }
    }

    if (line.startsWith('@@ ')) {
      if (currentHunk) {
        currentFile.hunks.push(currentHunk)
      }
      currentHunk = {
        header: line,
        lines: [],
      }

      const hunkMatch = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (hunkMatch) {
        oldLine = parseInt(hunkMatch[1], 10)
        newLine = parseInt(hunkMatch[2], 10)
      }
      continue
    }

    if (!currentHunk) {
      if (line.startsWith('--- a/')) {
        currentFile.oldPath = line.slice(6)
      } else if (line.startsWith('+++ b/')) {
        currentFile.newPath = line.slice(6)
      }
      continue
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      currentFile.additions++
      currentHunk.lines.push({
        type: 'add',
        content: line.slice(1),
        newLineNumber: newLine++,
      })
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      currentFile.deletions++
      currentHunk.lines.push({
        type: 'delete',
        content: line.slice(1),
        oldLineNumber: oldLine++,
      })
    } else if (line.startsWith('\\ No newline at end of file')) {
      currentHunk.lines.push({
        type: 'header',
        content: line,
      })
    } else {
      const text = line.startsWith(' ') ? line.slice(1) : line
      currentHunk.lines.push({
        type: 'context',
        content: text,
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
      })
    }
  }

  if (currentHunk && currentFile) {
    currentFile.hunks.push(currentHunk)
  }
  if (currentFile) {
    files.push(currentFile)
  }

  return files
}

interface MergeStrategyOption {
  id: MergeStyle
  title: string
  actionLabel: string
  confirmLabel: string
  description: string
  getDefaultTitle: (num: number, title: string, head?: string) => string
  getDefaultMessage: (body?: string) => string
}

const MERGE_STRATEGIES: MergeStrategyOption[] = [
  {
    id: 'merge',
    title: 'Create a merge commit',
    actionLabel: 'Merge pull request',
    confirmLabel: 'Confirm merge',
    description: 'All commits from this branch will be added to the base branch via a merge commit.',
    getDefaultTitle: (num, _, head) => `Merge pull request #${num} from ${head || 'branch'}`,
    getDefaultMessage: () => '',
  },
  {
    id: 'squash',
    title: 'Squash and merge',
    actionLabel: 'Squash and merge',
    confirmLabel: 'Confirm squash and merge',
    description: 'The commits from this branch will be combined into one commit in the base branch.',
    getDefaultTitle: (num, title) => `${title} (#${num})`,
    getDefaultMessage: (body) => body || '',
  },
  {
    id: 'rebase',
    title: 'Rebase and merge',
    actionLabel: 'Rebase and merge',
    confirmLabel: 'Confirm rebase and merge',
    description: 'The commits from this branch will be rebased and added to the base branch.',
    getDefaultTitle: (_, title) => title,
    getDefaultMessage: () => '',
  },
]

export function PullRequestDetail({ owner, repo, index }: PullRequestDetailProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: 'conversation' | 'commits' | 'files' =
    rawTab === 'commits' || rawTab === 'files' ? rawTab : 'conversation'

  const [commentBody, setCommentBody] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  const [mergeStyle, setMergeStyle] = useState<MergeStyle>('merge')
  const [isMergeDropdownOpen, setIsMergeDropdownOpen] = useState(false)
  const [isMergeConfirmOpen, setIsMergeConfirmOpen] = useState(false)
  const [mergeTitle, setMergeTitle] = useState('')
  const [mergeMessage, setMergeMessage] = useState('')
  const [deleteBranch, setDeleteBranch] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({})
  const mergeDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mergeDropdownRef.current && !mergeDropdownRef.current.contains(event.target as Node)) {
        setIsMergeDropdownOpen(false)
      }
    }
    if (isMergeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMergeDropdownOpen])

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

  const {
    data: commits,
    isLoading: isCommitsLoading,
    isError: isCommitsError,
    refetch: refetchCommits,
  } = usePullRequestCommits(owner, repo, index)

  const {
    data: files,
    isLoading: isFilesLoading,
    refetch: refetchFiles,
  } = usePullRequestFiles(owner, repo, index)

  const {
    data: diffData,
    isLoading: isDiffLoading,
  } = usePullRequestDiff(owner, repo, index)

  const parsedDiffFiles = useMemo(() => {
    return parseUnifiedDiff(diffData || '')
  }, [diffData])

  const selectedStrategy = useMemo(() => {
    return MERGE_STRATEGIES.find((s) => s.id === mergeStyle) || MERGE_STRATEGIES[0]
  }, [mergeStyle])

  const totalAdditions = useMemo(() => {
    if (files && files.length > 0) {
      return files.reduce((acc, f) => acc + (f.additions || 0), 0)
    }
    return parsedDiffFiles.reduce((acc, f) => acc + f.additions, 0)
  }, [files, parsedDiffFiles])

  const totalDeletions = useMemo(() => {
    if (files && files.length > 0) {
      return files.reduce((acc, f) => acc + (f.deletions || 0), 0)
    }
    return parsedDiffFiles.reduce((acc, f) => acc + f.deletions, 0)
  }, [files, parsedDiffFiles])

  const totalFilesCount = useMemo(() => {
    if (files && files.length > 0) return files.length
    return parsedDiffFiles.length
  }, [files, parsedDiffFiles])

  function handleSelectTab(tab: 'conversation' | 'commits' | 'files') {
    const nextParams = new URLSearchParams(searchParams)
    if (tab === 'conversation') {
      nextParams.delete('tab')
    } else {
      nextParams.set('tab', tab)
    }
    setSearchParams(nextParams, { replace: true })
  }

  function handleSelectStrategy(style: MergeStyle) {
    setMergeStyle(style)
    setIsMergeDropdownOpen(false)
    if (pr) {
      const strat = MERGE_STRATEGIES.find((s) => s.id === style) || MERGE_STRATEGIES[0]
      setMergeTitle(strat.getDefaultTitle(pr.number, pr.title, pr.head?.ref))
      setMergeMessage(strat.getDefaultMessage(pr.body))
    }
    setMergeError(null)
    setIsMergeConfirmOpen(true)
  }

  function handleOpenMergeConfirm() {
    if (!pr) return
    setIsMergeDropdownOpen(false)
    const strat = selectedStrategy
    setMergeTitle(strat.getDefaultTitle(pr.number, pr.title, pr.head?.ref))
    setMergeMessage(strat.getDefaultMessage(pr.body))
    setMergeError(null)
    setIsMergeConfirmOpen(true)
  }

  async function handleConfirmMerge(e: React.FormEvent) {
    e.preventDefault()
    if (!pr) return
    setIsMerging(true)
    setMergeError(null)
    try {
      await mergePullRequest(owner, repo, index, {
        Do: mergeStyle,
        MergeTitleField: mergeTitle.trim() || undefined,
        MergeMessageField: mergeMessage.trim() || undefined,
        delete_branch_after_merge: deleteBranch,
      })
      setIsMergeConfirmOpen(false)
      refetchPr()
      refetchComments()
      refetchCommits()
      refetchFiles()
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Failed to merge pull request')
    } finally {
      setIsMerging(false)
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentBody.trim()) return
    setIsSubmittingComment(true)
    setCommentError(null)
    try {
      await createIssueComment(owner, repo, index, commentBody.trim())
      setCommentBody('')
      refetchComments()
      refetchPr()
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  function toggleFileCollapse(path: string) {
    setCollapsedFiles((prev) => ({
      ...prev,
      [path]: !prev[path],
    }))
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
      <div className="space-y-3 pb-4 border-b border-border-default">
        <div className="flex items-center justify-between gap-4">
          <Link
            to={`/${owner}/${repo}/pulls`}
            className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-accent-fg transition-colors"
          >
            <Octicon name="arrow-left" size={12} />
            <span>Back to pull requests</span>
          </Link>
        </div>

        <h1 className="text-2xl font-normal text-fg-default leading-tight">
          {pr.title}{' '}
          <span className="text-fg-muted font-light">#{pr.number}</span>
        </h1>

        <div className="flex items-center gap-3 text-xs flex-wrap">
          {pr.merged ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-done-fg">
              <Octicon name="git-merge" size={14} />
              <span>Merged</span>
            </span>
          ) : pr.state === 'open' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-success-fg">
              <Octicon name="git-pull-request" size={14} />
              <span>Open</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-danger-fg">
              <Octicon name="git-pull-request-closed" size={14} />
              <span>Closed</span>
            </span>
          )}

          <span className="text-fg-muted">
            <Link
              to={`/${pr.user.login}`}
              className="font-semibold text-fg-default hover:text-accent-fg transition-colors"
            >
              {pr.user.login}
            </Link>{' '}
            wants to merge {commits?.length || 1} commit{(commits?.length || 1) !== 1 ? 's' : ''} into{' '}
            <span className="font-mono text-fg-default bg-canvas-subtle border border-border-default px-1.5 py-0.5 rounded">
              {pr.base?.ref || 'main'}
            </span>{' '}
            from{' '}
            <span className="font-mono text-fg-default bg-canvas-subtle border border-border-default px-1.5 py-0.5 rounded">
              {pr.head?.ref || 'branch'}
            </span>{' '}
            · {formatTime(pr.created_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border-default overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => handleSelectTab('conversation')}
          className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'conversation'
              ? 'border-accent-fg text-fg-default font-semibold'
              : 'border-transparent text-fg-muted hover:text-fg-default'
          }`}
        >
          <Octicon name="comment" size={14} />
          <span>Conversation</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-canvas-subtle border border-border-default text-fg-muted">
            {(comments?.length || 0) + 1}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('commits')}
          className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'commits'
              ? 'border-accent-fg text-fg-default font-semibold'
              : 'border-transparent text-fg-muted hover:text-fg-default'
          }`}
        >
          <Octicon name="git-commit" size={14} />
          <span>Commits</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-canvas-subtle border border-border-default text-fg-muted">
            {commits?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('files')}
          className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'files'
              ? 'border-accent-fg text-fg-default font-semibold'
              : 'border-transparent text-fg-muted hover:text-fg-default'
          }`}
        >
          <Octicon name="file" size={14} />
          <span>Files changed</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-canvas-subtle border border-border-default text-fg-muted">
            {totalFilesCount}
          </span>
        </button>
      </div>

      {activeTab === 'conversation' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="border border-border-default rounded-md bg-canvas-default overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-canvas-subtle border-b border-border-default text-xs">
                <div className="flex items-center gap-2">
                  <img
                    src={pr.user.avatar_url || '/default-avatar.jpg'}
                    alt={pr.user.login}
                    className="w-5 h-5 rounded-full border border-border-default object-cover"
                  />
                  <Link
                    to={`/${pr.user.login}`}
                    className="font-semibold text-fg-default hover:text-accent-fg transition-colors"
                  >
                    {pr.user.login}
                  </Link>
                  <span className="text-fg-muted">commented on {formatTime(pr.created_at)}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full border border-border-default text-[10px] text-fg-muted bg-canvas-default">
                  Author
                </span>
              </div>
              <div className="p-4 text-sm text-fg-default">
                {pr.body ? (
                  <MarkdownViewer content={pr.body} />
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

            {pr.merged ? (
              <div className="p-4 border border-done-fg/40 rounded-md bg-done-fg/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-done-fg shrink-0 mt-0.5">
                  <Octicon name="git-merge" size={16} />
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-fg-default block">
                    Pull request successfully merged and closed
                  </span>
                  <span className="text-fg-muted block">
                    {pr.merged_by?.login ? `${pr.merged_by.login} merged` : 'Merged'} into{' '}
                    <span className="font-mono text-fg-default bg-canvas-subtle border border-border-default px-1 py-0.5 rounded">
                      {pr.base?.ref}
                    </span>{' '}
                    on {formatTime(pr.merged_at || pr.updated_at)}
                  </span>
                </div>
              </div>
            ) : pr.state === 'closed' ? (
              <div className="p-4 border border-danger-fg/40 rounded-md bg-danger-fg/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-danger-fg shrink-0 mt-0.5">
                  <Octicon name="git-pull-request-closed" size={16} />
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-fg-default block">
                    This pull request is closed
                  </span>
                  <span className="text-fg-muted block">
                    Changes were not merged into{' '}
                    <span className="font-mono text-fg-default bg-canvas-subtle border border-border-default px-1 py-0.5 rounded">
                      {pr.base?.ref}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="border border-border-default rounded-md bg-canvas-subtle relative z-20">
                <div className="p-4 flex items-start gap-3 border-b border-border-default rounded-t-md">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5 ${
                      pr.mergeable === false ? 'bg-danger-fg' : 'bg-success-fg'
                    }`}
                  >
                    <Octicon name={pr.mergeable === false ? 'x' : 'check'} size={16} />
                  </div>
                  <div className="text-xs space-y-1 flex-1">
                    <span className="font-semibold text-fg-default block">
                      {pr.mergeable === false
                        ? 'This branch has conflicts that must be resolved'
                        : 'This branch has no conflicts with the base branch'}
                    </span>
                    <span className="text-fg-muted block">
                      {pr.mergeable === false
                        ? 'Conflicting files must be resolved before this pull request can be merged.'
                        : 'Merging can be performed automatically.'}
                    </span>
                  </div>
                </div>

                {mergeError && (
                  <div className="p-3 mx-4 mt-4 bg-danger-fg/10 border border-danger-fg/40 rounded text-xs text-danger-fg">
                    {mergeError}
                  </div>
                )}

                <div className="p-4">
                  {!isLoggedIn ? (
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className="text-fg-muted">Sign in to merge this pull request.</span>
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-success-fg hover:opacity-90 active:scale-[0.97] text-white cursor-pointer transition-all"
                      >
                        Sign in
                      </button>
                    </div>
                  ) : isMergeConfirmOpen ? (
                    <form onSubmit={handleConfirmMerge} className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-fg-muted">
                          Commit title
                        </label>
                        <input
                          type="text"
                          value={mergeTitle}
                          onChange={(e) => setMergeTitle(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-canvas-default text-fg-default border border-border-default rounded-md focus:outline-none focus:border-accent-fg"
                          placeholder="Commit title"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-fg-muted">
                          Commit description (optional)
                        </label>
                        <textarea
                          value={mergeMessage}
                          onChange={(e) => setMergeMessage(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-1.5 text-xs bg-canvas-default text-fg-default border border-border-default rounded-md focus:outline-none focus:border-accent-fg resize-y"
                          placeholder="Commit description"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="delete-branch"
                          checked={deleteBranch}
                          onChange={(e) => setDeleteBranch(e.target.checked)}
                          className="rounded border-border-default bg-canvas-default text-success-fg focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="delete-branch" className="text-xs text-fg-muted cursor-pointer">
                          Delete branch <span className="font-mono text-fg-default">{pr.head?.ref}</span> after merging
                        </label>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={isMerging}
                          className="px-4 py-1.5 text-xs font-semibold text-white rounded-md bg-success-fg hover:opacity-90 active:scale-[0.97] disabled:opacity-50 cursor-pointer transition-all"
                        >
                          {isMerging ? 'Merging...' : selectedStrategy.confirmLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsMergeConfirmOpen(false)}
                          disabled={isMerging}
                          className="px-3 py-1.5 text-xs text-fg-muted hover:text-fg-default rounded-md border border-border-default bg-canvas-raised active:scale-[0.97] cursor-pointer transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div ref={mergeDropdownRef} className="relative inline-flex rounded-md shadow-sm">
                      <button
                        type="button"
                        onClick={handleOpenMergeConfirm}
                        disabled={pr.mergeable === false}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-success-fg hover:opacity-90 active:scale-[0.97] rounded-l-md border-r border-success-fg/30 disabled:opacity-50 cursor-pointer transition-all"
                      >
                        <Octicon name="git-merge" size={14} />
                        <span>{selectedStrategy.actionLabel}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsMergeDropdownOpen(!isMergeDropdownOpen)}
                        disabled={pr.mergeable === false}
                        className="px-2 py-1.5 text-white bg-success-fg hover:opacity-90 rounded-r-md disabled:opacity-50 cursor-pointer transition-all"
                        title="Select merge strategy"
                      >
                        <Octicon name="triangle-down" size={12} />
                      </button>

                      {isMergeDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 max-w-[calc(100vw-3rem)] bg-canvas-raised border border-border-default rounded-md shadow-2xl z-50 overflow-hidden divide-y divide-border-default">
                          {MERGE_STRATEGIES.map((strat) => (
                            <button
                              key={strat.id}
                              type="button"
                              onClick={() => handleSelectStrategy(strat.id)}
                              className={`w-full text-left p-3 text-xs hover:bg-canvas-hover transition-colors flex items-start gap-2.5 cursor-pointer ${
                                strat.id === selectedStrategy.id ? 'bg-canvas-hover' : ''
                              }`}
                            >
                              <div className="mt-0.5 shrink-0 w-4 text-accent-fg">
                                {strat.id === selectedStrategy.id && <Octicon name="check" size={14} />}
                              </div>
                              <div className="space-y-1">
                                <span className="font-semibold text-fg-default block">
                                  {strat.title}
                                </span>
                                <p className="text-[11px] text-fg-muted leading-snug">
                                  {strat.description}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
                      disabled={isSubmittingComment || !commentBody.trim()}
                      className="px-4 py-1.5 text-xs font-semibold text-white rounded-md bg-success-fg hover:opacity-90 active:scale-[0.97] disabled:opacity-50 cursor-pointer transition-all"
                    >
                      {isSubmittingComment ? 'Posting...' : 'Comment'}
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
              <h4 className="font-semibold text-fg-default">Reviewers</h4>
              <p className="italic">No reviews requested</p>
            </div>

            <div className="space-y-2 border-b border-border-default pb-4">
              <h4 className="font-semibold text-fg-default">Assignees</h4>
              <p className="italic">No one assigned</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-fg-default">Branches</h4>
              <div className="space-y-1 font-mono text-[11px]">
                <div>Base: <span className="text-fg-default">{pr.base?.ref}</span></div>
                <div>Head: <span className="text-fg-default">{pr.head?.ref}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'commits' && (
        <div className="space-y-4">
          <div className="text-xs text-fg-muted">
            Showing <span className="font-semibold text-fg-default">{commits?.length || 0}</span> commit{(commits?.length || 0) !== 1 ? 's' : ''}
          </div>

          {isCommitsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          ) : isCommitsError ? (
            <div className="p-4 border border-danger-fg/40 bg-danger-fg/10 rounded-md text-xs text-danger-fg">
              Failed to load commits for this pull request.
            </div>
          ) : !commits || commits.length === 0 ? (
            <div className="p-8 text-center text-xs text-fg-muted border border-border-default rounded-md bg-canvas-default">
              No commits found for this pull request.
            </div>
          ) : (
            <div className="border border-border-default rounded-md bg-canvas-default overflow-hidden divide-y divide-border-default">
              {commits.map((commit) => (
                <div
                  key={commit.sha}
                  className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-canvas-hover transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={commit.author?.avatar_url || '/default-avatar.jpg'}
                      alt={commit.author?.login || commit.commit.author.name}
                      className="w-5 h-5 rounded-full border border-border-default object-cover shrink-0"
                    />
                    <div className="space-y-0.5 truncate">
                      <span className="font-semibold text-fg-default truncate block">
                        {commit.commit.message.split('\n')[0]}
                      </span>
                      <div className="text-[11px] text-fg-muted">
                        <span className="font-medium text-fg-default">
                          {commit.author?.login || commit.commit.author.name}
                        </span>{' '}
                        committed on {formatTime(commit.commit.author.date)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11px] text-fg-muted bg-canvas-subtle px-2 py-0.5 rounded border border-border-default">
                      {commit.sha.slice(0, 7)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 text-xs text-fg-muted flex-wrap">
            <div>
              Showing <span className="font-semibold text-fg-default">{totalFilesCount}</span> changed file{totalFilesCount !== 1 ? 's' : ''} with{' '}
              <span className="font-semibold text-success-fg">+{totalAdditions}</span> additions and{' '}
              <span className="font-semibold text-danger-fg">-{totalDeletions}</span> deletions
            </div>
          </div>

          {isFilesLoading || isDiffLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-md" />
              <Skeleton className="h-28 w-full rounded-md" />
            </div>
          ) : parsedDiffFiles.length === 0 && (!files || files.length === 0) ? (
            <div className="p-8 text-center text-xs text-fg-muted border border-border-default rounded-md bg-canvas-default">
              No file changes found for this pull request.
            </div>
          ) : (
            <div className="space-y-4">
              {parsedDiffFiles.map((file) => {
                const filePath = file.newPath || file.oldPath
                const isCollapsed = Boolean(collapsedFiles[filePath])
                const matchedFile = files?.find((f) => f.filename === filePath)

                return (
                  <div
                    key={filePath}
                    className="border border-border-default rounded-md bg-canvas-default overflow-hidden"
                  >
                    <div
                      onClick={() => toggleFileCollapse(filePath)}
                      className="flex items-center justify-between px-4 py-2.5 bg-canvas-subtle border-b border-border-default text-xs cursor-pointer select-none hover:bg-canvas-hover transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className={`text-fg-muted transition-transform inline-block ${
                            isCollapsed ? '' : 'rotate-90'
                          }`}
                        >
                          <Octicon name="chevron-right" size={14} />
                        </span>

                        <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                          {file.additions > 0 && (
                            <span className="text-success-fg">+{file.additions}</span>
                          )}
                          {file.deletions > 0 && (
                            <span className="text-danger-fg">-{file.deletions}</span>
                          )}
                        </div>

                        <span className="font-mono text-xs font-semibold text-fg-default truncate">
                          {filePath}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {matchedFile?.status && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                              matchedFile.status === 'added'
                                ? 'bg-success-fg/15 text-success-fg'
                                : matchedFile.status === 'deleted'
                                ? 'bg-danger-fg/15 text-danger-fg'
                                : 'bg-attention-fg/15 text-attention-fg'
                            }`}
                          >
                            {matchedFile.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="overflow-x-auto text-xs font-mono">
                        {file.hunks.length === 0 ? (
                          <div className="p-4 text-xs text-fg-muted italic">
                            Binary file or no text diff available.
                          </div>
                        ) : (
                          file.hunks.map((hunk, hunkIdx) => (
                            <div key={hunkIdx} className="divide-y divide-border-default/40">
                              <div className="px-4 py-1.5 bg-canvas-subtle text-[11px] text-fg-muted font-mono border-y border-border-default">
                                {hunk.header}
                              </div>
                              {hunk.lines.map((line, lineIdx) => (
                                <div
                                  key={lineIdx}
                                  className={`flex font-mono text-[12px] leading-5 ${
                                    line.type === 'add'
                                      ? 'bg-success-fg/10 text-fg-default'
                                      : line.type === 'delete'
                                      ? 'bg-danger-fg/10 text-fg-default'
                                      : line.type === 'header'
                                      ? 'bg-canvas-subtle text-fg-muted italic'
                                      : 'text-fg-default'
                                  }`}
                                >
                                  <div className="w-10 px-2 text-right select-none text-[11px] text-fg-muted border-r border-border-default/50 shrink-0">
                                    {line.oldLineNumber || ''}
                                  </div>
                                  <div className="w-10 px-2 text-right select-none text-[11px] text-fg-muted border-r border-border-default/50 shrink-0">
                                    {line.newLineNumber || ''}
                                  </div>
                                  <div className="w-6 text-center select-none shrink-0 font-bold">
                                    {line.type === 'add' ? (
                                      <span className="text-success-fg">+</span>
                                    ) : line.type === 'delete' ? (
                                      <span className="text-danger-fg">-</span>
                                    ) : (
                                      ' '
                                    )}
                                  </div>
                                  <div className="px-2 whitespace-pre overflow-x-auto flex-1">
                                    {line.content || ' '}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {parsedDiffFiles.length === 0 && files && files.length > 0 && (
                <div className="border border-border-default rounded-md bg-canvas-default overflow-hidden divide-y divide-border-default">
                  {files.map((file) => (
                    <div
                      key={file.filename}
                      className="p-3 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-fg-default">{file.filename}</span>
                      <div className="flex items-center gap-2">
                        {file.additions > 0 && (
                          <span className="text-success-fg">+{file.additions}</span>
                        )}
                        {file.deletions > 0 && (
                          <span className="text-danger-fg">-{file.deletions}</span>
                        )}
                        <span className="text-fg-muted capitalize text-[10px] px-1.5 py-0.5 rounded bg-canvas-subtle border border-border-default">
                          {file.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
