import {
  ForgejoRepository,
  ForgejoSearchResults,
  ForgejoUser,
  ForgejoContent,
  ForgejoBranch,
  ForgejoCommit,
  ForgejoIssue,
  ForgejoPullRequest,
  ForgejoRelease,
  ForgejoVersion,
  ForgejoHeatmapItem,
  ForgejoTag,
  ForgejoGitTree,
  ForgejoComment,
  CreatePullRequestOptions,
  ForgejoCompare,
  MergePullRequestOptions,
  ForgejoChangedFile,
} from '../types/forgejo'

export class ForgejoApiError extends Error {
  public status: number
  public statusText: string
  public url: string
  public data?: unknown

  constructor(message: string, status: number, statusText: string, url: string, data?: unknown) {
    super(message)
    this.name = 'ForgejoApiError'
    this.status = status
    this.statusText = statusText
    this.url = url
    this.data = data
  }
}

export function getForgejoBaseUrl(): string {
  const envUrl = import.meta.env.VITE_FORGEJO_URL
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '')
  }
  return 'https://codeberg.org'
}

export type AuthType = 'token' | 'basic'

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('gitcraft_auth_token') || sessionStorage.getItem('gitcraft_auth_token')
  } catch {
    return null
  }
}

export function getAuthType(): AuthType {
  try {
    const val = localStorage.getItem('gitcraft_auth_type') || sessionStorage.getItem('gitcraft_auth_type')
    if (val === 'basic' || val === 'token') {
      return val
    }
  } catch {
  }
  const token = getAuthToken()
  if (token) {
    try {
      const decoded = atob(token)
      if (decoded.includes(':') && decoded.length > 2) {
        return 'basic'
      }
    } catch {
    }
  }
  return 'token'
}

export function getAuthHeader(): string | null {
  const token = getAuthToken()
  if (!token) return null
  const authType = getAuthType()
  if (authType === 'basic') {
    return `Basic ${token}`
  }
  return `token ${token}`
}

export function setAuthToken(token: string | null, type: AuthType = 'token', remember: boolean = true): void {
  try {
    if (token) {
      if (remember) {
        localStorage.setItem('gitcraft_auth_token', token)
        localStorage.setItem('gitcraft_auth_type', type)
      } else {
        sessionStorage.setItem('gitcraft_auth_token', token)
        sessionStorage.setItem('gitcraft_auth_type', type)
      }
    } else {
      localStorage.removeItem('gitcraft_auth_token')
      sessionStorage.removeItem('gitcraft_auth_token')
      localStorage.removeItem('gitcraft_auth_type')
      sessionStorage.removeItem('gitcraft_auth_type')
      localStorage.removeItem('gitcraft_user')
    }
  } catch {
  }
  try {
    window.dispatchEvent(new Event('gitcraft_auth_change'))
  } catch {
  }
}

export function getStoredUser(): ForgejoUser | null {
  try {
    const raw = localStorage.getItem('gitcraft_user')
    if (raw) {
      return JSON.parse(raw) as ForgejoUser
    }
  } catch {
  }
  return null
}

export function setStoredUser(user: ForgejoUser | null): void {
  try {
    if (user) {
      localStorage.setItem('gitcraft_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('gitcraft_user')
    }
  } catch {
  }
}

export async function forgejoFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const baseUrl = getForgejoBaseUrl()
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const targetUrl = `${baseUrl}/api/v1${cleanPath}`

  const authHeader = getAuthHeader()
  const customHeaders: Record<string, string> = {
    Accept: 'application/json',
  }

  if (authHeader) {
    customHeaders['Authorization'] = authHeader
  }

  const response = await fetch(targetUrl, {
    ...init,
    headers: {
      ...customHeaders,
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let errorDetail = response.statusText
    let responseData: unknown = null
    try {
      const errorText = await response.text()
      if (errorText) {
        try {
          responseData = JSON.parse(errorText)
          if (typeof responseData === 'object' && responseData !== null && 'message' in responseData) {
            errorDetail = String((responseData as { message: unknown }).message)
          } else {
            errorDetail = errorText
          }
        } catch {
          errorDetail = errorText
        }
      }
    } catch {
    }
    throw new ForgejoApiError(
      `Forgejo API error (${response.status}): ${errorDetail}`,
      response.status,
      response.statusText,
      targetUrl,
      responseData
    )
  }

  if (response.status === 204) {
    return {} as T
  }

  const responseText = await response.text()
  if (!responseText || !responseText.trim()) {
    return {} as T
  }

  try {
    return JSON.parse(responseText) as T
  } catch {
    return responseText as unknown as T
  }
}

export async function getForgejoVersion(): Promise<ForgejoVersion> {
  return forgejoFetch<ForgejoVersion>('/version')
}

export async function getCurrentUser(): Promise<ForgejoUser | null> {
  const token = getAuthToken()
  if (!token) {
    return getStoredUser()
  }
  try {
    const user = await forgejoFetch<ForgejoUser>('/user')
    setStoredUser(user)
    return user
  } catch {
    return getStoredUser()
  }
}

export async function loginUser(
  usernameOrEmail: string,
  passwordOrToken: string,
  remember: boolean = true
): Promise<ForgejoUser> {
  const trimmedKey = passwordOrToken.trim()
  const isLikelyToken = trimmedKey.length >= 30 && !trimmedKey.includes(' ')

  if (isLikelyToken) {
    setAuthToken(trimmedKey, 'token', remember)
    try {
      const user = await forgejoFetch<ForgejoUser>('/user')
      setStoredUser(user)
      return user
    } catch (err) {
      setAuthToken(null)
      throw err
    }
  }

  const credentials = btoa(`${usernameOrEmail.trim()}:${passwordOrToken}`)
  const baseUrl = getForgejoBaseUrl()
  const response = await fetch(`${baseUrl}/api/v1/user`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
    },
  })

  if (!response.ok) {
    let errorDetail = 'Invalid credentials'
    try {
      const data = await response.json()
      if (data && typeof data === 'object' && 'message' in data) {
        errorDetail = String(data.message)
      }
    } catch {
    }
    throw new ForgejoApiError(
      errorDetail,
      response.status,
      response.statusText,
      `${baseUrl}/api/v1/user`
    )
  }

  const user = (await response.json()) as ForgejoUser
  setStoredUser(user)
  setAuthToken(credentials, 'basic', remember)
  return user
}

export function logoutUser(): void {
  setAuthToken(null)
  setStoredUser(null)
  try {
    window.dispatchEvent(new Event('gitcraft_auth_change'))
  } catch {
  }
}

export async function searchRepositories(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<ForgejoSearchResults<ForgejoRepository>> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(limit),
  })
  return forgejoFetch<ForgejoSearchResults<ForgejoRepository>>(`/repos/search?${params.toString()}`)
}

export async function getRepository(owner: string, repo: string): Promise<ForgejoRepository> {
  return forgejoFetch<ForgejoRepository>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`)
}

export async function getRepositoryContents(
  owner: string,
  repo: string,
  path: string = '',
  ref?: string
): Promise<ForgejoContent[] | ForgejoContent> {
  const cleanPath = path ? `/${path.replace(/^\/+/, '')}` : ''
  const extParams = new URLSearchParams()
  if (ref) {
    extParams.set('ref', ref)
  }
  extParams.set('includes', 'commit_metadata,commit_message')

  try {
    return await forgejoFetch<ForgejoContent[] | ForgejoContent>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents-ext${cleanPath}?${extParams.toString()}`
    )
  } catch {
    const fallbackParams = new URLSearchParams()
    if (ref) {
      fallbackParams.set('ref', ref)
    }
    const fallbackQuery = fallbackParams.toString() ? `?${fallbackParams.toString()}` : ''
    return forgejoFetch<ForgejoContent[] | ForgejoContent>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${cleanPath}${fallbackQuery}`
    )
  }
}

export async function getRepositoryBranches(owner: string, repo: string): Promise<ForgejoBranch[]> {
  return forgejoFetch<ForgejoBranch[]>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`)
}

export async function getRepositoryCommits(
  owner: string,
  repo: string,
  sha?: string,
  page: number = 1,
  limit: number = 30,
  path?: string
): Promise<ForgejoCommit[]> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  if (sha) {
    params.set('sha', sha)
  }
  if (path) {
    params.set('path', path)
  }
  return forgejoFetch<ForgejoCommit[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?${params.toString()}`
  )
}

export async function getRepositoryIssues(
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open',
  page: number = 1,
  limit: number = 25
): Promise<ForgejoIssue[]> {
  const params = new URLSearchParams({
    state,
    page: String(page),
    limit: String(limit),
  })
  return forgejoFetch<ForgejoIssue[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?${params.toString()}`
  )
}

export async function getRepositoryPulls(
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open',
  page: number = 1,
  limit: number = 25
): Promise<ForgejoPullRequest[]> {
  const params = new URLSearchParams({
    state,
    page: String(page),
    limit: String(limit),
  })
  return forgejoFetch<ForgejoPullRequest[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?${params.toString()}`
  )
}

export async function getRepositoryTree(
  owner: string,
  repo: string,
  sha: string,
  recursive: boolean = true
): Promise<ForgejoGitTree> {
  const query = recursive ? '?recursive=1' : ''
  return forgejoFetch<ForgejoGitTree>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(sha)}${query}`
  )
}

export async function getSingleIssue(
  owner: string,
  repo: string,
  index: string | number
): Promise<ForgejoIssue> {
  return forgejoFetch<ForgejoIssue>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${encodeURIComponent(String(index))}`
  )
}

export async function getIssueComments(
  owner: string,
  repo: string,
  index: string | number
): Promise<ForgejoComment[]> {
  return forgejoFetch<ForgejoComment[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${encodeURIComponent(String(index))}/comments`
  )
}

export async function getSinglePull(
  owner: string,
  repo: string,
  index: string | number
): Promise<ForgejoPullRequest> {
  return forgejoFetch<ForgejoPullRequest>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${encodeURIComponent(String(index))}`
  )
}

export async function createPullRequest(
  owner: string,
  repo: string,
  options: CreatePullRequestOptions
): Promise<ForgejoPullRequest> {
  return forgejoFetch<ForgejoPullRequest>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    }
  )
}

export async function getCompareDiff(
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<ForgejoCompare> {
  return forgejoFetch<ForgejoCompare>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`
  )
}

export async function mergePullRequest(
  owner: string,
  repo: string,
  index: string | number,
  options: MergePullRequestOptions
): Promise<unknown> {
  return forgejoFetch<unknown>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${encodeURIComponent(String(index))}/merge`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    }
  )
}

export async function getPullRequestCommits(
  owner: string,
  repo: string,
  index: string | number
): Promise<ForgejoCommit[]> {
  return forgejoFetch<ForgejoCommit[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${encodeURIComponent(String(index))}/commits`
  )
}

export async function getPullRequestFiles(
  owner: string,
  repo: string,
  index: string | number
): Promise<ForgejoChangedFile[]> {
  return forgejoFetch<ForgejoChangedFile[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${encodeURIComponent(String(index))}/files`
  )
}

export async function getPullRequestDiff(
  owner: string,
  repo: string,
  index: string | number
): Promise<string> {
  const baseUrl = getForgejoBaseUrl()
  const targetUrl = `${baseUrl}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${encodeURIComponent(String(index))}.diff`
  const authHeader = getAuthHeader()
  const customHeaders: Record<string, string> = {}
  if (authHeader) {
    customHeaders['Authorization'] = authHeader
  }
  let res = await fetch(targetUrl, { headers: customHeaders })
  if (!res.ok && res.status === 401 && authHeader) {
    res = await fetch(targetUrl)
  }
  if (!res.ok) {
    throw new ForgejoApiError(`Failed to fetch PR diff: ${res.statusText}`, res.status, res.statusText, targetUrl)
  }
  return res.text()
}

export async function createIssue(
  owner: string,
  repo: string,
  title: string,
  body?: string
): Promise<ForgejoIssue> {
  return forgejoFetch<ForgejoIssue>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body: body || '' }),
    }
  )
}

export async function createIssueComment(
  owner: string,
  repo: string,
  index: string | number,
  body: string
): Promise<ForgejoComment> {
  return forgejoFetch<ForgejoComment>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${encodeURIComponent(String(index))}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    }
  )
}

export async function getRepositoryReleases(
  owner: string,
  repo: string,
  page: number = 1,
  limit: number = 20
): Promise<ForgejoRelease[]> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  return forgejoFetch<ForgejoRelease[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?${params.toString()}`
  )
}

export async function getUser(username: string): Promise<ForgejoUser> {
  return forgejoFetch<ForgejoUser>(`/users/${encodeURIComponent(username)}`)
}

export async function getUserRepositories(
  username: string,
  page: number = 1,
  limit: number = 30
): Promise<ForgejoRepository[]> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  return forgejoFetch<ForgejoRepository[]>(
    `/users/${encodeURIComponent(username)}/repos?${params.toString()}`
  )
}

export async function getUserHeatmap(username: string): Promise<ForgejoHeatmapItem[]> {
  return forgejoFetch<ForgejoHeatmapItem[]>(`/users/${encodeURIComponent(username)}/heatmap`)
}

export async function searchUsers(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<ForgejoSearchResults<ForgejoUser>> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(limit),
  })
  return forgejoFetch<ForgejoSearchResults<ForgejoUser>>(`/users/search?${params.toString()}`)
}

export async function getRepositoryLanguages(
  owner: string,
  repo: string
): Promise<Record<string, number>> {
  return forgejoFetch<Record<string, number>>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`
  )
}

export async function getRepositoryTags(owner: string, repo: string): Promise<ForgejoTag[]> {
  return forgejoFetch<ForgejoTag[]>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tags`)
}

export async function getRepositoryRawFile(
  owner: string,
  repo: string,
  filepath: string,
  ref?: string
): Promise<string> {
  const baseUrl = getForgejoBaseUrl()
  const cleanPath = filepath.replace(/^\/+/, '')
  const params = new URLSearchParams()
  if (ref) {
    params.set('ref', ref)
  }
  const query = params.toString() ? `?${params.toString()}` : ''
  const targetUrl = `${baseUrl}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/raw/${cleanPath}${query}`
  const authHeader = getAuthHeader()
  const customHeaders: Record<string, string> = {}
  if (authHeader) {
    customHeaders['Authorization'] = authHeader
  }
  let res = await fetch(targetUrl, { headers: customHeaders })
  if (!res.ok && res.status === 401 && authHeader) {
    res = await fetch(targetUrl)
  }
  if (!res.ok) {
    throw new ForgejoApiError(`Failed to fetch raw file: ${res.statusText}`, res.status, res.statusText, targetUrl)
  }
  return res.text()
}

export interface UpdateFileOptions {
  content: string
  sha: string
  branch?: string
  message?: string
}

export async function updateRepositoryFile(
  owner: string,
  repo: string,
  filepath: string,
  options: UpdateFileOptions
): Promise<unknown> {
  const cleanPath = filepath.replace(/^\/+/, '')
  return forgejoFetch<unknown>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${cleanPath}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    }
  )
}
