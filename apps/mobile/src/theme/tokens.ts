/**
 * Territory Rush design tokens.
 *
 * Two full palettes — `lightColors` (default) and `darkColors` — expose the same
 * semantic keys so every screen can be theme-aware. Values mirror the hi-fi
 * handoff (TerritoryRush.dc.html): the dark theme is the original "Conquista de
 * ruas" surface; the light theme is the "claro" board (app bg #F4F6F9, white
 * cards, dark text, brand blue #1E6FE0, points gold darkened for contrast).
 *
 * `radii`, `spacing` and `fontSize` are theme-agnostic and shared by both.
 */
const darkColors = {
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
  tabBar: '#0C1017',

  // Strokes
  stroke: 'rgba(255,255,255,0.06)',
  strokeStrong: 'rgba(255,255,255,0.1)',
  strokeGlass: 'rgba(255,255,255,0.08)',
  divider: '#26303D',
  sheetHandle: '#39424F',

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
  primaryText: '#7BB5FF',
  accent: '#FC4C02',
  accentText: '#FC7B47',
  gold: '#F5B400',
  goldText: '#F5B400',
  yellow: '#FFD400',
  wordmarkRush: '#FFD400',
  green: '#1F9D57',
  greenBright: '#2FBB70',
  purple: '#A855F7',
  purpleBright: '#C084FC',
  teal: '#14B8A6',
  tealBright: '#2DD4BF',
  danger: '#E23B3B',
  dangerSoft: '#E86464',

  // Tinted surfaces / borders
  primarySurface: 'rgba(46,139,255,0.1)',
  primarySurfaceStrong: 'rgba(46,139,255,0.16)',
  primaryBorder: 'rgba(46,139,255,0.35)',
  primaryBorderStrong: 'rgba(46,139,255,0.55)',
  primaryBorderSoft: 'rgba(46,139,255,0.18)',
  accentSurface: 'rgba(252,76,2,0.15)',
  accentSurfaceSoft: 'rgba(252,76,2,0.1)',
  accentBorder: 'rgba(252,76,2,0.35)',
  goldSurface: 'rgba(245,180,0,0.14)',
  goldBorder: 'rgba(245,180,0,0.3)',
  greenSurface: 'rgba(31,157,87,0.12)',
  dangerSurface: 'rgba(226,59,59,0.14)',
  dangerBorder: 'rgba(226,59,59,0.35)',
  unclaimedSurface: 'rgba(122,132,146,0.16)',

  // Overlays
  scrim: 'rgba(10,14,21,0.85)',
  scrimBackdrop: 'rgba(5,8,14,0.55)',
  badgeBorder: 'rgba(12,17,24,0.9)',
  authGradientTop: '#0E1524',
  authGradientBottom: '#05080E',

  // Ranking podium
  silver: '#C0C7D0',
  bronze: '#C88A4B',
  podiumFrom: '#1C2431',
  podiumTo: '#141A24',
  podiumGoldFrom: '#2A2410',
  podiumGoldTo: '#1A1608',
  podiumGoldAvatarBg: '#2A2410',

  // Avatar fill gradient
  avatarFrom: '#3A4658',
  avatarTo: '#222A37',
  avatarMuted: '#26303D',

  white: '#FFFFFF',
};

export type Palette = typeof darkColors;

const lightColors: Palette = {
  // Surfaces
  bgApp: '#F4F6F9',
  surfaceCard: '#FFFFFF',
  surfaceInner: '#EEF2F7',
  surfaceInnerDeep: '#EEF1F5',
  surfaceSheet: '#F4F6F9',
  surfaceSheetAlt: '#FFFFFF',
  surfaceMuted: '#EEF1F5',
  surfaceGlass: 'rgba(255,255,255,0.9)',
  surfaceGlassSoft: 'rgba(255,255,255,0.82)',
  tabBar: '#FFFFFF',

  // Strokes
  stroke: 'rgba(15,23,34,0.07)',
  strokeStrong: 'rgba(15,23,34,0.1)',
  strokeGlass: 'rgba(15,23,34,0.08)',
  divider: '#DBE1E9',
  sheetHandle: '#CDD4DD',

  // Text
  textHi: '#0F1722',
  textMid: '#8A94A2',
  textLo: '#AAB3BF',
  textSoft: '#5A6472',
  textSofter: '#3A4658',

  // Brand / semantic
  primary: '#1E6FE0',
  primaryDeep: '#1559B8',
  primaryTint: '#4B8FEA',
  primaryText: '#1E6FE0',
  accent: '#FC4C02',
  accentText: '#FC4C02',
  gold: '#E6A100',
  goldText: '#B0790B',
  yellow: '#E6A100',
  wordmarkRush: '#FC4C02',
  green: '#107A3D',
  greenBright: '#12A050',
  purple: '#8B3FD6',
  purpleBright: '#A855F7',
  teal: '#0D9488',
  tealBright: '#14B8A6',
  danger: '#D62F2F',
  dangerSoft: '#D65C5C',

  // Tinted surfaces / borders
  primarySurface: 'rgba(30,111,224,0.08)',
  primarySurfaceStrong: 'rgba(30,111,224,0.12)',
  primaryBorder: 'rgba(30,111,224,0.35)',
  primaryBorderStrong: 'rgba(30,111,224,0.55)',
  primaryBorderSoft: 'rgba(30,111,224,0.22)',
  accentSurface: 'rgba(252,76,2,0.12)',
  accentSurfaceSoft: 'rgba(252,76,2,0.07)',
  accentBorder: 'rgba(252,76,2,0.35)',
  goldSurface: 'rgba(230,161,0,0.14)',
  goldBorder: 'rgba(230,161,0,0.35)',
  greenSurface: 'rgba(16,122,61,0.1)',
  dangerSurface: 'rgba(214,47,47,0.1)',
  dangerBorder: 'rgba(214,47,47,0.35)',
  unclaimedSurface: 'rgba(154,164,178,0.14)',

  // Overlays
  scrim: 'rgba(244,246,249,0.85)',
  scrimBackdrop: 'rgba(15,23,34,0.4)',
  badgeBorder: '#FFFFFF',
  authGradientTop: '#FFFFFF',
  authGradientBottom: '#E6EBF1',

  // Ranking podium
  silver: '#9099A6',
  bronze: '#C88A4B',
  podiumFrom: '#FFFFFF',
  podiumTo: '#F4F6F9',
  podiumGoldFrom: '#FFF9EC',
  podiumGoldTo: '#FFF3D6',
  podiumGoldAvatarBg: '#FFF6E0',

  // Avatar fill gradient
  avatarFrom: '#C3CCD8',
  avatarTo: '#E6EBF1',
  avatarMuted: '#E2E7EE',

  white: '#FFFFFF',
};

export type OwnershipColors = { unclaimed: string; mine: string; other: string };

const darkOwnership: OwnershipColors = {
  unclaimed: '#7A8492',
  mine: '#2E8BFF',
  other: '#E23B3B',
};

const lightOwnership: OwnershipColors = {
  unclaimed: '#9AA4B2',
  mine: '#1E6FE0',
  other: '#D62F2F',
};

const CARTO_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const CARTO_LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export type ThemeName = 'light' | 'dark';

export type Theme = {
  name: ThemeName;
  isDark: boolean;
  colors: Palette;
  ownership: OwnershipColors;
  mapStyleUrl: string;
  statusBarStyle: 'light' | 'dark';
};

export const themes: Record<ThemeName, Theme> = {
  light: {
    name: 'light',
    isDark: false,
    colors: lightColors,
    ownership: lightOwnership,
    mapStyleUrl: CARTO_LIGHT,
    statusBarStyle: 'dark',
  },
  dark: {
    name: 'dark',
    isDark: true,
    colors: darkColors,
    ownership: darkOwnership,
    mapStyleUrl: CARTO_DARK,
    statusBarStyle: 'light',
  },
};

export const defaultThemeName: ThemeName = 'light';

export { lightColors, darkColors, lightOwnership, darkOwnership };

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
