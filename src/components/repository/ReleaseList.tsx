import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ForgejoRepository } from '../../types/forgejo'
import { useRepositoryReleases, useRepositoryTags } from '../../hooks/useForgejo'
import { deleteRelease, getStoredUser } from '../../lib/forgejo'
import { MarkdownViewer } from '../ui/MarkdownViewer'
import { Octicon } from '../ui/Octicon'

export interface ReleaseListProps {
  owner: string
  repo: string
  repository: ForgejoRepository
}

export function ReleaseList({ owner, repo, repository }: ReleaseListProps) {
  const currentUser = getStoredUser()
  const canManage = Boolean(
    repository.permissions?.admin ||
    (currentUser && repository.owner.login === currentUser.login)
  )

  const {
    data: releases,
    isLoading: isReleasesLoading,
    refetch: refetchReleases,
  } = useRepositoryReleases(owner, repo)

  const { data: tags } = useRepositoryTags(owner, repo)

  const [activeTab, setActiveTab] = useState<'releases' | 'tags'>('releases')
  const [expandedAssets, setExpandedAssets] = useState<Record<number, boolean>>({})

  const releaseItems = releases || []
  const tagItems = tags || []

  function toggleAssets(id: number) {
    setExpandedAssets((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleDelete(releaseId: number) {
    if (!confirm('Are you sure you want to delete this release?')) return
    try {
      await deleteRelease(owner, repo, releaseId)
      refetchReleases()
    } catch {
      alert('Failed to delete release')
    }
  }

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default">
        <div className="flex items-center gap-1 border border-border-default rounded-md p-0.5 bg-canvas-subtle">
          <button
            type="button"
            onClick={() => setActiveTab('releases')}
            className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors ${
              activeTab === 'releases'
                ? 'bg-canvas-raised text-fg-default shadow-xs'
                : 'text-fg-muted hover:text-fg-default'
            }`}
          >
            <span>Releases</span>
            {releaseItems.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-canvas-default border border-border-default rounded-full text-[10px] text-fg-muted">
                {releaseItems.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors ${
              activeTab === 'tags'
                ? 'bg-canvas-raised text-fg-default shadow-xs'
                : 'text-fg-muted hover:text-fg-default'
            }`}
          >
            <span>Tags</span>
            {tagItems.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-canvas-default border border-border-default rounded-full text-[10px] text-fg-muted">
                {tagItems.length}
              </span>
            )}
          </button>
        </div>

        <Link
          to={`/${owner}/${repo}/releases/new`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-success-fg hover:opacity-90 active:scale-[0.97] text-white shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Octicon name="tag" size={13} />
          <span>Draft a new release</span>
        </Link>
      </div>

      {activeTab === 'releases' && (
        <div className="space-y-6">
          {isReleasesLoading ? (
            <div className="p-12 text-center text-fg-muted">
              Loading releases...
            </div>
          ) : releaseItems.length === 0 ? (
            <div className="p-12 text-center text-fg-muted border border-border-default rounded-md bg-canvas-default space-y-3">
              <Octicon name="tag" size={36} className="mx-auto text-fg-muted/60" />
              <h3 className="text-base font-semibold text-fg-default">There aren’t any releases here</h3>
              <p className="max-w-md mx-auto text-xs">
                Releases are packaged software iterations that can be tagged from specific branches or commits.
              </p>
              <div className="pt-2">
                <Link
                  to={`/${owner}/${repo}/releases/new`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-success-fg hover:opacity-90 active:scale-[0.97] text-white shadow-sm transition-all cursor-pointer"
                >
                  Draft a new release
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {releaseItems.map((rel, idx) => {
                const isLatest = idx === 0 && !rel.prerelease && !rel.draft
                const isAssetsOpen = expandedAssets[rel.id] ?? true
                const dateStr = rel.published_at || rel.created_at

                return (
                  <div
                    key={rel.id}
                    className="border border-border-default rounded-md bg-canvas-default overflow-hidden"
                  >
                    <div className="p-5 border-b border-border-default bg-canvas-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-fg-default">
                            {rel.name || rel.tag_name}
                          </h2>

                          {isLatest && (
                            <span className="px-2 py-0.5 rounded-full border border-success-fg/30 text-[10px] font-semibold text-success-fg bg-success-fg/10">
                              Latest
                            </span>
                          )}

                          {rel.prerelease && (
                            <span className="px-2 py-0.5 rounded-full border border-attention-fg/30 text-[10px] font-semibold text-attention-fg bg-attention-fg/10">
                              Pre-release
                            </span>
                          )}

                          {rel.draft && (
                            <span className="px-2 py-0.5 rounded-full border border-border-default text-[10px] font-semibold text-fg-muted bg-canvas-raised">
                              Draft
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-fg-muted flex-wrap">
                          <span className="inline-flex items-center gap-1 font-mono text-accent-fg">
                            <Octicon name="tag" size={12} />
                            <span>{rel.tag_name}</span>
                          </span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <img
                              src={rel.author.avatar_url || '/default-avatar.jpg'}
                              alt=""
                              className="w-3.5 h-3.5 rounded-full object-cover"
                            />
                            <span className="text-fg-default">{rel.author.login}</span>
                          </div>
                          <span>•</span>
                          <span>released on {new Date(dateStr).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDelete(rel.id)}
                            className="p-1 rounded text-fg-muted hover:text-danger-fg hover:bg-canvas-hover active:scale-[0.97] cursor-pointer transition-colors"
                            title="Delete release"
                          >
                            <Octicon name="trash" size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-4">
                      {rel.body ? (
                        <MarkdownViewer
                          content={rel.body}
                          owner={owner}
                          repo={repo}
                          refName={rel.tag_name}
                        />
                      ) : (
                        <p className="text-fg-muted italic text-xs">No release notes provided.</p>
                      )}

                      <div className="pt-3 border-t border-border-default space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleAssets(rel.id)}
                          className="flex items-center gap-1.5 font-semibold text-fg-default hover:text-accent-fg cursor-pointer text-xs transition-colors"
                        >
                          <Octicon name="triangle-down" size={12} className={isAssetsOpen ? '' : '-rotate-90'} />
                          <span>Assets</span>
                        </button>

                        {isAssetsOpen && (
                          <div className="pl-4 space-y-1 font-mono text-xs">
                            <a
                              href={rel.zipball_url || `https://codeberg.org/${owner}/${repo}/archive/${rel.tag_name}.zip`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-accent-fg hover:underline py-1"
                            >
                              <Octicon name="file" size={13} className="text-fg-muted" />
                              <span>Source code (zip)</span>
                            </a>
                            <a
                              href={rel.tarball_url || `https://codeberg.org/${owner}/${repo}/archive/${rel.tag_name}.tar.gz`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-accent-fg hover:underline py-1"
                            >
                              <Octicon name="file" size={13} className="text-fg-muted" />
                              <span>Source code (tar.gz)</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="border border-border-default rounded-md overflow-hidden bg-canvas-default">
          {tagItems.length === 0 ? (
            <div className="p-8 text-center text-fg-muted">
              No tags found in this repository.
            </div>
          ) : (
            <ul className="divide-y divide-border-default">
              {tagItems.map((tag) => (
                <li key={tag.name} className="p-4 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-canvas-subtle border border-border-default flex items-center justify-center text-fg-muted">
                      <Octicon name="tag" size={13} />
                    </span>
                    <div>
                      <span className="font-mono font-bold text-accent-fg block">{tag.name}</span>
                      <span className="font-mono text-[11px] text-fg-muted">
                        {tag.commit ? tag.commit.sha.slice(0, 7) : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/${owner}/${repo}/tree/${encodeURIComponent(tag.name)}`}
                      className="px-2.5 py-1 rounded bg-canvas-raised hover:bg-canvas-hover text-fg-default font-semibold border border-border-default active:scale-[0.97] transition-all"
                    >
                      Browse code
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
