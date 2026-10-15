import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useSearchRepositories,
  useUserRepositories,
  useForgejoVersion,
} from '../hooks/useForgejo'
import { Octicon } from '../components/ui/Octicon'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { getForgejoBaseUrl } from '../lib/forgejo'

export function HomePage() {
  const [repoFilter, setRepoFilter] = useState('')
  const { data: userRepos, isLoading: isUserReposLoading } = useUserRepositories('yohanesokta')
  const { data: exploreResults, isLoading: isExploreLoading, isError, error, refetch } = useSearchRepositories('forgejo', 1, 10)
  const { data: versionData } = useForgejoVersion()

  const myRepos = userRepos || []
  const filteredMyRepos = myRepos.filter((r) =>
    r.name.toLowerCase().includes(repoFilter.toLowerCase())
  )

  const exploreList = exploreResults?.data || []
  const baseUrl = getForgejoBaseUrl()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <aside className="lg:col-span-3 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#e6edf3]">
            Top Repositories
          </h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white transition-colors cursor-pointer"
          >
            <Octicon name="repo" size={12} />
            <span>New</span>
          </button>
        </div>

        <input
          type="text"
          value={repoFilter}
          onChange={(e) => setRepoFilter(e.target.value)}
          placeholder="Find a repository..."
          className="w-full px-2.5 py-1 text-xs bg-[#161b22] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] transition-all h-7"
        />

        {isUserReposLoading && (
          <div className="space-y-2 pt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        )}

        {!isUserReposLoading && filteredMyRepos.length > 0 && (
          <ul className="space-y-1.5 text-xs">
            {filteredMyRepos.map((repo) => (
              <li key={repo.id}>
                <Link
                  to={`/${repo.owner.login}/${repo.name}`}
                  className="flex items-center gap-2 py-1 text-[#e6edf3] hover:text-[#58a6ff] group truncate"
                >
                  <img
                    src={repo.avatar_url?.trim() || repo.owner.avatar_url || '/default-avatar.jpg'}
                    alt={repo.name}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = repo.owner.avatar_url || '/default-avatar.jpg'
                    }}
                    className="w-4 h-4 rounded-full border border-[#30363d] object-cover shrink-0"
                  />
                  <span className="truncate group-hover:underline">
                    {repo.owner.login}/{repo.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!isUserReposLoading && filteredMyRepos.length === 0 && (
          <p className="text-xs text-[#8b949e]">
            No repositories found.
          </p>
        )}

        <div className="pt-4 border-t border-[#21262d] space-y-2">
          <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
            Recent activity
          </h3>
          <p className="text-xs text-[#8b949e]">
            When you take actions across repositories, we’ll show your activity here.
          </p>
        </div>
      </aside>

      <section className="lg:col-span-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
          <h1 className="text-lg font-bold text-[#e6edf3]">
            Home
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
            <Link to="/yohanesokta" className="text-[#58a6ff] hover:underline font-semibold">
              Go to your profile
            </Link>
          </div>
        </div>

        {isExploreLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border border-[#30363d] rounded-md bg-[#161b22] space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            title="Failed to fetch feed"
            message={error instanceof Error ? error.message : 'Network error'}
            onRetry={() => refetch()}
          />
        )}

        {!isExploreLoading && !isError && (
          <div className="space-y-4">
            {exploreList.map((repo) => (
              <div
                key={repo.id}
                className="p-4 border border-[#30363d] rounded-md bg-[#161b22] hover:border-[#8b949e]/50 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    {repo.avatar_url?.trim() ? (
                      <img
                        src={repo.avatar_url}
                        alt=""
                        className="w-4 h-4 rounded-sm object-cover border border-[#30363d] shrink-0"
                      />
                    ) : (
                      <Octicon name="repo" size={16} className="text-[#8b949e] shrink-0" />
                    )}
                    <Link
                      to={`/${repo.owner.login}/${repo.name}`}
                      className="text-sm font-semibold text-[#58a6ff] hover:underline truncate"
                    >
                      {repo.owner.login}/{repo.name}
                    </Link>
                  </div>
                  <span className="px-2 py-0.5 rounded-full border border-[#30363d] text-[10px] text-[#8b949e]">
                    {repo.private ? 'Private' : 'Public'}
                  </span>
                </div>

                {repo.description && (
                  <p className="text-xs text-[#8b949e] line-clamp-2 leading-relaxed">
                    {repo.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-[#8b949e] pt-2 border-t border-[#30363d]/50">
                  {repo.language && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3178c6]" />
                      <span>{repo.language}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Octicon name="star" size={14} />
                    <span>{repo.stars_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Octicon name="repo-forked" size={14} />
                    <span>{repo.forks_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <aside className="lg:col-span-3 space-y-6">
        <div className="p-4 rounded-md border border-[#30363d] bg-[#161b22] space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#e6edf3]">
            <Octicon name="mark-github" size={16} />
            <span>Connected to Forgejo</span>
          </div>
          <p className="text-xs text-[#8b949e] font-mono break-all">
            {baseUrl}
          </p>
          {versionData?.version && (
            <div className="text-[11px] text-[#8b949e]">
              Engine version: <span className="font-mono text-[#58a6ff]">v{versionData.version}</span>
            </div>
          )}
        </div>

        <div className="p-4 rounded-md border border-[#30363d] bg-[#161b22] space-y-2 text-xs text-[#8b949e]">
          <h3 className="font-semibold text-[#e6edf3]">Explore users</h3>
          <p>
            Visit <Link to="/yohanesokta" className="text-[#58a6ff] hover:underline font-semibold">/yohanesokta</Link> to view the full profile dashboard.
          </p>
        </div>
      </aside>
    </div>
  )
}
