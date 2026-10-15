import { useState, useEffect } from 'react'
import { Octicon } from '../ui/Octicon'
import { ForgejoUser } from '../../types/forgejo'
import { getStoredUser, getAuthToken, updateUserSettings } from '../../lib/forgejo'

export interface ProfileSidebarProps {
  user?: ForgejoUser | null
  onUserUpdated?: () => void
}

export function ProfileSidebar({ user, onUserUpdated }: ProfileSidebarProps) {
  if (!user) {
    return null
  }

  const currentUser = getStoredUser()
  const authToken = getAuthToken()
  const isLoggedIn = Boolean(currentUser && authToken)
  const isOwnProfile = Boolean(
    isLoggedIn &&
    user &&
    currentUser?.login?.toLowerCase() === user.login?.toLowerCase()
  )

  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(user.full_name || '')
  const [bio, setBio] = useState(user.description || '')
  const [pronouns, setPronouns] = useState(user.pronouns || '')
  const [location, setLocation] = useState(user.location || '')
  const [website, setWebsite] = useState(user.website || '')

  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setFullName(user.full_name || '')
    setBio(user.description || '')
    setPronouns(user.pronouns || '')
    setLocation(user.location || '')
    setWebsite(user.website || '')
  }, [user])

  function handleStartEditing() {
    setFullName(user?.full_name || '')
    setBio(user?.description || '')
    setPronouns(user?.pronouns || '')
    setLocation(user?.location || '')
    setWebsite(user?.website || '')
    setErrorMsg(null)
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setErrorMsg(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)

    try {
      await updateUserSettings({
        full_name: fullName.trim() || undefined,
        description: bio.trim() || undefined,
        pronouns: pronouns.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
      })
      setIsEditing(false)
      onUserUpdated?.()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
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

        {!isEditing ? (
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
        ) : null}
      </div>

      {!isEditing ? (
        <>
          {user.description && (
            <p className="text-sm text-[#e6edf3] pt-1 leading-normal">
              {user.description}
            </p>
          )}

          {isOwnProfile && (
            <button
              type="button"
              onClick={handleStartEditing}
              className="w-full py-1.5 px-3 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
            >
              Edit profile
            </button>
          )}

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
        </>
      ) : (
        <form onSubmit={handleSave} className="space-y-3 pt-2 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded border border-[#f85149]/40 bg-[#f85149]/10 text-xs text-[#f85149]">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#e6edf3]">
              Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full px-2.5 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#e6edf3]">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Add a bio"
              rows={3}
              className="w-full px-2.5 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] resize-y"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#e6edf3]">
              Pronouns
            </label>
            <input
              type="text"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="e.g. they/them"
              className="w-full px-2.5 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#e6edf3]">
              Location
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-[#8b949e]">
                <Octicon name="location" size={14} />
              </span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="w-full pl-8 pr-2.5 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#e6edf3]">
              Website
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-[#8b949e]">
                <Octicon name="link" size={14} />
              </span>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full pl-8 pr-2.5 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-[#e6edf3] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </aside>
  )
}
