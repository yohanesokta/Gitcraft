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
            className="w-20 h-20 sm:w-32 sm:h-32 lg:w-64 lg:h-64 rounded-full border border-border-default object-cover shadow-xs"
          />
        </div>

        {!isEditing ? (
          <div className="pt-2 lg:pt-4 space-y-1">
            <h1 className="text-2xl font-bold text-fg-default leading-tight">
              {displayName}
            </h1>
            <p className="text-xl font-light text-fg-muted leading-tight">
              {user.login}
            </p>
            {user.pronouns && (
              <span className="inline-block text-xs text-fg-muted">
                {user.pronouns}
              </span>
            )}
          </div>
        ) : null}
      </div>

      {!isEditing ? (
        <>
          {user.description && (
            <p className="text-sm text-fg-default pt-1 leading-normal">
              {user.description}
            </p>
          )}

          {isOwnProfile && (
            <button
              type="button"
              onClick={handleStartEditing}
              className="w-full py-1.5 px-3 rounded-md text-xs font-semibold bg-canvas-subtle hover:bg-canvas-hover text-fg-default border border-border-default transition-colors cursor-pointer active:scale-[0.97]"
            >
              Edit profile
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Octicon name="people" size={14} />
            <span className="font-semibold text-fg-default">{followersCount}</span>
            <span>followers</span>
            <span>&middot;</span>
            <span className="font-semibold text-fg-default">{followingCount}</span>
            <span>following</span>
          </div>

          <div className="space-y-2.5 pt-2 text-xs text-fg-muted border-t border-border-default">
            {user.location && (
              <div className="flex items-center gap-2">
                <Octicon name="location" size={14} className="shrink-0 text-fg-muted" />
                <span className="text-fg-default truncate">{user.location}</span>
              </div>
            )}

            {isPublicEmail && (
              <div className="flex items-center gap-2">
                <Octicon name="mail" size={14} className="shrink-0 text-fg-muted" />
                <a
                  href={`mailto:${user.email}`}
                  className="hover:text-accent-fg hover:underline truncate"
                >
                  {user.email}
                </a>
              </div>
            )}

            {user.website && (
              <div className="flex items-center gap-2">
                <Octicon name="link" size={14} className="shrink-0 text-fg-muted" />
                <a
                  href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-fg hover:underline truncate font-semibold"
                >
                  {user.website}
                </a>
              </div>
            )}

            {joinedDate && (
              <div className="flex items-center gap-2 text-fg-muted">
                <Octicon name="history" size={14} className="shrink-0 text-fg-muted" />
                <span>Joined {joinedDate}</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <form onSubmit={handleSave} className="space-y-3 pt-2 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-md border border-danger-fg/40 bg-danger-fg/10 text-xs text-danger-fg">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-fg-default">
              Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full px-2.5 py-1.5 bg-canvas-default text-fg-default border border-border-default rounded-md focus:outline-none focus:border-accent-fg"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-fg-default">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Add a bio"
              rows={3}
              className="w-full px-2.5 py-1.5 bg-canvas-default text-fg-default border border-border-default rounded-md focus:outline-none focus:border-accent-fg resize-y"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-fg-default">
              Pronouns
            </label>
            <input
              type="text"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="e.g. they/them"
              className="w-full px-2.5 py-1.5 bg-canvas-default text-fg-default border border-border-default rounded-md focus:outline-none focus:border-accent-fg"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-fg-default">
              Location
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-fg-muted">
                <Octicon name="location" size={14} />
              </span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="w-full pl-8 pr-2.5 py-1.5 bg-canvas-default text-fg-default border border-border-default rounded-md focus:outline-none focus:border-accent-fg"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-fg-default">
              Website
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-fg-muted">
                <Octicon name="link" size={14} />
              </span>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full pl-8 pr-2.5 py-1.5 bg-canvas-default text-fg-default border border-border-default rounded-md focus:outline-none focus:border-accent-fg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-[var(--accent-text)] bg-accent-fg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer active:scale-[0.97]"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-fg-muted hover:text-fg-default bg-canvas-default border border-border-default transition-colors cursor-pointer active:scale-[0.97]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </aside>
  )
}
