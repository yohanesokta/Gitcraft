import { Link } from 'react-router-dom'
import { Octicon } from '../ui/Octicon'
import { ForgejoRepository } from '../../types/forgejo'

export interface RepositorySidebarProps {
  repository: ForgejoRepository
  languagesData?: Record<string, number>
  hasLicense?: boolean
}

export function RepositorySidebar({
  repository,
  languagesData,
  hasLicense = false,
}: RepositorySidebarProps) {
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

  const languageEntries = (() => {
    if (languagesData && Object.keys(languagesData).length > 0) {
      const totalBytes = Object.values(languagesData).reduce((a, b) => a + b, 0)
      return Object.entries(languagesData).map(([name, bytes]) => {
        const pct = totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(1) : '0'
        return { name, bytes, percentage: pct }
      })
    }
    if (repository.language) {
      return [{ name: repository.language, bytes: 1, percentage: '100.0' }]
    }
    return []
  })()

  return (
    <aside className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#e6edf3]">About</h2>
          <button
            type="button"
            aria-label="Edit repository details"
            className="text-[#8b949e] hover:text-[#e6edf3] cursor-pointer"
          >
            <Octicon name="gear" size={14} />
          </button>
        </div>

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
          {hasLicense && (
            <div className="flex items-center gap-2 hover:text-[#58a6ff] cursor-pointer">
              <Octicon name="law" size={14} />
              <span>Apache-2.0 license</span>
            </div>
          )}
          <div className="flex items-center gap-2 hover:text-[#58a6ff] cursor-pointer">
            <Octicon name="pulse" size={14} />
            <span>Activity</span>
          </div>
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
        <Link
          to={`/${repository.owner.login}/${repository.name}/releases/new`}
          className="inline-block text-xs text-[#58a6ff] hover:underline"
        >
          Create a new release
        </Link>
      </div>

      <div className="border-t border-[#30363d] pt-4 space-y-2">
        <h2 className="text-sm font-semibold text-[#e6edf3]">Packages</h2>
        <p className="text-xs text-[#8b949e]">No packages published</p>
        <Link
          to="#"
          className="inline-block text-xs text-[#58a6ff] hover:underline"
        >
          Publish your first package
        </Link>
      </div>

      <div className="border-t border-[#30363d] pt-4 space-y-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-[#e6edf3]">Contributors</h2>
          <span className="px-1.5 py-0.2 bg-[#30363d] rounded-full text-[10px] text-[#e6edf3]">
            1
          </span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Link
            to={`/${repository.owner.login}`}
            className="flex items-center gap-2 text-xs text-[#58a6ff] hover:underline group"
          >
            <img
              src={repository.owner.avatar_url || '/default-avatar.jpg'}
              alt={repository.owner.login}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/default-avatar.jpg'
              }}
              className="w-8 h-8 rounded-full border border-[#30363d] object-cover"
            />
            <div className="text-xs">
              <span className="font-semibold text-[#e6edf3] group-hover:text-[#58a6ff] block">
                {repository.owner.login}
              </span>
              {repository.owner.full_name && (
                <span className="text-[#8b949e] block">
                  {repository.owner.full_name}
                </span>
              )}
            </div>
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
    </aside>
  )
}
