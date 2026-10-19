import { MarkdownViewer } from '../ui/MarkdownViewer'
import { Octicon } from '../ui/Octicon'

export interface ReadmeViewerProps {
  content: string
  filename?: string
  licenseName?: string
  owner?: string
  repo?: string
  refName?: string
}

export function ReadmeViewer({
  content,
  filename = 'README.md',
  licenseName,
  owner,
  repo,
  refName = 'main',
}: ReadmeViewerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-border-default pb-2 text-xs text-fg-muted">
        <div className="flex items-center gap-1.5 font-semibold text-fg-default">
          <Octicon name="book" size={14} className="text-fg-muted" />
          <span>README</span>
        </div>
        {licenseName && (
          <div className="flex items-center gap-1.5 ml-4">
            <Octicon name="law" size={14} className="text-fg-muted" />
            <span>{licenseName}</span>
          </div>
        )}
      </div>

      <div className="border border-border-default rounded-lg overflow-hidden bg-canvas-default">
        <div className="px-4 py-3 bg-canvas-subtle border-b border-border-default flex items-center justify-between text-xs font-semibold text-fg-default">
          <div className="flex items-center gap-2">
            <Octicon name="book" size={16} className="text-fg-muted" />
            <span>{filename}</span>
          </div>
          <div className="flex items-center gap-2 text-fg-muted">
            <button
              type="button"
              title="Edit file"
              aria-label="Edit file"
              className="p-1 rounded-md hover:bg-canvas-hover hover:text-fg-default transition-colors"
            >
              <Octicon name="pencil" size={14} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <MarkdownViewer
            content={content}
            owner={owner}
            repo={repo}
            refName={refName}
          />
        </div>
      </div>
    </div>
  )
}
