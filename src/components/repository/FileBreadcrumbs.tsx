import { Link } from 'react-router-dom'

export interface FileBreadcrumbsProps {
  owner: string
  repo: string
  refName: string
  path: string
  isFile?: boolean
}

export function FileBreadcrumbs({
  owner,
  repo,
  refName,
  path,
  isFile = false,
}: FileBreadcrumbsProps) {
  const segments = path.split('/').filter(Boolean)

  return (
    <nav className="flex items-center gap-1.5 text-sm flex-wrap">
      <Link
        to={`/${owner}/${repo}`}
        className="text-accent-fg hover:underline font-semibold"
      >
        {repo}
      </Link>

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        const subPath = segments.slice(0, index + 1).join('/')
        const isFileSegment = isLast && isFile

        return (
          <span key={subPath} className="flex items-center gap-1.5">
            <span className="text-fg-subtle">/</span>
            {isLast ? (
              <span className={`font-semibold ${isFileSegment ? 'text-fg-default' : 'text-fg-default'}`}>
                {segment}
              </span>
            ) : (
              <Link
                to={`/${owner}/${repo}/tree/${encodeURIComponent(refName)}/${subPath}`}
                className="text-accent-fg hover:underline"
              >
                {segment}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
