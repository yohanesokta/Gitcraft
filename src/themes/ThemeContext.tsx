import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  ThemeDefinition,
  ThemeMode,
  THEMES,
  githubRefinedTheme,
  getStoredThemeId,
  getStoredThemeMode,
  applyTheme,
  resolveActualMode,
} from './index'

interface ThemeContextValue {
  themeId: string
  setThemeId: (id: string) => void
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
  theme: ThemeDefinition
  themes: ThemeDefinition[]
  actualMode: 'dark' | 'light'
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(getStoredThemeId)
  const [mode, setModeState] = useState<ThemeMode>(getStoredThemeMode)
  const [actualMode, setActualMode] = useState<'dark' | 'light'>(() => resolveActualMode(getStoredThemeMode()))

  // Initial apply on mount
  useEffect(() => {
    applyTheme(themeId, mode)
    setActualMode(resolveActualMode(mode))
  }, [themeId, mode])

  // Listen to system theme changes if mode is auto
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange() {
      if (mode === 'auto') {
        applyTheme(themeId, 'auto')
        setActualMode(resolveActualMode('auto'))
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mode, themeId])

  function setThemeId(newId: string) {
    setThemeIdState(newId)
    applyTheme(newId, mode)
  }

  function setMode(newMode: ThemeMode) {
    setModeState(newMode)
    applyTheme(themeId, newMode)
    setActualMode(resolveActualMode(newMode))
  }

  function toggleMode() {
    const nextMode = actualMode === 'dark' ? 'light' : 'dark'
    setMode(nextMode)
  }

  const currentTheme = THEMES.find((t) => t.id === themeId) || githubRefinedTheme

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        setThemeId,
        mode,
        setMode,
        toggleMode,
        theme: currentTheme,
        themes: THEMES,
        actualMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
