import { useState, useDeferredValue, useMemo, useEffect, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  useUser,
  useUserRepositories,
  useUserHeatmap,
  useRepository,
  useRepositoryContents,
  useRepositoryRawFile,
} from '../hooks/useForgejo'
import { ProfileSidebar } from '../components/profile/ProfileSidebar'
import { RepositoryListItem } from '../components/repository/RepositoryListItem'
import { ContributionGraph } from '../components/profile/ContributionGraph'
import { MarkdownViewer } from '../components/ui/MarkdownViewer'
import { CustomizePinsModal } from '../components/profile/CustomizePinsModal'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { Octicon } from '../components/ui/Octicon'
import { ForgejoRepository } from '../types/forgejo'
import { getUserPinnedRepos, setUserPinnedRepos, getStoredUser } from '../lib/forgejo'

export function ProfilePage() {
  const { owner } = useParams<{ owner: string }>()
  const targetUsername = owner || 'yohanesokta'

  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab =
    tabParam === 'repositories' ||
    tabParam === 'projects' ||
    tabParam === 'packages' ||
    tabParam === 'stars'
      ? tabParam
      : 'overview'

  const [searchInput, setSearchInput] = useState('')
  const deferredQuery = useDeferredValue(searchInput)

  const [sortOption, setSortOption] = useState<'updated' | 'name' | 'stars'>('updated')
  const [typeFilter, setTypeFilter] = useState<'all' | 'public' | 'private' | 'sources' | 'forks'>('all')
  const [languageFilter, setLanguageFilter] = useState<string>('all')

  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false)
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)

  const [isCustomizePinsOpen, setIsCustomizePinsOpen] = useState(false)
  const [pinnedNames, setPinnedNames] = useState<string[]>(() => getUserPinnedRepos(targetUsername))

  const sortMenuRef = useRef<HTMLDivElement>(null)
  const typeMenuRef = useRef<HTMLDivElement>(null)
  const langMenuRef = useRef<HTMLDivElement>(null)

  const currentUser = getStoredUser()
  const isOwnProfile = Boolean(currentUser && currentUser.login === targetUsername)

  useEffect(() => {
    function handlePinsChange() {
      setPinnedNames(getUserPinnedRepos(targetUsername))
    }
    handlePinsChange()
    window.addEventListener('gitcraft_pins_change', handlePinsChange)
    return () => {
      window.removeEventListener('gitcraft_pins_change', handlePinsChange)
    }
  }, [targetUsername])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false)
      }
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setIsTypeMenuOpen(false)
      }
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLanguageMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
    error: userError,
    refetch: refetchUser,
  } = useUser(targetUsername)

  const {
    data: repositories,
    isLoading: isReposLoading,
    isError: isReposError,
    error: reposError,
    refetch: refetchRepos,
  } = useUserRepositories(targetUsername)

  const {
    data: heatmapData,
  } = useUserHeatmap(targetUsername)

  const rawRepos = repositories || []

  const availableLanguages = useMemo(() => {
    const langs = new Set<string>()
    rawRepos.forEach((r) => {
      if (r.language) langs.add(r.language)
    })
    return Array.from(langs).sort()
  }, [rawRepos])

  const sortedRepos = useMemo(() => {
    const list = [...rawRepos]
    if (sortOption === 'name') {
      return list.sort((a, b) => a.name.localeCompare(b.name))
    }
    if (sortOption === 'stars') {
      return list.sort((a, b) => (b.stars_count || 0) - (a.stars_count || 0))
    }
    return list.sort((a, b) => {
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : a.created_at ? new Date(a.created_at).getTime() : 0
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : b.created_at ? new Date(b.created_at).getTime() : 0
      return timeB - timeA
    })
  }, [rawRepos, sortOption])

  const filteredRepos = useMemo(() => {
    return sortedRepos.filter((repo) => {
      if (typeFilter === 'public' && repo.private) return false
      if (typeFilter === 'private' && !repo.private) return false
      if (typeFilter === 'sources' && repo.fork) return false
      if (typeFilter === 'forks' && !repo.fork) return false

      if (languageFilter !== 'all' && repo.language !== languageFilter) return false

      if (!deferredQuery.trim()) return true
      const q = deferredQuery.toLowerCase()
      return (
        repo.name.toLowerCase().includes(q) ||
        (repo.description && repo.description.toLowerCase().includes(q))
      )
    })
  }, [sortedRepos, typeFilter, languageFilter, deferredQuery])

  const repoCount = rawRepos.length
  const starCount = user?.starred_repos_count ?? 0

  const pinnedRepos = useMemo(() => {
    if (pinnedNames.length > 0) {
      const matched = pinnedNames
        .map((name) => sortedRepos.find((r) => r.name === name))
        .filter((r): r is ForgejoRepository => Boolean(r))
      if (matched.length > 0) {
        return matched
      }
    }
    return sortedRepos.slice(0, 6)
  }, [pinnedNames, sortedRepos])

  const { data: profileRepo } = useRepository(targetUsername, targetUsername)
  const defaultBranch = profileRepo?.default_branch || 'main'
  const { data: profileContents } = useRepositoryContents(
    profileRepo ? targetUsername : undefined,
    profileRepo ? targetUsername : undefined,
    '',
    defaultBranch
  )
  const readmeItem = Array.isArray(profileContents)
    ? profileContents.find((f) => f.name.toLowerCase().startsWith('readme'))
    : undefined
  const readmePath = readmeItem?.name || 'README.md'

  const { data: profileReadme } = useRepositoryRawFile(
    profileRepo ? targetUsername : undefined,
    profileRepo ? targetUsername : undefined,
    readmePath,
    defaultBranch
  )

  function handleSavePins(newPins: string[]) {
    setUserPinnedRepos(targetUsername, newPins)
    setPinnedNames(newPins)
  }

  const sortLabels: Record<string, string> = {
    updated: 'Last updated',
    name: 'Name',
    stars: 'Stars',
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[#21262d] -mx-4 sm:-mx-6 px-4 sm:px-6">
        <nav className="flex items-center gap-1 overflow-x-auto overflow-y-hidden no-scrollbar -mb-[1px]">
          <Link
            to={`/${targetUsername}`}
            className={`flex items-center gap-2 px-3 py-2 text-xs border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#f78166] text-[#e6edf3] font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]/40'
            }`}
          >
            <Octicon name="book" size={16} />
            <span>Overview</span>
          </Link>

          <Link
            to={`/${targetUsername}?tab=repositories`}
            className={`flex items-center gap-2 px-3 py-2 text-xs border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'repositories'
                ? 'border-[#f78166] text-[#e6edf3] font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]/40'
            }`}
          >
            <Octicon name="repo" size={16} />
            <span>Repositories</span>
            <span className="px-1.5 py-0.2 bg-[#30363d] rounded-full text-[10px] text-[#e6edf3]">
              {repoCount}
            </span>
          </Link>

          <Link
            to={`/${targetUsername}?tab=projects`}
            className={`flex items-center gap-2 px-3 py-2 text-xs border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'projects'
                ? 'border-[#f78166] text-[#e6edf3] font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]/40'
            }`}
          >
            <Octicon name="table" size={16} />
            <span>Projects</span>
          </Link>

          <Link
            to={`/${targetUsername}?tab=packages`}
            className={`flex items-center gap-2 px-3 py-2 text-xs border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'packages'
                ? 'border-[#f78166] text-[#e6edf3] font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]/40'
            }`}
          >
            <Octicon name="repo" size={16} />
            <span>Packages</span>
          </Link>

          <Link
            to={`/${targetUsername}?tab=stars`}
            className={`flex items-center gap-2 px-3 py-2 text-xs border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'stars'
                ? 'border-[#f78166] text-[#e6edf3] font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]/40'
            }`}
          >
            <Octicon name="star" size={16} />
            <span>Stars</span>
            <span className="px-1.5 py-0.2 bg-[#30363d] rounded-full text-[10px] text-[#e6edf3]">
              {starCount}
            </span>
          </Link>
        </nav>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {isUserLoading ? (
          <div className="w-full lg:w-72 space-y-4">
            <Skeleton className="w-48 h-48 rounded-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <ProfileSidebar user={user} onUserUpdated={refetchUser} />
        )}

        <section className="flex-1 w-full space-y-6 min-w-0">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {profileReadme && (
                <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#21262d] text-xs text-[#8b949e]">
                    <span className="font-mono text-[#e6edf3]">
                      {targetUsername} / {readmePath}
                    </span>
                    <span className="text-[#8b949e]">
                      <Octicon name="pencil" size={14} />
                    </span>
                  </div>
                  <MarkdownViewer
                    content={profileReadme}
                    owner={targetUsername}
                    repo={targetUsername}
                    refName={defaultBranch}
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#e6edf3]">
                    Pinned
                  </h2>
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => setIsCustomizePinsOpen(true)}
                      className="text-xs text-[#8b949e] hover:text-[#58a6ff] cursor-pointer"
                    >
                      Customize your pins
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pinnedRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="p-4 border border-[#30363d] rounded-md bg-[#0d1117] flex flex-col justify-between hover:border-[#8b949e]/50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 truncate">
                            {repo.avatar_url?.trim() && (
                              <img
                                src={repo.avatar_url}
                                alt=""
                                className="w-4 h-4 rounded-sm object-cover border border-[#30363d] shrink-0"
                              />
                            )}
                            <Link
                              to={`/${repo.owner.login}/${repo.name}`}
                              className="text-sm font-semibold text-[#58a6ff] hover:underline truncate"
                            >
                              {repo.name}
                            </Link>
                          </div>
                          <span className="px-2 py-0.5 rounded-full border border-[#30363d] text-[10px] text-[#8b949e]">
                            {repo.private ? 'Private' : 'Public'}
                          </span>
                        </div>
                        {repo.description && (
                          <p className="text-xs text-[#8b949e] line-clamp-2 mb-3">
                            {repo.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[#8b949e] pt-2 border-t border-[#21262d]">
                        {repo.language && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#3178c6]" />
                            <span>{repo.language}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Octicon name="star" size={12} />
                          <span>{repo.stars_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Octicon name="repo-forked" size={12} />
                          <span>{repo.forks_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <ContributionGraph heatmapData={heatmapData} />
            </div>
          )}

          {activeTab === 'repositories' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#21262d]">
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Find a repository..."
                    className="w-full pl-3 pr-3 py-1.5 text-xs bg-[#161b22] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all h-8"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative" ref={typeMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsTypeMenuOpen(!isTypeMenuOpen)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
                    >
                      <span>Type{typeFilter !== 'all' ? `: ${typeFilter}` : ''}</span>
                      <Octicon name="triangle-down" size={12} className="text-[#8b949e]" />
                    </button>

                    {isTypeMenuOpen && (
                      <div className="absolute left-0 mt-1 w-40 bg-[#161b22] border border-[#30363d] rounded-md shadow-lg py-1 z-30 text-xs">
                        {(['all', 'public', 'private', 'sources', 'forks'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setTypeFilter(t)
                              setIsTypeMenuOpen(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#21262d] text-[#e6edf3] flex items-center justify-between capitalize cursor-pointer"
                          >
                            <span>{t}</span>
                            {typeFilter === t && <Octicon name="check" size={12} className="text-[#58a6ff]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={langMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
                    >
                      <span>Language{languageFilter !== 'all' ? `: ${languageFilter}` : ''}</span>
                      <Octicon name="triangle-down" size={12} className="text-[#8b949e]" />
                    </button>

                    {isLanguageMenuOpen && (
                      <div className="absolute left-0 mt-1 w-44 bg-[#161b22] border border-[#30363d] rounded-md shadow-lg py-1 z-30 text-xs max-h-60 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setLanguageFilter('all')
                            setIsLanguageMenuOpen(false)
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#21262d] text-[#e6edf3] flex items-center justify-between cursor-pointer"
                        >
                          <span>All</span>
                          {languageFilter === 'all' && <Octicon name="check" size={12} className="text-[#58a6ff]" />}
                        </button>
                        {availableLanguages.map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => {
                              setLanguageFilter(lang)
                              setIsLanguageMenuOpen(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#21262d] text-[#e6edf3] flex items-center justify-between cursor-pointer"
                          >
                            <span>{lang}</span>
                            {languageFilter === lang && <Octicon name="check" size={12} className="text-[#58a6ff]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={sortMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
                    >
                      <span>Sort: {sortLabels[sortOption]}</span>
                      <Octicon name="triangle-down" size={12} className="text-[#8b949e]" />
                    </button>

                    {isSortMenuOpen && (
                      <div className="absolute right-0 mt-1 w-44 bg-[#161b22] border border-[#30363d] rounded-md shadow-lg py-1 z-30 text-xs">
                        {(['updated', 'name', 'stars'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setSortOption(opt)
                              setIsSortMenuOpen(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#21262d] text-[#e6edf3] flex items-center justify-between cursor-pointer"
                          >
                            <span>{sortLabels[opt]}</span>
                            {sortOption === opt && <Octicon name="check" size={12} className="text-[#58a6ff]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    to="/new"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white border border-[#2ea043] shadow-sm transition-colors cursor-pointer"
                  >
                    <Octicon name="repo" size={14} />
                    <span>New</span>
                  </Link>
                </div>
              </div>

              {isReposLoading && (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="py-6 border-b border-[#21262d] space-y-3">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-4 pt-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isReposError && (
                <ErrorState
                  title="Failed to fetch repositories"
                  message={reposError instanceof Error ? reposError.message : 'Unknown network error occurred'}
                  onRetry={() => refetchRepos()}
                />
              )}

              {isUserError && (
                <div className="p-3 rounded-md bg-[#3c1e21]/20 border border-[#f85149]/30 text-xs text-[#f85149]">
                  {userError instanceof Error ? userError.message : 'User data offline'}
                  <button onClick={() => refetchUser()} className="ml-2 underline font-semibold">
                    Retry
                  </button>
                </div>
              )}

              {!isReposLoading && !isReposError && filteredRepos.length === 0 && (
                <div className="p-8 text-center text-xs text-[#8b949e] border border-[#30363d] rounded-md bg-[#161b22]">
                  {targetUsername} doesn’t have any repositories that match.
                </div>
              )}

              {!isReposLoading && !isReposError && filteredRepos.length > 0 && (
                <ul className="divide-y divide-[#21262d]">
                  {filteredRepos.map((repo) => (
                    <RepositoryListItem key={repo.id} repository={repo} />
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab !== 'overview' && activeTab !== 'repositories' && (
            <div className="p-12 text-center text-xs text-[#8b949e] border border-[#30363d] rounded-md bg-[#161b22]">
              No {activeTab} available for {targetUsername}.
            </div>
          )}
        </section>
      </div>

      <CustomizePinsModal
        isOpen={isCustomizePinsOpen}
        onClose={() => setIsCustomizePinsOpen(false)}
        username={targetUsername}
        repositories={sortedRepos}
        initialPinned={pinnedNames.length > 0 ? pinnedNames : pinnedRepos.map((r) => r.name)}
        onSave={handleSavePins}
      />
    </div>
  )
}
