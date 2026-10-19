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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#21262d]">
        <div className="flex items-center gap-1 border border-[#30363d] rounded-md p-0.5 bg-[#161b22]">
          <button
            type="button"
            onClick={() => setActiveTab('releases')}
            className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors ${
              activeTab === 'releases'
                ? 'bg-[#21262d] text-[#e6edf3]'
                : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            <span>Releases</span>
            {releaseItems.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-[#30363d] rounded-full text-[10px] text-[#e6edf3]">
                {releaseItems.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors ${
              activeTab === 'tags'
                ? 'bg-[#21262d] text-[#e6edf3]'
                : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            <span>Tags</span>
            {tagItems.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-[#30363d] rounded-full text-[10px] text-[#e6edf3]">
                {tagItems.length}
              </span>
            )}
          </button>
        </div>

        <Link
          to={`/${owner}/${repo}/releases/new`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Octicon name="tag" size={13} />
          <span>Draft a new release</span>
        </Link>
      </div>

      {activeTab === 'releases' && (
        <div className="space-y-6">
          {isReleasesLoading ? (
            <div className="p-12 text-center text-[#8b949e]">
              Loading releases...
            </div>
          ) : releaseItems.length === 0 ? (
            <div className="p-12 text-center text-[#8b949e] border border-[#30363d] rounded-md bg-[#0d1117] space-y-3">
              <Octicon name="tag" size={36} className="mx-auto text-[#8b949e]/60" />
              <h3 className="text-base font-semibold text-[#e6edf3]">There aren’t any releases here</h3>
              <p className="max-w-md mx-auto text-xs">
                Releases are packaged software iterations that can be tagged from specific branches or commits.
              </p>
              <div className="pt-2">
                <Link
                  to={`/${owner}/${repo}/releases/new`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white shadow-sm transition-colors cursor-pointer"
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
                    className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden"
                  >
                    <div className="p-5 border-b border-[#21262d] bg-[#161b22] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-[#e6edf3]">
                            {rel.name || rel.tag_name}
                          </h2>

                          {isLatest && (
                            <span className="px-2 py-0.5 rounded-full border border-[#238636] text-[10px] font-semibold text-[#3fb950] bg-[#238636]/10">
                              Latest
                            </span>
                          )}

                          {rel.prerelease && (
                            <span className="px-2 py-0.5 rounded-full border border-[#d29922] text-[10px] font-semibold text-[#d29922] bg-[#d29922]/10">
                              Pre-release
                            </span>
                          )}

                          {rel.draft && (
                            <span className="px-2 py-0.5 rounded-full border border-[#8b949e] text-[10px] font-semibold text-[#8b949e] bg-[#21262d]">
                              Draft
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#8b949e] flex-wrap">
                          <span className="inline-flex items-center gap-1 font-mono text-[#58a6ff]">
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
                            <span className="text-[#e6edf3]">{rel.author.login}</span>
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
                            className="p-1 rounded text-[#8b949e] hover:text-[#f85149] hover:bg-[#21262d] cursor-pointer"
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
                        <p className="text-[#8b949e] italic text-xs">No release notes provided.</p>
                      )}

                      <div className="pt-3 border-t border-[#21262d] space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleAssets(rel.id)}
                          className="flex items-center gap-1.5 font-semibold text-[#e6edf3] hover:text-[#58a6ff] cursor-pointer text-xs"
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
                              className="flex items-center gap-2 text-[#58a6ff] hover:underline py-1"
                            >
                              <Octicon name="file" size={13} className="text-[#8b949e]" />
                              <span>Source code (zip)</span>
                            </a>
                            <a
                              href={rel.tarball_url || `https://codeberg.org/${owner}/${repo}/archive/${rel.tag_name}.tar.gz`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-[#58a6ff] hover:underline py-1"
                            >
                              <Octicon name="file" size={13} className="text-[#8b949e]" />
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
        <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
          {tagItems.length === 0 ? (
            <div className="p-8 text-center text-[#8b949e]">
              No tags found in this repository.
            </div>
          ) : (
            <ul className="divide-y divide-[#21262d]">
              {tagItems.map((tag) => (
                <li key={tag.name} className="p-4 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-[#21262d] flex items-center justify-center text-[#8b949e]">
                      <Octicon name="tag" size={13} />
                    </span>
                    <div>
                      <span className="font-mono font-bold text-[#58a6ff] block">{tag.name}</span>
                      <span className="font-mono text-[11px] text-[#8b949e]">
                        {tag.commit ? tag.commit.sha.slice(0, 7) : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/${owner}/${repo}/tree/${encodeURIComponent(tag.name)}`}
                      className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-semibold border border-[#30363d]"
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
