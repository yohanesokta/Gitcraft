import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRepositoryBranches, useCompareDiff } from '../../hooks/useForgejo'
import { createPullRequest, getStoredUser, getAuthToken } from '../../lib/forgejo'
import { Octicon } from '../ui/Octicon'

export interface NewPullRequestProps {
  owner: string
  repo: string
  defaultBase?: string
  onCancel?: () => void
}

export function NewPullRequest({
  owner,
  repo,
  defaultBase = 'main',
  onCancel,
}: NewPullRequestProps) {
  const navigate = useNavigate()
  const currentUser = getStoredUser()
  const authToken = getAuthToken()
  const isLoggedIn = Boolean(currentUser && authToken)

  const { data: branches, isLoading: isBranchesLoading } = useRepositoryBranches(owner, repo)

  const [baseBranch, setBaseBranch] = useState(defaultBase)
  const [headBranch, setHeadBranch] = useState('')

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (branches && branches.length > 0) {
      if (!branches.some((b) => b.name === baseBranch)) {
        setBaseBranch(branches[0].name)
      }
      if (!headBranch) {
        const other = branches.find((b) => b.name !== (defaultBase || branches[0].name))
        setHeadBranch(other ? other.name : branches[0].name)
      }
    }
  }, [branches, baseBranch, headBranch, defaultBase])

  const {
    data: compareData,
    isLoading: isCompareLoading,
  } = useCompareDiff(owner, repo, baseBranch, headBranch)

  const isIdentical = baseBranch === headBranch
  const hasCommits = Boolean(compareData && compareData.total_commits > 0)

  useEffect(() => {
    if (compareData?.commits && compareData.commits.length > 0 && !title) {
      const firstCommit = compareData.commits[0]
      const firstLine = firstCommit.commit.message.split('\n')[0]
      setTitle(firstLine)
    }
  }, [compareData, title])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || isIdentical) return
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      const created = await createPullRequest(owner, repo, {
        title: title.trim(),
        base: baseBranch,
        head: headBranch,
        body: body.trim() || undefined,
      })
      navigate(`/${owner}/${repo}/pulls/${created.number}`)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create pull request')
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
        <div>
          <h1 className="text-xl font-normal text-[#e6edf3]">Compare changes</h1>
          <p className="text-xs text-[#8b949e] mt-1">
            Choose two branches to see what’s changed or to start a new pull request.
          </p>
        </div>
        <Link
          to={`/${owner}/${repo}/pulls`}
          className="inline-flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-[#58a6ff]"
        >
          <Octicon name="arrow-left" size={12} />
          <span>Back to pull requests</span>
        </Link>
      </div>

      <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-md flex items-center gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#8b949e] font-mono">base:</span>
          <div className="relative">
            <select
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              className="bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded px-3 py-1 text-xs font-mono focus:outline-none focus:border-[#58a6ff] cursor-pointer"
            >
              {branches?.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-[#8b949e]">←</span>

        <div className="flex items-center gap-2">
          <span className="text-[#8b949e] font-mono">compare:</span>
          <div className="relative">
            <select
              value={headBranch}
              onChange={(e) => setHeadBranch(e.target.value)}
              className="bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded px-3 py-1 text-xs font-mono focus:outline-none focus:border-[#58a6ff] cursor-pointer"
            >
              {branches?.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ml-auto text-xs">
          {isBranchesLoading || isCompareLoading ? (
            <span className="text-[#8b949e]">Checking mergeability...</span>
          ) : isIdentical ? (
            <span className="text-[#d29922]">Choose different branches to compare.</span>
          ) : hasCommits ? (
            <span className="inline-flex items-center gap-1.5 text-[#3fb950] font-medium">
              <Octicon name="check" size={14} />
              <span>Able to merge automatically</span>
            </span>
          ) : (
            <span className="text-[#8b949e]">Branches are up to date with each other</span>
          )}
        </div>
      </div>

      {!isLoggedIn && (
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-md text-xs text-[#8b949e] flex items-center justify-between">
          <span>You need to be signed in to create a pull request.</span>
          <Link
            to="/login"
            className="px-3 py-1 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white"
          >
            Sign in
          </Link>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/40 rounded-md text-xs text-[#f85149]">
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="p-5 border border-[#30363d] rounded-md bg-[#0d1117] space-y-4"
      >
        <div>
          <label className="block text-xs font-medium text-[#e6edf3] mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            required
            className="w-full px-3 py-2 text-sm bg-[#161b22] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#8b949e] mb-1">
            Description
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Leave a comment (Markdown supported)..."
            rows={6}
            className="w-full px-3 py-2 text-xs bg-[#161b22] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] resize-y"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d]">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] rounded-md border border-[#30363d] bg-[#21262d] cursor-pointer"
            >
              Cancel
            </button>
          ) : (
            <Link
              to={`/${owner}/${repo}/pulls`}
              className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] rounded-md border border-[#30363d] bg-[#21262d]"
            >
              Cancel
            </Link>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || isIdentical || !isLoggedIn}
            className="px-4 py-1.5 text-xs font-semibold text-white rounded-md bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
          >
            {isSubmitting ? 'Creating pull request...' : 'Create pull request'}
          </button>
        </div>
      </form>

      {hasCommits && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#8b949e] px-1">
            <span className="font-semibold text-[#e6edf3]">
              Commits ({compareData?.total_commits || 0})
            </span>
            {compareData?.files && (
              <span>{compareData.files.length} file{compareData.files.length !== 1 ? 's' : ''} changed</span>
            )}
          </div>

          <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden divide-y divide-[#21262d]">
            {compareData?.commits.map((commit) => (
              <div
                key={commit.sha}
                className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-[#161b22]/50 transition-colors"
              >
                <div className="space-y-1 truncate">
                  <span className="font-semibold text-[#e6edf3] truncate block">
                    {commit.commit.message.split('\n')[0]}
                  </span>
                  <div className="text-[11px] text-[#8b949e]">
                    {commit.author?.login || commit.commit.author.name} committed on{' '}
                    {formatTime(commit.commit.author.date)}
                  </div>
                </div>
                <span className="font-mono text-[11px] text-[#8b949e] bg-[#161b22] px-2 py-0.5 rounded border border-[#30363d] shrink-0">
                  {commit.sha.slice(0, 7)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
