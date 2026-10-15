import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { getForgejoBaseUrl } from '../../lib/forgejo'

export interface MarkdownViewerProps {
  content: string
  owner?: string
  repo?: string
  refName?: string
  className?: string
}

export function MarkdownViewer({
  content,
  owner,
  repo,
  refName = 'main',
  className = '',
}: MarkdownViewerProps) {
  const baseUrl = getForgejoBaseUrl()

  function resolveAssetUrl(src?: string): string {
    if (!src) return ''
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith(String.fromCharCode(47, 47))) {
      return src
    }
    if (!owner || !repo) {
      return src
    }
    const cleanPath = src.replace(/^\.?\/+/, '')
    return `${baseUrl}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/raw/${cleanPath}?ref=${encodeURIComponent(refName)}`
  }

  function resolveLinkUrl(href?: string): string {
    if (!href) return ''
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#') || href.startsWith('mailto:')) {
      return href
    }
    if (!owner || !repo) {
      return href
    }
    const cleanPath = href.replace(/^\.?\/+/, '')
    return `/${owner}/${repo}/blob/${encodeURIComponent(refName)}/${cleanPath}`
  }

  return (
    <div className={`markdown-body ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          img: ({ src, alt, ...props }) => (
            <img
              src={resolveAssetUrl(src)}
              alt={alt || ''}
              loading="lazy"
              {...props}
            />
          ),
          a: ({ href, children, ...props }) => (
            <a
              href={resolveLinkUrl(href)}
              {...(href?.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  )
}
