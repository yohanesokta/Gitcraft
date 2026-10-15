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
            wants to merge {commits?.length || 1} commit{(commits?.length || 1) !== 1 ? 's' : ''} into{' '}
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

      <div className="flex items-center gap-2 border-b border-[#21262d] overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => handleSelectTab('conversation')}
          className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'conversation'
              ? 'border-[#f78166] text-[#e6edf3] font-semibold'
              : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <Octicon name="comment" size={14} />
          <span>Conversation</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#21262d] text-[#8b949e]">
            {(comments?.length || 0) + 1}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('commits')}
          className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'commits'
              ? 'border-[#f78166] text-[#e6edf3] font-semibold'
              : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <Octicon name="git-commit" size={14} />
          <span>Commits</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#21262d] text-[#8b949e]">
            {commits?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('files')}
          className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'files'
              ? 'border-[#f78166] text-[#e6edf3] font-semibold'
              : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <Octicon name="file" size={14} />
          <span>Files changed</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#21262d] text-[#8b949e]">
            {totalFilesCount}
          </span>
        </button>
      </div>

      {activeTab === 'conversation' && (
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

            {pr.merged ? (
              <div className="p-4 border border-[#8957e5]/40 rounded-md bg-[#8957e5]/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-[#8957e5] shrink-0 mt-0.5">
                  <Octicon name="git-merge" size={16} />
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-[#e6edf3] block">
                    Pull request successfully merged and closed
                  </span>
                  <span className="text-[#8b949e] block">
                    {pr.merged_by?.login ? `${pr.merged_by.login} merged` : 'Merged'} into{' '}
                    <span className="font-mono text-[#e6edf3] bg-[#21262d] px-1 py-0.5 rounded">
                      {pr.base?.ref}
                    </span>{' '}
                    on {formatTime(pr.merged_at || pr.updated_at)}
                  </span>
                </div>
              </div>
            ) : pr.state === 'closed' ? (
              <div className="p-4 border border-[#cf222e]/40 rounded-md bg-[#cf222e]/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-[#cf222e] shrink-0 mt-0.5">
                  <Octicon name="git-pull-request-closed" size={16} />
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-[#e6edf3] block">
                    This pull request is closed
                  </span>
                  <span className="text-[#8b949e] block">
                    Changes were not merged into{' '}
                    <span className="font-mono text-[#e6edf3] bg-[#21262d] px-1 py-0.5 rounded">
                      {pr.base?.ref}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="border border-[#30363d] rounded-md bg-[#161b22] relative z-20">
                <div className="p-4 flex items-start gap-3 border-b border-[#30363d] rounded-t-md">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5 ${
                      pr.mergeable === false ? 'bg-[#cf222e]' : 'bg-[#238636]'
                    }`}
                  >
                    <Octicon name={pr.mergeable === false ? 'x' : 'check'} size={16} />
                  </div>
                  <div className="text-xs space-y-1 flex-1">
                    <span className="font-semibold text-[#e6edf3] block">
                      {pr.mergeable === false
                        ? 'This branch has conflicts that must be resolved'
                        : 'This branch has no conflicts with the base branch'}
                    </span>
                    <span className="text-[#8b949e] block">
                      {pr.mergeable === false
                        ? 'Conflicting files must be resolved before this pull request can be merged.'
                        : 'Merging can be performed automatically.'}
                    </span>
                  </div>
                </div>

                {mergeError && (
                  <div className="p-3 mx-4 mt-4 bg-[#f85149]/10 border border-[#f85149]/40 rounded text-xs text-[#f85149]">
                    {mergeError}
                  </div>
                )}

                <div className="p-4">
                  {!isLoggedIn ? (
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className="text-[#8b949e]">Sign in to merge this pull request.</span>
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white cursor-pointer"
                      >
                        Sign in
                      </button>
                    </div>
                  ) : isMergeConfirmOpen ? (
                    <form onSubmit={handleConfirmMerge} className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#8b949e]">
                          Commit title
                        </label>
                        <input
                          type="text"
                          value={mergeTitle}
                          onChange={(e) => setMergeTitle(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff]"
                          placeholder="Commit title"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#8b949e]">
                          Commit description (optional)
                        </label>
                        <textarea
                          value={mergeMessage}
                          onChange={(e) => setMergeMessage(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-1.5 text-xs bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] resize-y"
                          placeholder="Commit description"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="delete-branch"
                          checked={deleteBranch}
                          onChange={(e) => setDeleteBranch(e.target.checked)}
                          className="rounded border-[#30363d] bg-[#0d1117] text-[#238636] focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="delete-branch" className="text-xs text-[#8b949e] cursor-pointer">
                          Delete branch <span className="font-mono text-[#e6edf3]">{pr.head?.ref}</span> after merging
                        </label>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={isMerging}
                          className="px-4 py-1.5 text-xs font-semibold text-white rounded-md bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 cursor-pointer"
                        >
                          {isMerging ? 'Merging...' : selectedStrategy.confirmLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsMergeConfirmOpen(false)}
                          disabled={isMerging}
                          className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] rounded-md border border-[#30363d] bg-[#21262d] cursor-pointer"
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
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-l-md border-r border-[#1f6f2e] disabled:opacity-50 cursor-pointer"
                      >
                        <Octicon name="git-merge" size={14} />
                        <span>{selectedStrategy.actionLabel}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsMergeDropdownOpen(!isMergeDropdownOpen)}
                        disabled={pr.mergeable === false}
                        className="px-2 py-1.5 text-white bg-[#238636] hover:bg-[#2ea043] rounded-r-md disabled:opacity-50 cursor-pointer"
                        title="Select merge strategy"
                      >
                        <Octicon name="triangle-down" size={12} />
                      </button>

                      {isMergeDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 max-w-[calc(100vw-3rem)] bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl z-50 overflow-hidden divide-y divide-[#30363d]">
                          {MERGE_STRATEGIES.map((strat) => (
                            <button
                              key={strat.id}
                              type="button"
                              onClick={() => handleSelectStrategy(strat.id)}
                              className={`w-full text-left p-3 text-xs hover:bg-[#21262d] transition-colors flex items-start gap-2.5 cursor-pointer ${
                                strat.id === selectedStrategy.id ? 'bg-[#21262d]/60' : ''
                              }`}
                            >
                              <div className="mt-0.5 shrink-0 w-4 text-[#58a6ff]">
                                {strat.id === selectedStrategy.id && <Octicon name="check" size={14} />}
                              </div>
                              <div className="space-y-1">
                                <span className="font-semibold text-[#e6edf3] block">
                                  {strat.title}
                                </span>
                                <p className="text-[11px] text-[#8b949e] leading-snug">
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
                      disabled={isSubmittingComment || !commentBody.trim()}
                      className="px-4 py-1.5 text-xs font-semibold text-white rounded-md bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingComment ? 'Posting...' : 'Comment'}
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
      )}

      {activeTab === 'commits' && (
        <div className="space-y-4">
          <div className="text-xs text-[#8b949e]">
            Showing <span className="font-semibold text-[#e6edf3]">{commits?.length || 0}</span> commit{(commits?.length || 0) !== 1 ? 's' : ''}
          </div>

          {isCommitsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          ) : isCommitsError ? (
            <div className="p-4 border border-[#f85149]/40 bg-[#f85149]/10 rounded-md text-xs text-[#f85149]">
              Failed to load commits for this pull request.
            </div>
          ) : !commits || commits.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8b949e] border border-[#30363d] rounded-md bg-[#0d1117]">
              No commits found for this pull request.
            </div>
          ) : (
            <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden divide-y divide-[#21262d]">
              {commits.map((commit) => (
                <div
                  key={commit.sha}
                  className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-[#161b22]/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={commit.author?.avatar_url || '/default-avatar.jpg'}
                      alt={commit.author?.login || commit.commit.author.name}
                      className="w-5 h-5 rounded-full border border-[#30363d] object-cover shrink-0"
                    />
                    <div className="space-y-0.5 truncate">
                      <span className="font-semibold text-[#e6edf3] truncate block">
                        {commit.commit.message.split('\n')[0]}
                      </span>
                      <div className="text-[11px] text-[#8b949e]">
                        <span className="font-medium text-[#e6edf3]">
                          {commit.author?.login || commit.commit.author.name}
                        </span>{' '}
                        committed on {formatTime(commit.commit.author.date)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11px] text-[#8b949e] bg-[#161b22] px-2 py-0.5 rounded border border-[#30363d]">
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
          <div className="flex items-center justify-between gap-4 text-xs text-[#8b949e] flex-wrap">
            <div>
              Showing <span className="font-semibold text-[#e6edf3]">{totalFilesCount}</span> changed file{totalFilesCount !== 1 ? 's' : ''} with{' '}
              <span className="font-semibold text-[#3fb950]">+{totalAdditions}</span> additions and{' '}
              <span className="font-semibold text-[#f85149]">-{totalDeletions}</span> deletions
            </div>
          </div>

          {isFilesLoading || isDiffLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-md" />
              <Skeleton className="h-28 w-full rounded-md" />
            </div>
          ) : parsedDiffFiles.length === 0 && (!files || files.length === 0) ? (
            <div className="p-8 text-center text-xs text-[#8b949e] border border-[#30363d] rounded-md bg-[#0d1117]">
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
                    className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden"
                  >
                    <div
                      onClick={() => toggleFileCollapse(filePath)}
                      className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] text-xs cursor-pointer select-none hover:bg-[#21262d]/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className={`text-[#8b949e] transition-transform inline-block ${
                            isCollapsed ? '' : 'rotate-90'
                          }`}
                        >
                          <Octicon name="chevron-right" size={14} />
                        </span>

                        <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                          {file.additions > 0 && (
                            <span className="text-[#3fb950]">+{file.additions}</span>
                          )}
                          {file.deletions > 0 && (
                            <span className="text-[#f85149]">-{file.deletions}</span>
                          )}
                        </div>

                        <span className="font-mono text-xs font-semibold text-[#e6edf3] truncate">
                          {filePath}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {matchedFile?.status && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                              matchedFile.status === 'added'
                                ? 'bg-[#238636]/20 text-[#3fb950]'
                                : matchedFile.status === 'deleted'
                                ? 'bg-[#da3633]/20 text-[#f85149]'
                                : 'bg-[#d29922]/20 text-[#d29922]'
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
                          <div className="p-4 text-xs text-[#8b949e] italic">
                            Binary file or no text diff available.
                          </div>
                        ) : (
                          file.hunks.map((hunk, hunkIdx) => (
                            <div key={hunkIdx} className="divide-y divide-[#21262d]/30">
                              <div className="px-4 py-1.5 bg-[#161b22] text-[11px] text-[#8b949e] font-mono border-y border-[#21262d]">
                                {hunk.header}
                              </div>
                              {hunk.lines.map((line, lineIdx) => (
                                <div
                                  key={lineIdx}
                                  className={`flex font-mono text-[12px] leading-5 ${
                                    line.type === 'add'
                                      ? 'bg-[#238636]/15 text-[#e6edf3]'
                                      : line.type === 'delete'
                                      ? 'bg-[#da3633]/15 text-[#e6edf3]'
                                      : line.type === 'header'
                                      ? 'bg-[#161b22] text-[#8b949e] italic'
                                      : 'text-[#e6edf3]'
                                  }`}
                                >
                                  <div className="w-10 px-2 text-right select-none text-[11px] text-[#8b949e] border-r border-[#21262d]/50 shrink-0">
                                    {line.oldLineNumber || ''}
                                  </div>
                                  <div className="w-10 px-2 text-right select-none text-[11px] text-[#8b949e] border-r border-[#21262d]/50 shrink-0">
                                    {line.newLineNumber || ''}
                                  </div>
                                  <div className="w-6 text-center select-none shrink-0 font-bold">
                                    {line.type === 'add' ? (
                                      <span className="text-[#3fb950]">+</span>
                                    ) : line.type === 'delete' ? (
                                      <span className="text-[#f85149]">-</span>
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
                <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden divide-y divide-[#21262d]">
                  {files.map((file) => (
                    <div
                      key={file.filename}
                      className="p-3 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-[#e6edf3]">{file.filename}</span>
                      <div className="flex items-center gap-2">
                        {file.additions > 0 && (
                          <span className="text-[#3fb950]">+{file.additions}</span>
                        )}
                        {file.deletions > 0 && (
                          <span className="text-[#f85149]">-{file.deletions}</span>
                        )}
                        <span className="text-[#8b949e] capitalize text-[10px] px-1.5 py-0.5 rounded bg-[#161b22] border border-[#30363d]">
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
