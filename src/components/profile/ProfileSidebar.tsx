import { Octicon } from '../ui/Octicon'
import { ForgejoUser } from '../../types/forgejo'

export interface ProfileSidebarProps {
  user?: ForgejoUser | null
}

export function ProfileSidebar({ user }: ProfileSidebarProps) {
  if (!user) {
    return null
  }

  const avatarUrl = user.avatar_url || '/default-avatar.jpg'
  const displayName = user.full_name || user.login
  const followersCount = user.followers_count ?? 0
  const followingCount = user.following_count ?? 0

  const joinedDate = user.created
    ? new Date(user.created).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      })
    : null

  const isPublicEmail = user.email && !user.email.includes('noreply')

  return (
    <aside className="w-full lg:w-72 shrink-0 space-y-4">
      <div className="flex flex-row lg:flex-col items-center lg:items-start gap-4 lg:gap-0">
        <div className="relative group shrink-0">
          <img
            src={avatarUrl}
            alt={displayName}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/default-avatar.jpg'
            }}
            className="w-20 h-20 sm:w-32 sm:h-32 lg:w-64 lg:h-64 rounded-full border border-[#30363d] object-cover shadow-sm"
          />
        </div>

        <div className="pt-2 lg:pt-4 space-y-1">
          <h1 className="text-2xl font-bold text-[#e6edf3] leading-tight">
            {displayName}
          </h1>
          <p className="text-xl font-light text-[#8b949e] leading-tight">
            {user.login}
          </p>
          {user.pronouns && (
            <span className="inline-block text-xs text-[#8b949e]">
              {user.pronouns}
            </span>
          )}
        </div>
      </div>

      {user.description && (
        <p className="text-sm text-[#e6edf3] pt-1 leading-normal">
          {user.description}
        </p>
      )}

      <button
        type="button"
        className="w-full py-1.5 px-3 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
      >
        Edit profile
      </button>

      <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
        <Octicon name="people" size={14} />
        <span className="font-semibold text-[#e6edf3]">{followersCount}</span>
        <span>followers</span>
        <span>&middot;</span>
        <span className="font-semibold text-[#e6edf3]">{followingCount}</span>
        <span>following</span>
      </div>

      <div className="space-y-2 pt-2 text-xs text-[#8b949e] border-t border-[#21262d]">
        {user.location && (
          <div className="flex items-center gap-2">
            <Octicon name="location" size={14} className="shrink-0" />
            <span className="text-[#e6edf3] truncate">{user.location}</span>
          </div>
        )}

        {isPublicEmail && (
          <div className="flex items-center gap-2">
            <Octicon name="mail" size={14} className="shrink-0" />
            <a
              href={`mailto:${user.email}`}
              className="hover:text-[#58a6ff] hover:underline truncate"
            >
              {user.email}
            </a>
          </div>
        )}

        {user.website && (
          <div className="flex items-center gap-2">
            <Octicon name="link" size={14} className="shrink-0" />
            <a
              href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#58a6ff] hover:underline truncate font-semibold"
            >
              {user.website}
            </a>
          </div>
        )}

        {joinedDate && (
          <div className="flex items-center gap-2 text-[#8b949e]">
            <Octicon name="history" size={14} className="shrink-0" />
            <span>Joined {joinedDate}</span>
          </div>
        )}
      </div>
    </aside>
  )
}
