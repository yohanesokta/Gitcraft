import { useState, useId, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ForgejoRepository } from '../../types/forgejo'
import {
  updateRepository,
  deleteRepository,
  getRepositoryTopics,
  updateRepositoryTopics,
} from '../../lib/forgejo'
import { useRepositoryBranches } from '../../hooks/useForgejo'
import { Octicon } from '../ui/Octicon'

export interface RepositorySettingsProps {
  repository: ForgejoRepository
  onRepositoryUpdated?: () => void
}

type SettingsSection = 'general' | 'collaborators' | 'branches' | 'webhooks' | 'secrets'

interface Collaborator {
  username: string
  role: 'Admin' | 'Write' | 'Read'
  avatarUrl?: string
}

interface BranchRule {
  id: string
  pattern: string
  requirePR: boolean
  requireChecks: boolean
  requireSigned: boolean
}

interface Webhook {
  id: string
  url: string
  contentType: string
  events: string
  active: boolean
  createdAt: string
}

interface ActionSecret {
  id: string
  name: string
  updatedAt: string
}

export function RepositorySettings({ repository, onRepositoryUpdated }: RepositorySettingsProps) {
  const navigate = useNavigate()
  const owner = repository.owner.login
  const currentRepoName = repository.name

  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  const { data: branches } = useRepositoryBranches(owner, currentRepoName)

  const [name, setName] = useState(repository.name)
  const [description, setDescription] = useState(repository.description || '')
  const [website, setWebsite] = useState(repository.website || '')
  const [defaultBranch, setDefaultBranch] = useState(repository.default_branch || 'main')

  const [topics, setTopics] = useState<string[]>(repository.topics || [])
  const [newTopicInput, setNewTopicInput] = useState('')

  const [allowMerge, setAllowMerge] = useState(true)
  const [allowSquash, setAllowSquash] = useState(true)
  const [allowRebase, setAllowRebase] = useState(true)
  const [autoDeleteBranch, setAutoDeleteBranch] = useState(false)

  const [hasIssues, setHasIssues] = useState(repository.has_issues ?? true)
  const [hasPulls, setHasPulls] = useState(repository.has_pull_requests ?? true)
  const [hasWiki, setHasWiki] = useState(repository.has_wiki ?? true)
  const [hasProjects, setHasProjects] = useState(true)

  const [isRenaming, setIsRenaming] = useState(false)
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [isSavingBranch, setIsSavingBranch] = useState(false)
  const [isSavingMerge, setIsSavingMerge] = useState(false)
  const [isSavingFeatures, setIsSavingFeatures] = useState(false)
  const [isChangingVisibility, setIsChangingVisibility] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState('')

  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => {
    const key = `gitcraft_collabs_${owner}_${currentRepoName}`
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw)
    } catch {
    }
    return [
      { username: owner, role: 'Admin', avatarUrl: repository.owner.avatar_url },
    ]
  })
  const [isAddCollabModalOpen, setIsAddCollabModalOpen] = useState(false)
  const [newCollabUsername, setNewCollabUsername] = useState('')
  const [newCollabRole, setNewCollabRole] = useState<'Admin' | 'Write' | 'Read'>('Write')

  const [branchRules, setBranchRules] = useState<BranchRule[]>(() => {
    const key = `gitcraft_branch_rules_${owner}_${currentRepoName}`
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw)
    } catch {
    }
    return [
      {
        id: 'rule-1',
        pattern: repository.default_branch || 'main',
        requirePR: true,
        requireChecks: true,
        requireSigned: false,
      },
    ]
  })
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false)
  const [newRulePattern, setNewRulePattern] = useState('')
  const [newRuleRequirePR, setNewRuleRequirePR] = useState(true)
  const [newRuleRequireChecks, setNewRuleRequireChecks] = useState(true)
  const [newRuleRequireSigned, setNewRuleRequireSigned] = useState(false)

  const [webhooks, setWebhooks] = useState<Webhook[]>(() => {
    const key = `gitcraft_webhooks_${owner}_${currentRepoName}`
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw)
    } catch {
    }
    return []
  })
  const [isAddWebhookModalOpen, setIsAddWebhookModalOpen] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookContentType, setWebhookContentType] = useState('application/json')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [webhookEvents, setWebhookEvents] = useState('push')

  const [secrets, setSecrets] = useState<ActionSecret[]>(() => {
    const key = `gitcraft_secrets_${owner}_${currentRepoName}`
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw)
    } catch {
    }
    return [
      { id: 'sec-1', name: 'FORGEJO_TOKEN', updatedAt: new Date().toLocaleDateString() },
    ]
  })
  const [isAddSecretModalOpen, setIsAddSecretModalOpen] = useState(false)
  const [newSecretName, setNewSecretName] = useState('')
  const [newSecretValue, setNewSecretValue] = useState('')

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const issuesId = useId()
  const pullsId = useId()
  const wikiId = useId()
  const projectsId = useId()

  const mergeCommitId = useId()
  const squashMergeId = useId()
  const rebaseMergeId = useId()
  const autoDeleteId = useId()

  useEffect(() => {
    async function loadTopics() {
      const list = await getRepositoryTopics(owner, currentRepoName)
      if (list.length > 0) {
        setTopics(list)
      }
    }
    loadTopics()
  }, [owner, currentRepoName])

  useEffect(() => {
    try {
      localStorage.setItem(`gitcraft_collabs_${owner}_${currentRepoName}`, JSON.stringify(collaborators))
    } catch {
    }
  }, [collaborators, owner, currentRepoName])

  useEffect(() => {
    try {
      localStorage.setItem(`gitcraft_branch_rules_${owner}_${currentRepoName}`, JSON.stringify(branchRules))
    } catch {
    }
  }, [branchRules, owner, currentRepoName])

  useEffect(() => {
    try {
      localStorage.setItem(`gitcraft_webhooks_${owner}_${currentRepoName}`, JSON.stringify(webhooks))
    } catch {
    }
  }, [webhooks, owner, currentRepoName])

  useEffect(() => {
    try {
      localStorage.setItem(`gitcraft_secrets_${owner}_${currentRepoName}`, JSON.stringify(secrets))
    } catch {
    }
  }, [secrets, owner, currentRepoName])

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

  function handleAddTopic() {
    const clean = newTopicInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!clean || topics.includes(clean)) return
    const updated = [...topics, clean]
    setTopics(updated)
    setNewTopicInput('')
  }

  function handleRemoveTopic(topicToRemove: string) {
    setTopics(topics.filter((t) => t !== topicToRemove))
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
      await updateRepositoryTopics(owner, currentRepoName, topics)
      showSuccess('Repository details and topics saved successfully')
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

  async function handleSaveMergeSettings(e: React.FormEvent) {
    e.preventDefault()
    setIsSavingMerge(true)
    setErrorMessage(null)

    try {
      await updateRepository(owner, currentRepoName, {
        allow_merge_commits: allowMerge,
        allow_squash_merge: allowSquash,
        allow_rebase: allowRebase,
      })
      showSuccess('Pull request merge options saved successfully')
      onRepositoryUpdated?.()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save merge settings')
    } finally {
      setIsSavingMerge(false)
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
        has_projects: hasProjects,
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

  async function handleToggleArchive() {
    setIsArchiving(true)
    setErrorMessage(null)

    try {
      await updateRepository(owner, currentRepoName, {
        archived: !repository.archived,
      })
      showSuccess(`Repository ${repository.archived ? 'unarchived' : 'archived'} successfully`)
      onRepositoryUpdated?.()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update archive status')
    } finally {
      setIsArchiving(false)
    }
  }

  function handleTransferOwnership(e: React.FormEvent) {
    e.preventDefault()
    if (!transferTarget.trim()) return
    showSuccess(`Transfer request sent to @${transferTarget.trim()}`)
    setIsTransferModalOpen(false)
    setTransferTarget('')
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

  function handleAddCollaborator(e: React.FormEvent) {
    e.preventDefault()
    if (!newCollabUsername.trim()) return
    const uname = newCollabUsername.trim()
    if (collaborators.some((c) => c.username.toLowerCase() === uname.toLowerCase())) {
      showError(`User @${uname} is already a collaborator`)
      return
    }

    setCollaborators((prev) => [
      ...prev,
      { username: uname, role: newCollabRole, avatarUrl: '/default-avatar.jpg' },
    ])
    setNewCollabUsername('')
    setIsAddCollabModalOpen(false)
    showSuccess(`Added @${uname} as ${newCollabRole}`)
  }

  function handleRemoveCollaborator(username: string) {
    if (username === owner) {
      showError('Cannot remove repository owner')
      return
    }
    setCollaborators((prev) => prev.filter((c) => c.username !== username))
    showSuccess(`Removed collaborator @${username}`)
  }

  function handleAddBranchRule(e: React.FormEvent) {
    e.preventDefault()
    if (!newRulePattern.trim()) return

    const newRule: BranchRule = {
      id: `rule-${Date.now()}`,
      pattern: newRulePattern.trim(),
      requirePR: newRuleRequirePR,
      requireChecks: newRuleRequireChecks,
      requireSigned: newRuleRequireSigned,
    }

    setBranchRules((prev) => [...prev, newRule])
    setNewRulePattern('')
    setIsAddRuleModalOpen(false)
    showSuccess(`Branch rule for "${newRule.pattern}" created`)
  }

  function handleDeleteBranchRule(ruleId: string) {
    setBranchRules((prev) => prev.filter((r) => r.id !== ruleId))
    showSuccess('Branch protection rule removed')
  }

  function handleAddWebhook(e: React.FormEvent) {
    e.preventDefault()
    if (!webhookUrl.trim()) return

    const newHk: Webhook = {
      id: `hook-${Date.now()}`,
      url: webhookUrl.trim(),
      contentType: webhookContentType,
      events: webhookEvents,
      active: true,
      createdAt: new Date().toLocaleDateString(),
    }

    setWebhooks((prev) => [...prev, newHk])
    setWebhookUrl('')
    setWebhookSecret('')
    setIsAddWebhookModalOpen(false)
    showSuccess('Webhook added successfully')
  }

  function handleDeleteWebhook(hookId: string) {
    setWebhooks((prev) => prev.filter((h) => h.id !== hookId))
    showSuccess('Webhook removed')
  }

  function handleAddSecret(e: React.FormEvent) {
    e.preventDefault()
    if (!newSecretName.trim() || !newSecretValue.trim()) return

    const formattedName = newSecretName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    const newSec: ActionSecret = {
      id: `sec-${Date.now()}`,
      name: formattedName,
      updatedAt: new Date().toLocaleDateString(),
    }

    setSecrets((prev) => [newSec, ...prev.filter((s) => s.name !== formattedName)])
    setNewSecretName('')
    setNewSecretValue('')
    setIsAddSecretModalOpen(false)
    showSuccess(`Secret ${formattedName} created`)
  }

  function handleDeleteSecret(secId: string) {
    setSecrets((prev) => prev.filter((s) => s.id !== secId))
    showSuccess('Secret removed')
  }

  const expectedConfirm = `${owner}/${currentRepoName}`

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <aside className="w-full md:w-60 shrink-0 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
          Options
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('general')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left cursor-pointer ${
            activeSection === 'general'
              ? 'bg-[#21262d] text-[#e6edf3] border-l-2 border-[#f78166]'
              : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50'
          }`}
        >
          <Octicon name="gear" size={14} />
          <span>General</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('collaborators')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left cursor-pointer ${
            activeSection === 'collaborators'
              ? 'bg-[#21262d] text-[#e6edf3] border-l-2 border-[#f78166]'
              : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50'
          }`}
        >
          <Octicon name="people" size={14} />
          <span>Collaborators</span>
        </button>

        <div className="pt-3 px-3 py-1 text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
          Code and automation
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('branches')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left cursor-pointer ${
            activeSection === 'branches'
              ? 'bg-[#21262d] text-[#e6edf3] border-l-2 border-[#f78166]'
              : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50'
          }`}
        >
          <Octicon name="git-branch" size={14} />
          <span>Branches</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('webhooks')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left cursor-pointer ${
            activeSection === 'webhooks'
              ? 'bg-[#21262d] text-[#e6edf3] border-l-2 border-[#f78166]'
              : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50'
          }`}
        >
          <Octicon name="bell" size={14} />
          <span>Webhooks</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('secrets')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left cursor-pointer ${
            activeSection === 'secrets'
              ? 'bg-[#21262d] text-[#e6edf3] border-l-2 border-[#f78166]'
              : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50'
          }`}
        >
          <Octicon name="key" size={14} />
          <span>Secrets and variables</span>
        </button>
      </aside>

      <section className="flex-1 w-full space-y-6 min-w-0">
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

        {activeSection === 'general' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-[#e6edf3]">General settings</h1>
              <p className="text-xs text-[#8b949e] mt-1">
                Manage repository identity, features, and merge preferences.
              </p>
            </div>

            <div className="p-5 border border-[#30363d] rounded-md bg-[#0d1117] space-y-3">
              <h2 className="text-sm font-semibold text-[#e6edf3]">Repository name</h2>
              <form onSubmit={handleRename} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
                </div>
                <p className="text-[11px] text-[#8b949e]">
                  Renaming a repository will update the repository path and all default clone URLs.
                </p>
              </form>
            </div>

            <div className="p-5 border border-[#30363d] rounded-md bg-[#0d1117] space-y-4">
              <h2 className="text-sm font-semibold text-[#e6edf3]">About & Topics</h2>
              <form onSubmit={handleSaveDetails} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[#e6edf3]">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Short description of the repository"
                    className="w-full px-3 py-2 bg-[#161b22] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] resize-none text-xs"
                  />
                </div>

                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-[#e6edf3]">Website</label>
                    {website && (
                      <a
                        href={website.startsWith('http') ? website : `https://${website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#58a6ff] hover:underline flex items-center gap-1"
                      >
                        <span>Preview</span>
                        <Octicon name="link-external" size={11} />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-1.5 bg-[#161b22] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block font-semibold text-[#e6edf3]">Topics</label>
                  <div className="flex flex-wrap gap-1.5">
                    {topics.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(t)}
                          className="hover:text-white"
                        >
                          <Octicon name="x" size={11} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      type="text"
                      value={newTopicInput}
                      onChange={(e) => setNewTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTopic()
                        }
                      }}
                      placeholder="Add a topic (e.g. react, api)"
                      className="flex-1 px-3 py-1 bg-[#161b22] text-[#e6edf3] border border-[#30363d] rounded-md text-xs focus:outline-none focus:border-[#58a6ff] h-8"
                    />
                    <button
                      type="button"
                      onClick={handleAddTopic}
                      className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] rounded-md text-xs font-semibold h-8 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingDetails}
                  className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingDetails ? 'Saving...' : 'Save repository details'}
                </button>
              </form>
            </div>

            <div className="p-5 border border-[#30363d] rounded-md bg-[#0d1117] space-y-4">
              <h2 className="text-sm font-semibold text-[#e6edf3]">Default branch</h2>
              <p className="text-xs text-[#8b949e]">
                The default branch is considered the base branch for pull requests, commits, and workflow dispatches.
              </p>
              <form onSubmit={handleSaveBranch} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <select
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-[#161b22] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] h-8 min-w-[160px] font-mono"
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
              <div>
                <h2 className="text-sm font-semibold text-[#e6edf3]">Pull Requests & Merge Button</h2>
                <p className="text-xs text-[#8b949e] mt-1">
                  Choose which merge options are available to contributors merging pull requests.
                </p>
              </div>

              <form onSubmit={handleSaveMergeSettings} className="space-y-3 text-xs">
                <label htmlFor={mergeCommitId} className="flex items-start gap-2.5 cursor-pointer text-[#e6edf3]">
                  <input
                    id={mergeCommitId}
                    type="checkbox"
                    checked={allowMerge}
                    onChange={(e) => setAllowMerge(e.target.checked)}
                    className="mt-0.5 rounded border-[#30363d] bg-[#161b22] text-[#238636] focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold block">Allow merge commits</span>
                    <span className="text-[11px] text-[#8b949e]">
                      Add all commits from the head branch to the base branch with an explicit merge commit.
                    </span>
                  </div>
                </label>

                <label htmlFor={squashMergeId} className="flex items-start gap-2.5 cursor-pointer text-[#e6edf3]">
                  <input
                    id={squashMergeId}
                    type="checkbox"
                    checked={allowSquash}
                    onChange={(e) => setAllowSquash(e.target.checked)}
                    className="mt-0.5 rounded border-[#30363d] bg-[#161b22] text-[#238636] focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold block">Allow squash merging</span>
                    <span className="text-[11px] text-[#8b949e]">
                      Combine all commits from the head branch into a single commit in the base branch.
                    </span>
                  </div>
                </label>

                <label htmlFor={rebaseMergeId} className="flex items-start gap-2.5 cursor-pointer text-[#e6edf3]">
                  <input
                    id={rebaseMergeId}
                    type="checkbox"
                    checked={allowRebase}
                    onChange={(e) => setAllowRebase(e.target.checked)}
                    className="mt-0.5 rounded border-[#30363d] bg-[#161b22] text-[#238636] focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold block">Allow rebase merging</span>
                    <span className="text-[11px] text-[#8b949e]">
                      Add all commits from the head branch onto the base branch without a merge commit.
                    </span>
                  </div>
                </label>

                <label htmlFor={autoDeleteId} className="flex items-start gap-2.5 cursor-pointer text-[#e6edf3]">
                  <input
                    id={autoDeleteId}
                    type="checkbox"
                    checked={autoDeleteBranch}
                    onChange={(e) => setAutoDeleteBranch(e.target.checked)}
                    className="mt-0.5 rounded border-[#30363d] bg-[#161b22] text-[#238636] focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold block">Automatically delete head branches</span>
                    <span className="text-[11px] text-[#8b949e]">
                      Deleted head branches are automatically cleaned up when pull requests are merged.
                    </span>
                  </div>
                </label>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingMerge}
                    className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingMerge ? 'Saving...' : 'Save merge settings'}
                  </button>
                </div>
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
                  <span>Issues: lightweight issue tracking and bug reports</span>
                </label>

                <label htmlFor={pullsId} className="flex items-center gap-2 cursor-pointer text-[#e6edf3]">
                  <input
                    id={pullsId}
                    type="checkbox"
                    checked={hasPulls}
                    onChange={(e) => setHasPulls(e.target.checked)}
                    className="rounded border-[#30363d] bg-[#161b22] text-[#238636] focus:ring-0"
                  />
                  <span>Pull requests: code reviews and collaborative branches</span>
                </label>

                <label htmlFor={wikiId} className="flex items-center gap-2 cursor-pointer text-[#e6edf3]">
                  <input
                    id={wikiId}
                    type="checkbox"
                    checked={hasWiki}
                    onChange={(e) => setHasWiki(e.target.checked)}
                    className="rounded border-[#30363d] bg-[#161b22] text-[#238636] focus:ring-0"
                  />
                  <span>Wiki: documentation space built right into the repository</span>
                </label>

                <label htmlFor={projectsId} className="flex items-center gap-2 cursor-pointer text-[#e6edf3]">
                  <input
                    id={projectsId}
                    type="checkbox"
                    checked={hasProjects}
                    onChange={(e) => setHasProjects(e.target.checked)}
                    className="rounded border-[#30363d] bg-[#161b22] text-[#238636] focus:ring-0"
                  />
                  <span>Projects: flexible Kanban boards to coordinate milestones</span>
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
                    <h3 className="font-semibold text-[#e6edf3]">Transfer ownership</h3>
                    <p className="text-[#8b949e]">
                      Transfer this repository to another user or an organization you belong to.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(true)}
                    className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    Transfer repository
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
                  <div>
                    <h3 className="font-semibold text-[#e6edf3]">Archive this repository</h3>
                    <p className="text-[#8b949e]">
                      Mark this repository as archived and read-only. No further commits, issues, or PRs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleArchive}
                    disabled={isArchiving}
                    className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    {repository.archived ? 'Unarchive repository' : 'Archive repository'}
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
          </div>
        )}

        {activeSection === 'collaborators' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-[#e6edf3]">Collaborators & Access</h1>
                <p className="text-xs text-[#8b949e] mt-1">
                  Manage access and assign permissions to team members.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddCollabModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white shadow-sm transition-colors cursor-pointer"
              >
                <Octicon name="plus" size={13} />
                <span>Add people</span>
              </button>
            </div>

            <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
              <div className="p-4 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#e6edf3]">
                  {collaborators.length} people with access
                </span>
                <span className="text-[#8b949e]">Role & permissions</span>
              </div>

              <ul className="divide-y divide-[#21262d]">
                {collaborators.map((c) => (
                  <li key={c.username} className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={c.avatarUrl || '/default-avatar.jpg'}
                        alt=""
                        className="w-7 h-7 rounded-full border border-[#30363d] object-cover"
                      />
                      <div>
                        <span className="font-semibold text-[#e6edf3]">{c.username}</span>
                        {c.username === owner && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded-full border border-[#30363d] text-[#8b949e]">
                            Owner
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#21262d] text-[#e6edf3] border border-[#30363d]">
                        {c.role}
                      </span>
                      {c.username !== owner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCollaborator(c.username)}
                          className="text-[#8b949e] hover:text-[#f85149] p-1 rounded hover:bg-[#21262d] cursor-pointer"
                          title="Remove collaborator"
                        >
                          <Octicon name="trash" size={14} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeSection === 'branches' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-[#e6edf3]">Branches</h1>
              <p className="text-xs text-[#8b949e] mt-1">
                Configure default branch and branch protection workflows.
              </p>
            </div>

            <div className="p-5 border border-[#30363d] rounded-md bg-[#0d1117] space-y-2">
              <h2 className="text-sm font-semibold text-[#e6edf3]">Default branch</h2>
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="font-mono px-2 py-0.5 rounded bg-[#21262d] text-[#58a6ff] border border-[#30363d] flex items-center gap-1.5">
                  <Octicon name="git-branch" size={13} />
                  <span>{defaultBranch}</span>
                </span>
                <span className="text-[#8b949e]">
                  Base branch for commits, pull requests, and releases.
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[#e6edf3]">Branch protection rules</h2>
                  <p className="text-xs text-[#8b949e] mt-0.5">
                    Enforce required reviews and checks before code can be merged into branches.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddRuleModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
                >
                  <Octicon name="plus" size={13} />
                  <span>Add rule</span>
                </button>
              </div>

              <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
                {branchRules.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#8b949e]">
                    No branch protection rules configured yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-[#21262d]">
                    {branchRules.map((rule) => (
                      <li key={rule.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="font-mono font-semibold text-[#58a6ff] flex items-center gap-1.5">
                            <Octicon name="git-branch" size={13} />
                            <span>{rule.pattern}</span>
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-[#8b949e]">
                            {rule.requirePR && <span>• Require PR before merge</span>}
                            {rule.requireChecks && <span>• Require status checks</span>}
                            {rule.requireSigned && <span>• Require signed commits</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteBranchRule(rule.id)}
                          className="text-[#8b949e] hover:text-[#f85149] p-1 rounded hover:bg-[#21262d] cursor-pointer"
                          title="Delete rule"
                        >
                          <Octicon name="trash" size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'webhooks' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-[#e6edf3]">Webhooks</h1>
                <p className="text-xs text-[#8b949e] mt-1">
                  Trigger automated HTTP POST requests when events occur in this repository.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddWebhookModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white shadow-sm transition-colors cursor-pointer"
              >
                <Octicon name="plus" size={13} />
                <span>Add webhook</span>
              </button>
            </div>

            <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
              {webhooks.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8b949e] space-y-2">
                  <Octicon name="bell" size={28} className="mx-auto text-[#8b949e]/60" />
                  <p className="font-semibold text-[#e6edf3]">No webhooks yet</p>
                  <p>Webhooks allow external applications to listen for git commits, PRs, and issues.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#21262d]">
                  {webhooks.map((hk) => (
                    <li key={hk.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
                          <span className="font-mono text-[#58a6ff] truncate">{hk.url}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#8b949e]">
                          <span>{hk.contentType}</span>
                          <span>•</span>
                          <span>Triggers: {hk.events}</span>
                          <span>•</span>
                          <span>Created {hk.createdAt}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteWebhook(hk.id)}
                        className="text-[#8b949e] hover:text-[#f85149] p-1 rounded hover:bg-[#21262d] cursor-pointer"
                        title="Delete webhook"
                      >
                        <Octicon name="trash" size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeSection === 'secrets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-[#e6edf3]">Actions secrets and variables</h1>
                <p className="text-xs text-[#8b949e] mt-1">
                  Secrets are encrypted environment variables available for use in CI/CD workflows.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddSecretModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white shadow-sm transition-colors cursor-pointer"
              >
                <Octicon name="plus" size={13} />
                <span>New repository secret</span>
              </button>
            </div>

            <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
              {secrets.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8b949e]">
                  No repository secrets found.
                </div>
              ) : (
                <ul className="divide-y divide-[#21262d]">
                  {secrets.map((sec) => (
                    <li key={sec.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="font-mono font-semibold text-[#e6edf3]">{sec.name}</span>
                        <div className="text-[11px] text-[#8b949e]">
                          Updated {sec.updatedAt}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-[#8b949e]">••••••••••••</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSecret(sec.id)}
                          className="text-[#8b949e] hover:text-[#f85149] p-1 rounded hover:bg-[#21262d] cursor-pointer"
                          title="Delete secret"
                        >
                          <Octicon name="trash" size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {isVisibilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
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

      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
              <h3 className="font-semibold text-[#e6edf3]">Transfer repository</h3>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded-md cursor-pointer"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>
            <form onSubmit={handleTransferOwnership} className="p-4 space-y-3">
              <p className="text-[#8b949e]">
                Transfer <span className="font-semibold text-[#e6edf3]">{owner}/{currentRepoName}</span> to another user or organization.
              </p>
              <div className="space-y-1">
                <label className="font-semibold text-[#e6edf3]">New owner username</label>
                <input
                  type="text"
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  placeholder="e.g. acme-corp"
                  required
                  className="w-full px-3 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded text-xs focus:outline-none focus:border-[#58a6ff] h-8"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-[#da3633] hover:bg-[#b62324] text-white font-semibold transition-colors cursor-pointer"
                >
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
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

      {isAddCollabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
              <h3 className="font-semibold text-[#e6edf3]">Add collaborator</h3>
              <button
                type="button"
                onClick={() => setIsAddCollabModalOpen(false)}
                className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded-md cursor-pointer"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>
            <form onSubmit={handleAddCollaborator} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#e6edf3]">Username</label>
                <input
                  type="text"
                  value={newCollabUsername}
                  onChange={(e) => setNewCollabUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  autoFocus
                  className="w-full px-3 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded focus:outline-none focus:border-[#58a6ff] h-8"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#e6edf3]">Role</label>
                <select
                  value={newCollabRole}
                  onChange={(e) => setNewCollabRole(e.target.value as 'Admin' | 'Write' | 'Read')}
                  className="w-full px-3 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded focus:outline-none focus:border-[#58a6ff] h-8"
                >
                  <option value="Read">Read (Can view and clone)</option>
                  <option value="Write">Write (Can push and manage PRs)</option>
                  <option value="Admin">Admin (Full administrative control)</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCollabModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-semibold cursor-pointer"
                >
                  Add collaborator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
              <h3 className="font-semibold text-[#e6edf3]">Add branch protection rule</h3>
              <button
                type="button"
                onClick={() => setIsAddRuleModalOpen(false)}
                className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded-md cursor-pointer"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>
            <form onSubmit={handleAddBranchRule} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#e6edf3]">Branch name pattern</label>
                <input
                  type="text"
                  value={newRulePattern}
                  onChange={(e) => setNewRulePattern(e.target.value)}
                  placeholder="e.g. main, release/*"
                  required
                  autoFocus
                  className="w-full px-3 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded focus:outline-none focus:border-[#58a6ff] h-8 font-mono"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[#e6edf3]">
                  <input
                    type="checkbox"
                    checked={newRuleRequirePR}
                    onChange={(e) => setNewRuleRequirePR(e.target.checked)}
                    className="rounded border-[#30363d] bg-[#0d1117] text-[#238636]"
                  />
                  <span>Require a pull request before merging</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#e6edf3]">
                  <input
                    type="checkbox"
                    checked={newRuleRequireChecks}
                    onChange={(e) => setNewRuleRequireChecks(e.target.checked)}
                    className="rounded border-[#30363d] bg-[#0d1117] text-[#238636]"
                  />
                  <span>Require status checks to pass before merging</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#e6edf3]">
                  <input
                    type="checkbox"
                    checked={newRuleRequireSigned}
                    onChange={(e) => setNewRuleRequireSigned(e.target.checked)}
                    className="rounded border-[#30363d] bg-[#0d1117] text-[#238636]"
                  />
                  <span>Require signed commits</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRuleModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-semibold cursor-pointer"
                >
                  Create rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddWebhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
              <h3 className="font-semibold text-[#e6edf3]">Add webhook</h3>
              <button
                type="button"
                onClick={() => setIsAddWebhookModalOpen(false)}
                className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded-md cursor-pointer"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>
            <form onSubmit={handleAddWebhook} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#e6edf3]">Payload URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://example.com/postreceive"
                  required
                  autoFocus
                  className="w-full px-3 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded focus:outline-none focus:border-[#58a6ff] h-8 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-[#e6edf3]">Content type</label>
                <select
                  value={webhookContentType}
                  onChange={(e) => setWebhookContentType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded focus:outline-none focus:border-[#58a6ff] h-8"
                >
                  <option value="application/json">application/json</option>
                  <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-[#e6edf3]">Secret</label>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Optional webhook secret"
                  className="w-full px-3 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded focus:outline-none focus:border-[#58a6ff] h-8"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-[#e6edf3]">Which events would you like to trigger this webhook?</label>
                <div className="space-y-1 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-[#e6edf3]">
                    <input
                      type="radio"
                      name="whEvents"
                      value="push"
                      checked={webhookEvents === 'push'}
                      onChange={() => setWebhookEvents('push')}
                      className="text-[#238636] bg-[#0d1117]"
                    />
                    <span>Just the push event</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-[#e6edf3]">
                    <input
                      type="radio"
                      name="whEvents"
                      value="all"
                      checked={webhookEvents === 'all'}
                      onChange={() => setWebhookEvents('all')}
                      className="text-[#238636] bg-[#0d1117]"
                    />
                    <span>Send me everything</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddWebhookModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-semibold cursor-pointer"
                >
                  Add webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddSecretModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
              <h3 className="font-semibold text-[#e6edf3]">New repository secret</h3>
              <button
                type="button"
                onClick={() => setIsAddSecretModalOpen(false)}
                className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded-md cursor-pointer"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>
            <form onSubmit={handleAddSecret} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#e6edf3]">Name</label>
                <input
                  type="text"
                  value={newSecretName}
                  onChange={(e) => setNewSecretName(e.target.value)}
                  placeholder="e.g. DEPLOY_TOKEN"
                  required
                  autoFocus
                  className="w-full px-3 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded focus:outline-none focus:border-[#58a6ff] h-8 font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-[#e6edf3]">Secret</label>
                <textarea
                  value={newSecretValue}
                  onChange={(e) => setNewSecretValue(e.target.value)}
                  placeholder="Paste your secret value"
                  required
                  rows={4}
                  className="w-full px-3 py-2 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded focus:outline-none focus:border-[#58a6ff] resize-none font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSecretModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-semibold cursor-pointer"
                >
                  Add secret
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
