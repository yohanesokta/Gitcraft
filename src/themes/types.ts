export type ThemeMode = 'dark' | 'light' | 'auto'

export interface ThemeColors {
  bgPage: string
  bgSurface: string
  bgSurfaceRaised: string
  bgHover: string
  bgActive: string
  borderColor: string
  borderStrong: string
  textPrimary: string
  textSecondary: string
  textTertiary: string
  accent: string
  accentHover: string
  accentText: string
  accentSubtle: string
  codeBg: string
  codeBorder: string
  statusOpen: string
  statusOpenBg: string
  statusClosed: string
  statusMerged: string
  shadowFloating: string
}

export interface ThemeDefinition {
  id: string
  name: string
  description: string
  dark: ThemeColors
  light: ThemeColors
}
