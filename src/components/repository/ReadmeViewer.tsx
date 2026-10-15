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
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-[#21262d] pb-2 text-xs text-[#8b949e]">
        <div className="flex items-center gap-1.5 font-semibold text-[#e6edf3]">
          <Octicon name="book" size={14} />
          <span>README</span>
        </div>
        {licenseName && (
          <div className="flex items-center gap-1.5 ml-4">
            <Octicon name="law" size={14} />
            <span>{licenseName}</span>
          </div>
        )}
      </div>

      <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
        <div className="p-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs font-semibold text-[#e6edf3]">
          <div className="flex items-center gap-2">
            <Octicon name="book" size={16} className="text-[#8b949e]" />
            <span>{filename}</span>
          </div>
          <div className="flex items-center gap-1 text-[#8b949e]">
            <Octicon name="pencil" size={14} className="hover:text-[#58a6ff] cursor-pointer" />
          </div>
        </div>

        <div className="p-8">
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
