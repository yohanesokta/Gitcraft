import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  useRepository,
  useRepositoryContents,
  useRepositoryCommits,
  useRepositoryLanguages,
} from '../hooks/useForgejo'
import { RepositoryHeader } from '../components/repository/RepositoryHeader'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { ForgejoContent } from '../types/forgejo'
import { Octicon } from '../components/ui/Octicon'

export function RepositoryPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>()

  const {
    data: repository,
    isLoading: isRepoLoading,
    isError: isRepoError,
    error: repoError,
    refetch: refetchRepo,
  } = useRepository(owner, repo)

  const {
    data: contents,
    isLoading: isContentsLoading,
    isError: isContentsError,
    error: contentsError,
  } = useRepositoryContents(owner, repo)

  const {
    data: commits,
  } = useRepositoryCommits(owner, repo)

  const {
    data: languagesData,
  } = useRepositoryLanguages(owner, repo)

  const languageColors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Python: '#3572A5',
    Go: '#00ADD8',
    Rust: '#dea584',
    Shell: '#89e051',
    C: '#555555',
    'C++': '#f34b7d',
    CMake: '#064f8c',
    'Jupyter Notebook': '#da5b0b',
  }

  const languageEntries = useMemo(() => {
    if (languagesData && Object.keys(languagesData).length > 0) {
      const totalBytes = Object.values(languagesData).reduce((a, b) => a + b, 0)
      return Object.entries(languagesData).map(([name, bytes]) => {
        const pct = totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(1) : '0'
        return { name, bytes, percentage: pct }
      })
    }
    if (repository?.language) {
      return [{ name: repository.language, bytes: 1, percentage: '100.0' }]
    }
    return []
  }, [languagesData, repository?.language])

  if (isRepoLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="pt-6">
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </div>
    )
  }

  if (isRepoError || !repository) {
    return (
      <ErrorState
        title="Could not load repository"
        message={repoError instanceof Error ? repoError.message : 'Repository not found or network error'}
        onRetry={() => refetchRepo()}
      />
    )
  }

  const fileList: ForgejoContent[] = Array.isArray(contents)
    ? [...contents].sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1
        if (a.type !== 'dir' && b.type === 'dir') return 1
        return a.name.localeCompare(b.name)
      })
    : []

  const latestCommit = commits && commits.length > 0 ? commits[0] : null
  const commitCount = commits ? commits.length : 1
  const hasReadme = fileList.some((f) => f.name.toLowerCase().startsWith('readme'))

  return (
    <div className="space-y-6">
      <RepositoryHeader repository={repository} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
              >
                <Octicon name="git-branch" size={14} className="text-[#8b949e]" />
                <span>{repository.default_branch || 'main'}</span>
                <Octicon name="triangle-down" size={12} className="text-[#8b949e] ml-1" />
              </button>

              <div className="hidden sm:flex items-center gap-3 text-xs text-[#8b949e]">
                <span className="font-semibold text-[#e6edf3]">
                  1 <span className="font-normal text-[#8b949e]">Branch</span>
                </span>
                <span className="font-semibold text-[#e6edf3]">
                  0 <span className="font-normal text-[#8b949e]">Tags</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
              >
                Go to file
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
              >
                <span>Add file</span>
                <Octicon name="triangle-down" size={12} className="text-[#8b949e]" />
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white border border-[#2ea043] shadow-sm transition-colors cursor-pointer"
              >
                <Octicon name="code" size={14} />
                <span>Code</span>
                <Octicon name="triangle-down" size={12} className="opacity-75" />
              </button>
            </div>
          </div>

          <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
            {latestCommit && (
              <div className="p-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] flex-wrap gap-2">
                <div className="flex items-center gap-2 truncate">
                  <img
                    src={latestCommit.author?.avatar_url || '/default-avatar.jpg'}
                    alt={latestCommit.author?.login || latestCommit.commit.author.name}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/default-avatar.jpg'
                    }}
                    className="w-5 h-5 rounded-full border border-[#30363d] object-cover shrink-0"
                  />
                  <span className="font-bold text-[#e6edf3] hover:underline cursor-pointer">
                    {latestCommit.author?.login || latestCommit.commit.author.name}
                  </span>
                  <span className="text-[#e6edf3] truncate hover:text-[#58a6ff] hover:underline cursor-pointer">
                    {latestCommit.commit.message.split('\n')[0]}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="font-mono text-[#58a6ff] hover:underline cursor-pointer">
                    {latestCommit.sha.slice(0, 7)}
                  </span>
                  <span>&middot;</span>
                  <span>
                    {new Date(latestCommit.commit.author.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-[#e6edf3] hover:text-[#58a6ff] cursor-pointer ml-1">
                    <Octicon name="history" size={14} className="text-[#8b949e]" />
                    <span>{commitCount} Commits</span>
                  </div>
                </div>
              </div>
            )}

            {isContentsLoading && (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            )}

            {isContentsError && (
              <div className="p-4 text-xs text-[#f85149]">
                {contentsError instanceof Error ? contentsError.message : 'Failed to load directory contents'}
              </div>
            )}

            {!isContentsLoading && !isContentsError && fileList.length === 0 && (
              <div className="p-8 text-center text-xs text-[#8b949e]">
                This repository is empty.
              </div>
            )}

            {!isContentsLoading && !isContentsError && fileList.length > 0 && (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#30363d] bg-[#161b22] text-[#8b949e]">
                    <th className="py-2 px-3 font-semibold w-1/3">Name</th>
                    <th className="py-2 px-3 font-semibold">Last commit message</th>
                    <th className="py-2 px-3 font-semibold text-right w-32">Last commit date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d]">
                  {fileList.map((item) => (
                    <tr
                      key={item.path}
                      className="hover:bg-[#161b22]/70 transition-colors group"
                    >
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {item.type === 'dir' ? (
                            <Octicon name="file-directory" size={16} className="text-[#58a6ff]" />
                          ) : (
                            <Octicon name="file" size={16} className="text-[#8b949e]" />
                          )}
                          <span className="text-[#e6edf3] hover:text-[#58a6ff] hover:underline cursor-pointer">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 truncate max-w-xs text-[#8b949e] group-hover:text-[#c9d1d9]">
                        {latestCommit?.commit.message.split('\n')[0] || 'Initial commit'}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right text-[#8b949e]">
                        {latestCommit?.commit.author.date
                          ? new Date(latestCommit.commit.author.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'recently'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!hasReadme ? (
            <div className="border border-[#30363d] rounded-md p-8 text-center bg-[#0d1117]">
              <div className="w-12 h-12 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[#8b949e] mx-auto mb-3">
                <Octicon name="book" size={24} />
              </div>
              <h2 className="text-base font-bold text-[#e6edf3] mb-1">
                Add a README
              </h2>
              <p className="text-xs text-[#8b949e] max-w-sm mx-auto mb-4">
                Help people interested in this repository understand your project.
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white border border-[#2ea043] transition-colors cursor-pointer"
              >
                Add a README
              </button>
            </div>
          ) : (
            <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
              <div className="p-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs font-semibold text-[#e6edf3]">
                <div className="flex items-center gap-2">
                  <Octicon name="book" size={16} className="text-[#8b949e]" />
                  <span>README.md</span>
                </div>
                <div className="flex items-center gap-1 text-[#8b949e]">
                  <Octicon name="pencil" size={14} className="hover:text-[#58a6ff] cursor-pointer" />
                </div>
              </div>
              <div className="p-8 text-sm text-[#e6edf3] leading-relaxed">
                <h1 className="text-2xl font-bold pb-2 mb-4 border-b border-[#21262d]">
                  {repository.name}
                </h1>
                <p className="text-[#8b949e] mb-4">
                  {repository.description || 'Welcome to this repository on Gitcraft.'}
                </p>
                <div className="p-4 bg-[#161b22] rounded-md border border-[#30363d] font-mono text-xs text-[#e6edf3]">
                  git clone {repository.clone_url}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#e6edf3]">About</h2>
            {repository.description ? (
              <p className="text-xs text-[#e6edf3] leading-relaxed">
                {repository.description}
              </p>
            ) : (
              <p className="text-xs text-[#8b949e] italic">
                No description, website, or topics provided.
              </p>
            )}

            {repository.website && (
              <div className="flex items-center gap-2 text-xs text-[#58a6ff]">
                <Octicon name="link" size={14} className="text-[#8b949e] shrink-0" />
                <a
                  href={repository.website.startsWith('http') ? repository.website : `https://${repository.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline truncate"
                >
                  {repository.website}
                </a>
              </div>
            )}

            {repository.topics && repository.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {repository.topics.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1f6feb]/15 text-[#58a6ff] hover:bg-[#1f6feb]/25 cursor-pointer transition-colors"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-2 pt-2 text-xs text-[#8b949e]">
              <div className="flex items-center gap-2 hover:text-[#58a6ff] cursor-pointer">
                <Octicon name="star" size={14} />
                <span>{repository.stars_count} stars</span>
              </div>
              <div className="flex items-center gap-2 hover:text-[#58a6ff] cursor-pointer">
                <Octicon name="eye" size={14} />
                <span>{repository.watchers_count} watching</span>
              </div>
              <div className="flex items-center gap-2 hover:text-[#58a6ff] cursor-pointer">
                <Octicon name="repo-forked" size={14} />
                <span>{repository.forks_count} forks</span>
              </div>
            </div>
          </div>

          <div className="border-t border-[#30363d] pt-4 space-y-2">
            <h2 className="text-sm font-semibold text-[#e6edf3]">Releases</h2>
            <p className="text-xs text-[#8b949e]">
              {repository.release_counter ? `${repository.release_counter} releases` : 'No releases published'}
            </p>
          </div>

          <div className="border-t border-[#30363d] pt-4 space-y-2">
            <h2 className="text-sm font-semibold text-[#e6edf3]">Packages</h2>
            <p className="text-xs text-[#8b949e]">No packages published</p>
          </div>

          <div className="border-t border-[#30363d] pt-4 space-y-2">
            <h2 className="text-sm font-semibold text-[#e6edf3]">Owner</h2>
            <div className="flex items-center gap-2 pt-1">
              <Link to={`/${repository.owner.login}`} className="flex items-center gap-2 text-xs text-[#58a6ff] hover:underline">
                <img
                  src={repository.owner.avatar_url || '/default-avatar.jpg'}
                  alt={repository.owner.login}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/default-avatar.jpg'
                  }}
                  className="w-8 h-8 rounded-full border border-[#30363d] object-cover"
                />
                <span className="font-semibold text-[#e6edf3]">{repository.owner.full_name || repository.owner.login}</span>
              </Link>
            </div>
          </div>

          {languageEntries.length > 0 && (
            <div className="border-t border-[#30363d] pt-4 space-y-3">
              <h2 className="text-sm font-semibold text-[#e6edf3]">Languages</h2>
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#21262d]">
                {languageEntries.map((lang) => (
                  <div
                    key={lang.name}
                    style={{
                      width: `${lang.percentage}%`,
                      backgroundColor: languageColors[lang.name] || '#58a6ff',
                    }}
                    className="h-full"
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                {languageEntries.map((lang) => (
                  <div key={lang.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: languageColors[lang.name] || '#58a6ff',
                      }}
                    />
                    <span className="font-semibold text-[#e6edf3]">{lang.name}</span>
                    <span className="text-[#8b949e]">{lang.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
