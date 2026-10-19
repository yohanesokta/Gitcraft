import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  useUserOrgs,
  useGitignoreTemplates,
  useLicenseTemplates,
} from '../hooks/useForgejo'
import {
  createRepository,
  getStoredUser,
  getAuthToken,
} from '../lib/forgejo'
import { Octicon } from '../components/ui/Octicon'

const FALLBACK_GITIGNORES = [
  'Node',
  'Python',
  'Go',
  'Rust',
  'Java',
  'C++',
  'C',
  'Ruby',
  'PHP',
  'Swift',
  'Unity',
]

const FALLBACK_LICENSES = [
  { key: 'MIT', name: 'MIT License' },
  { key: 'Apache-2.0', name: 'Apache License 2.0' },
  { key: 'GPL-3.0', name: 'GNU General Public License v3.0' },
  { key: 'BSD-3-Clause', name: 'BSD 3-Clause "New" or "Revised" License' },
  { key: 'Unlicense', name: 'The Unlicense' },
  { key: 'MPL-2.0', name: 'Mozilla Public License 2.0' },
]

export function NewRepositoryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUser = getStoredUser()
  const authToken = getAuthToken()
  const isLoggedIn = Boolean(currentUser && authToken)

  const { data: orgs } = useUserOrgs()
  const { data: apiGitignores } = useGitignoreTemplates()
  const { data: apiLicenses } = useLicenseTemplates()

  const [selectedOwner, setSelectedOwner] = useState(currentUser?.login || '')
  const [repoName, setRepoName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [addReadme, setAddReadme] = useState(false)
  const [addGitignore, setAddGitignore] = useState(false)
  const [selectedGitignore, setSelectedGitignore] = useState('Node')
  const [addLicense, setAddLicense] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState('MIT')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const gitignoreList = useMemo(() => {
    if (apiGitignores && apiGitignores.length > 0) {
      return apiGitignores
    }
    return FALLBACK_GITIGNORES
  }, [apiGitignores])

  const licenseList = useMemo(() => {
    if (apiLicenses && apiLicenses.length > 0) {
      return apiLicenses
    }
    return FALLBACK_LICENSES
  }, [apiLicenses])

  const ownerOptions = useMemo(() => {
    const list: { login: string; avatarUrl?: string; isOrg: boolean }[] = []
    if (currentUser?.login) {
      list.push({
        login: currentUser.login,
        avatarUrl: currentUser.avatar_url,
        isOrg: false,
      })
    }
    if (orgs && orgs.length > 0) {
      for (const org of orgs) {
        list.push({
          login: org.login,
          avatarUrl: org.avatar_url,
          isOrg: true,
        })
      }
    }
    return list
  }, [currentUser, orgs])

  const isCurrentOwnerAnOrg = Boolean(
    orgs?.some((o) => o.login.toLowerCase() === selectedOwner.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!repoName.trim()) return

    setIsSubmitting(true)
    setErrorMsg(null)

    const shouldAutoInit = addReadme || addGitignore || addLicense

    try {
      const createdRepo = await createRepository(
        {
          name: repoName.trim(),
          description: description.trim() || undefined,
          private: isPrivate,
          auto_init: shouldAutoInit,
          gitignores: addGitignore ? selectedGitignore : undefined,
          license: addLicense ? selectedLicense : undefined,
          readme: addReadme ? 'Default' : undefined,
          default_branch: 'main',
        },
        isCurrentOwnerAnOrg ? selectedOwner : undefined
      )

      queryClient.invalidateQueries({ queryKey: ['forgejo', 'repos'] })
      queryClient.invalidateQueries({ queryKey: ['forgejo', 'user_repos'] })

      const targetOwner = createdRepo.owner?.login || selectedOwner
      const targetRepo = createdRepo.name || repoName.trim()
      navigate(`/${targetOwner}/${targetRepo}`)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create repository')
      setIsSubmitting(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <div className="border border-border-default rounded-[var(--radius-card)] p-8 bg-canvas-subtle text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-canvas-raised border border-border-default flex items-center justify-center mx-auto text-accent-fg">
            <Octicon name="repo" size={24} />
          </div>
          <h2 className="text-xl font-semibold text-fg-default">
            Sign in to create a repository
          </h2>
          <p className="text-xs text-fg-muted max-w-sm mx-auto">
            You must be logged in with your Forgejo account to create personal or organizational repositories.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-accent-text bg-accent-fg hover:bg-accent-hover active:scale-[0.97] rounded-[var(--radius-control)] transition-all"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 text-fg-default">
      <div className="pb-6 border-b border-border-default space-y-1">
        <h1 className="text-2xl font-normal text-fg-default">
          Create a new repository
        </h1>
        <p className="text-xs text-fg-muted">
          A repository contains all project files, including the revision history.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="py-6 space-y-6 text-xs">
        {errorMsg && (
          <div className="p-3 bg-danger-fg/10 border border-danger-fg/30 rounded-[var(--radius-control)] text-xs text-danger-fg">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="w-full sm:w-48 space-y-1.5">
              <label className="block text-xs font-semibold text-fg-default">
                Owner <span className="text-danger-fg">*</span>
              </label>
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-canvas-subtle text-fg-default border border-border-default rounded-[var(--radius-control)] focus:outline-none focus:border-accent-fg cursor-pointer"
              >
                {ownerOptions.map((opt) => (
                  <option key={opt.login} value={opt.login}>
                    {opt.login} {opt.isOrg ? '(Organization)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <span className="hidden sm:inline-block text-xl font-light text-fg-muted pb-1">
              /
            </span>

            <div className="flex-1 space-y-1.5">
              <label className="block text-xs font-semibold text-fg-default">
                Repository name <span className="text-danger-fg">*</span>
              </label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="my-awesome-project"
                required
                pattern="^[a-zA-Z0-9_\-\.]+$"
                className="w-full h-8 px-3 text-xs bg-canvas-subtle text-fg-default placeholder:text-fg-subtle border border-border-default rounded-[var(--radius-control)] focus:outline-none focus:border-accent-fg"
              />
            </div>
          </div>

          <p className="text-[11px] text-fg-muted">
            Great repository names are short and memorable. Need inspiration? How about <span className="text-accent-fg font-medium">legendary-waddle</span>?
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-fg-default">
            Description <span className="text-fg-muted font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of this repository"
            className="w-full h-8 px-3 text-xs bg-canvas-subtle text-fg-default placeholder:text-fg-subtle border border-border-default rounded-[var(--radius-control)] focus:outline-none focus:border-accent-fg"
          />
        </div>

        <div className="pt-4 border-t border-border-default space-y-3">
          <label className="block text-xs font-semibold text-fg-default">
            Visibility
          </label>

          <div className="space-y-2">
            <label
              className={`flex items-start gap-3 p-3 rounded-[var(--radius-control)] border cursor-pointer transition-colors ${
                !isPrivate
                  ? 'border-accent-fg bg-canvas-subtle'
                  : 'border-border-default bg-canvas-default hover:bg-canvas-subtle'
              }`}
            >
              <input
                type="radio"
                name="visibility"
                checked={!isPrivate}
                onChange={() => setIsPrivate(false)}
                className="mt-0.5 accent-[var(--accent)] cursor-pointer"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-fg-default">
                  <Octicon name="repo" size={14} className="text-fg-muted" />
                  <span>Public</span>
                </div>
                <p className="text-[11px] text-fg-muted">
                  Anyone on the internet can see this repository. You choose who can commit.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-[var(--radius-control)] border cursor-pointer transition-colors ${
                isPrivate
                  ? 'border-accent-fg bg-canvas-subtle'
                  : 'border-border-default bg-canvas-default hover:bg-canvas-subtle'
              }`}
            >
              <input
                type="radio"
                name="visibility"
                checked={isPrivate}
                onChange={() => setIsPrivate(true)}
                className="mt-0.5 accent-[var(--accent)] cursor-pointer"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-fg-default">
                  <Octicon name="shield" size={14} className="text-fg-muted" />
                  <span>Private</span>
                </div>
                <p className="text-[11px] text-fg-muted">
                  You choose who can see and commit to this repository.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-border-default space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-fg-default">
              Initialize this repository with:
            </h3>
            <p className="text-[11px] text-fg-muted">
              Skip this step if you're pushing an existing repository.
            </p>
          </div>

          <div className="border border-border-default rounded-[var(--radius-card)] bg-canvas-subtle divide-y divide-border-default">
            <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-canvas-hover transition-colors">
              <input
                type="checkbox"
                checked={addReadme}
                onChange={(e) => setAddReadme(e.target.checked)}
                className="mt-0.5 rounded border-border-default bg-canvas-default text-accent-fg focus:ring-0 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="font-semibold text-fg-default block">
                  Add a README file
                </span>
                <p className="text-[11px] text-fg-muted">
                  This is where you can write a long description for your project.
                </p>
              </div>
            </label>

            <div className="p-3 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addGitignore}
                  onChange={(e) => setAddGitignore(e.target.checked)}
                  className="mt-0.5 rounded border-border-default bg-canvas-default text-accent-fg focus:ring-0 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold text-fg-default block">
                    Add .gitignore
                  </span>
                  <p className="text-[11px] text-fg-muted">
                    Choose which files not to track from a list of templates.
                  </p>
                </div>
              </label>

              {addGitignore && (
                <div className="pl-6 pt-1 max-w-xs">
                  <label className="block text-[11px] text-fg-muted mb-1">
                    .gitignore template
                  </label>
                  <select
                    value={selectedGitignore}
                    onChange={(e) => setSelectedGitignore(e.target.value)}
                    className="w-full h-7 px-2 text-xs bg-canvas-default text-fg-default border border-border-default rounded-[var(--radius-control)] focus:outline-none focus:border-accent-fg cursor-pointer"
                  >
                    {gitignoreList.map((tpl) => (
                      <option key={tpl} value={tpl}>
                        {tpl}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-3 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addLicense}
                  onChange={(e) => setAddLicense(e.target.checked)}
                  className="mt-0.5 rounded border-border-default bg-canvas-default text-accent-fg focus:ring-0 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold text-fg-default block">
                    Choose a license
                  </span>
                  <p className="text-[11px] text-fg-muted">
                    A license tells others what they can and can't do with your code.
                  </p>
                </div>
              </label>

              {addLicense && (
                <div className="pl-6 pt-1 max-w-xs">
                  <label className="block text-[11px] text-fg-muted mb-1">
                    License
                  </label>
                  <select
                    value={selectedLicense}
                    onChange={(e) => setSelectedLicense(e.target.value)}
                    className="w-full h-7 px-2 text-xs bg-canvas-default text-fg-default border border-border-default rounded-[var(--radius-control)] focus:outline-none focus:border-accent-fg cursor-pointer"
                  >
                    {licenseList.map((lic) => (
                      <option key={lic.key} value={lic.key}>
                        {lic.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border-default flex items-center justify-between flex-wrap gap-4">
          <p className="text-[11px] text-fg-muted">
            Your default branch will be named <span className="font-mono text-fg-default">main</span>.
          </p>

          <button
            type="submit"
            disabled={isSubmitting || !repoName.trim()}
            className="px-5 py-2 text-xs font-medium text-accent-text bg-accent-fg hover:bg-accent-hover active:scale-[0.97] rounded-[var(--radius-control)] disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          >
            {isSubmitting ? 'Creating repository...' : 'Create repository'}
          </button>
        </div>
      </form>
    </div>
  )
}
