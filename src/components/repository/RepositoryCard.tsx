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
    <div className="p-4 border border-[#30363d] rounded-md bg-[#161b22] hover:border-[#8b949e]/50 transition-colors flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 truncate">
            {repository.avatar_url?.trim() ? (
              <img
                src={repository.avatar_url}
                alt=""
                className="w-4 h-4 rounded-sm object-cover border border-[#30363d] shrink-0"
              />
            ) : (
              <BookMarked className="w-4 h-4 text-[#8b949e] shrink-0" />
            )}
            <Link
              to={`/${repository.owner.login}/${repository.name}`}
              className="text-sm font-semibold text-[#58a6ff] hover:underline truncate"
            >
              <span className="font-normal text-[#8b949e]">{repository.owner.login}/</span>
              {repository.name}
            </Link>
          </div>
          <Badge variant="outline" size="sm">
            {repository.private ? 'Private' : 'Public'}
          </Badge>
        </div>

        {repository.description ? (
          <p className="text-xs text-[#8b949e] line-clamp-2 mb-3">
            {repository.description}
          </p>
        ) : (
          <p className="text-xs text-[#8b949e]/60 italic mb-3">
            No description provided.
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-[#8b949e] pt-2 border-t border-[#30363d]/50">
        {repository.language && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3572A5]" />
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

        <div className="ml-auto text-[11px] text-[#8b949e]">
          Updated {updatedDate}
        </div>
      </div>
    </div>
  )
}
