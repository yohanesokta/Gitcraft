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
  getRepositoryBranches,
  getRepositoryTags,
  getRepositoryRawFile,
  getRepositoryTree,
  getSingleIssue,
  getIssueComments,
  getSinglePull,
  getCompareDiff,
  getPullRequestCommits,
  getPullRequestFiles,
  getPullRequestDiff,
  getUserOrgs,
  getGitignoreTemplates,
  getLicenseTemplates,
  getAuthToken,
  checkRepoStarred,
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

export function useRepositoryBranches(owner?: string, repo?: string) {
  return useQuery({
    queryKey: ['forgejo', 'branches', owner, repo],
    queryFn: () => getRepositoryBranches(owner!, repo!),
    enabled: Boolean(owner && repo),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}

export function useRepositoryTags(owner?: string, repo?: string) {
  return useQuery({
    queryKey: ['forgejo', 'tags', owner, repo],
    queryFn: () => getRepositoryTags(owner!, repo!),
    enabled: Boolean(owner && repo),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}

export function useRepositoryRawFile(owner?: string, repo?: string, filepath?: string, ref?: string) {
  return useQuery({
    queryKey: ['forgejo', 'raw', owner, repo, filepath, ref],
    queryFn: () => getRepositoryRawFile(owner!, repo!, filepath!, ref),
    enabled: Boolean(owner && repo && filepath),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}

export function useRepositoryTree(owner?: string, repo?: string, sha?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['forgejo', 'tree', owner, repo, sha],
    queryFn: () => getRepositoryTree(owner!, repo!, sha!),
    enabled: Boolean(owner && repo && sha && enabled),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}

export function useSingleIssue(owner?: string, repo?: string, index?: string | number) {
  return useQuery({
    queryKey: ['forgejo', 'issue', owner, repo, index],
    queryFn: () => getSingleIssue(owner!, repo!, index!),
    enabled: Boolean(owner && repo && index),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

export function useIssueComments(owner?: string, repo?: string, index?: string | number) {
  return useQuery({
    queryKey: ['forgejo', 'issue_comments', owner, repo, index],
    queryFn: () => getIssueComments(owner!, repo!, index!),
    enabled: Boolean(owner && repo && index),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

export function useSinglePull(owner?: string, repo?: string, index?: string | number) {
  return useQuery({
    queryKey: ['forgejo', 'pull', owner, repo, index],
    queryFn: () => getSinglePull(owner!, repo!, index!),
    enabled: Boolean(owner && repo && index),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

export function useCompareDiff(owner?: string, repo?: string, base?: string, head?: string) {
  return useQuery({
    queryKey: ['forgejo', 'compare', owner, repo, base, head],
    queryFn: () => getCompareDiff(owner!, repo!, base!, head!),
    enabled: Boolean(owner && repo && base && head && base !== head),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

export function usePullRequestCommits(owner?: string, repo?: string, index?: string | number) {
  return useQuery({
    queryKey: ['forgejo', 'pull_commits', owner, repo, index],
    queryFn: () => getPullRequestCommits(owner!, repo!, index!),
    enabled: Boolean(owner && repo && index),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

export function usePullRequestFiles(owner?: string, repo?: string, index?: string | number) {
  return useQuery({
    queryKey: ['forgejo', 'pull_files', owner, repo, index],
    queryFn: () => getPullRequestFiles(owner!, repo!, index!),
    enabled: Boolean(owner && repo && index),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

export function usePullRequestDiff(owner?: string, repo?: string, index?: string | number) {
  return useQuery({
    queryKey: ['forgejo', 'pull_diff', owner, repo, index],
    queryFn: () => getPullRequestDiff(owner!, repo!, index!),
    enabled: Boolean(owner && repo && index),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

export function useFileLastCommit(
  owner?: string,
  repo?: string,
  ref?: string,
  path?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['forgejo', 'file_last_commit', owner, repo, ref, path],
    queryFn: () => getRepositoryCommits(owner!, repo!, ref, 1, 1, path),
    enabled: Boolean(enabled && owner && repo && path),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })
}

export function useUserOrgs() {
  const token = getAuthToken()
  return useQuery({
    queryKey: ['forgejo', 'user_orgs'],
    queryFn: getUserOrgs,
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })
}

export function useGitignoreTemplates() {
  return useQuery({
    queryKey: ['forgejo', 'gitignore_templates'],
    queryFn: getGitignoreTemplates,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  })
}

export function useLicenseTemplates() {
  return useQuery({
    queryKey: ['forgejo', 'license_templates'],
    queryFn: getLicenseTemplates,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  })
}

export function useRepoStarred(owner?: string, repo?: string) {
  const token = getAuthToken()
  return useQuery({
    queryKey: ['forgejo', 'repo_starred', owner, repo],
    queryFn: () => checkRepoStarred(owner!, repo!),
    enabled: Boolean(token && owner && repo),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

