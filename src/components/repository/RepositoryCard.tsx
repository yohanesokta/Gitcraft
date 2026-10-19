import { Link } from 'react-router-dom'
import { Star, GitFork, BookMarked } from 'lucide-react'
import { ForgejoRepository } from '../../types/forgejo'
import { Badge } from '../ui/Badge'

export interface RepositoryCardProps {
  repository: ForgejoRepository
}

export function RepositoryCard({ repository }: RepositoryCardProps) {
  const updatedDate = new Date(repository.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="p-4 border border-border-default rounded-md bg-canvas-subtle hover:border-fg-muted/40 transition-colors flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 truncate">
            {repository.avatar_url?.trim() ? (
              <img
                src={repository.avatar_url}
                alt=""
                className="w-4 h-4 rounded-sm object-cover border border-border-default shrink-0"
              />
            ) : (
              <BookMarked className="w-4 h-4 text-fg-muted shrink-0" />
            )}
            <Link
              to={`/${repository.owner.login}/${repository.name}`}
              className="text-sm font-semibold text-accent-fg hover:underline truncate"
            >
              <span className="font-normal text-fg-muted">{repository.owner.login}/</span>
              {repository.name}
            </Link>
          </div>
          <Badge variant="outline" size="sm">
            {repository.private ? 'Private' : 'Public'}
          </Badge>
        </div>

        {repository.description ? (
          <p className="text-xs text-fg-muted line-clamp-2 mb-3">
            {repository.description}
          </p>
        ) : (
          <p className="text-xs text-fg-muted/60 italic mb-3">
            No description provided.
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-fg-muted pt-2 border-t border-border-default/50">
        {repository.language && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-fg" />
            <span>{repository.language}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5" />
          <span>{repository.stars_count}</span>
        </div>

        <div className="flex items-center gap-1">
          <GitFork className="w-3.5 h-3.5" />
          <span>{repository.forks_count}</span>
        </div>

        <div className="ml-auto text-[11px] text-fg-muted">
          Updated {updatedDate}
        </div>
      </div>
    </div>
  )
}
