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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-canvas-raised border border-border-default rounded-lg shadow-2xl max-w-lg w-full overflow-hidden text-xs">
        <div className="p-4 border-b border-border-default flex items-center justify-between bg-canvas-subtle">
          <h3 className="font-semibold text-sm text-fg-default">Edit repository details</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg-default p-1 rounded-md hover:bg-canvas-hover transition-colors cursor-pointer"
          >
            <Octicon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {errorMessage && (
            <div className="p-2.5 bg-danger-fg/10 border border-danger-fg/40 rounded-md text-danger-fg">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-semibold text-fg-default">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of the repository"
              rows={3}
              className="w-full px-3 py-2 bg-canvas-default text-fg-default border border-border-default rounded-md focus:outline-none focus:border-accent-fg resize-none leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-fg-default">Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-1.5 bg-canvas-default text-fg-default border border-border-default rounded-md focus:outline-none focus:border-accent-fg h-8"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-semibold text-fg-default">Topics</label>
            <div className="flex flex-wrap gap-1.5 min-h-[28px] p-2 bg-canvas-default border border-border-default rounded-md">
              {topics.length === 0 && (
                <span className="text-fg-muted text-[11px] self-center">No topics added</span>
              )}
              {topics.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-subtle text-accent-fg border border-accent-fg/30"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(t)}
                    className="hover:opacity-75 cursor-pointer"
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
                className="flex-1 px-3 py-1 bg-canvas-default text-fg-default border border-border-default rounded-md focus:outline-none focus:border-accent-fg h-8"
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className="px-3 py-1 bg-canvas-subtle hover:bg-canvas-hover text-fg-default border border-border-default rounded-md font-semibold h-8 cursor-pointer active:scale-[0.97]"
              >
                Add
              </button>
            </div>
            <p className="text-[10px] text-fg-muted">
              Use lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-md border border-border-default bg-canvas-default hover:bg-canvas-hover text-fg-muted hover:text-fg-default font-medium transition-colors cursor-pointer active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-accent-fg hover:opacity-90 text-[var(--accent-text)] font-semibold transition-opacity cursor-pointer disabled:opacity-50 active:scale-[0.97]"
            >
              {isSaving && (
                <span className="w-3.5 h-3.5 border-2 border-current/20 border-t-current rounded-full animate-spin" />
              )}
              <span>{isSaving ? 'Saving changes...' : 'Save changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
