import { useState, useEffect, useMemo } from 'react'
import { ForgejoRepository } from '../../types/forgejo'
import { Octicon } from '../ui/Octicon'

export interface RepositoryProjectsProps {
  repository: ForgejoRepository
  owner: string
  repo: string
}

export interface ProjectCard {
  id: string
  title: string
  note?: string
  label?: string
  createdAt: string
}

export interface ProjectColumn {
  id: string
  title: string
  cards: ProjectCard[]
}

export interface ProjectBoard {
  id: string
  title: string
  description: string
  state: 'open' | 'closed'
  updatedAt: string
  columns: ProjectColumn[]
}

function getInitialProjects(owner: string, repo: string): ProjectBoard[] {
  const storageKey = `gitcraft_projects_${owner}_${repo}`
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
  }

  const defaultBoard: ProjectBoard = {
    id: 'proj-1',
    title: 'Sprint Roadmap',
    description: 'Coordinate, track, and prioritize issues and feature requests.',
    state: 'open',
    updatedAt: new Date().toISOString(),
    columns: [
      {
        id: 'col-todo',
        title: 'To do',
        cards: [
          {
            id: 'card-1',
            title: 'Improve mobile responsive layout on tables',
            note: 'Ensure horizontal overflow is contained on mobile viewports.',
            label: 'enhancement',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'card-2',
            title: 'Audit WCAG AA color contrast on buttons',
            note: 'Review secondary text and borders contrast ratios.',
            label: 'documentation',
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'col-progress',
        title: 'In progress',
        cards: [
          {
            id: 'card-3',
            title: 'Repository settings polish',
            note: 'Enrich settings tabs with branch protections and webhooks.',
            label: 'feature',
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'col-done',
        title: 'Done',
        cards: [
          {
            id: 'card-4',
            title: 'Implement repository Fork and Star features',
            note: 'Integrated with Forgejo REST API endpoints.',
            label: 'completed',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'card-5',
            title: 'Pull request diff comparison and merge strategies',
            note: 'Support merge, squash, and rebase strategies.',
            label: 'completed',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ],
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify([defaultBoard]))
  } catch {
  }
  return [defaultBoard]
}

export function RepositoryProjects({ owner, repo }: RepositoryProjectsProps) {
  const storageKey = `gitcraft_projects_${owner}_${repo}`
  const [projects, setProjects] = useState<ProjectBoard[]>(() => getInitialProjects(owner, repo))
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open')
  const [searchQuery, setSearchQuery] = useState('')

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')

  const [addingCardColumnId, setAddingCardColumnId] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [newCardNote, setNewCardNote] = useState('')
  const [newCardLabel, setNewCardLabel] = useState('feature')

  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(projects))
    } catch {
    }
  }, [projects, storageKey])

  const activeBoard = useMemo(() => {
    return projects.find((p) => p.id === activeBoardId) || null
  }, [projects, activeBoardId])

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (p.state !== activeTab) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    })
  }, [projects, activeTab, searchQuery])

  const openCount = projects.filter((p) => p.state === 'open').length
  const closedCount = projects.filter((p) => p.state === 'closed').length

  function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newProjectTitle.trim()) return

    const newBoard: ProjectBoard = {
      id: `proj-${Date.now()}`,
      title: newProjectTitle.trim(),
      description: newProjectDescription.trim() || 'No description provided.',
      state: 'open',
      updatedAt: new Date().toISOString(),
      columns: [
        { id: `col-${Date.now()}-1`, title: 'To do', cards: [] },
        { id: `col-${Date.now()}-2`, title: 'In progress', cards: [] },
        { id: `col-${Date.now()}-3`, title: 'Done', cards: [] },
      ],
    }

    setProjects((prev) => [newBoard, ...prev])
    setNewProjectTitle('')
    setNewProjectDescription('')
    setIsNewProjectModalOpen(false)
    setActiveBoardId(newBoard.id)
  }

  function handleToggleBoardState(boardId: string) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === boardId) {
          const nextState: 'open' | 'closed' = p.state === 'open' ? 'closed' : 'open'
          return { ...p, state: nextState, updatedAt: new Date().toISOString() }
        }
        return p
      })
    )
  }

  function handleDeleteBoard(boardId: string) {
    if (confirm('Are you sure you want to delete this project board?')) {
      setProjects((prev) => prev.filter((p) => p.id !== boardId))
      if (activeBoardId === boardId) {
        setActiveBoardId(null)
      }
    }
  }

  function handleAddCard(columnId: string) {
    if (!newCardTitle.trim() || !activeBoardId) return

    const card: ProjectCard = {
      id: `card-${Date.now()}`,
      title: newCardTitle.trim(),
      note: newCardNote.trim() || undefined,
      label: newCardLabel,
      createdAt: new Date().toISOString(),
    }

    setProjects((prev) =>
      prev.map((board) => {
        if (board.id === activeBoardId) {
          return {
            ...board,
            updatedAt: new Date().toISOString(),
            columns: board.columns.map((col) => {
              if (col.id === columnId) {
                return { ...col, cards: [...col.cards, card] }
              }
              return col
            }),
          }
        }
        return board
      })
    )

    setNewCardTitle('')
    setNewCardNote('')
    setAddingCardColumnId(null)
  }

  function handleDeleteCard(columnId: string, cardId: string) {
    if (!activeBoardId) return

    setProjects((prev) =>
      prev.map((board) => {
        if (board.id === activeBoardId) {
          return {
            ...board,
            columns: board.columns.map((col) => {
              if (col.id === columnId) {
                return { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
              }
              return col
            }),
          }
        }
        return board
      })
    )
  }

  function handleMoveCard(fromColId: string, toColId: string, cardId: string) {
    if (!activeBoardId || fromColId === toColId) return

    setProjects((prev) =>
      prev.map((board) => {
        if (board.id === activeBoardId) {
          let cardToMove: ProjectCard | undefined
          board.columns.forEach((col) => {
            if (col.id === fromColId) {
              cardToMove = col.cards.find((c) => c.id === cardId)
            }
          })
          if (!cardToMove) return board

          return {
            ...board,
            updatedAt: new Date().toISOString(),
            columns: board.columns.map((col) => {
              if (col.id === fromColId) {
                return { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
              }
              if (col.id === toColId) {
                return { ...col, cards: [...col.cards, cardToMove!] }
              }
              return col
            }),
          }
        }
        return board
      })
    )
  }

  function handleAddColumn(e: React.FormEvent) {
    e.preventDefault()
    if (!newColumnTitle.trim() || !activeBoardId) return

    const newCol: ProjectColumn = {
      id: `col-${Date.now()}`,
      title: newColumnTitle.trim(),
      cards: [],
    }

    setProjects((prev) =>
      prev.map((board) => {
        if (board.id === activeBoardId) {
          return {
            ...board,
            columns: [...board.columns, newCol],
          }
        }
        return board
      })
    )

    setNewColumnTitle('')
    setIsAddingColumn(false)
  }

  function getBoardStats(board: ProjectBoard) {
    let totalCards = 0
    let doneCards = 0
    board.columns.forEach((col) => {
      totalCards += col.cards.length
      if (col.title.toLowerCase().includes('done') || col.title.toLowerCase().includes('complete')) {
        doneCards += col.cards.length
      }
    })
    const percent = totalCards === 0 ? 0 : Math.round((doneCards / totalCards) * 100)
    return { totalCards, doneCards, percent }
  }

  if (activeBoard) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveBoardId(null)}
                className="text-xs text-accent-fg hover:underline flex items-center gap-1 font-medium cursor-pointer transition-colors"
              >
                <Octicon name="arrow-left" size={14} />
                <span>Projects</span>
              </button>
              <span className="text-fg-muted">/</span>
              <h2 className="text-base font-bold text-fg-default">{activeBoard.title}</h2>
              <span
                className={`px-2 py-0.2 rounded-full text-[10px] font-semibold border ${
                  activeBoard.state === 'open'
                    ? 'border-success-fg/30 text-success-fg bg-success-fg/10'
                    : 'border-border-default text-fg-muted bg-canvas-raised'
                }`}
              >
                {activeBoard.state === 'open' ? 'Open' : 'Closed'}
              </span>
            </div>
            <p className="text-xs text-fg-muted">{activeBoard.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-canvas-raised hover:bg-canvas-hover active:scale-[0.97] text-fg-default border border-border-default transition-all cursor-pointer"
            >
              <Octicon name="plus" size={13} />
              <span>Add column</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleBoardState(activeBoard.id)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-canvas-raised hover:bg-canvas-hover active:scale-[0.97] text-fg-muted hover:text-fg-default border border-border-default transition-all cursor-pointer"
            >
              {activeBoard.state === 'open' ? 'Close project' : 'Reopen project'}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-4 overflow-x-auto pb-4 pt-2">
          {activeBoard.columns.map((column) => (
            <div
              key={column.id}
              className="w-80 shrink-0 bg-canvas-subtle border border-border-default rounded-lg flex flex-col max-h-[75vh]"
            >
              <div className="p-3 border-b border-border-default flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-fg-default">{column.title}</span>
                  <span className="px-1.5 py-0.2 bg-canvas-default border border-border-default rounded-full text-[10px] text-fg-muted font-semibold">
                    {column.cards.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAddingCardColumnId(column.id)}
                  className="text-fg-muted hover:text-fg-default p-1 rounded hover:bg-canvas-hover active:scale-[0.97] cursor-pointer transition-colors"
                  title="Add card"
                >
                  <Octicon name="plus" size={14} />
                </button>
              </div>

              <div className="p-2 space-y-2 overflow-y-auto flex-1">
                {column.cards.map((card) => (
                  <div
                    key={card.id}
                    className="p-3 bg-canvas-default border border-border-default rounded-md hover:border-fg-muted/40 transition-colors space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-fg-default leading-snug">{card.title}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(column.id, card.id)}
                        className="text-fg-muted hover:text-danger-fg shrink-0 p-0.5 cursor-pointer transition-colors"
                        title="Delete card"
                      >
                        <Octicon name="trash" size={12} />
                      </button>
                    </div>

                    {card.note && (
                      <p className="text-[11px] text-fg-muted leading-relaxed">{card.note}</p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      {card.label && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full font-medium ${
                            card.label === 'feature'
                              ? 'bg-accent-subtle text-accent-fg border border-accent-fg/30'
                              : card.label === 'bug'
                              ? 'bg-danger-fg/15 text-danger-fg border border-danger-fg/30'
                              : 'bg-success-fg/15 text-success-fg border border-success-fg/30'
                          }`}
                        >
                          {card.label}
                        </span>
                      )}

                      <select
                        aria-label="Move card to column"
                        value={column.id}
                        onChange={(e) => handleMoveCard(column.id, e.target.value, card.id)}
                        className="bg-canvas-raised text-fg-muted hover:text-fg-default border border-border-default rounded px-1.5 py-0.5 text-[10px] cursor-pointer"
                      >
                        {activeBoard.columns.map((c) => (
                          <option key={c.id} value={c.id}>
                            Move: {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {addingCardColumnId === column.id ? (
                  <div className="p-3 bg-canvas-default border border-accent-fg/50 rounded-md space-y-2 text-xs">
                    <input
                      type="text"
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      placeholder="Card title..."
                      autoFocus
                      className="w-full px-2 py-1 bg-canvas-subtle text-fg-default border border-border-default rounded text-xs focus:outline-none focus:border-accent-fg"
                    />
                    <textarea
                      value={newCardNote}
                      onChange={(e) => setNewCardNote(e.target.value)}
                      placeholder="Note or details (optional)..."
                      rows={2}
                      className="w-full px-2 py-1 bg-canvas-subtle text-fg-default border border-border-default rounded text-xs focus:outline-none focus:border-accent-fg resize-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={newCardLabel}
                        onChange={(e) => setNewCardLabel(e.target.value)}
                        className="bg-canvas-subtle text-fg-default border border-border-default rounded px-2 py-1 text-[11px]"
                      >
                        <option value="feature">feature</option>
                        <option value="bug">bug</option>
                        <option value="enhancement">enhancement</option>
                        <option value="documentation">documentation</option>
                      </select>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAddingCardColumnId(null)}
                          className="px-2 py-1 rounded bg-canvas-raised text-fg-muted hover:text-fg-default active:scale-[0.97] text-[11px] cursor-pointer transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddCard(column.id)}
                          className="px-2 py-1 rounded bg-success-fg hover:opacity-90 active:scale-[0.97] text-white font-semibold text-[11px] cursor-pointer transition-all"
                        >
                          Add card
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingCardColumnId(column.id)}
                    className="w-full py-2 text-xs text-fg-muted hover:text-fg-default hover:bg-canvas-hover rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Octicon name="plus" size={12} />
                    <span>Add item</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {isAddingColumn ? (
            <form
              onSubmit={handleAddColumn}
              className="w-80 shrink-0 bg-canvas-subtle border border-accent-fg/50 rounded-lg p-3 space-y-2 text-xs"
            >
              <h4 className="font-semibold text-fg-default">New column</h4>
              <input
                type="text"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Column title (e.g. In review)"
                autoFocus
                className="w-full px-2.5 py-1.5 bg-canvas-default text-fg-default border border-border-default rounded focus:outline-none focus:border-accent-fg"
              />
              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="px-2.5 py-1 rounded bg-canvas-raised text-fg-muted hover:text-fg-default active:scale-[0.97] cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded bg-success-fg hover:opacity-90 active:scale-[0.97] text-white font-semibold cursor-pointer transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-fg-default">Projects</h2>
          <p className="text-xs text-fg-muted">
            Coordinate, track, and update your work in one place with customizable Kanban boards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewProjectModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-success-fg hover:opacity-90 active:scale-[0.97] text-white shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Octicon name="table" size={14} />
          <span>New project</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 border-b sm:border-b-0 border-border-default pb-2 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('open')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'open'
                ? 'bg-canvas-raised text-fg-default'
                : 'text-fg-muted hover:text-fg-default'
            }`}
          >
            <Octicon name="table" size={14} />
            <span>{openCount} Open</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('closed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'closed'
                ? 'bg-canvas-raised text-fg-default'
                : 'text-fg-muted hover:text-fg-default'
            }`}
          >
            <Octicon name="check" size={14} />
            <span>{closedCount} Closed</span>
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all projects..."
            className="w-full px-3 py-1.5 text-xs bg-canvas-subtle text-fg-default placeholder-fg-muted border border-border-default rounded-md focus:outline-none focus:border-accent-fg h-8"
          />
        </div>
      </div>

      <div className="border border-border-default rounded-md overflow-hidden bg-canvas-default">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center text-xs text-fg-muted space-y-3">
            <Octicon name="table" size={32} className="mx-auto text-fg-muted/60" />
            <p className="font-semibold text-fg-default">No {activeTab} projects found</p>
            <p>Create a project board to begin organizing your issues and tasks.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border-default">
            {filteredProjects.map((board) => {
              const stats = getBoardStats(board)
              return (
                <li
                  key={board.id}
                  className="p-5 hover:bg-canvas-hover transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setActiveBoardId(board.id)}
                        className="text-sm font-bold text-accent-fg hover:underline text-left cursor-pointer"
                      >
                        {board.title}
                      </button>
                      <span className="px-2 py-0.2 rounded-full border border-border-default text-[10px] text-fg-muted bg-canvas-subtle">
                        {board.columns.length} columns
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted line-clamp-1">{board.description}</p>
                    <div className="text-[11px] text-fg-muted">
                      Updated on {new Date(board.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-36 space-y-1">
                      <div className="flex justify-between text-[10px] text-fg-muted">
                        <span>Progress</span>
                        <span>{stats.percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-canvas-subtle rounded-full overflow-hidden border border-border-default/50">
                        <div
                          className="h-full bg-success-fg transition-all duration-300"
                          style={{ width: `${stats.percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveBoardId(board.id)}
                        className="px-2.5 py-1 rounded bg-canvas-raised hover:bg-canvas-hover active:scale-[0.97] text-fg-default text-xs font-semibold border border-border-default cursor-pointer transition-all"
                      >
                        View board
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBoard(board.id)}
                        className="p-1 rounded text-fg-muted hover:text-danger-fg hover:bg-canvas-hover active:scale-[0.97] cursor-pointer transition-all"
                        title="Delete project"
                      >
                        <Octicon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-canvas-raised border border-border-default rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-border-default flex items-center justify-between bg-canvas-subtle">
              <h3 className="font-semibold text-fg-default">Create a new project board</h3>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-fg-muted hover:text-fg-default p-1 rounded-md cursor-pointer transition-colors"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block font-semibold text-fg-default">Project board name</label>
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="e.g. Release 2.0 Roadmap"
                  required
                  autoFocus
                  className="w-full px-3 py-1.5 bg-canvas-default text-fg-default placeholder-fg-muted border border-border-default rounded focus:outline-none focus:border-accent-fg h-8"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-fg-default">Description</label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="What is this project board about?"
                  rows={3}
                  className="w-full px-3 py-1.5 bg-canvas-default text-fg-default placeholder-fg-muted border border-border-default rounded focus:outline-none focus:border-accent-fg resize-none"
                />
              </div>

              <div className="p-3 bg-canvas-default border border-border-default rounded text-[11px] text-fg-muted space-y-1">
                <span className="font-semibold text-fg-default">Template: Basic Kanban</span>
                <p>Includes To do, In progress, and Done columns automatically.</p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-border-default bg-canvas-raised hover:bg-canvas-hover active:scale-[0.97] text-fg-default font-medium cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-success-fg hover:opacity-90 active:scale-[0.97] text-white font-semibold transition-all cursor-pointer"
                >
                  Create project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
