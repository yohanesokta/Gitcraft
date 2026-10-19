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

export interface ForgejoContentCommitMetadata {
  id?: string
  sha?: string
  message?: string
  url?: string
  author?: {
    name?: string
    email?: string
    date?: string
  }
  committer?: {
    name?: string
    email?: string
    date?: string
  }
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
  commit_metadata?: ForgejoContentCommitMetadata
  commit_message?: string
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
  merged_by?: ForgejoUser | null
  mergeable?: boolean
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

export interface CreatePullRequestOptions {
  title: string
  base: string
  head: string
  body?: string
}

export interface ForgejoCompareFile {
  filename: string
  status?: string
}

export interface ForgejoCompare {
  commits: ForgejoCommit[]
  files?: ForgejoCompareFile[]
  total_commits: number
}

export type MergeStyle = 'merge' | 'squash' | 'rebase' | 'rebase-merge'

export interface MergePullRequestOptions {
  Do: MergeStyle
  MergeTitleField?: string
  MergeMessageField?: string
  delete_branch_after_merge?: boolean
}

export interface ForgejoChangedFile {
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  contents_url?: string
  raw_url?: string
  html_url?: string
}

export interface CreateRepositoryOptions {
  name: string
  description?: string
  private?: boolean
  auto_init?: boolean
  gitignores?: string
  license?: string
  readme?: string
  default_branch?: string
}

export interface ForgejoLicenseTemplate {
  key: string
  name: string
  url?: string
}

export interface UpdateUserSettingsOptions {
  full_name?: string
  description?: string
  website?: string
  location?: string
  pronouns?: string
}

export interface CreateForkOption {
  organization?: string
  name?: string
}

export interface EditRepoOptions {
  name?: string
  description?: string
  website?: string
  private?: boolean
  default_branch?: string
  has_issues?: boolean
  has_wiki?: boolean
  has_pull_requests?: boolean
  has_projects?: boolean
  allow_merge_commits?: boolean
  allow_squash_merge?: boolean
  allow_rebase?: boolean
  allow_rebase_explicit?: boolean
  autodetect_manual_merge?: boolean
  ignore_whitespace_conflicts?: boolean
  archived?: boolean
}

export interface CreateReleaseOptions {
  tag_name: string
  target_commitish?: string
  name: string
  body?: string
  draft?: boolean
  prerelease?: boolean
}


