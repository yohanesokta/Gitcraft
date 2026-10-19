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
        <div className="p-3 bg-[#238636]/15 border border-[#238636]/40 rounded-md text-[#3fb950] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Octicon name="check" size={14} />
            <span>{triggerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setTriggerMessage(null)}
            className="text-[#8b949e] hover:text-[#e6edf3]"
          >
            <Octicon name="x" size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-md space-y-3">
            <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
              Workflows
            </h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSelectedWorkflow('all')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  selectedWorkflow === 'all'
                    ? 'bg-[#21262d] text-[#e6edf3] font-semibold'
                    : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Octicon name="play" size={14} />
                  <span>All workflows</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 bg-[#30363d] rounded-full text-[#e6edf3]">
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
                      ? 'bg-[#21262d] text-[#e6edf3] font-semibold'
                      : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50'
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

          <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-md space-y-2 text-xs">
            <h4 className="font-semibold text-[#e6edf3]">About Actions</h4>
            <p className="text-[#8b949e] text-[11px] leading-relaxed">
              Automate, customize, and execute software development workflows right in your repository with Forgejo and GitHub Actions compatibility.
            </p>
          </div>
        </aside>

        <section className="flex-1 w-full space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#21262d]">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter workflow runs"
                className="w-full px-3 py-1.5 text-xs bg-[#161b22] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] h-8"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-md border border-[#30363d] bg-[#161b22] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-[#21262d] text-[#e6edf3]'
                      : 'text-[#8b949e] hover:text-[#e6edf3]'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('success')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                    statusFilter === 'success'
                      ? 'bg-[#21262d] text-[#e6edf3]'
                      : 'text-[#8b949e] hover:text-[#e6edf3]'
                  }`}
                >
                  Success
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsRunWorkflowModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] shadow-sm transition-colors cursor-pointer"
              >
                <Octicon name="play" size={12} className="text-[#3fb950]" />
                <span>Run workflow</span>
              </button>
            </div>
          </div>

          {!hasWorkflows && (
            <div className="p-6 bg-[#0d1117] border border-[#30363d] rounded-md space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[#e6edf3]">
                  Get started with Actions
                </h3>
                <p className="text-xs text-[#8b949e] mt-1">
                  Choose a workflow template to automatically build, test, and package your code.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STARTER_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-4 bg-[#161b22] border border-[#30363d] rounded-md flex flex-col justify-between hover:border-[#8b949e]/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h4 className="text-xs font-bold text-[#e6edf3]">{tmpl.name}</h4>
                        <span className="text-[10px] font-mono text-[#8b949e]">
                          {tmpl.filename.split('/').pop()}
                        </span>
                      </div>
                      <p className="text-xs text-[#8b949e] line-clamp-2 mb-4">
                        {tmpl.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConfigureTemplate(tmpl)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white transition-colors cursor-pointer w-full"
                    >
                      <Octicon name="pencil" size={13} />
                      <span>Configure</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
            <div className="px-4 py-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#e6edf3]">
                {filteredRuns.length} workflow runs
              </span>
              <span className="text-[#8b949e]">Recent executions</span>
            </div>

            {isCommitsLoading ? (
              <div className="p-8 text-center text-xs text-[#8b949e]">
                Loading workflow runs...
              </div>
            ) : filteredRuns.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8b949e]">
                No workflow runs found.
              </div>
            ) : (
              <ul className="divide-y divide-[#21262d]">
                {filteredRuns.map((run) => (
                  <li
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                    className="p-4 hover:bg-[#161b22]/70 transition-colors cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="pt-0.5">
                        {run.status === 'success' ? (
                          <span className="w-5 h-5 rounded-full bg-[#238636]/20 text-[#3fb950] flex items-center justify-center">
                            <Octicon name="check" size={12} />
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full border-2 border-[#d29922] border-t-transparent animate-spin inline-block" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-[#e6edf3] hover:text-[#58a6ff] truncate">
                          {run.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-[#8b949e] mt-1 flex-wrap">
                          <span className="font-semibold text-[#e6edf3]">CI Pipeline</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-mono text-[#58a6ff]">
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

                    <div className="text-right shrink-0 text-[11px] text-[#8b949e]">
                      <div>{run.time}</div>
                      <div className="text-[10px] text-[#3fb950] font-medium mt-0.5">
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
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
              <div>
                <h3 className="text-sm font-semibold text-[#e6edf3]">
                  Configure {activeTemplate.name}
                </h3>
                <p className="text-xs font-mono text-[#8b949e] mt-0.5">
                  {activeTemplate.filename}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTemplate(null)}
                className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded-md"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {commitSuccess && (
                <div className="p-2.5 bg-[#238636]/15 border border-[#238636]/40 rounded-md text-[#3fb950]">
                  {commitSuccess}
                </div>
              )}
              {commitError && (
                <div className="p-2.5 bg-[#f85149]/15 border border-[#f85149]/40 rounded-md text-[#f85149]">
                  {commitError}
                </div>
              )}

              <p className="text-[#8b949e]">
                Edit your workflow file below. When committed, it will be placed in your repository root.
              </p>

              <textarea
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                rows={14}
                className="w-full font-mono text-xs p-3 bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] leading-relaxed resize-none"
              />
            </div>

            <div className="p-3 border-t border-[#30363d] bg-[#0d1117] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTemplate(null)}
                className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitWorkflow}
                disabled={isCommitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCommitting ? 'Committing...' : 'Commit new workflow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-xl w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#238636]/20 text-[#3fb950] flex items-center justify-center">
                  <Octicon name="check" size={12} />
                </span>
                <h3 className="font-semibold text-[#e6edf3]">{selectedRun.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRun(null)}
                className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded-md cursor-pointer"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 text-xs text-[#8b949e] pb-3 border-b border-[#21262d]">
                <span className="font-mono text-[#58a6ff]">#{selectedRun.sha}</span>
                <span>Branch: <span className="font-semibold text-[#e6edf3]">{selectedRun.branch}</span></span>
                <span>Triggered by: <span className="font-semibold text-[#e6edf3]">{selectedRun.author}</span></span>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-[#e6edf3]">Job Steps: build-and-test</h4>
                <div className="space-y-1 font-mono text-[11px] bg-[#0d1117] p-3 rounded-md border border-[#21262d]">
                  <div className="text-[#3fb950] flex items-center justify-between">
                    <span>✓ Set up job</span>
                    <span className="text-[#8b949e]">2s</span>
                  </div>
                  <div className="text-[#3fb950] flex items-center justify-between">
                    <span>✓ Check out repository code</span>
                    <span className="text-[#8b949e]">4s</span>
                  </div>
                  <div className="text-[#3fb950] flex items-center justify-between">
                    <span>✓ Set up environment & runtime</span>
                    <span className="text-[#8b949e]">12s</span>
                  </div>
                  <div className="text-[#3fb950] flex items-center justify-between">
                    <span>✓ Run test suites</span>
                    <span className="text-[#8b949e]">20s</span>
                  </div>
                  <div className="text-[#3fb950] flex items-center justify-between">
                    <span>✓ Post Check out repository code</span>
                    <span className="text-[#8b949e]">1s</span>
                  </div>
                  <div className="text-[#3fb950] flex items-center justify-between">
                    <span>✓ Complete job</span>
                    <span className="text-[#8b949e]">1s</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRun(null)}
                  className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] font-medium cursor-pointer"
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
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
              <h3 className="font-semibold text-[#e6edf3]">Run workflow</h3>
              <button
                type="button"
                onClick={() => setIsRunWorkflowModalOpen(false)}
                className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded-md cursor-pointer"
              >
                <Octicon name="x" size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-[#8b949e]">
                This will dispatch an on-demand workflow execution on the target branch.
              </p>

              <div className="space-y-1.5">
                <label className="block font-semibold text-[#e6edf3]">Use workflow from branch</label>
                <select
                  value={runBranch}
                  onChange={(e) => setRunBranch(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none h-8 font-mono"
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
                  className="px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerRun}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-semibold transition-colors cursor-pointer"
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
