import { Link } from 'react-router-dom'
import { ForgejoRepository } from '../../types/forgejo'
import { Octicon } from '../ui/Octicon'

export interface RepositoryListItemProps {
  repository: ForgejoRepository
}

export function RepositoryListItem({ repository }: RepositoryListItemProps) {
  const updatedDate = new Date(repository.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

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
  }

  const langColor = repository.language ? languageColors[repository.language] || '#3572A5' : '#3178c6'

  return (
    <li className="py-6 border-b border-[#21262d] flex flex-col md:flex-row md:items-start justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {repository.avatar_url?.trim() && (
            <img
              src={repository.avatar_url}
              alt=""
              className="w-5 h-5 rounded-md object-cover border border-[#30363d] shrink-0"
            />
          )}
          <Link
            to={`/${repository.owner.login}/${repository.name}`}
            className="text-xl font-semibold text-[#58a6ff] hover:underline"
          >
            {repository.name}
          </Link>
          <span className="px-2 py-0.5 rounded-full border border-[#30363d] text-xs font-medium text-[#8b949e]">
            {repository.private ? 'Private' : 'Public'}
          </span>
        </div>

        {repository.description ? (
          <p className="text-sm text-[#8b949e] max-w-2xl leading-relaxed">
            {repository.description}
          </p>
        ) : null}

        {repository.topics && repository.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {repository.topics.map((topic) => (
              <span
                key={topic}
                className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1f6feb]/15 text-[#58a6ff] hover:bg-[#1f6feb]/25 cursor-pointer transition-colors"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-[#8b949e] pt-2 flex-wrap">
          {repository.language && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: langColor }}
              />
              <span>{repository.language}</span>
            </div>
          )}

          <Link
            to={`/${repository.owner.login}/${repository.name}`}
            className="flex items-center gap-1 hover:text-[#58a6ff] transition-colors"
          >
            <Octicon name="star" size={14} />
            <span>{repository.stars_count}</span>
          </Link>

          <Link
            to={`/${repository.owner.login}/${repository.name}`}
            className="flex items-center gap-1 hover:text-[#58a6ff] transition-colors"
          >
            <Octicon name="repo-forked" size={14} />
            <span>{repository.forks_count}</span>
          </Link>

          <span>Updated {updatedDate}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 self-start md:self-auto shrink-0">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-l-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
          >
            <Octicon name="star" size={14} className="text-[#8b949e]" />
            <span>Star</span>
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
    </li>
  )
}
