import { Link, useLocation } from 'react-router-dom'
import { ForgejoRepository } from '../../types/forgejo'
import { Octicon } from '../ui/Octicon'

export interface RepositoryHeaderProps {
  repository: ForgejoRepository
}

export function RepositoryHeader({ repository }: RepositoryHeaderProps) {
  const location = useLocation()
  const basePath = `/${repository.owner.login}/${repository.name}`

  const isCodeActive =
    location.pathname === basePath ||
    location.pathname.startsWith(`${basePath}/tree`) ||
    location.pathname.startsWith(`${basePath}/blob`) ||
    location.pathname.startsWith(`${basePath}/commits`)

  const tabs = [
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
    {
      id: 'settings',
      label: 'Settings',
      path: `${basePath}/settings`,
      icon: <Octicon name="gear" size={16} />,
      active: location.pathname.startsWith(`${basePath}/settings`),
    },
  ]

  return (
    <div className="bg-[#0d1117] border-b border-[#21262d] -mx-4 sm:-mx-6 -mt-6 px-4 sm:px-6 mb-6">
      <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-[#21262d] pt-2">
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
            src={repository.owner.avatar_url || '/default-avatar.jpg'}
            alt={repository.owner.login}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/default-avatar.jpg'
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
          >
            <Octicon name="pin" size={14} className="text-[#8b949e]" />
            <span>Pin</span>
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
              aria-label="Fork options"
              className="px-2 py-1 rounded-r-md text-xs bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] border-y border-r border-[#30363d] transition-colors cursor-pointer"
            >
              <Octicon name="triangle-down" size={12} />
            </button>
          </div>

          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-l-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
            >
              <Octicon name="star" size={14} className="text-[#8b949e]" />
              <span>Star</span>
              <span className="ml-1 px-1.5 py-0.2 bg-[#30363d] rounded-full text-[10px] text-[#e6edf3]">
                {repository.stars_count}
              </span>
            </button>
            <button
              type="button"
              aria-label="Star options"
              className="px-2 py-1 rounded-r-md text-xs bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] border-y border-r border-[#30363d] transition-colors cursor-pointer"
            >
              <Octicon name="triangle-down" size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
