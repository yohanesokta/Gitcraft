import { Link } from 'react-router-dom'
import { Octicon } from '../ui/Octicon'
import { ForgejoContent, ForgejoCommit } from '../../types/forgejo'

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

  const commitDate = latestCommit?.commit.author.date
    ? new Date(latestCommit.commit.author.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'recently'

  const authorName = latestCommit?.author?.login || latestCommit?.commit.author.name || owner
  const avatarUrl = latestCommit?.author?.avatar_url || '/default-avatar.jpg'
  const commitMsg = latestCommit?.commit.message.split('\n')[0] || 'Initial commit'
  const shortSha = latestCommit?.sha ? latestCommit.sha.slice(0, 7) : ''

  return (
    <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
      {latestCommit && (
        <div className="p-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] flex-wrap gap-2">
          <div className="flex items-center gap-2 truncate">
            <img
              src={avatarUrl}
              alt={authorName}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/default-avatar.jpg'
              }}
              className="w-5 h-5 rounded-full border border-[#30363d] object-cover shrink-0"
            />
            <Link
              to={`/${authorName}`}
              className="font-bold text-[#e6edf3] hover:underline hover:text-[#58a6ff]"
            >
              {authorName}
            </Link>
            <span className="text-[#e6edf3] truncate">
              {commitMsg}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs">
            {shortSha && (
              <Link
                to={`/${owner}/${repo}/commits/${refName}`}
                className="font-mono text-[#58a6ff] hover:underline"
              >
                {shortSha}
              </Link>
            )}
            <span>&middot;</span>
            <span>{commitDate}</span>
            <Link
              to={`/${owner}/${repo}/commits/${refName}`}
              className="flex items-center gap-1.5 font-bold text-[#e6edf3] hover:text-[#58a6ff] ml-1"
            >
              <Octicon name="history" size={14} className="text-[#8b949e]" />
              <span>{commitCount} Commits</span>
            </Link>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="p-6 text-center text-xs text-[#8b949e]">
          Loading directory contents...
        </div>
      )}

      {!isLoading && items.length === 0 && !isSubdirectory && (
        <div className="p-8 text-center text-xs text-[#8b949e]">
          This directory is empty.
        </div>
      )}

      {!isLoading && (items.length > 0 || isSubdirectory) && (
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-[#30363d] bg-[#161b22] text-[#8b949e] hidden md:table-row">
              <th className="py-2 px-3 font-semibold w-1/3">Name</th>
              <th className="py-2 px-3 font-semibold">Last commit message</th>
              <th className="py-2 px-3 font-semibold text-right w-36">Last commit date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]">
            {isSubdirectory && (
              <tr className="hover:bg-[#161b22]/70 transition-colors">
                <td colSpan={3} className="py-2 px-3">
                  <Link
                    to={
                      parentPath
                        ? `/${owner}/${repo}/tree/${encodeURIComponent(refName)}/${parentPath}`
                        : `/${owner}/${repo}/tree/${encodeURIComponent(refName)}`
                    }
                    className="flex items-center gap-2 text-[#58a6ff] font-semibold hover:underline"
                  >
                    <span>..</span>
                  </Link>
                </td>
              </tr>
            )}

            {sortedItems.map((item) => {
              const targetUrl =
                item.type === 'dir'
                  ? `/${owner}/${repo}/tree/${encodeURIComponent(refName)}/${item.path}`
                  : `/${owner}/${repo}/blob/${encodeURIComponent(refName)}/${item.path}`

              return (
                <tr
                  key={item.path}
                  className="hover:bg-[#161b22]/70 transition-colors group"
                >
                  <td className="py-2 px-3 whitespace-nowrap">
                    <Link
                      to={targetUrl}
                      className="flex items-center gap-2 text-[#e6edf3] hover:text-[#58a6ff] hover:underline"
                    >
                      {item.type === 'dir' ? (
                        <Octicon name="file-directory" size={16} className="text-[#58a6ff]" />
                      ) : (
                        <Octicon name="file" size={16} className="text-[#8b949e]" />
                      )}
                      <span>{item.name}</span>
                    </Link>
                  </td>
                  <td className="py-2 px-3 truncate max-w-xs text-[#8b949e] group-hover:text-[#c9d1d9] hidden md:table-cell">
                    {commitMsg}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap text-right text-[#8b949e] hidden md:table-cell">
                    {commitDate}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
