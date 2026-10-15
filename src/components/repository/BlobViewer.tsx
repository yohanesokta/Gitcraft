import { useState, useMemo } from 'react'
import Markdown from 'react-markdown'
import { Octicon } from '../ui/Octicon'

export interface BlobViewerProps {
  filename: string
  content: string
  size?: number
  rawUrl?: string
}

export function BlobViewer({
  filename,
  content,
  size,
  rawUrl,
}: BlobViewerProps) {
  const isMarkdown = filename.toLowerCase().endsWith('.md')
  const [viewMode, setViewMode] = useState<'code' | 'preview'>(isMarkdown ? 'preview' : 'code')
  const [hasCopied, setHasCopied] = useState(false)

  const lines = useMemo(() => {
    return content.split('\n')
  }, [content])

  const lineCount = lines.length
  const formattedSize = useMemo(() => {
    if (typeof size === 'number' && size > 0) {
      if (size < 1024) return `${size} Bytes`
      return `${(size / 1024).toFixed(1)} KB`
    }
    const bytes = new Blob([content]).size
    if (bytes < 1024) return `${bytes} Bytes`
    return `${(bytes / 1024).toFixed(1)} KB`
  }, [size, content])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setHasCopied(true)
      setTimeout(() => setHasCopied(false), 2000)
    } catch {
    }
  }

  function handleDownload() {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
      <div className="p-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {isMarkdown && (
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

          <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e]">
            <span>{lineCount} lines</span>
            <span>&middot;</span>
            <span>{formattedSize}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {rawUrl && (
            <a
              href={rawUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors"
            >
              Raw
            </a>
          )}

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
        </div>
      </div>

      {viewMode === 'preview' && isMarkdown ? (
        <div className="p-8 markdown-body">
          <Markdown>{content}</Markdown>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-[#161b22]/50">
                  <td className="w-12 py-0.5 px-3 text-right select-none text-[#6e7681] border-r border-[#30363d]/40 shrink-0">
                    {idx + 1}
                  </td>
                  <td className="py-0.5 px-4 text-[#e6edf3] whitespace-pre font-mono">
                    {line || '\n'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
