import { useState, useId } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  useRepositoryBranches,
  useRepositoryTags,
  useRepositoryCommits,
} from '../../hooks/useForgejo'
import { createRelease, getStoredUser } from '../../lib/forgejo'
import { MarkdownViewer } from '../ui/MarkdownViewer'
import { Octicon } from '../ui/Octicon'

export interface NewReleaseProps {
  owner: string
  repo: string
  defaultBranch?: string
}

export function NewRelease({ owner, repo, defaultBranch = 'main' }: NewReleaseProps) {
  const navigate = useNavigate()
  const currentUser = getStoredUser()

  const { data: branches } = useRepositoryBranches(owner, repo)
  const { data: tags } = useRepositoryTags(owner, repo)
  const { data: commits } = useRepositoryCommits(owner, repo, defaultBranch, 1)

  const [tagName, setTagName] = useState('')
  const [targetBranch, setTargetBranch] = useState(defaultBranch)
  const [releaseTitle, setReleaseTitle] = useState('')
  const [releaseBody, setReleaseBody] = useState('')

  const [isPreRelease, setIsPreRelease] = useState(false)
  const [isLatest, setIsLatest] = useState(true)

  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  const [tagFilter, setTagFilter] = useState('')

  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const prereleaseId = useId()
  const latestId = useId()

  const availableTags = (tags || []).map((t) => t.name)
  const filteredTags = availableTags.filter((t) =>
    t.toLowerCase().includes(tagFilter.toLowerCase())
  )

  const isNewTag = tagName.trim().length > 0 && !availableTags.includes(tagName.trim())

  function handleGenerateNotes() {
    if (!commits || commits.length === 0) return
    const notes = commits
      .slice(0, 10)
      .map((c) => {
        const msg = c.commit.message.split('\n')[0]
        const author = c.author?.login || c.commit.author.name
        return `* ${msg} by @${author} in \`${c.sha.slice(0, 7)}\``
      })
      .join('\n')

    const header = `## What's Changed\n\n${notes}\n\n**Full Changelog**: https://codeberg.org/${owner}/${repo}/commits/${targetBranch}`
    setReleaseBody((prev) => (prev ? `${prev}\n\n${header}` : header))
  }

  async function handlePublish(draft: boolean = false) {
    if (!tagName.trim()) {
      setErrorMessage('Please specify a tag name for this release')
      return
    }
    if (!releaseTitle.trim()) {
      setErrorMessage('Please specify a title for this release')
      return
    }

    if (!currentUser) {
      navigate('/login')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await createRelease(owner, repo, {
        tag_name: tagName.trim(),
        target_commitish: targetBranch,
        name: releaseTitle.trim(),
        body: releaseBody.trim(),
        draft,
        prerelease: isPreRelease,
      })

      navigate(`/${owner}/${repo}/releases`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to publish release')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-xs">
      <div className="flex items-center gap-2 pb-3 border-b border-[#21262d]">
        <Link
          to={`/${owner}/${repo}/releases`}
          className="text-[#58a6ff] hover:underline flex items-center gap-1 font-medium"
        >
          <Octicon name="arrow-left" size={14} />
          <span>Releases</span>
        </Link>
        <span className="text-[#8b949e]">/</span>
        <h1 className="text-base font-bold text-[#e6edf3]">Draft a new release</h1>
      </div>

      {errorMessage && (
        <div className="p-3 bg-[#f85149]/15 border border-[#f85149]/40 rounded-md text-[#f85149]">
          {errorMessage}
        </div>
      )}

      <div className="p-6 bg-[#0d1117] border border-[#30363d] rounded-md space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer min-w-[140px] justify-between"
            >
              <div className="flex items-center gap-1.5">
                <Octicon name="tag" size={13} className="text-[#8b949e]" />
                <span>{tagName || 'Choose a tag'}</span>
              </div>
              <Octicon name="triangle-down" size={12} className="text-[#8b949e]" />
            </button>

            {isTagDropdownOpen && (
              <div className="absolute left-0 mt-1 w-64 bg-[#161b22] border border-[#30363d] rounded-md shadow-xl py-2 z-30 space-y-2">
                <div className="px-2">
                  <input
                    type="text"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    placeholder="Find or create a tag"
                    autoFocus
                    className="w-full px-2.5 py-1 text-xs bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded focus:outline-none focus:border-[#58a6ff]"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-[#21262d]">
                  {tagFilter.trim() && !availableTags.includes(tagFilter.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTagName(tagFilter.trim())
                        setIsTagDropdownOpen(false)
                        setTagFilter('')
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#21262d] text-[#58a6ff] font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      <Octicon name="plus" size={12} />
                      <span>Create new tag: {tagFilter.trim()}</span>
                    </button>
                  )}

                  {filteredTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTagName(t)
                        setIsTagDropdownOpen(false)
                        setTagFilter('')
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#21262d] text-[#e6edf3] flex items-center justify-between cursor-pointer"
                    >
                      <span>{t}</span>
                      {tagName === t && <Octicon name="check" size={12} className="text-[#58a6ff]" />}
                    </button>
                  ))}

                  {filteredTags.length === 0 && !tagFilter.trim() && (
                    <div className="px-3 py-2 text-[11px] text-[#8b949e]">No tags exist yet. Type above to create one.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#8b949e]">Target:</span>
            <select
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="px-2.5 py-1.5 bg-[#21262d] text-[#e6edf3] border border-[#30363d] rounded-md font-mono text-xs focus:outline-none focus:border-[#58a6ff]"
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
          </div>

          {isNewTag && (
            <span className="text-[11px] text-[#8b949e] flex items-center gap-1 bg-[#21262d] px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
              <span>Tag will be created on publish</span>
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <input
            type="text"
            value={releaseTitle}
            onChange={(e) => setReleaseTitle(e.target.value)}
            placeholder="Release title"
            className="w-full px-3 py-2 bg-[#161b22] text-[#e6edf3] border border-[#30363d] rounded-md text-sm font-semibold focus:outline-none focus:border-[#58a6ff]"
          />
        </div>

        <div className="space-y-2 border border-[#30363d] rounded-md overflow-hidden bg-[#161b22]">
          <div className="flex items-center justify-between px-3 pt-2 border-b border-[#30363d] bg-[#0d1117]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'write'
                    ? 'border-[#f78166] text-[#e6edf3]'
                    : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'border-[#f78166] text-[#e6edf3]'
                    : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                Preview
              </button>
            </div>

            <button
              type="button"
              onClick={handleGenerateNotes}
              className="text-[11px] font-semibold text-[#58a6ff] hover:underline flex items-center gap-1 cursor-pointer pb-1"
            >
              <Octicon name="pencil" size={11} />
              <span>Generate release notes</span>
            </button>
          </div>

          <div className="p-3">
            {activeTab === 'write' ? (
              <textarea
                value={releaseBody}
                onChange={(e) => setReleaseBody(e.target.value)}
                placeholder="Describe this release..."
                rows={10}
                className="w-full px-3 py-2 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md text-xs font-mono focus:outline-none focus:border-[#58a6ff] resize-none leading-relaxed"
              />
            ) : (
              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-md min-h-[220px]">
                {releaseBody.trim() ? (
                  <MarkdownViewer
                    content={releaseBody}
                    owner={owner}
                    repo={repo}
                    refName={targetBranch}
                  />
                ) : (
                  <p className="text-xs text-[#8b949e] italic">Nothing to preview</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <label htmlFor={prereleaseId} className="flex items-start gap-2.5 cursor-pointer text-[#e6edf3]">
            <input
              id={prereleaseId}
              type="checkbox"
              checked={isPreRelease}
              onChange={(e) => setIsPreRelease(e.target.checked)}
              className="mt-0.5 rounded border-[#30363d] bg-[#161b22] text-[#238636] focus:ring-0"
            />
            <div>
              <span className="font-semibold block">Set as a pre-release</span>
              <span className="text-[11px] text-[#8b949e]">
                Identify this release as non-production ready (e.g. alpha, beta, release candidate).
              </span>
            </div>
          </label>

          <label htmlFor={latestId} className="flex items-start gap-2.5 cursor-pointer text-[#e6edf3]">
            <input
              id={latestId}
              type="checkbox"
              checked={isLatest}
              onChange={(e) => setIsLatest(e.target.checked)}
              className="mt-0.5 rounded border-[#30363d] bg-[#161b22] text-[#238636] focus:ring-0"
            />
            <div>
              <span className="font-semibold block">Set as the latest release</span>
              <span className="text-[11px] text-[#8b949e]">
                Set as the latest official release for this repository.
              </span>
            </div>
          </label>
        </div>

        <div className="pt-4 border-t border-[#30363d] flex items-center justify-between">
          <Link
            to={`/${owner}/${repo}/releases`}
            className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-medium"
          >
            Cancel
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePublish(true)}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => handlePublish(false)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>Publish release</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
