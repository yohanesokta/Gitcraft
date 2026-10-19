import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  useRepository,
  useRepositoryContents,
  useRepositoryCommits,
  useRepositoryLanguages,
  useRepositoryBranches,
  useRepositoryTags,
  useRepositoryRawFile,
} from '../hooks/useForgejo'
import { RepositoryHeader } from '../components/repository/RepositoryHeader'
import { BranchSelector } from '../components/repository/BranchSelector'
import { FileBreadcrumbs } from '../components/repository/FileBreadcrumbs'
import { FileBrowser } from '../components/repository/FileBrowser'
import { BlobViewer } from '../components/repository/BlobViewer'
import { CommitBrowser } from '../components/repository/CommitBrowser'
import { ReadmeViewer } from '../components/repository/ReadmeViewer'
import { RepositorySidebar } from '../components/repository/RepositorySidebar'
import { FileSearchModal } from '../components/repository/FileSearchModal'
import { IssueList } from '../components/repository/IssueList'
import { IssueDetail } from '../components/repository/IssueDetail'
import { PullRequestList } from '../components/repository/PullRequestList'
import { PullRequestDetail } from '../components/repository/PullRequestDetail'
import { NewPullRequest } from '../components/repository/NewPullRequest'
import { RepositorySettings } from '../components/repository/RepositorySettings'
import { RepositoryActions } from '../components/repository/RepositoryActions'
import { RepositoryProjects } from '../components/repository/RepositoryProjects'
import { ReleaseList } from '../components/repository/ReleaseList'
import { NewRelease } from '../components/repository/NewRelease'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { Octicon } from '../components/ui/Octicon'
import { ForgejoContent } from '../types/forgejo'
import { getForgejoBaseUrl, getStoredUser } from '../lib/forgejo'

export function RepositoryPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>()
  const wildcard = useParams<{ '*': string }>()['*'] || ''

  const segments = wildcard.split('/').filter(Boolean)
  const routeMode = segments[0] || 'tree'

  const {
    data: repository,
    isLoading: isRepoLoading,
    isError: isRepoError,
    error: repoError,
    refetch: refetchRepo,
  } = useRepository(owner, repo)

  const defaultRef = repository?.default_branch || 'main'

  const selectedRef =
    routeMode === 'tree' || routeMode === 'blob' || routeMode === 'commits'
      ? segments[1] || defaultRef
      : defaultRef

  const subPath =
    routeMode === 'tree' || routeMode === 'blob'
      ? segments.slice(2).join('/')
      : ''

  const { data: branches } = useRepositoryBranches(owner, repo)
  const { data: tags } = useRepositoryTags(owner, repo)

  const {
    data: contents,
    isLoading: isContentsLoading,
    isError: isContentsError,
    error: contentsError,
  } = useRepositoryContents(owner, repo, subPath, selectedRef)

  const {
    data: commits,
    isLoading: isCommitsLoading,
  } = useRepositoryCommits(owner, repo, selectedRef)

  const {
    data: languagesData,
  } = useRepositoryLanguages(owner, repo)

  const fileList: ForgejoContent[] = Array.isArray(contents)
    ? contents
    : contents
    ? [contents]
    : []

  const readmeItem = fileList.find((f) => f.name.toLowerCase().startsWith('readme'))
  const licenseItem = fileList.find((f) => f.name.toLowerCase().startsWith('license'))

  const {
    data: rawReadme,
    isLoading: isReadmeLoading,
  } = useRepositoryRawFile(owner, repo, readmeItem?.path || '', selectedRef)

  const isBlobMode = routeMode === 'blob'
  const isCommitsMode = routeMode === 'commits'
  const isIssuesMode = routeMode === 'issues'
  const isPullsMode = routeMode === 'pulls'
  const isCompareMode = routeMode === 'compare'
  const isActionsMode = routeMode === 'actions'
  const isProjectsMode = routeMode === 'projects'
  const isSettingsMode = routeMode === 'settings'
  const isReleasesMode = routeMode === 'releases'

  const blobFilename = segments[segments.length - 1] || ''
  const {
    data: rawBlobContent,
    isLoading: isBlobLoading,
    refetch: refetchRawBlob,
  } = useRepositoryRawFile(owner, repo, subPath, selectedRef)

  const [isCodeMenuOpen, setIsCodeMenuOpen] = useState(false)
  const [cloneType, setCloneType] = useState<'https' | 'ssh'>('https')
  const [hasCopiedClone, setHasCopiedClone] = useState(false)
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false)
  const codeMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === 't' &&
        !isFileSearchOpen &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        setIsFileSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFileSearchOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (codeMenuRef.current && !codeMenuRef.current.contains(event.target as Node)) {
        setIsCodeMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const cloneUrl = useMemo(() => {
    if (!repository) return ''
    return cloneType === 'https' ? repository.clone_url : repository.ssh_url
  }, [repository, cloneType])

  async function handleCopyClone() {
    if (!cloneUrl) return
    try {
      await navigator.clipboard.writeText(cloneUrl)
      setHasCopiedClone(true)
      setTimeout(() => setHasCopiedClone(false), 2000)
    } catch {
    }
  }

  if (isRepoLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="pt-6">
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </div>
    )
  }

  if (isRepoError || !repository || !owner || !repo) {
    return (
      <ErrorState
        title="Could not load repository"
        message={repoError instanceof Error ? repoError.message : 'Repository not found or network error'}
        onRetry={() => refetchRepo()}
      />
    )
  }

  const latestCommit = commits && commits.length > 0 ? commits[0] : null
  const commitCount = commits ? commits.length : 1
  const baseUrl = getForgejoBaseUrl()
  const rawFileUrl = `${baseUrl}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/raw/${subPath}?ref=${selectedRef}`

  const currentUser = getStoredUser()
  const canManage = Boolean(
    repository?.permissions?.admin ||
    (currentUser && repository?.owner.login === currentUser.login)
  )

  return (
    <div className="space-y-6">
      <RepositoryHeader repository={repository} />

      {isSettingsMode ? (
        canManage ? (
          <RepositorySettings repository={repository} onRepositoryUpdated={refetchRepo} />
        ) : (
          <div className="p-8 text-center text-xs text-fg-muted border border-border-default rounded-md bg-canvas-subtle">
            You do not have administrative access to this repository.
          </div>
        )
      ) : isActionsMode ? (
        <RepositoryActions repository={repository} owner={owner} repo={repo} />
      ) : isProjectsMode ? (
        <RepositoryProjects repository={repository} owner={owner} repo={repo} />
      ) : isReleasesMode ? (
        segments[1] === 'new' ? (
          <NewRelease owner={owner} repo={repo} defaultBranch={defaultRef} />
        ) : (
          <ReleaseList owner={owner} repo={repo} repository={repository} />
        )
      ) : isIssuesMode ? (
        segments[1] ? (
          <IssueDetail owner={owner} repo={repo} index={segments[1]} />
        ) : (
          <IssueList owner={owner} repo={repo} />
        )
      ) : isPullsMode ? (
        segments[1] === 'new' ? (
          <NewPullRequest owner={owner} repo={repo} defaultBase={defaultRef} />
        ) : segments[1] ? (
          <PullRequestDetail owner={owner} repo={repo} index={segments[1]} />
        ) : (
          <PullRequestList owner={owner} repo={repo} />
        )
      ) : isCompareMode ? (
        <NewPullRequest owner={owner} repo={repo} defaultBase={defaultRef} />
      ) : isCommitsMode ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <BranchSelector
              owner={owner}
              repo={repo}
              currentRef={selectedRef}
              branches={branches}
              tags={tags}
              basePath={`/${owner}/${repo}`}
            />
            <Link
              to={`/${owner}/${repo}/tree/${encodeURIComponent(selectedRef)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-canvas-subtle hover:bg-canvas-hover text-fg-default border border-border-default transition-colors active:scale-[0.97]"
            >
              <Octicon name="arrow-left" size={13} />
              <span>Browse code</span>
            </Link>
          </div>

          <CommitBrowser
            owner={owner}
            repo={repo}
            refName={selectedRef}
            commits={commits || []}
            isLoading={isCommitsLoading}
          />
        </div>
      ) : isBlobMode ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <BranchSelector
                owner={owner}
                repo={repo}
                currentRef={selectedRef}
                branches={branches}
                tags={tags}
                basePath={`/${owner}/${repo}`}
              />
              <FileBreadcrumbs
                owner={owner}
                repo={repo}
                refName={selectedRef}
                path={subPath}
                isFile
              />
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/${owner}/${repo}/commits/${encodeURIComponent(selectedRef)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-canvas-subtle hover:bg-canvas-hover text-fg-default border border-border-default transition-colors active:scale-[0.97]"
              >
                <Octicon name="history" size={13} className="text-fg-muted" />
                <span>History</span>
              </Link>
            </div>
          </div>

          {isBlobLoading ? (
            <div className="p-8 text-center text-xs text-fg-muted">
              Loading file content...
            </div>
          ) : (
            <BlobViewer
              filename={blobFilename}
              path={subPath}
              content={rawBlobContent || ''}
              rawUrl={rawFileUrl}
              owner={owner}
              repo={repo}
              refName={selectedRef}
              onContentUpdated={() => {
                refetchRawBlob()
                refetchRepo()
              }}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <BranchSelector
                  owner={owner}
                  repo={repo}
                  currentRef={selectedRef}
                  branches={branches}
                  tags={tags}
                  basePath={`/${owner}/${repo}`}
                />
                {subPath && (
                  <FileBreadcrumbs
                    owner={owner}
                    repo={repo}
                    refName={selectedRef}
                    path={subPath}
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFileSearchOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-canvas-subtle hover:bg-canvas-hover text-fg-default border border-border-default transition-colors cursor-pointer active:scale-[0.97]"
                >
                  <Octicon name="search" size={12} className="text-fg-muted" />
                  <span>Go to file</span>
                  <span className="px-1.5 py-0.5 rounded border border-border-default text-[10px] text-fg-muted font-mono bg-canvas-raised">
                    t
                  </span>
                </button>

                <div className="relative" ref={codeMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsCodeMenuOpen(!isCodeMenuOpen)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-accent-fg hover:opacity-90 text-[var(--accent-text)] border border-accent-fg shadow-xs transition-opacity cursor-pointer active:scale-[0.97]"
                  >
                    <Octicon name="code" size={13} />
                    <span>Code</span>
                    <Octicon name="triangle-down" size={11} className="opacity-75" />
                  </button>

                  {isCodeMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-80 bg-canvas-raised border border-border-default rounded-lg shadow-xl z-50 p-3.5 text-xs space-y-3">
                      <div className="flex items-center gap-3 border-b border-border-default pb-2">
                        <button
                          type="button"
                          onClick={() => setCloneType('https')}
                          className={`font-semibold pb-1 border-b-2 transition-colors cursor-pointer ${
                            cloneType === 'https'
                              ? 'border-accent-fg text-fg-default'
                              : 'border-transparent text-fg-muted hover:text-fg-default'
                          }`}
                        >
                          HTTPS
                        </button>
                        <button
                          type="button"
                          onClick={() => setCloneType('ssh')}
                          className={`font-semibold pb-1 border-b-2 transition-colors cursor-pointer ${
                            cloneType === 'ssh'
                              ? 'border-accent-fg text-fg-default'
                              : 'border-transparent text-fg-muted hover:text-fg-default'
                          }`}
                        >
                          SSH
                        </button>
                      </div>

                      <div className="flex items-center rounded-md border border-border-default bg-canvas-default overflow-hidden">
                        <input
                          type="text"
                          readOnly
                          value={cloneUrl}
                          className="w-full px-2.5 py-1.5 text-xs font-mono text-fg-default bg-transparent focus:outline-none select-all"
                        />
                        <button
                          type="button"
                          onClick={handleCopyClone}
                          aria-label="Copy clone URL"
                          className="p-1.5 hover:bg-canvas-hover text-fg-muted hover:text-fg-default border-l border-border-default transition-colors cursor-pointer"
                        >
                          {hasCopiedClone ? (
                            <Octicon name="check" size={14} className="text-success-fg" />
                          ) : (
                            <Octicon name="copy" size={14} />
                          )}
                        </button>
                      </div>

                      <div className="pt-2 border-t border-border-default">
                        <a
                          href={`${baseUrl}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/archive/${selectedRef}.zip`}
                          className="flex items-center gap-2 py-1 text-fg-default hover:text-accent-fg transition-colors font-medium"
                        >
                          <Octicon name="download" size={14} className="text-fg-muted" />
                          <span>Download ZIP</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isContentsError && (
              <div className="p-4 text-xs text-danger-fg border border-danger-fg/30 rounded-md bg-danger-fg/10">
                {contentsError instanceof Error ? contentsError.message : 'Failed to load directory contents'}
              </div>
            )}

            <FileBrowser
              owner={owner}
              repo={repo}
              refName={selectedRef}
              currentPath={subPath}
              items={fileList}
              latestCommit={latestCommit}
              commitCount={commitCount}
              isLoading={isContentsLoading}
            />

            {!subPath && isReadmeLoading && readmeItem && (
              <div className="border border-border-default rounded-lg p-6 bg-canvas-default space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}

            {!subPath && rawReadme && (
              <ReadmeViewer
                content={rawReadme}
                filename={readmeItem?.name || 'README.md'}
                licenseName={licenseItem ? 'Apache-2.0 license' : undefined}
                owner={owner}
                repo={repo}
                refName={selectedRef}
              />
            )}
          </div>

          <RepositorySidebar
            repository={repository}
            languagesData={languagesData}
            hasLicense={Boolean(licenseItem)}
            onRepositoryUpdated={refetchRepo}
          />
        </div>
      )}

      <FileSearchModal
        isOpen={isFileSearchOpen}
        onClose={() => setIsFileSearchOpen(false)}
        owner={owner}
        repo={repo}
        refName={selectedRef}
      />
    </div>
  )
}
