export interface ForgejoUser {
  id: number
  login: string
  username?: string
  full_name?: string
  email?: string
  avatar_url: string
  html_url?: string
  description?: string
  website?: string
  location?: string
  pronouns?: string
  followers_count?: number
  following_count?: number
  starred_repos_count?: number
  created?: string
}

export interface ForgejoRepoPermissions {
  admin: boolean
  push: boolean
  pull: boolean
}

export interface ForgejoRepository {
  id: number
  owner: ForgejoUser
  name: string
  full_name: string
  description?: string
  empty: boolean
  private: boolean
  fork: boolean
  template?: boolean
  stars_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  open_pr_counter?: number
  release_counter?: number
  default_branch: string
  archived: boolean
  created_at: string
  updated_at: string
  avatar_url?: string
  language?: string
  languages_url?: string
  html_url: string
  clone_url: string
  ssh_url: string
  website?: string
  size?: number
  topics?: string[]
  has_issues?: boolean
  has_pull_requests?: boolean
  has_wiki?: boolean
  permissions?: ForgejoRepoPermissions
}

export interface ForgejoSearchResults<T> {
  ok: boolean
  data: T[]
}

export interface ForgejoFileLinks {
  self?: string
  git?: string
  html?: string
}

export interface ForgejoContent {
  name: string
  path: string
  sha: string
  last_commit_sha?: string
  last_commit_when?: string
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  size: number
  encoding?: string | null
  content?: string | null
  target?: string | null
  url?: string | null
  html_url?: string | null
  download_url?: string | null
  _links?: ForgejoFileLinks
}

export interface ForgejoBranch {
  name: string
  commit: {
    id: string
    message: string
    url: string
    timestamp: string
  }
  protected: boolean
}

export interface ForgejoCommitMeta {
  id: string
  sha?: string
  url: string
  created?: string
}

export interface ForgejoCommit {
  sha: string
  url: string
  html_url: string
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    }
    committer?: {
      name: string
      email: string
      date: string
    }
  }
  author?: ForgejoUser | null
  committer?: ForgejoUser | null
  parents?: ForgejoCommitMeta[]
}

export interface ForgejoLabel {
  id: number
  name: string
  color: string
  description?: string
}

export interface ForgejoIssue {
  id: number
  number: number
  title: string
  body?: string
  state: 'open' | 'closed'
  user: ForgejoUser
  labels: ForgejoLabel[]
  comments: number
  created_at: string
  updated_at: string
  closed_at?: string | null
  is_locked?: boolean
  pull_request?: unknown
}

export interface ForgejoPullRequest {
  id: number
  number: number
  title: string
  body?: string
  state: 'open' | 'closed'
  user: ForgejoUser
  created_at: string
  updated_at: string
  merged?: boolean
  merged_at?: string | null
  comments?: number
  head?: {
    label: string
    ref: string
    sha: string
    repo?: ForgejoRepository
  }
  base?: {
    label: string
    ref: string
    sha: string
  }
}

export interface ForgejoRelease {
  id: number
  tag_name: string
  name: string
  body?: string
  draft: boolean
  prerelease: boolean
  created_at: string
  published_at: string
  author: ForgejoUser
  tarball_url: string
  zipball_url: string
}

export interface ForgejoVersion {
  version: string
}

export interface ForgejoHeatmapItem {
  timestamp: number
  contributions: number
}

export interface ForgejoTag {
  name: string
  id: string
  commit: {
    sha: string
    url: string
  }
}

export interface ForgejoGitTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  size?: number
  sha: string
  url: string
}

export interface ForgejoGitTree {
  sha: string
  url: string
  tree: ForgejoGitTreeItem[]
  truncated: boolean
  total_count: number
}

export interface ForgejoComment {
  id: number
  html_url: string
  pull_request_url?: string
  issue_url?: string
  user: ForgejoUser
  body: string
  created_at: string
  updated_at: string
}
