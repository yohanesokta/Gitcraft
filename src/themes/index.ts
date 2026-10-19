import { ThemeDefinition, ThemeMode } from './types'
import { githubRefinedTheme } from './github-refined'
import { graphiteQuietTheme } from './graphite-quiet'
import { paperMonoTheme } from './paper-mono'

export * from './types'
export { githubRefinedTheme } from './github-refined'
export { graphiteQuietTheme } from './graphite-quiet'
export { paperMonoTheme } from './paper-mono'

export const THEMES: ThemeDefinition[] = [
  githubRefinedTheme,
  graphiteQuietTheme,
  paperMonoTheme,
]

export const STORAGE_KEY_THEME = 'gitcraft_theme'
export const STORAGE_KEY_MODE = 'gitcraft_mode'

export function getStoredThemeId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_THEME) || 'github-refined'
  } catch {
    return 'github-refined'
  }
}

export function getStoredThemeMode(): ThemeMode {
  try {
    const mode = localStorage.getItem(STORAGE_KEY_MODE)
    if (mode === 'light' || mode === 'dark' || mode === 'auto') {
      return mode
    }
    return 'dark'
  } catch {
    return 'dark'
  }
}

export function resolveActualMode(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export function applyTheme(themeId?: string, mode?: ThemeMode): void {
  const activeId = themeId || getStoredThemeId()
  const activeMode = mode || getStoredThemeMode()
  const actualMode = resolveActualMode(activeMode)

  const selectedTheme = THEMES.find((t) => t.id === activeId) || githubRefinedTheme
  const colors = actualMode === 'dark' ? selectedTheme.dark : selectedTheme.light

  const root = document.documentElement

  // Set data-theme and data-color-theme
  root.setAttribute('data-theme', actualMode)
  root.setAttribute('data-color-theme', selectedTheme.id)

  // Apply CSS custom properties
  root.style.setProperty('--bg-page', colors.bgPage)
  root.style.setProperty('--bg-surface', colors.bgSurface)
  root.style.setProperty('--bg-surface-raised', colors.bgSurfaceRaised)
  root.style.setProperty('--bg-hover', colors.bgHover)
  root.style.setProperty('--bg-active', colors.bgActive)
  root.style.setProperty('--border-color', colors.borderColor)
  root.style.setProperty('--border-strong', colors.borderStrong)
  root.style.setProperty('--text-primary', colors.textPrimary)
  root.style.setProperty('--text-secondary', colors.textSecondary)
  root.style.setProperty('--text-tertiary', colors.textTertiary)
  root.style.setProperty('--accent', colors.accent)
  root.style.setProperty('--accent-hover', colors.accentHover)
  root.style.setProperty('--accent-text', colors.accentText)
  root.style.setProperty('--accent-subtle', colors.accentSubtle)
  root.style.setProperty('--code-bg', colors.codeBg)
  root.style.setProperty('--code-border', colors.codeBorder)
  root.style.setProperty('--status-open', colors.statusOpen)
  root.style.setProperty('--status-open-bg', colors.statusOpenBg)
  root.style.setProperty('--status-closed', colors.statusClosed)
  root.style.setProperty('--status-merged', colors.statusMerged)
  root.style.setProperty('--shadow-floating', colors.shadowFloating)

  // Persist to local storage
  try {
    localStorage.setItem(STORAGE_KEY_THEME, selectedTheme.id)
    localStorage.setItem(STORAGE_KEY_MODE, activeMode)
  } catch {
    // Ignore localStorage errors
  }

  // Dispatch custom event
  window.dispatchEvent(
    new CustomEvent('gitcraft_theme_change', {
      detail: { themeId: selectedTheme.id, mode: activeMode, actualMode },
    })
  )
}
