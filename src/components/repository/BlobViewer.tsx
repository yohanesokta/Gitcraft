import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { MarkdownViewer } from '../ui/MarkdownViewer'
import { Octicon } from '../ui/Octicon'
import { useTheme } from '../../themes/ThemeContext'
import {
  getRepositoryContents,
  updateRepositoryFile,
  getStoredUser,
  getAuthToken,
} from '../../lib/forgejo'

export interface BlobViewerProps {
  filename: string
  path?: string
  content: string
  size?: number
  rawUrl?: string
  owner?: string
  repo?: string
  refName?: string
  onContentUpdated?: (newContent: string) => void
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    jsonc: 'json',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    md: 'markdown',
    markdown: 'markdown',
    py: 'python',
    pyw: 'python',
    go: 'go',
    rs: 'rust',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    cs: 'csharp',
    java: 'java',
    rb: 'ruby',
    php: 'php',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    svg: 'xml',
    sql: 'sql',
    dockerfile: 'dockerfile',
    toml: 'ini',
    ini: 'ini',
    graphql: 'graphql',
    gql: 'graphql',
    r: 'r',
    swift: 'swift',
    kt: 'kotlin',
    kts: 'kotlin',
    dart: 'dart',
    lua: 'lua',
  }
  const base = filename.toLowerCase()
  if (base === 'dockerfile') return 'dockerfile'
  if (base === 'makefile') return 'makefile'
  return map[ext] || 'plaintext'
}

const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'json',
  'html',
  'css',
  'scss',
  'markdown',
  'python',
  'go',
  'rust',
  'c',
  'cpp',
  'csharp',
  'java',
  'ruby',
  'php',
  'shell',
  'yaml',
  'xml',
  'sql',
  'dockerfile',
  'ini',
  'graphql',
  'lua',
  'plaintext',
]

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function BlobViewer({
  filename,
  path = filename,
  content,
  size,
  rawUrl,
  owner,
  repo,
  refName = 'main',
  onContentUpdated,
}: BlobViewerProps) {
  const { actualMode } = useTheme()
  const isMarkdown = filename.toLowerCase().endsWith('.md')
  const defaultLanguage = useMemo(() => getLanguageFromFilename(filename), [filename])
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage)

  const [viewMode, setViewMode] = useState<'code' | 'preview'>(isMarkdown ? 'preview' : 'code')
  const [isEditing, setIsEditing] = useState(false)
  const [editorValue, setEditorValue] = useState(content)
  const [hasCopied, setHasCopied] = useState(false)

  const [commitMessage, setCommitMessage] = useState(`Update ${filename}`)
  const [commitDescription, setCommitDescription] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [commitSuccess, setCommitSuccess] = useState(false)

  const navigate = useNavigate()
  const currentUser = getStoredUser()
  const authToken = getAuthToken()
  const isLoggedIn = Boolean(currentUser && authToken)

  useEffect(() => {
    setSelectedLanguage(getLanguageFromFilename(filename))
    setEditorValue(content)
    setCommitMessage(`Update ${filename}`)
  }, [filename, content])

  const lineCount = useMemo(() => {
    return (editorValue || '').split('\n').length
  }, [editorValue])

  const formattedSize = useMemo(() => {
    if (typeof size === 'number' && size > 0 && !isEditing) {
      if (size < 1024) return `${size} Bytes`
      return `${(size / 1024).toFixed(1)} KB`
    }
    const bytes = new Blob([editorValue]).size
    if (bytes < 1024) return `${bytes} Bytes`
    return `${(bytes / 1024).toFixed(1)} KB`
  }, [size, editorValue, isEditing])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(editorValue)
      setHasCopied(true)
      setTimeout(() => setHasCopied(false), 2000)
    } catch {
    }
  }

  function handleDownload() {
    const blob = new Blob([editorValue], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function handleStartEdit() {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    setIsEditing(true)
    setViewMode('code')
    setCommitError(null)
    setCommitSuccess(false)
  }

  function handleCancelEdit() {
    setEditorValue(content)
    setIsEditing(false)
    setCommitError(null)
  }

  async function handleCommit(e: React.FormEvent) {
    e.preventDefault()
    if (!owner || !repo) return
    setIsCommitting(true)
    setCommitError(null)
    try {
      const fileData = await getRepositoryContents(owner, repo, path, refName)
      if (Array.isArray(fileData) || !fileData?.sha) {
        throw new Error('Unable to retrieve file SHA for commit')
      }

      const fullMessage = commitDescription.trim()
        ? `${commitMessage.trim()}\n\n${commitDescription.trim()}`
        : commitMessage.trim()

      const base64Content = toBase64(editorValue)

      await updateRepositoryFile(owner, repo, path, {
        sha: fileData.sha,
        content: base64Content,
        message: fullMessage,
        branch: refName,
      })

      setIsEditing(false)
      setCommitSuccess(true)
      setTimeout(() => setCommitSuccess(false), 3000)
      if (onContentUpdated) {
        onContentUpdated(editorValue)
      }
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Failed to commit changes')
    } finally {
      setIsCommitting(false)
    }
  }

  const editorHeight = useMemo(() => {
    const calculated = Math.max(450, Math.min(lineCount * 19 + 40, 850))
    return `${calculated}px`
  }, [lineCount])

  return (
    <div className="space-y-4">
      {commitSuccess && (
        <div className="p-3 bg-success-fg/10 border border-success-fg/40 rounded-md text-xs text-success-fg flex items-center gap-2">
          <Octicon name="check" size={14} />
          <span>File successfully committed and updated!</span>
        </div>
      )}

      <div className="border border-border-default rounded-lg overflow-hidden bg-canvas-default">
        <div className="px-4 py-2.5 bg-canvas-subtle border-b border-border-default flex items-center justify-between text-xs text-fg-muted flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {isMarkdown && !isEditing && (
              <div className="inline-flex rounded-md border border-border-default p-0.5 bg-canvas-default">
                <button
                  type="button"
                  onClick={() => setViewMode('code')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer active:scale-[0.97] ${
                    viewMode === 'code'
                      ? 'bg-canvas-raised text-fg-default font-semibold shadow-xs'
                      : 'text-fg-muted hover:text-fg-default'
                  }`}
                >
                  <Octicon name="code" size={13} />
                  <span>Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer active:scale-[0.97] ${
                    viewMode === 'preview'
                      ? 'bg-canvas-raised text-fg-default font-semibold shadow-xs'
                      : 'text-fg-muted hover:text-fg-default'
                  }`}
                >
                  <Octicon name="book" size={13} />
                  <span>Preview</span>
                </button>
              </div>
            )}

            {isEditing && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-subtle text-accent-fg border border-accent-fg/30 font-semibold text-xs">
                <Octicon name="pencil" size={12} />
                <span>Editing</span>
              </span>
            )}

            <div className="flex items-center gap-2 text-xs font-mono text-fg-muted">
              <span>{lineCount} lines</span>
              <span>&middot;</span>
              <span>{formattedSize}</span>
            </div>

            <div className="flex items-center gap-1 border-l border-border-default pl-3">
              <span className="text-[11px] text-fg-muted">Syntax:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-canvas-default text-fg-default border border-border-default rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-accent-fg cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-canvas-subtle hover:bg-canvas-hover text-fg-default border border-border-default transition-colors cursor-pointer active:scale-[0.97]"
              >
                <Octicon name="pencil" size={13} className="text-fg-muted" />
                <span>Edit file</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-canvas-subtle hover:bg-canvas-hover text-fg-muted hover:text-fg-default border border-border-default transition-colors cursor-pointer active:scale-[0.97]"
              >
                Cancel
              </button>
            )}

            {rawUrl && !isEditing && (
              <a
                href={rawUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-canvas-subtle hover:bg-canvas-hover text-fg-default border border-border-default transition-colors active:scale-[0.97]"
              >
                Raw
              </a>
            )}

            {!isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-canvas-subtle hover:bg-canvas-hover text-fg-default border border-border-default transition-colors cursor-pointer active:scale-[0.97]"
                >
                  {hasCopied ? (
                    <>
                      <Octicon name="check" size={13} className="text-success-fg" />
                      <span className="text-success-fg">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Octicon name="copy" size={13} className="text-fg-muted" />
                      <span>Copy raw</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  aria-label="Download raw file"
                  className="w-8 h-8 rounded-md border border-border-default bg-canvas-subtle hover:bg-canvas-hover flex items-center justify-center text-fg-muted hover:text-fg-default transition-colors cursor-pointer active:scale-[0.97]"
                >
                  <Octicon name="download" size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {viewMode === 'preview' && isMarkdown && !isEditing ? (
          <div className="p-6 sm:p-8">
            <MarkdownViewer
              content={editorValue}
              owner={owner}
              repo={repo}
              refName={refName}
            />
          </div>
        ) : (
          <div className="relative">
            <Editor
              height={editorHeight}
              language={selectedLanguage}
              value={editorValue}
              theme={actualMode === 'dark' ? 'vs-dark' : 'light'}
              onChange={(value) => setEditorValue(value || '')}
              options={{
                readOnly: !isEditing,
                minimap: { enabled: lineCount > 40 },
                scrollBeyondLastLine: false,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
                automaticLayout: true,
                wordWrap: 'on',
                lineNumbers: 'on',
                tabSize: 2,
                contextmenu: true,
                padding: { top: 8, bottom: 8 },
              }}
              loading={
                <div className="p-8 text-center text-xs text-fg-muted">
                  Loading Monaco Editor...
                </div>
              }
            />
          </div>
        )}
      </div>

      {isEditing && (
        <form
          onSubmit={handleCommit}
          className="p-5 border border-border-default rounded-lg bg-canvas-subtle space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border-default">
            <h3 className="text-sm font-semibold text-fg-default">Commit changes</h3>
            <span className="text-xs text-fg-muted">
              Branch: <span className="font-mono text-fg-default">{refName}</span>
            </span>
          </div>

          {commitError && (
            <div className="p-3 bg-danger-fg/10 border border-danger-fg/40 rounded-md text-xs text-danger-fg">
              {commitError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-fg-default mb-1">
                Commit message
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs bg-canvas-default text-fg-default placeholder-fg-subtle border border-border-default rounded-md focus:outline-none focus:border-accent-fg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">
                Extended description (optional)
              </label>
              <textarea
                value={commitDescription}
                onChange={(e) => setCommitDescription(e.target.value)}
                placeholder="Add an optional extended description..."
                rows={3}
                className="w-full px-3 py-1.5 text-xs bg-canvas-default text-fg-default placeholder-fg-subtle border border-border-default rounded-md focus:outline-none focus:border-accent-fg resize-y"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 text-xs text-fg-muted">
              <div className="w-2 h-2 rounded-full bg-success-fg" />
              <span>Commit directly to the <span className="font-mono text-fg-default">{refName}</span> branch</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3 py-1.5 text-xs text-fg-muted hover:text-fg-default rounded-md border border-border-default bg-canvas-default cursor-pointer active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCommitting || !commitMessage.trim()}
              className="px-4 py-1.5 text-xs font-semibold text-[var(--accent-text)] rounded-md bg-accent-fg hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity active:scale-[0.97]"
            >
              {isCommitting ? 'Committing changes...' : 'Commit changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
