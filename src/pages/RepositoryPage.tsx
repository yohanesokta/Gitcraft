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
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { Octicon } from '../components/ui/Octicon'
import { ForgejoContent } from '../types/forgejo'
import { getForgejoBaseUrl } from '../lib/forgejo'

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

  const blobFilename = segments[segments.length - 1] || ''
  const {
    data: rawBlobContent,
    isLoading: isBlobLoading,
  } = useRepositoryRawFile(owner, repo, subPath, selectedRef)

  const [isCodeMenuOpen, setIsCodeMenuOpen] = useState(false)
  const [cloneType, setCloneType] = useState<'https' | 'ssh'>('https')
  const [hasCopiedClone, setHasCopiedClone] = useState(false)
  const codeMenuRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="space-y-6">
      <RepositoryHeader repository={repository} />

      {isCommitsMode ? (
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
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors"
            >
              <Octicon name="arrow-left" size={14} />
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
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors"
              >
                <Octicon name="history" size={14} className="text-[#8b949e]" />
                <span>History</span>
              </Link>
            </div>
          </div>

          {isBlobLoading ? (
            <div className="p-8 text-center text-xs text-[#8b949e]">
              Loading file content...
            </div>
          ) : (
            <BlobViewer
              filename={blobFilename}
              content={rawBlobContent || ''}
              rawUrl={rawFileUrl}
              owner={owner}
              repo={repo}
              refName={selectedRef}
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
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
                >
                  <Octicon name="search" size={12} className="text-[#8b949e]" />
                  <span>Go to file</span>
                  <span className="px-1.5 py-0.2 rounded border border-[#30363d] text-[10px] text-[#8b949e] font-mono">
                    t
                  </span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
                  >
                    <span>Add file</span>
                    <Octicon name="triangle-down" size={12} className="text-[#8b949e]" />
                  </button>
                </div>

                <div className="relative" ref={codeMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsCodeMenuOpen(!isCodeMenuOpen)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white border border-[#2ea043] shadow-sm transition-colors cursor-pointer"
                  >
                    <Octicon name="code" size={14} />
                    <span>Code</span>
                    <Octicon name="triangle-down" size={12} className="opacity-75" />
                  </button>

                  {isCodeMenuOpen && (
                    <div className="absolute right-0 mt-1 w-80 bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl z-50 p-3 text-xs space-y-3">
                      <div className="flex items-center gap-2 border-b border-[#30363d] pb-2">
                        <button
                          type="button"
                          onClick={() => setCloneType('https')}
                          className={`font-semibold pb-1 border-b-2 transition-colors cursor-pointer ${
                            cloneType === 'https'
                              ? 'border-[#f78166] text-[#e6edf3]'
                              : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
                          }`}
                        >
                          HTTPS
                        </button>
                        <button
                          type="button"
                          onClick={() => setCloneType('ssh')}
                          className={`font-semibold pb-1 border-b-2 transition-colors cursor-pointer ${
                            cloneType === 'ssh'
                              ? 'border-[#f78166] text-[#e6edf3]'
                              : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
                          }`}
                        >
                          SSH
                        </button>
                      </div>

                      <div className="flex items-center rounded-md border border-[#30363d] bg-[#0d1117] overflow-hidden">
                        <input
                          type="text"
                          readOnly
                          value={cloneUrl}
                          className="w-full px-2.5 py-1 text-xs font-mono text-[#e6edf3] bg-transparent focus:outline-none select-all"
                        />
                        <button
                          type="button"
                          onClick={handleCopyClone}
                          aria-label="Copy clone URL"
                          className="p-1.5 hover:bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] border-l border-[#30363d] transition-colors cursor-pointer"
                        >
                          {hasCopiedClone ? (
                            <Octicon name="check" size={14} className="text-[#3fb950]" />
                          ) : (
                            <Octicon name="copy" size={14} />
                          )}
                        </button>
                      </div>

                      <div className="pt-2 border-t border-[#30363d]">
                        <a
                          href={`${baseUrl}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/archive/${selectedRef}.zip`}
                          className="flex items-center gap-2 py-1 text-[#e6edf3] hover:text-[#58a6ff] transition-colors font-medium"
                        >
                          <Octicon name="download" size={14} className="text-[#8b949e]" />
                          <span>Download ZIP</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isContentsError && (
              <div className="p-4 text-xs text-[#f85149] border border-[#f85149]/40 rounded-md bg-[#3c1e21]/20">
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
              <div className="border border-[#30363d] rounded-md p-6 bg-[#0d1117] space-y-3">
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
          />
        </div>
      )}
    </div>
  )
}
