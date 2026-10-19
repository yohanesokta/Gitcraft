import { Link } from 'react-router-dom'
import { Octicon } from '../ui/Octicon'
import { ForgejoContent, ForgejoCommit } from '../../types/forgejo'
import { useFileLastCommit } from '../../hooks/useForgejo'

export interface FileBrowserProps {
  owner: string
  repo: string
  refName: string
  currentPath: string
  items: ForgejoContent[]
  latestCommit?: ForgejoCommit | null
  commitCount?: number
  isLoading?: boolean
}

function formatCommitDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diffSec < 60) return 'just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`
    if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)} days ago`
    if (diffSec < 86400 * 365) return `${Math.floor(diffSec / (86400 * 30))} months ago`
    return `${Math.floor(diffSec / (86400 * 365))} years ago`
  } catch {
    return dateStr
  }
}

interface FileRowProps {
  item: ForgejoContent
  owner: string
  repo: string
  refName: string
}

function FileRow({ item, owner, repo, refName }: FileRowProps) {
  const directMessage = item.commit_message || item.commit_metadata?.message
  const directDate =
    item.commit_metadata?.author?.date ||
    item.commit_metadata?.committer?.date ||
    item.last_commit_when

  const hasDirect = Boolean(directMessage)

  const { data: commits, isLoading } = useFileLastCommit(
    owner,
    repo,
    refName,
    item.path,
    !hasDirect
  )

  const fileCommit = commits && commits.length > 0 ? commits[0] : null
  const commitMsg = hasDirect
    ? directMessage!.split('\n')[0]
    : fileCommit
    ? fileCommit.commit.message.split('\n')[0]
    : ''

  const commitDateStr = hasDirect
    ? directDate
    : fileCommit?.commit.author.date || ''

  const targetUrl =
    item.type === 'dir'
      ? `/${owner}/${repo}/tree/${encodeURIComponent(refName)}/${item.path}`
      : `/${owner}/${repo}/blob/${encodeURIComponent(refName)}/${item.path}`

  return (
    <tr className="hover:bg-canvas-hover transition-colors group">
      <td className="py-2.5 px-3.5 whitespace-nowrap">
        <Link
          to={targetUrl}
          className="flex items-center gap-2.5 text-fg-default hover:text-accent-fg hover:underline font-normal"
        >
          {item.type === 'dir' ? (
            <Octicon name="file-directory" size={16} className="text-accent-fg shrink-0" />
          ) : (
            <Octicon name="file" size={16} className="text-fg-subtle shrink-0" />
          )}
          <span>{item.name}</span>
        </Link>
      </td>
      <td className="py-2.5 px-3.5 truncate max-w-md text-fg-muted group-hover:text-fg-default hidden md:table-cell">
        {!hasDirect && isLoading ? (
          <span className="inline-block w-32 h-3 bg-canvas-hover rounded animate-pulse" />
        ) : (
          commitMsg
        )}
      </td>
      <td className="py-2.5 px-3.5 whitespace-nowrap text-right text-fg-subtle hidden md:table-cell">
        {!hasDirect && isLoading ? (
          <span className="inline-block w-16 h-3 bg-canvas-hover rounded animate-pulse" />
        ) : (
          formatCommitDate(commitDateStr)
        )}
      </td>
    </tr>
  )
}

export function FileBrowser({
  owner,
  repo,
  refName,
  currentPath,
  items,
  latestCommit,
  commitCount = 1,
  isLoading = false,
}: FileBrowserProps) {
  const sortedItems = [...items].sort((a, b) => {
    if (a.type === 'dir' && b.type !== 'dir') return -1
    if (a.type !== 'dir' && b.type === 'dir') return 1
    return a.name.localeCompare(b.name)
  })

  const pathSegments = currentPath.split('/').filter(Boolean)
  const isSubdirectory = pathSegments.length > 0
  const parentPath = pathSegments.slice(0, -1).join('/')

  const topCommitDate = latestCommit?.commit.author.date
    ? formatCommitDate(latestCommit.commit.author.date)
    : 'recently'

  const authorName = latestCommit?.author?.login || latestCommit?.commit.author.name || owner
  const avatarUrl = latestCommit?.author?.avatar_url || '/default-avatar.jpg'
  const topCommitMsg = latestCommit?.commit.message.split('\n')[0] || 'Initial commit'
  const shortSha = latestCommit?.sha ? latestCommit.sha.slice(0, 7) : ''

  return (
    <div className="border border-border-default rounded-lg overflow-hidden bg-canvas-default">
      {latestCommit && (
        <div className="px-3.5 py-3 bg-canvas-subtle border-b border-border-default flex items-center justify-between text-xs text-fg-muted flex-wrap gap-2">
          <div className="flex items-center gap-2 truncate">
            <img
              src={avatarUrl}
              alt={authorName}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/default-avatar.jpg'
              }}
              className="w-5 h-5 rounded-full border border-border-default object-cover shrink-0"
            />
            <Link
              to={`/${authorName}`}
              className="font-semibold text-fg-default hover:underline hover:text-accent-fg"
            >
              {authorName}
            </Link>
            <span className="text-fg-default truncate">
              {topCommitMsg}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs">
            {shortSha && (
              <Link
                to={`/${owner}/${repo}/commits/${refName}`}
                className="font-mono text-xs text-accent-fg hover:underline"
              >
                {shortSha}
              </Link>
            )}
            <span className="text-fg-subtle">&middot;</span>
            <span className="text-fg-subtle">{topCommitDate}</span>
            <Link
              to={`/${owner}/${repo}/commits/${refName}`}
              className="flex items-center gap-1.5 font-semibold text-fg-default hover:text-accent-fg ml-1"
            >
              <Octicon name="history" size={14} className="text-fg-muted" />
              <span>{commitCount} Commits</span>
            </Link>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="p-8 text-center text-xs text-fg-muted">
          Loading directory contents...
        </div>
      )}

      {!isLoading && items.length === 0 && !isSubdirectory && (
        <div className="p-8 text-center text-xs text-fg-muted">
          This directory is empty.
        </div>
      )}

      {!isLoading && (items.length > 0 || isSubdirectory) && (
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-border-default bg-canvas-subtle text-fg-muted hidden md:table-row">
              <th className="py-2.5 px-3.5 font-medium w-1/3">Name</th>
              <th className="py-2.5 px-3.5 font-medium">Last commit message</th>
              <th className="py-2.5 px-3.5 font-medium text-right w-36">Last commit date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {isSubdirectory && (
              <tr className="hover:bg-canvas-hover transition-colors">
                <td colSpan={3} className="py-2.5 px-3.5">
                  <Link
                    to={
                      parentPath
                        ? `/${owner}/${repo}/tree/${encodeURIComponent(refName)}/${parentPath}`
                        : `/${owner}/${repo}/tree/${encodeURIComponent(refName)}`
                    }
                    className="flex items-center gap-2 text-accent-fg font-semibold hover:underline"
                  >
                    <span>..</span>
                  </Link>
                </td>
              </tr>
            )}

            {sortedItems.map((item) => (
              <FileRow
                key={item.path}
                item={item}
                owner={owner}
                repo={repo}
                refName={refName}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
