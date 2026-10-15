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

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('gitcraft_auth_token') || sessionStorage.getItem('gitcraft_auth_token')
  } catch {
    return null
  }
}

export function setAuthToken(token: string | null, remember: boolean = true): void {
  try {
    if (token) {
      if (remember) {
        localStorage.setItem('gitcraft_auth_token', token)
      } else {
        sessionStorage.setItem('gitcraft_auth_token', token)
      }
    } else {
      localStorage.removeItem('gitcraft_auth_token')
      sessionStorage.removeItem('gitcraft_auth_token')
      localStorage.removeItem('gitcraft_user')
    }
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

  const token = getAuthToken()
  const customHeaders: Record<string, string> = {
    Accept: 'application/json',
  }

  if (token) {
    customHeaders['Authorization'] = `token ${token}`
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
      responseData = await response.json()
      if (typeof responseData === 'object' && responseData !== null && 'message' in responseData) {
        errorDetail = String((responseData as { message: unknown }).message)
      }
    } catch {
      try {
        const rawText = await response.text()
        if (rawText) {
          errorDetail = rawText
        }
      } catch {
      }
    }
    throw new ForgejoApiError(
      `Forgejo API error (${response.status}): ${errorDetail}`,
      response.status,
      response.statusText,
      targetUrl,
      responseData
    )
  }

  return response.json() as Promise<T>
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
    setAuthToken(trimmedKey, remember)
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
  setAuthToken(credentials, remember)
  return user
}

export function logoutUser(): void {
  setAuthToken(null)
  setStoredUser(null)
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
  const params = new URLSearchParams()
  if (ref) {
    params.set('ref', ref)
  }
  const query = params.toString() ? `?${params.toString()}` : ''
  return forgejoFetch<ForgejoContent[] | ForgejoContent>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${cleanPath}${query}`
  )
}

export async function getRepositoryBranches(owner: string, repo: string): Promise<ForgejoBranch[]> {
  return forgejoFetch<ForgejoBranch[]>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`)
}

export async function getRepositoryCommits(
  owner: string,
  repo: string,
  sha?: string,
  page: number = 1,
  limit: number = 30
): Promise<ForgejoCommit[]> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  if (sha) {
    params.set('sha', sha)
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
