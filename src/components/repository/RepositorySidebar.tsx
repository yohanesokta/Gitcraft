import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Octicon } from '../ui/Octicon'
import { ForgejoRepository } from '../../types/forgejo'
import { getStoredUser } from '../../lib/forgejo'
import { EditAboutModal } from './EditAboutModal'

export interface RepositorySidebarProps {
  repository: ForgejoRepository
  languagesData?: Record<string, number>
  hasLicense?: boolean
  onRepositoryUpdated?: () => void
}

export function RepositorySidebar({
  repository,
  languagesData,
  hasLicense = false,
  onRepositoryUpdated,
}: RepositorySidebarProps) {
  const [isEditAboutOpen, setIsEditAboutOpen] = useState(false)
  const currentUser = getStoredUser()
  const canManage = Boolean(
    repository.permissions?.admin ||
    (currentUser && repository.owner.login === currentUser.login)
  )

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
          <h2 className="text-sm font-semibold text-fg-default">About</h2>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsEditAboutOpen(true)}
              aria-label="Edit repository details"
              className="text-fg-muted hover:text-fg-default cursor-pointer p-1 rounded-md hover:bg-canvas-hover transition-colors"
            >
              <Octicon name="gear" size={14} />
            </button>
          )}
        </div>

        {repository.description ? (
          <p className="text-xs text-fg-default leading-relaxed">
            {repository.description}
          </p>
        ) : (
          <p className="text-xs text-fg-muted italic">
            No description, website, or topics provided.
          </p>
        )}

        {repository.website && (
          <div className="flex items-center gap-2 text-xs text-accent-fg">
            <Octicon name="link" size={14} className="text-fg-muted shrink-0" />
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
                className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-subtle text-accent-fg hover:opacity-80 cursor-pointer transition-opacity"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-2.5 pt-2 text-xs text-fg-muted">
          {hasLicense && (
            <div className="flex items-center gap-2 hover:text-accent-fg cursor-pointer transition-colors">
              <Octicon name="law" size={14} />
              <span>Apache-2.0 license</span>
            </div>
          )}
          <div className="flex items-center gap-2 hover:text-accent-fg cursor-pointer transition-colors">
            <Octicon name="pulse" size={14} />
            <span>Activity</span>
          </div>
          <div className="flex items-center gap-2 hover:text-accent-fg cursor-pointer transition-colors">
            <Octicon name="star" size={14} />
            <span>{repository.stars_count} stars</span>
          </div>
          <div className="flex items-center gap-2 hover:text-accent-fg cursor-pointer transition-colors">
            <Octicon name="eye" size={14} />
            <span>{repository.watchers_count} watching</span>
          </div>
          <div className="flex items-center gap-2 hover:text-accent-fg cursor-pointer transition-colors">
            <Octicon name="repo-forked" size={14} />
            <span>{repository.forks_count} forks</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border-default pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <Link
            to={`/${repository.owner.login}/${repository.name}/releases`}
            className="text-sm font-semibold text-fg-default hover:text-accent-fg hover:underline"
          >
            Releases
          </Link>
          {repository.release_counter ? (
            <span className="px-1.5 py-0.5 bg-canvas-raised border border-border-default rounded-full text-[10px] font-mono text-fg-muted">
              {repository.release_counter}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-fg-muted">
          {repository.release_counter ? `${repository.release_counter} releases` : 'No releases published'}
        </p>
        <Link
          to={`/${repository.owner.login}/${repository.name}/releases/new`}
          className="inline-block text-xs text-accent-fg hover:underline font-medium"
        >
          Create a new release
        </Link>
      </div>

      <div className="border-t border-border-default pt-4 space-y-2">
        <h2 className="text-sm font-semibold text-fg-default">Packages</h2>
        <p className="text-xs text-fg-muted">No packages published</p>
        <Link
          to="#"
          className="inline-block text-xs text-accent-fg hover:underline font-medium"
        >
          Publish your first package
        </Link>
      </div>

      <div className="border-t border-border-default pt-4 space-y-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-fg-default">Contributors</h2>
          <span className="px-1.5 py-0.5 bg-canvas-raised border border-border-default rounded-full text-[10px] font-mono text-fg-muted">
            1
          </span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Link
            to={`/${repository.owner.login}`}
            className="flex items-center gap-2 text-xs text-accent-fg hover:underline group"
          >
            <img
              src={repository.owner.avatar_url || '/default-avatar.jpg'}
              alt={repository.owner.login}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/default-avatar.jpg'
              }}
              className="w-8 h-8 rounded-full border border-border-default object-cover"
            />
            <div className="text-xs">
              <span className="font-semibold text-fg-default group-hover:text-accent-fg block">
                {repository.owner.login}
              </span>
              {repository.owner.full_name && (
                <span className="text-fg-muted block">
                  {repository.owner.full_name}
                </span>
              )}
            </div>
          </Link>
        </div>
      </div>

      {languageEntries.length > 0 && (
        <div className="border-t border-border-default pt-4 space-y-3">
          <h2 className="text-sm font-semibold text-fg-default">Languages</h2>
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-canvas-raised border border-border-default">
            {languageEntries.map((lang) => (
              <div
                key={lang.name}
                style={{
                  width: `${lang.percentage}%`,
                  backgroundColor: languageColors[lang.name] || 'var(--accent)',
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
                    backgroundColor: languageColors[lang.name] || 'var(--accent)',
                  }}
                />
                <span className="font-medium text-fg-default">{lang.name}</span>
                <span className="text-fg-muted font-mono">{lang.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <EditAboutModal
        repository={repository}
        isOpen={isEditAboutOpen}
        onClose={() => setIsEditAboutOpen(false)}
        onUpdated={onRepositoryUpdated}
      />
    </aside>
  )
}
