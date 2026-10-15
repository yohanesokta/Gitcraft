import { useState, useDeferredValue } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useSearchRepositories } from '../hooks/useForgejo'
import { RepositoryListItem } from '../components/repository/RepositoryListItem'
import { ProfileSidebar } from '../components/profile/ProfileSidebar'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { Octicon } from '../components/ui/Octicon'

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [searchInput, setSearchInput] = useState(initialQuery)
  const deferredQuery = useDeferredValue(searchInput)

  const activeQuery = deferredQuery.trim() || 'gitcraft'

  const {
    data: searchResults,
    isLoading,
    isError,
    error,
    refetch,
  } = useSearchRepositories(activeQuery)

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() })
    } else {
      setSearchParams({})
    }
  }

  const repositories = searchResults?.data || []
  const repoCount = repositories.length > 0 ? repositories.length : 97

  return (
    <div className="space-y-6">
      <div className="border-b border-[#21262d] -mx-4 sm:-mx-6 px-4 sm:px-6">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-[1px]">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-xs border-b-2 border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]/40 transition-colors whitespace-nowrap"
          >
            <Octicon name="book" size={16} />
            <span>Overview</span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-xs border-b-2 border-[#f78166] text-[#e6edf3] font-semibold transition-colors whitespace-nowrap"
          >
            <Octicon name="repo" size={16} className="text-[#e6edf3]" />
            <span>Repositories</span>
            <span className="px-1.5 py-0.2 bg-[#30363d] rounded-full text-[10px] text-[#e6edf3]">
              {repoCount}
            </span>
          </Link>

          <Link
            to="#"
            className="flex items-center gap-2 px-3 py-2 text-xs border-b-2 border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]/40 transition-colors whitespace-nowrap"
          >
            <Octicon name="table" size={16} />
            <span>Projects</span>
          </Link>

          <Link
            to="#"
            className="flex items-center gap-2 px-3 py-2 text-xs border-b-2 border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]/40 transition-colors whitespace-nowrap"
          >
            <Octicon name="repo" size={16} />
            <span>Packages</span>
          </Link>

          <Link
            to="#"
            className="flex items-center gap-2 px-3 py-2 text-xs border-b-2 border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]/40 transition-colors whitespace-nowrap"
          >
            <Octicon name="star" size={16} />
            <span>Stars</span>
            <span className="px-1.5 py-0.2 bg-[#30363d] rounded-full text-[10px] text-[#e6edf3]">
              50
            </span>
          </Link>
        </nav>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ProfileSidebar />

        <section className="flex-1 w-full space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#21262d]">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Find a repository..."
                className="w-full pl-3 pr-3 py-1.5 text-xs bg-[#161b22] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all h-8"
              />
            </form>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
              >
                <span>Type</span>
                <Octicon name="triangle-down" size={12} className="text-[#8b949e]" />
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
              >
                <span>Language</span>
                <Octicon name="triangle-down" size={12} className="text-[#8b949e]" />
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
              >
                <span>Sort</span>
                <Octicon name="triangle-down" size={12} className="text-[#8b949e]" />
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white border border-[#2ea043] shadow-sm transition-colors cursor-pointer"
              >
                <Octicon name="repo" size={14} />
                <span>New</span>
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="py-6 border-b border-[#21262d] space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-4 pt-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <ErrorState
              title="Failed to fetch repositories"
              message={error instanceof Error ? error.message : 'Unknown network error occurred'}
              onRetry={() => refetch()}
            />
          )}

          {!isLoading && !isError && repositories.length === 0 && (
            <div className="p-8 text-center text-xs text-[#8b949e] border border-[#30363d] rounded-md bg-[#161b22]">
              yohanesokta doesn’t have any repositories that match.
            </div>
          )}

          {!isLoading && !isError && repositories.length > 0 && (
            <ul className="divide-y divide-[#21262d]">
              {repositories.map((repo) => (
                <RepositoryListItem key={repo.id} repository={repo} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
