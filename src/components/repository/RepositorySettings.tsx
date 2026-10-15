import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { ForgejoRepository } from '../../types/forgejo'
import { updateRepository, deleteRepository } from '../../lib/forgejo'
import { useRepositoryBranches } from '../../hooks/useForgejo'
import { Octicon } from '../ui/Octicon'

export interface RepositorySettingsProps {
  repository: ForgejoRepository
  onRepositoryUpdated?: () => void
}

export function RepositorySettings({ repository, onRepositoryUpdated }: RepositorySettingsProps) {
  const navigate = useNavigate()
  const owner = repository.owner.login
  const currentRepoName = repository.name

  const { data: branches } = useRepositoryBranches(owner, currentRepoName)

  const [name, setName] = useState(repository.name)
  const [description, setDescription] = useState(repository.description || '')
  const [website, setWebsite] = useState(repository.website || '')
  const [defaultBranch, setDefaultBranch] = useState(repository.default_branch || 'main')

  const [hasIssues, setHasIssues] = useState(repository.has_issues ?? true)
  const [hasPulls, setHasPulls] = useState(repository.has_pull_requests ?? true)
  const [hasWiki, setHasWiki] = useState(repository.has_wiki ?? true)

  const [isRenaming, setIsRenaming] = useState(false)
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [isSavingBranch, setIsSavingBranch] = useState(false)
  const [isSavingFeatures, setIsSavingFeatures] = useState(false)
  const [isChangingVisibility, setIsChangingVisibility] = useState(false)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false)

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const issuesId = useId()
  const pullsId = useId()
  const wikiId = useId()

  function showSuccess(msg: string) {
    setSuccessMessage(msg)
    setErrorMessage(null)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  function showError(msg: string) {
    setErrorMessage(msg)
    setSuccessMessage(null)
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || name.trim() === currentRepoName) return

    setIsRenaming(true)
    setErrorMessage(null)

    try {
      const updated = await updateRepository(owner, currentRepoName, {
        name: name.trim(),
      })
      showSuccess('Repository renamed successfully')
      onRepositoryUpdated?.()
      navigate(`/${owner}/${updated.name}/settings`)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to rename repository')
    } finally {
      setIsRenaming(false)
    }
  }

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault()
    setIsSavingDetails(true)
    setErrorMessage(null)

    try {
      await updateRepository(owner, currentRepoName, {
        description: description.trim(),
        website: website.trim(),
      })
      showSuccess('Repository details saved successfully')
      onRepositoryUpdated?.()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save repository details')
    } finally {
      setIsSavingDetails(false)
    }
  }

  async function handleSaveBranch(e: React.FormEvent) {
    e.preventDefault()
    if (!defaultBranch || defaultBranch === repository.default_branch) return

    setIsSavingBranch(true)
    setErrorMessage(null)

    try {
      await updateRepository(owner, currentRepoName, {
        default_branch: defaultBranch,
      })
      showSuccess('Default branch updated successfully')
      onRepositoryUpdated?.()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update default branch')
    } finally {
      setIsSavingBranch(false)
    }
  }

  async function handleSaveFeatures(e: React.FormEvent) {
    e.preventDefault()
    setIsSavingFeatures(true)
    setErrorMessage(null)

    try {
      await updateRepository(owner, currentRepoName, {
        has_issues: hasIssues,
        has_pull_requests: hasPulls,
        has_wiki: hasWiki,
      })
      showSuccess('Features updated successfully')
      onRepositoryUpdated?.()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update features')
    } finally {
      setIsSavingFeatures(false)
    }
  }

  async function handleToggleVisibility() {
    setIsChangingVisibility(true)
    setErrorMessage(null)

    try {
      await updateRepository(owner, currentRepoName, {
        private: !repository.private,
      })
      setIsVisibilityModalOpen(false)
      showSuccess(`Repository is now ${repository.private ? 'public' : 'private'}`)
      onRepositoryUpdated?.()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to change repository visibility')
    } finally {
      setIsChangingVisibility(false)
    }
  }

  async function handleDeleteRepository() {
    const requiredConfirmation = `${owner}/${currentRepoName}`
    if (deleteConfirmText.trim() !== requiredConfirmation) return

    setIsDeleting(true)
    setErrorMessage(null)

    try {
      await deleteRepository(owner, currentRepoName)
      setIsDeleteModalOpen(false)
      navigate(`/${owner}`)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete repository')
      setIsDeleting(false)
    }
  }

  const expectedConfirm = `${owner}/${currentRepoName}`

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <aside className="w-full md:w-56 shrink-0 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
          Repository settings
        </div>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-[#21262d] text-[#e6edf3] border-l-2 border-[#f78166]"
        >
          <Octicon name="gear" size={14} />
          <span>General</span>
        </button>
      </aside>

      <section className="flex-1 w-full space-y-8 min-w-0">
        <div>
          <h1 className="text-xl font-semibold text-[#e6edf3]">General settings</h1>
          <p className="text-xs text-[#8b949e] mt-1">
            Manage repository details, branch settings, and general preferences.
          </p>
        </div>

        {successMessage && (
          <div className="p-3 bg-[#238636]/15 border border-[#238636]/40 rounded-md text-[#3fb950] text-xs flex items-center gap-2">
            <Octicon name="check" size={14} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-[#f85149]/15 border border-[#f85149]/40 rounded-md text-[#f85149] text-xs flex items-center gap-2">
            <Octicon name="alert" size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-5 border border-[#30363d] rounded-md bg-[#0d1117] space-y-4">
          <h2 className="text-sm font-semibold text-[#e6edf3]">Repository name</h2>
          <form onSubmit={handleRename} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="flex-1 max-w-sm px-3 py-1.5 text-xs bg-[#161b22] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] h-8"
            />
            <button
              type="submit"
              disabled={isRenaming || !name.trim() || name.trim() === currentRepoName}
              className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
            >
              {isRenaming ? 'Renaming...' : 'Rename'}
            </button>
          </form>
        </div>

        <div className="p-5 border border-[#30363d] rounded-md bg-[#0d1117] space-y-4">
          <h2 className="text-sm font-semibold text-[#e6edf3]">Repository details</h2>
          <form onSubmit={handleSaveDetails} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block font-semibold text-[#e6edf3]">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Short description of the repository"
                className="w-full px-3 py-2 bg-[#161b22] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] resize-none"
              />
            </div>

            <div className="space-y-1.5 max-w-md">
              <label className="block font-semibold text-[#e6edf3]">Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-1.5 bg-[#161b22] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] h-8"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingDetails}
              className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSavingDetails ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>

        <div className="p-5 border border-[#30363d] rounded-md bg-[#0d1117] space-y-4">
          <h2 className="text-sm font-semibold text-[#e6edf3]">Default branch</h2>
          <p className="text-xs text-[#8b949e]">
            The default branch is considered the base branch in your repository for pull requests and code commits.
          </p>
          <form onSubmit={handleSaveBranch} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <select
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#161b22] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] h-8 min-w-[160px]"
            >
              {(branches || []).map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
              {(!branches || branches.length === 0) && (
                <option value={defaultBranch}>{defaultBranch}</option>
              )}
            </select>
            <button
              type="submit"
              disabled={isSavingBranch || defaultBranch === repository.default_branch}
              className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
            >
              {isSavingBranch ? 'Updating...' : 'Update default branch'}
            </button>
          </form>
        </div>

        <div className="p-5 border border-[#30363d] rounded-md bg-[#0d1117] space-y-4">
          <h2 className="text-sm font-semibold text-[#e6edf3]">Features</h2>
          <form onSubmit={handleSaveFeatures} className="space-y-3 text-xs">
            <label htmlFor={issuesId} className="flex items-center gap-2 cursor-pointer text-[#e6edf3]">
              <input
                id={issuesId}
                type="checkbox"
                checked={hasIssues}
                onChange={(e) => setHasIssues(e.target.checked)}
                className="rounded border-[#30363d] bg-[#161b22] text-[#238636] focus:ring-0"
              />
              <span>Issues</span>
            </label>

            <label htmlFor={pullsId} className="flex items-center gap-2 cursor-pointer text-[#e6edf3]">
              <input
                id={pullsId}
                type="checkbox"
                checked={hasPulls}
                onChange={(e) => setHasPulls(e.target.checked)}
                className="rounded border-[#30363d] bg-[#161b22] text-[#238636] focus:ring-0"
              />
              <span>Pull requests</span>
            </label>

            <label htmlFor={wikiId} className="flex items-center gap-2 cursor-pointer text-[#e6edf3]">
              <input
                id={wikiId}
                type="checkbox"
                checked={hasWiki}
                onChange={(e) => setHasWiki(e.target.checked)}
                className="rounded border-[#30363d] bg-[#161b22] text-[#238636] focus:ring-0"
              />
              <span>Wiki</span>
            </label>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingFeatures}
                className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingFeatures ? 'Saving...' : 'Save features'}
              </button>
            </div>
          </form>
        </div>

        <div className="border border-[#f85149]/40 rounded-md bg-[#0d1117] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f85149]/20 bg-[#f85149]/5 flex items-center gap-2">
            <Octicon name="alert" size={16} className="text-[#f85149]" />
            <h2 className="text-sm font-semibold text-[#f85149]">Danger Zone</h2>
          </div>

          <div className="p-5 divide-y divide-[#30363d] space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <h3 className="font-semibold text-[#e6edf3]">Change repository visibility</h3>
                <p className="text-[#8b949e]">
                  This repository is currently <span className="font-semibold text-[#e6edf3]">{repository.private ? 'private' : 'public'}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVisibilityModalOpen(true)}
                className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#f85149] border border-[#30363d] font-semibold transition-colors cursor-pointer shrink-0"
              >
                Change to {repository.private ? 'public' : 'private'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div>
                <h3 className="font-semibold text-[#f85149]">Delete this repository</h3>
                <p className="text-[#8b949e]">
                  Once you delete a repository, there is no going back. Please be certain.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmText('')
                  setIsDeleteModalOpen(true)
                }}
                className="px-3 py-1.5 rounded-md bg-[#da3633]/15 hover:bg-[#da3633] text-[#f85149] hover:text-white border border-[#da3633]/40 font-semibold transition-colors cursor-pointer shrink-0"
              >
                Delete this repository
              </button>
            </div>
          </div>
        </div>
      </section>

      {isVisibilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
              <h3 className="font-semibold text-[#e6edf3]">Change visibility</h3>
              <button
                type="button"
                onClick={() => setIsVisibilityModalOpen(false)}
                className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded-md cursor-pointer"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[#8b949e]">
                Are you sure you want to change the visibility of <span className="font-semibold text-[#e6edf3]">{owner}/{currentRepoName}</span> to <span className="font-semibold text-[#e6edf3]">{repository.private ? 'public' : 'private'}</span>?
              </p>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVisibilityModalOpen(false)}
                  disabled={isChangingVisibility}
                  className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleToggleVisibility}
                  disabled={isChangingVisibility}
                  className="px-3 py-1.5 rounded-md bg-[#da3633] hover:bg-[#b62324] text-white font-semibold transition-colors cursor-pointer"
                >
                  {isChangingVisibility ? 'Updating...' : `Make ${repository.private ? 'public' : 'private'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#161b22] border border-[#f85149]/40 rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
              <h3 className="font-semibold text-[#f85149]">Delete repository</h3>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded-md cursor-pointer"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-md text-[#f85149]">
                This action cannot be undone. This will permanently delete the <span className="font-semibold">{expectedConfirm}</span> repository, wiki, issues, and comments.
              </div>

              <div className="space-y-1.5">
                <label className="block text-[#e6edf3]">
                  Please type <span className="font-mono font-bold text-[#e6edf3]">{expectedConfirm}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={expectedConfirm}
                  className="w-full px-3 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#f85149] h-8 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRepository}
                  disabled={isDeleting || deleteConfirmText.trim() !== expectedConfirm}
                  className="px-3 py-1.5 rounded-md bg-[#da3633] hover:bg-[#b62324] text-white font-semibold transition-colors cursor-pointer disabled:opacity-40"
                >
                  {isDeleting ? 'Deleting repository...' : 'I understand, delete this repository'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
