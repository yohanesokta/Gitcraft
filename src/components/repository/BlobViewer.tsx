import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { MarkdownViewer } from '../ui/MarkdownViewer'
import { Octicon } from '../ui/Octicon'
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
        <div className="p-3 bg-[#238636]/20 border border-[#238636]/50 rounded-md text-xs text-[#3fb950] flex items-center gap-2">
          <Octicon name="check" size={14} />
          <span>File successfully committed and updated!</span>
        </div>
      )}

      <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
        <div className="p-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {isMarkdown && !isEditing && (
              <div className="inline-flex rounded-md shadow-sm border border-[#30363d] p-0.5 bg-[#0d1117]">
                <button
                  type="button"
                  onClick={() => setViewMode('code')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'code'
                      ? 'bg-[#21262d] text-[#e6edf3] font-semibold'
                      : 'text-[#8b949e] hover:text-[#e6edf3]'
                  }`}
                >
                  <Octicon name="code" size={14} />
                  <span>Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'preview'
                      ? 'bg-[#21262d] text-[#e6edf3] font-semibold'
                      : 'text-[#8b949e] hover:text-[#e6edf3]'
                  }`}
                >
                  <Octicon name="book" size={14} />
                  <span>Preview</span>
                </button>
              </div>
            )}

            {isEditing && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40 font-semibold text-xs">
                <Octicon name="pencil" size={12} />
                <span>Editing</span>
              </span>
            )}

            <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e]">
              <span>{lineCount} lines</span>
              <span>&middot;</span>
              <span>{formattedSize}</span>
            </div>

            <div className="flex items-center gap-1 border-l border-[#30363d] pl-3">
              <span className="text-[11px] text-[#8b949e]">Syntax:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-[#58a6ff] cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
              >
                <Octicon name="pencil" size={13} className="text-[#8b949e]" />
                <span>Edit file</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            {rawUrl && !isEditing && (
              <a
                href={rawUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors"
              >
                Raw
              </a>
            )}

            {!isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
                >
                  {hasCopied ? (
                    <>
                      <Octicon name="check" size={14} className="text-[#3fb950]" />
                      <span className="text-[#3fb950]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Octicon name="copy" size={14} className="text-[#8b949e]" />
                      <span>Copy raw</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  aria-label="Download raw file"
                  className="w-7 h-7 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] flex items-center justify-center text-[#8b949e] hover:text-[#e6edf3] transition-colors cursor-pointer"
                >
                  <Octicon name="download" size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {viewMode === 'preview' && isMarkdown && !isEditing ? (
          <div className="p-8">
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
              theme="vs-dark"
              onChange={(value) => setEditorValue(value || '')}
              options={{
                readOnly: !isEditing,
                minimap: { enabled: lineCount > 40 },
                scrollBeyondLastLine: false,
                fontSize: 12,
                fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
                automaticLayout: true,
                wordWrap: 'on',
                lineNumbers: 'on',
                tabSize: 2,
                contextmenu: true,
                padding: { top: 8, bottom: 8 },
              }}
              loading={
                <div className="p-8 text-center text-xs text-[#8b949e]">
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
          className="p-5 border border-[#30363d] rounded-md bg-[#161b22] space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
            <h3 className="text-sm font-semibold text-[#e6edf3]">Commit changes</h3>
            <span className="text-xs text-[#8b949e]">
              Branch: <span className="font-mono text-[#e6edf3]">{refName}</span>
            </span>
          </div>

          {commitError && (
            <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/40 rounded-md text-xs text-[#f85149]">
              {commitError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#e6edf3] mb-1">
                Commit message
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs bg-[#0d1117] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8b949e] mb-1">
                Extended description (optional)
              </label>
              <textarea
                value={commitDescription}
                onChange={(e) => setCommitDescription(e.target.value)}
                placeholder="Add an optional extended description..."
                rows={3}
                className="w-full px-3 py-1.5 text-xs bg-[#0d1117] text-[#e6edf3] placeholder-[#8b949e] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] resize-y"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 text-xs text-[#8b949e]">
              <div className="w-2 h-2 rounded-full bg-[#3fb950]" />
              <span>Commit directly to the <span className="font-mono text-[#e6edf3]">{refName}</span> branch</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d]">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] rounded-md border border-[#30363d] bg-[#21262d] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCommitting || !commitMessage.trim()}
              className="px-4 py-1.5 text-xs font-semibold text-white rounded-md bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 cursor-pointer transition-colors"
            >
              {isCommitting ? 'Committing changes...' : 'Commit changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
