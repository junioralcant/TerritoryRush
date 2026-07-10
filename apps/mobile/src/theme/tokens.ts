/**
 * Territory Rush design tokens (dark theme).
 *
 * Values mirror the hi-fi handoff in
 * `Territory Rush_ Conquista de ruas/design_handoff_territory_rush/README.md`.
 * The app ships the dark theme as its primary surface; tokens are centralised
 * here so a light theme can be layered on later without touching screens.
 */
export const colors = {
  // Surfaces
  bgApp: '#0A0E15',
  surfaceCard: '#151B26',
  surfaceInner: '#1B2230',
  surfaceInnerDeep: '#0E141E',
  surfaceSheet: '#0F1520',
  surfaceSheetAlt: '#121824',
  surfaceMuted: '#131A24',
  surfaceGlass: 'rgba(12,17,24,0.82)',
  surfaceGlassSoft: 'rgba(12,17,24,0.7)',

  // Strokes
  stroke: 'rgba(255,255,255,0.06)',
  strokeStrong: 'rgba(255,255,255,0.1)',

  // Text
  textHi: '#F2F5F9',
  textMid: '#8B95A4',
  textLo: '#6B7482',
  textSoft: '#AAB3BF',
  textSofter: '#CFD6DF',

  // Brand / semantic
  primary: '#2E8BFF',
  primaryDeep: '#1C6FE0',
  primaryTint: '#5AA5FF',
  accent: '#FC4C02',
  gold: '#F5B400',
  yellow: '#FFD400',
  green: '#1F9D57',
  greenBright: '#2FBB70',
  purple: '#A855F7',
  purpleBright: '#C084FC',
  teal: '#14B8A6',
  tealBright: '#2DD4BF',
  danger: '#E23B3B',
  dangerSoft: '#E86464',

  // Ranking podium
  silver: '#C0C7D0',
  bronze: '#C88A4B',

  // Avatar fill gradient
  avatarFrom: '#3A4658',
  avatarTo: '#222A37',

  white: '#FFFFFF',
} as const;

export const ownershipColors = {
  unclaimed: '#7A8492',
  mine: '#2E8BFF',
  other: '#E23B3B',
} as const;

export const radii = {
  pill: 999,
  card: 18,
  sheet: 24,
  box: 14,
  boxLg: 16,
  boxSm: 12,
  button: 15,
} as const;

export const spacing = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 24,
} as const;

export const fontSize = {
  micro: 10,
  label: 11,
  labelLg: 12,
  body: 13,
  bodyLg: 14,
  title: 16,
  titleLg: 18,
  heading: 20,
  headingLg: 22,
  display: 24,
  displayLg: 28,
  wordmark: 38,
} as const;
