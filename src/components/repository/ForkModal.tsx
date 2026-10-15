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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <Octicon name="repo-forked" size={16} className="text-[#8b949e]" />
            <h2 className="text-sm font-semibold text-[#e6edf3]">Create a new fork</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded-md hover:bg-[#21262d] transition-colors cursor-pointer"
          >
            <Octicon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <p className="text-[#8b949e]">
            A fork is a copy of a repository. Forking a repository allows you to freely experiment with changes without affecting the original project.
          </p>

          {errorMessage && (
            <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-md text-[#f85149] text-xs">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 space-y-1.5">
              <label className="block font-semibold text-[#e6edf3]">Owner</label>
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none h-8"
              >
                {availableOwners.map((owner) => (
                  <option key={owner.login} value={owner.login}>
                    {owner.login}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block font-semibold text-[#e6edf3]">Repository name</label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none h-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-[#e6edf3]">
              Description <span className="font-normal text-[#8b949e]">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description for the fork"
              className="w-full px-2.5 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none h-8"
            />
          </div>

          <div className="pt-3 border-t border-[#30363d] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>{isSubmitting ? 'Forking repository...' : 'Create fork'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
