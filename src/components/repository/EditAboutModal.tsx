import { useState, useEffect } from 'react'
import { ForgejoRepository } from '../../types/forgejo'
import { updateRepository, updateRepositoryTopics, getRepositoryTopics } from '../../lib/forgejo'
import { Octicon } from '../ui/Octicon'

export interface EditAboutModalProps {
  repository: ForgejoRepository
  isOpen: boolean
  onClose: () => void
  onUpdated?: () => void
}

export function EditAboutModal({
  repository,
  isOpen,
  onClose,
  onUpdated,
}: EditAboutModalProps) {
  const owner = repository.owner.login
  const repo = repository.name

  const [description, setDescription] = useState(repository.description || '')
  const [website, setWebsite] = useState(repository.website || '')
  const [topics, setTopics] = useState<string[]>(repository.topics || [])
  const [topicInput, setTopicInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setDescription(repository.description || '')
      setWebsite(repository.website || '')
      setTopics(repository.topics || [])
      setErrorMessage(null)

      async function fetchTopics() {
        const list = await getRepositoryTopics(owner, repo)
        if (list.length > 0) {
          setTopics(list)
        }
      }
      fetchTopics()
    }
  }, [isOpen, repository, owner, repo])

  if (!isOpen) return null

  function handleAddTopic() {
    const clean = topicInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!clean || topics.includes(clean)) return
    setTopics([...topics, clean])
    setTopicInput('')
  }

  function handleRemoveTopic(tToRemove: string) {
    setTopics(topics.filter((t) => t !== tToRemove))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)

    try {
      await updateRepository(owner, repo, {
        description: description.trim(),
        website: website.trim(),
      })
      await updateRepositoryTopics(owner, repo, topics)
      onUpdated?.()
      onClose()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update repository details')
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-lg w-full overflow-hidden text-xs">
        <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <h3 className="font-semibold text-sm text-[#e6edf3]">Edit repository details</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded-md cursor-pointer"
          >
            <Octicon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {errorMessage && (
            <div className="p-2.5 bg-[#f85149]/15 border border-[#f85149]/40 rounded text-[#f85149]">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-semibold text-[#e6edf3]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of the repository"
              rows={3}
              className="w-full px-3 py-2 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] resize-none leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-[#e6edf3]">Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-1.5 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] h-8"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-semibold text-[#e6edf3]">Topics</label>
            <div className="flex flex-wrap gap-1.5 min-h-[28px] p-2 bg-[#0d1117] border border-[#30363d] rounded-md">
              {topics.length === 0 && (
                <span className="text-[#8b949e] text-[11px] self-center">No topics added</span>
              )}
              {topics.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(t)}
                    className="hover:text-white"
                  >
                    <Octicon name="x" size={10} />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTopic()
                  }
                }}
                placeholder="Add a topic (e.g. react, api)"
                className="flex-1 px-3 py-1 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] h-8"
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] rounded-md font-semibold h-8 cursor-pointer"
              >
                Add
              </button>
            </div>
            <p className="text-[10px] text-[#8b949e]">
              Use lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div className="pt-3 border-t border-[#30363d] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving && (
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>{isSaving ? 'Saving changes...' : 'Save changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
