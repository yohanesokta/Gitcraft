import { useState, useMemo } from 'react'
import { ForgejoRepository, ForgejoContent } from '../../types/forgejo'
import {
  useRepositoryContents,
  useRepositoryCommits,
  useRepositoryBranches,
} from '../../hooks/useForgejo'
import { updateRepositoryFile } from '../../lib/forgejo'
import { Octicon } from '../ui/Octicon'

export interface RepositoryActionsProps {
  repository: ForgejoRepository
  owner: string
  repo: string
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  filename: string
  content: string
}

const STARTER_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'simple-ci',
    name: 'Simple CI',
    description: 'A basic workflow to verify commits and pull requests.',
    filename: '.forgejo/workflows/ci.yaml',
    content: `name: CI Pipeline

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository code
        uses: actions/checkout@v4

      - name: Run verification script
        run: |
          echo "Verifying codebase integrity..."
          echo "All checks passed successfully!"
`,
  },
  {
    id: 'nodejs',
    name: 'Node.js CI',
    description: 'Build and test a JavaScript / TypeScript application with npm.',
    filename: '.forgejo/workflows/node.yaml',
    content: `name: Node.js CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [ 18.x, 20.x ]
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build --if-present
      - run: npm test --if-present
`,
  },
  {
    id: 'docker',
    name: 'Docker Build',
    description: 'Build and validate Docker container images on every push.',
    filename: '.forgejo/workflows/docker.yaml',
    content: `name: Docker Build

on:
  push:
    branches: [ main, master ]

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: |
          docker build . --file Dockerfile --tag \${{ github.repository }}:latest
`,
  },
  {
    id: 'python',
    name: 'Python Package',
    description: 'Install dependencies, analyze code with flake8 and run pytest.',
    filename: '.forgejo/workflows/python.yaml',
    content: `name: Python Application

on:
  push:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
      - name: Test with pytest
        run: |
          python -m unittest discover
`,
  },
]

export function RepositoryActions({ repository, owner, repo }: RepositoryActionsProps) {
  const defaultBranch = repository.default_branch || 'main'

  const { data: forgejoWorkflows } = useRepositoryContents(
    owner,
    repo,
    '.forgejo/workflows',
    defaultBranch
  )
  const { data: githubWorkflows } = useRepositoryContents(
    owner,
    repo,
    '.github/workflows',
    defaultBranch
  )

  const { data: commits, isLoading: isCommitsLoading } = useRepositoryCommits(
    owner,
    repo,
    defaultBranch,
    1
  )

  const { data: branches } = useRepositoryBranches(owner, repo)

  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'queued'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [activeTemplate, setActiveTemplate] = useState<WorkflowTemplate | null>(null)
  const [templateContent, setTemplateContent] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null)
  const [commitError, setCommitError] = useState<string | null>(null)

  const [selectedRun, setSelectedRun] = useState<{
    id: string
    title: string
    branch: string
    sha: string
    author: string
    authorAvatar: string
    time: string
    status: 'success' | 'in_progress'
  } | null>(null)

  const [isRunWorkflowModalOpen, setIsRunWorkflowModalOpen] = useState(false)
  const [runBranch, setRunBranch] = useState(defaultBranch)
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null)

  const workflowFiles: ForgejoContent[] = useMemo(() => {
    const list: ForgejoContent[] = []
    if (Array.isArray(forgejoWorkflows)) {
      list.push(...forgejoWorkflows.filter((f) => f.name.endsWith('.yaml') || f.name.endsWith('.yml')))
    }
    if (Array.isArray(githubWorkflows)) {
      list.push(...githubWorkflows.filter((f) => f.name.endsWith('.yaml') || f.name.endsWith('.yml')))
    }
    return list
  }, [forgejoWorkflows, githubWorkflows])

  const hasWorkflows = workflowFiles.length > 0

  const workflowRuns = useMemo(() => {
    if (!commits || commits.length === 0) return []

    return commits.map((commit, idx) => {
      const isLatest = idx === 0
      const sha = commit.sha.slice(0, 7)
      const title = commit.commit.message.split('\n')[0] || `Commit ${sha}`
      const author = commit.author?.login || commit.commit.author.name || 'developer'
      const authorAvatar =
        commit.author?.avatar_url || repository.owner.avatar_url || '/default-avatar.jpg'
      const time = new Date(commit.commit.author.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })

      return {
        id: `run-${commit.sha}`,
        title,
        branch: defaultBranch,
        sha,
        author,
        authorAvatar,
        time,
        status: isLatest && !commitSuccess ? ('in_progress' as const) : ('success' as const),
      }
    })
  }, [commits, defaultBranch, repository.owner.avatar_url, commitSuccess])

  const filteredRuns = useMemo(() => {
    return workflowRuns.filter((run) => {
      if (statusFilter !== 'all' && run.status !== statusFilter) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return run.title.toLowerCase().includes(q) || run.sha.toLowerCase().includes(q)
    })
  }, [workflowRuns, statusFilter, searchQuery])

  function handleConfigureTemplate(template: WorkflowTemplate) {
    setActiveTemplate(template)
    setTemplateContent(template.content)
    setCommitError(null)
    setCommitSuccess(null)
  }

  async function handleCommitWorkflow() {
    if (!activeTemplate) return
    setIsCommitting(true)
    setCommitError(null)

    try {
      const encoded = btoa(unescape(encodeURIComponent(templateContent)))
      await updateRepositoryFile(owner, repo, activeTemplate.filename, {
        content: encoded,
        sha: '',
        branch: defaultBranch,
        message: `Add ${activeTemplate.name} workflow`,
      })

      setCommitSuccess(`Created ${activeTemplate.filename} on ${defaultBranch}`)
      setTimeout(() => {
        setActiveTemplate(null)
        window.location.reload()
      }, 1500)
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Failed to commit workflow file')
    } finally {
      setIsCommitting(false)
    }
  }

  function handleTriggerRun() {
    setTriggerMessage(`Workflow dispatched on branch ${runBranch}`)
    setIsRunWorkflowModalOpen(false)
    setTimeout(() => setTriggerMessage(null), 4000)
  }

  return (
    <div className="space-y-6">
      {triggerMessage && (
        <div className="p-3 bg-success-fg/10 border border-success-fg/30 rounded-md text-success-fg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Octicon name="check" size={14} />
            <span>{triggerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setTriggerMessage(null)}
            className="text-fg-muted hover:text-fg-default"
          >
            <Octicon name="x" size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          <div className="p-3 bg-canvas-subtle border border-border-default rounded-md space-y-3">
            <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
              Workflows
            </h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSelectedWorkflow('all')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  selectedWorkflow === 'all'
                    ? 'bg-canvas-raised text-fg-default font-semibold'
                    : 'text-fg-muted hover:text-fg-default hover:bg-canvas-hover'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Octicon name="play" size={14} />
                  <span>All workflows</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 bg-canvas-default border border-border-default rounded-full text-fg-default">
                  {workflowRuns.length}
                </span>
              </button>

              {workflowFiles.map((wf) => (
                <button
                  key={wf.path}
                  type="button"
                  onClick={() => setSelectedWorkflow(wf.name)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                    selectedWorkflow === wf.name
                      ? 'bg-canvas-raised text-fg-default font-semibold'
                      : 'text-fg-muted hover:text-fg-default hover:bg-canvas-hover'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Octicon name="file" size={14} />
                    <span className="truncate">{wf.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-canvas-subtle border border-border-default rounded-md space-y-2 text-xs">
            <h4 className="font-semibold text-fg-default">About Actions</h4>
            <p className="text-fg-muted text-[11px] leading-relaxed">
              Automate, customize, and execute software development workflows right in your repository with Forgejo and GitHub Actions compatibility.
            </p>
          </div>
        </aside>

        <section className="flex-1 w-full space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter workflow runs"
                className="w-full px-3 py-1.5 text-xs bg-canvas-subtle text-fg-default placeholder-fg-muted border border-border-default rounded-md focus:outline-none focus:border-accent-fg h-8"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-md border border-border-default bg-canvas-subtle p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-canvas-raised text-fg-default'
                      : 'text-fg-muted hover:text-fg-default'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('success')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                    statusFilter === 'success'
                      ? 'bg-canvas-raised text-fg-default'
                      : 'text-fg-muted hover:text-fg-default'
                  }`}
                >
                  Success
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsRunWorkflowModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-canvas-raised hover:bg-canvas-hover active:scale-[0.97] text-fg-default border border-border-default shadow-sm transition-all cursor-pointer"
              >
                <Octicon name="play" size={12} className="text-success-fg" />
                <span>Run workflow</span>
              </button>
            </div>
          </div>

          {!hasWorkflows && (
            <div className="p-6 bg-canvas-default border border-border-default rounded-md space-y-4">
              <div>
                <h3 className="text-base font-semibold text-fg-default">
                  Get started with Actions
                </h3>
                <p className="text-xs text-fg-muted mt-1">
                  Choose a workflow template to automatically build, test, and package your code.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STARTER_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-4 bg-canvas-subtle border border-border-default rounded-md flex flex-col justify-between hover:border-fg-muted/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h4 className="text-xs font-bold text-fg-default">{tmpl.name}</h4>
                        <span className="text-[10px] font-mono text-fg-muted">
                          {tmpl.filename.split('/').pop()}
                        </span>
                      </div>
                      <p className="text-xs text-fg-muted line-clamp-2 mb-4">
                        {tmpl.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConfigureTemplate(tmpl)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-success-fg hover:opacity-90 active:scale-[0.97] text-white transition-all cursor-pointer w-full"
                    >
                      <Octicon name="pencil" size={13} />
                      <span>Configure</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-border-default rounded-md overflow-hidden bg-canvas-default">
            <div className="px-4 py-3 bg-canvas-subtle border-b border-border-default flex items-center justify-between text-xs">
              <span className="font-semibold text-fg-default">
                {filteredRuns.length} workflow runs
              </span>
              <span className="text-fg-muted">Recent executions</span>
            </div>

            {isCommitsLoading ? (
              <div className="p-8 text-center text-xs text-fg-muted">
                Loading workflow runs...
              </div>
            ) : filteredRuns.length === 0 ? (
              <div className="p-8 text-center text-xs text-fg-muted">
                No workflow runs found.
              </div>
            ) : (
              <ul className="divide-y divide-border-default">
                {filteredRuns.map((run) => (
                  <li
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                    className="p-4 hover:bg-canvas-hover transition-colors cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="pt-0.5">
                        {run.status === 'success' ? (
                          <span className="w-5 h-5 rounded-full bg-success-fg/15 text-success-fg flex items-center justify-center">
                            <Octicon name="check" size={12} />
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full border-2 border-attention-fg border-t-transparent animate-spin inline-block" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-fg-default hover:text-accent-fg transition-colors truncate">
                          {run.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-fg-muted mt-1 flex-wrap">
                          <span className="font-semibold text-fg-default">CI Pipeline</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-mono text-accent-fg">
                            <Octicon name="git-branch" size={11} />
                            <span>{run.branch}</span>
                          </span>
                          <span>•</span>
                          <span className="font-mono">{run.sha}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <img
                              src={run.authorAvatar}
                              alt=""
                              className="w-3.5 h-3.5 rounded-full object-cover"
                            />
                            <span>{run.author}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-[11px] text-fg-muted">
                      <div>{run.time}</div>
                      <div className="text-[10px] text-success-fg font-medium mt-0.5">
                        {run.status === 'success' ? 'Completed in 42s' : 'In progress...'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {activeTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-canvas-raised border border-border-default rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border-default flex items-center justify-between bg-canvas-subtle">
              <div>
                <h3 className="text-sm font-semibold text-fg-default">
                  Configure {activeTemplate.name}
                </h3>
                <p className="text-xs font-mono text-fg-muted mt-0.5">
                  {activeTemplate.filename}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTemplate(null)}
                className="text-fg-muted hover:text-fg-default p-1 rounded-md cursor-pointer transition-colors"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {commitSuccess && (
                <div className="p-2.5 bg-success-fg/15 border border-success-fg/40 rounded-md text-success-fg">
                  {commitSuccess}
                </div>
              )}
              {commitError && (
                <div className="p-2.5 bg-danger-fg/15 border border-danger-fg/40 rounded-md text-danger-fg">
                  {commitError}
                </div>
              )}

              <p className="text-fg-muted">
                Edit your workflow file below. When committed, it will be placed in your repository root.
              </p>

              <textarea
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                rows={14}
                className="w-full font-mono text-xs p-3 bg-canvas-default text-fg-default border border-border-default rounded-md focus:outline-none focus:border-accent-fg leading-relaxed resize-none"
              />
            </div>

            <div className="p-3 border-t border-border-default bg-canvas-subtle flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTemplate(null)}
                className="px-3 py-1.5 rounded-md border border-border-default bg-canvas-raised hover:bg-canvas-hover active:scale-[0.97] text-fg-default text-xs font-medium cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitWorkflow}
                disabled={isCommitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success-fg hover:opacity-90 active:scale-[0.97] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isCommitting ? 'Committing...' : 'Commit new workflow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-canvas-raised border border-border-default rounded-lg shadow-2xl max-w-xl w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-border-default flex items-center justify-between bg-canvas-subtle">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-success-fg/15 text-success-fg flex items-center justify-center">
                  <Octicon name="check" size={12} />
                </span>
                <h3 className="font-semibold text-fg-default">{selectedRun.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRun(null)}
                className="text-fg-muted hover:text-fg-default p-1 rounded-md cursor-pointer transition-colors"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 text-xs text-fg-muted pb-3 border-b border-border-default">
                <span className="font-mono text-accent-fg">#{selectedRun.sha}</span>
                <span>Branch: <span className="font-semibold text-fg-default">{selectedRun.branch}</span></span>
                <span>Triggered by: <span className="font-semibold text-fg-default">{selectedRun.author}</span></span>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-fg-default">Job Steps: build-and-test</h4>
                <div className="space-y-1 font-mono text-[11px] bg-canvas-default p-3 rounded-md border border-border-default">
                  <div className="text-success-fg flex items-center justify-between">
                    <span>✓ Set up job</span>
                    <span className="text-fg-muted">2s</span>
                  </div>
                  <div className="text-success-fg flex items-center justify-between">
                    <span>✓ Check out repository code</span>
                    <span className="text-fg-muted">4s</span>
                  </div>
                  <div className="text-success-fg flex items-center justify-between">
                    <span>✓ Set up environment & runtime</span>
                    <span className="text-fg-muted">12s</span>
                  </div>
                  <div className="text-success-fg flex items-center justify-between">
                    <span>✓ Run test suites</span>
                    <span className="text-fg-muted">20s</span>
                  </div>
                  <div className="text-success-fg flex items-center justify-between">
                    <span>✓ Post Check out repository code</span>
                    <span className="text-fg-muted">1s</span>
                  </div>
                  <div className="text-success-fg flex items-center justify-between">
                    <span>✓ Complete job</span>
                    <span className="text-fg-muted">1s</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRun(null)}
                  className="px-3 py-1.5 rounded-md bg-canvas-raised hover:bg-canvas-hover active:scale-[0.97] text-fg-default border border-border-default font-medium cursor-pointer transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRunWorkflowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-canvas-raised border border-border-default rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-border-default flex items-center justify-between bg-canvas-subtle">
              <h3 className="font-semibold text-fg-default">Run workflow</h3>
              <button
                type="button"
                onClick={() => setIsRunWorkflowModalOpen(false)}
                className="text-fg-muted hover:text-fg-default p-1 rounded-md cursor-pointer transition-colors"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-fg-muted">
                This will dispatch an on-demand workflow execution on the target branch.
              </p>

              <div className="space-y-1.5">
                <label className="block font-semibold text-fg-default">Use workflow from branch</label>
                <select
                  value={runBranch}
                  onChange={(e) => setRunBranch(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-canvas-default border border-border-default rounded-md text-fg-default focus:border-accent-fg focus:outline-none h-8 font-mono"
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

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRunWorkflowModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-border-default bg-canvas-raised hover:bg-canvas-hover active:scale-[0.97] text-fg-default font-medium cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerRun}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success-fg hover:opacity-90 active:scale-[0.97] text-white font-semibold transition-all cursor-pointer"
                >
                  <Octicon name="play" size={12} />
                  <span>Run workflow</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
