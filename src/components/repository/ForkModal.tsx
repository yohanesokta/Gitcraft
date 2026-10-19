import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ForgejoRepository } from '../../types/forgejo'
import { forkRepository, getStoredUser } from '../../lib/forgejo'
import { useUserOrgs } from '../../hooks/useForgejo'
import { Octicon } from '../ui/Octicon'

export interface ForkModalProps {
  repository: ForgejoRepository
  isOpen: boolean
  onClose: () => void
}

export function ForkModal({ repository, isOpen, onClose }: ForkModalProps) {
  const navigate = useNavigate()
  const currentUser = getStoredUser()
  const { data: userOrgs } = useUserOrgs()

  const [selectedOwner, setSelectedOwner] = useState<string>(currentUser?.login || '')
  const [repoName, setRepoName] = useState(repository.name)
  const [description, setDescription] = useState(repository.description || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const availableOwners = [
    ...(currentUser ? [{ login: currentUser.login, avatar_url: currentUser.avatar_url }] : []),
    ...((userOrgs || []).map((org) => ({ login: org.login, avatar_url: org.avatar_url }))),
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!repoName.trim()) {
      setErrorMessage('Repository name cannot be empty')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const isOrg = selectedOwner !== currentUser?.login
      const forked = await forkRepository(repository.owner.login, repository.name, {
        organization: isOrg ? selectedOwner : undefined,
        name: repoName.trim(),
      })

      onClose()
      navigate(`/${forked.owner.login}/${forked.name}`)
    } catch (err) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Failed to fork repository')
      }
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-canvas-raised border border-border-default rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-canvas-subtle">
          <div className="flex items-center gap-2">
            <Octicon name="repo-forked" size={16} className="text-fg-muted" />
            <h2 className="text-sm font-semibold text-fg-default">Create a new fork</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg-default p-1 rounded-md hover:bg-canvas-hover transition-colors cursor-pointer"
          >
            <Octicon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <p className="text-fg-muted leading-relaxed">
            A fork is a copy of a repository. Forking a repository allows you to freely experiment with changes without affecting the original project.
          </p>

          {errorMessage && (
            <div className="p-3 bg-danger-fg/10 border border-danger-fg/30 rounded-md text-danger-fg text-xs">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 space-y-1.5">
              <label className="block font-semibold text-fg-default">Owner</label>
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-canvas-default border border-border-default rounded-md text-fg-default focus:border-accent-fg focus:outline-none h-8"
              >
                {availableOwners.map((owner) => (
                  <option key={owner.login} value={owner.login}>
                    {owner.login}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block font-semibold text-fg-default">Repository name</label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 bg-canvas-default border border-border-default rounded-md text-fg-default focus:border-accent-fg focus:outline-none h-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-fg-default">
              Description <span className="font-normal text-fg-muted">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description for the fork"
              className="w-full px-2.5 py-1.5 bg-canvas-default border border-border-default rounded-md text-fg-default focus:border-accent-fg focus:outline-none h-8"
            />
          </div>

          <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-md border border-border-default bg-canvas-default hover:bg-canvas-hover text-fg-muted hover:text-fg-default font-medium transition-colors cursor-pointer active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-accent-fg hover:opacity-90 text-[var(--accent-text)] font-semibold transition-opacity cursor-pointer disabled:opacity-50 active:scale-[0.97]"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-current/20 border-t-current rounded-full animate-spin" />
              )}
              <span>{isSubmitting ? 'Forking repository...' : 'Create fork'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
