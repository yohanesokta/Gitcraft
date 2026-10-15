import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Octicon } from '../ui/Octicon'
import { ForgejoCommit } from '../../types/forgejo'

export interface CommitBrowserProps {
  owner: string
  repo: string
  refName: string
  commits: ForgejoCommit[]
  isLoading?: boolean
}

interface CommitGroup {
  dateLabel: string
  items: ForgejoCommit[]
}

export function CommitBrowser({
  owner,
  repo,
  refName,
  commits,
  isLoading = false,
}: CommitBrowserProps) {
  const [copiedSha, setCopiedSha] = useState<string | null>(null)

  const groups: CommitGroup[] = useMemo(() => {
    const map = new Map<string, ForgejoCommit[]>()
    for (const c of commits) {
      const date = c.commit.author.date ? new Date(c.commit.author.date) : new Date()
      const dateLabel = `Commits on ${date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
      if (!map.has(dateLabel)) {
        map.set(dateLabel, [])
      }
      map.get(dateLabel)!.push(c)
    }
    return Array.from(map.entries()).map(([dateLabel, items]) => ({
      dateLabel,
      items,
    }))
  }, [commits])

  async function handleCopySha(sha: string) {
    try {
      await navigator.clipboard.writeText(sha)
      setCopiedSha(sha)
      setTimeout(() => setCopiedSha(null), 2000)
    } catch {
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-[#8b949e]">
        Loading commits...
      </div>
    )
  }

  if (commits.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[#8b949e] border border-[#30363d] rounded-md bg-[#0d1117]">
        No commits found for {refName}.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.dateLabel} className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-[#8b949e]">
            <Octicon name="git-commit" size={16} />
            <span className="font-semibold">{group.dateLabel}</span>
          </div>

          <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117] divide-y divide-[#21262d]">
            {group.items.map((commit) => {
              const authorName = commit.author?.login || commit.commit.author.name
              const avatarUrl = commit.author?.avatar_url || '/default-avatar.jpg'
              const commitDate = commit.commit.author.date
                ? new Date(commit.commit.author.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'recently'
              const shortSha = commit.sha.slice(0, 7)
              const isCopied = copiedSha === commit.sha

              return (
                <div
                  key={commit.sha}
                  className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#161b22]/50 transition-colors"
                >
                  <div className="space-y-1 truncate">
                    <p className="text-sm font-semibold text-[#e6edf3] hover:text-[#58a6ff] hover:underline cursor-pointer truncate">
                      {commit.commit.message.split('\n')[0]}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[#8b949e]">
                      <img
                        src={avatarUrl}
                        alt={authorName}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/default-avatar.jpg'
                        }}
                        className="w-4 h-4 rounded-full border border-[#30363d] object-cover shrink-0"
                      />
                      <Link
                        to={`/${authorName}`}
                        className="font-bold text-[#e6edf3] hover:underline"
                      >
                        {authorName}
                      </Link>
                      <span>committed on {commitDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <button
                      type="button"
                      onClick={() => handleCopySha(commit.sha)}
                      title="Copy full SHA"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#58a6ff] font-mono transition-colors cursor-pointer"
                    >
                      <span>{shortSha}</span>
                      {isCopied ? (
                        <Octicon name="check" size={12} className="text-[#3fb950]" />
                      ) : (
                        <Octicon name="copy" size={12} className="text-[#8b949e]" />
                      )}
                    </button>

                    <Link
                      to={`/${owner}/${repo}/tree/${commit.sha}`}
                      title="Browse the repository at this point in the history"
                      className="w-7 h-7 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] flex items-center justify-center text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                    >
                      <Octicon name="code" size={14} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
