import { useQuery } from '@tanstack/react-query'
import {
  getForgejoVersion,
  searchRepositories,
  getRepository,
  getRepositoryContents,
  getRepositoryCommits,
  getRepositoryIssues,
  getRepositoryPulls,
  getRepositoryReleases,
  getUser,
  getUserRepositories,
  getUserHeatmap,
  getCurrentUser,
  getRepositoryLanguages,
} from '../lib/forgejo'

export function useForgejoVersion() {
  return useQuery({
    queryKey: ['forgejo', 'version'],
    queryFn: getForgejoVersion,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  })
}

export function useSearchRepositories(query: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['forgejo', 'repos', 'search', query, page, limit],
    queryFn: () => searchRepositories(query, page, limit),
    enabled: true,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })
}

export function useRepository(owner?: string, repo?: string) {
  return useQuery({
    queryKey: ['forgejo', 'repo', owner, repo],
    queryFn: () => getRepository(owner!, repo!),
    enabled: Boolean(owner && repo),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })
}

export function useRepositoryContents(owner?: string, repo?: string, path: string = '', ref?: string) {
  return useQuery({
    queryKey: ['forgejo', 'contents', owner, repo, path, ref],
    queryFn: () => getRepositoryContents(owner!, repo!, path, ref),
    enabled: Boolean(owner && repo),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

export function useRepositoryCommits(owner?: string, repo?: string, sha?: string, page: number = 1) {
  return useQuery({
    queryKey: ['forgejo', 'commits', owner, repo, sha, page],
    queryFn: () => getRepositoryCommits(owner!, repo!, sha, page),
    enabled: Boolean(owner && repo),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}

export function useRepositoryIssues(owner?: string, repo?: string, state: 'open' | 'closed' | 'all' = 'open') {
  return useQuery({
    queryKey: ['forgejo', 'issues', owner, repo, state],
    queryFn: () => getRepositoryIssues(owner!, repo!, state),
    enabled: Boolean(owner && repo),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

export function useRepositoryPulls(owner?: string, repo?: string, state: 'open' | 'closed' | 'all' = 'open') {
  return useQuery({
    queryKey: ['forgejo', 'pulls', owner, repo, state],
    queryFn: () => getRepositoryPulls(owner!, repo!, state),
    enabled: Boolean(owner && repo),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

export function useRepositoryReleases(owner?: string, repo?: string) {
  return useQuery({
    queryKey: ['forgejo', 'releases', owner, repo],
    queryFn: () => getRepositoryReleases(owner!, repo!),
    enabled: Boolean(owner && repo),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })
}

export function useUser(username?: string) {
  return useQuery({
    queryKey: ['forgejo', 'user', username],
    queryFn: () => getUser(username!),
    enabled: Boolean(username),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })
}

export function useUserRepositories(username?: string) {
  return useQuery({
    queryKey: ['forgejo', 'user', username, 'repos'],
    queryFn: () => getUserRepositories(username!),
    enabled: Boolean(username),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}

export function useUserHeatmap(username?: string) {
  return useQuery({
    queryKey: ['forgejo', 'user', username, 'heatmap'],
    queryFn: () => getUserHeatmap(username!),
    enabled: Boolean(username),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['forgejo', 'current_user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })
}

export function useRepositoryLanguages(owner?: string, repo?: string) {
  return useQuery({
    queryKey: ['forgejo', 'languages', owner, repo],
    queryFn: () => getRepositoryLanguages(owner!, repo!),
    enabled: Boolean(owner && repo),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })
}
