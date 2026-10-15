import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ForgejoRepository } from '../../types/forgejo'
import { Octicon } from '../ui/Octicon'
import { ForkModal } from './ForkModal'
import {
  getStoredUser,
  getAuthToken,
  starRepository,
  unstarRepository,
  isRepoPinned,
  toggleRepoPinned,
} from '../../lib/forgejo'
import { useRepoStarred } from '../../hooks/useForgejo'

export interface RepositoryHeaderProps {
  repository: ForgejoRepository
}

export function RepositoryHeader({ repository }: RepositoryHeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const currentUser = getStoredUser()
  const token = getAuthToken()
  const owner = repository.owner.login
  const repo = repository.name
  const basePath = `/${owner}/${repo}`

  const { data: isStarredFromApi } = useRepoStarred(owner, repo)
  const [isStarred, setIsStarred] = useState<boolean>(false)
  const [starsCount, setStarsCount] = useState<number>(repository.stars_count)
  const [isStarring, setIsStarring] = useState<boolean>(false)

  const [isPinned, setIsPinned] = useState<boolean>(() => {
    return currentUser ? isRepoPinned(currentUser.login, repo) : false
  })
  const [pinAlert, setPinAlert] = useState<string | null>(null)

  const [isForkModalOpen, setIsForkModalOpen] = useState<boolean>(false)

  useEffect(() => {
    if (typeof isStarredFromApi === 'boolean') {
      setIsStarred(isStarredFromApi)
    }
  }, [isStarredFromApi])

  useEffect(() => {
    setStarsCount(repository.stars_count)
  }, [repository.stars_count])

  useEffect(() => {
    function syncPins() {
      if (currentUser) {
        setIsPinned(isRepoPinned(currentUser.login, repo))
      }
    }
    syncPins()
    window.addEventListener('gitcraft_pins_change', syncPins)
    return () => {
      window.removeEventListener('gitcraft_pins_change', syncPins)
    }
  }, [currentUser?.login, repo])

  const canManage = Boolean(
    repository.permissions?.admin ||
    (currentUser && repository.owner.login === currentUser.login)
  )

  async function handleToggleStar() {
    if (!token) {
      navigate('/login')
      return
    }

    if (isStarring) return
    setIsStarring(true)

    const nextStarred = !isStarred
    setIsStarred(nextStarred)
    setStarsCount((prev) => (nextStarred ? prev + 1 : Math.max(0, prev - 1)))

    try {
      if (nextStarred) {
        await starRepository(owner, repo)
      } else {
        await unstarRepository(owner, repo)
      }
      queryClient.invalidateQueries({ queryKey: ['forgejo', 'repo_starred', owner, repo] })
      queryClient.invalidateQueries({ queryKey: ['forgejo', 'repo', owner, repo] })
      queryClient.invalidateQueries({ queryKey: ['forgejo', 'repos'] })
      queryClient.invalidateQueries({ queryKey: ['forgejo', 'user_repos'] })
    } catch {
      setIsStarred(!nextStarred)
      setStarsCount((prev) => (nextStarred ? Math.max(0, prev - 1) : prev + 1))
    } finally {
      setIsStarring(false)
    }
  }

  function handleTogglePin() {
    if (!token || !currentUser) {
      navigate('/login')
      return
    }

    const wasPinned = isPinned
    const result = toggleRepoPinned(currentUser.login, repo)

    if (!wasPinned && !result) {
      setPinAlert('You can only pin up to 6 repositories.')
      setTimeout(() => setPinAlert(null), 3000)
    } else {
      setIsPinned(result)
    }
  }

  function handleForkClick() {
    if (!token) {
      navigate('/login')
      return
    }
    setIsForkModalOpen(true)
  }

  const isCodeActive =
    location.pathname === basePath ||
    location.pathname.startsWith(`${basePath}/tree`) ||
    location.pathname.startsWith(`${basePath}/blob`) ||
    location.pathname.startsWith(`${basePath}/commits`)

  const baseTabs = [
    {
      id: 'code',
      label: 'Code',
      path: basePath,
      icon: <Octicon name="code" size={16} />,
      active: isCodeActive,
    },
    {
      id: 'issues',
      label: 'Issues',
      count: repository.open_issues_count,
      path: `${basePath}/issues`,
      icon: <Octicon name="issue-opened" size={16} />,
      active: location.pathname.startsWith(`${basePath}/issues`),
    },
    {
      id: 'pulls',
      label: 'Pull requests',
      count: repository.open_pr_counter,
      path: `${basePath}/pulls`,
      icon: <Octicon name="git-pull-request" size={16} />,
      active: location.pathname.startsWith(`${basePath}/pulls`),
    },
    {
      id: 'agents',
      label: 'Agents',
      path: `${basePath}/agents`,
      icon: <Octicon name="organization" size={16} />,
      active: location.pathname.startsWith(`${basePath}/agents`),
    },
    {
      id: 'actions',
      label: 'Actions',
      path: `${basePath}/actions`,
      icon: <Octicon name="play" size={16} />,
      active: location.pathname.startsWith(`${basePath}/actions`),
    },
    {
      id: 'projects',
      label: 'Projects',
      path: `${basePath}/projects`,
      icon: <Octicon name="table" size={16} />,
      active: location.pathname.startsWith(`${basePath}/projects`),
    },
    {
      id: 'wiki',
      label: 'Wiki',
      path: `${basePath}/wiki`,
      icon: <Octicon name="book" size={16} />,
      active: location.pathname.startsWith(`${basePath}/wiki`),
    },
    {
      id: 'security',
      label: 'Security and quality',
      path: `${basePath}/security`,
      icon: <Octicon name="shield" size={16} />,
      active: location.pathname.startsWith(`${basePath}/security`),
    },
    {
      id: 'insights',
      label: 'Insights',
      path: `${basePath}/pulse`,
      icon: <Octicon name="graph" size={16} />,
      active: location.pathname.startsWith(`${basePath}/pulse`),
    },
  ]

  const tabs = canManage
    ? [
        ...baseTabs,
        {
          id: 'settings',
          label: 'Settings',
          path: `${basePath}/settings`,
          icon: <Octicon name="gear" size={16} />,
          active: location.pathname.startsWith(`${basePath}/settings`),
        },
      ]
    : baseTabs

  return (
    <div className="bg-[#0d1117] border-b border-[#21262d] -mx-4 sm:-mx-6 -mt-6 px-4 sm:px-6 mb-6">
      <nav className="flex items-center gap-1 overflow-x-auto overflow-y-hidden no-scrollbar border-b border-[#21262d] pt-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.path}
            className={`flex items-center gap-2 px-3 py-2 text-xs border-b-2 transition-colors whitespace-nowrap -mb-[1px] ${
              tab.active
                ? 'border-[#f78166] text-[#e6edf3] font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]/40'
            }`}
          >
            <span className={tab.active ? 'text-[#e6edf3]' : 'text-[#8b949e]'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className="px-1.5 py-0.2 bg-[#30363d] rounded-full text-[10px] text-[#e6edf3]">
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <img
            src={repository.avatar_url?.trim() || repository.owner.avatar_url || '/default-avatar.jpg'}
            alt={repository.name}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = repository.owner.avatar_url || '/default-avatar.jpg'
            }}
            className="w-6 h-6 rounded-full border border-[#30363d] object-cover shrink-0"
          />
          <h1 className="text-xl font-bold text-[#e6edf3] tracking-tight">
            {repository.name}
          </h1>
          <span className="px-2 py-0.5 rounded-full border border-[#30363d] text-xs text-[#8b949e]">
            {repository.private ? 'Private' : 'Public'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap relative">
          {pinAlert && (
            <div className="absolute -top-8 right-0 bg-[#f85149] text-white text-[11px] px-2.5 py-1 rounded shadow-md whitespace-nowrap z-20">
              {pinAlert}
            </div>
          )}

          <button
            type="button"
            onClick={handleTogglePin}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              isPinned
                ? 'bg-[#21262d] text-[#58a6ff] border-[#58a6ff]/40 hover:bg-[#30363d]'
                : 'bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border-[#30363d]'
            }`}
          >
            <Octicon name="pin" size={14} className={isPinned ? 'text-[#58a6ff]' : 'text-[#8b949e]'} />
            <span>{isPinned ? 'Unpin' : 'Pin'}</span>
          </button>

          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-l-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
            >
              <Octicon name="eye" size={14} className="text-[#8b949e]" />
              <span>Watch</span>
              <span className="ml-1 px-1.5 py-0.2 bg-[#30363d] rounded-full text-[10px] text-[#e6edf3]">
                {repository.watchers_count}
              </span>
            </button>
            <button
              type="button"
              aria-label="Watch options"
              className="px-2 py-1 rounded-r-md text-xs bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] border-y border-r border-[#30363d] transition-colors cursor-pointer"
            >
              <Octicon name="triangle-down" size={12} />
            </button>
          </div>

          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={handleForkClick}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-l-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
            >
              <Octicon name="repo-forked" size={14} className="text-[#8b949e]" />
              <span>Fork</span>
              <span className="ml-1 px-1.5 py-0.2 bg-[#30363d] rounded-full text-[10px] text-[#e6edf3]">
                {repository.forks_count}
              </span>
            </button>
            <button
              type="button"
              onClick={handleForkClick}
              aria-label="Fork options"
              className="px-2 py-1 rounded-r-md text-xs bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] border-y border-r border-[#30363d] transition-colors cursor-pointer"
            >
              <Octicon name="triangle-down" size={12} />
            </button>
          </div>

          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={handleToggleStar}
              disabled={isStarring}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-l-md text-xs font-medium border border-[#30363d] transition-colors cursor-pointer ${
                isStarred
                  ? 'bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d]'
                  : 'bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3]'
              }`}
            >
              <Octicon
                name={isStarred ? 'star-fill' : 'star'}
                size={14}
                className={isStarred ? 'text-[#e3b341]' : 'text-[#8b949e]'}
              />
              <span>{isStarred ? 'Starred' : 'Star'}</span>
              <span className="ml-1 px-1.5 py-0.2 bg-[#30363d] rounded-full text-[10px] text-[#e6edf3]">
                {starsCount}
              </span>
            </button>
            <button
              type="button"
              onClick={handleToggleStar}
              aria-label="Star options"
              className="px-2 py-1 rounded-r-md text-xs bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] border-y border-r border-[#30363d] transition-colors cursor-pointer"
            >
              <Octicon name="triangle-down" size={12} />
            </button>
          </div>
        </div>
      </div>

      <ForkModal
        repository={repository}
        isOpen={isForkModalOpen}
        onClose={() => setIsForkModalOpen(false)}
      />
    </div>
  )
}
