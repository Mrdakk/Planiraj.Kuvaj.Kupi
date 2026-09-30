/**
 * "Nedeljni sto" design tokens. Screens and components take every color, size,
 * radius and spacing from here; nothing visual is hardcoded elsewhere.
 */
export const colors = {
  primary: '#C45C26',
  primarySoft: '#FFF6EC',
  onPrimary: '#FFFBF6',
  background: '#F4EFE6',
  surface: '#FFFBF6',
  surfacePressed: '#F4EFE6',
  surfaceRaised: '#EBE4D8',
  surfaceAlt: '#EFE8DC',
  sheet: '#FFFFFF',
  sheetField: '#FFFFFF',
  sheetHandle: '#E8DDD2',
  switchThumb: '#FFFFFF',
  text: '#2A2118',
  textOnLight: '#2A2118',
  textOnLightMuted: '#6B6158',
  textSecondary: '#6B5E52',
  /** 4.5:1 on background, so captions stay readable. */
  textMuted: '#75695E',
  border: '#E4D9CC',
  success: '#6B7F5A',
  successSoft: '#E7EDE1',
  cookedSurface: '#EEF2E8',
  cookedSurfacePressed: '#E2E8D8',
  danger: '#B54A3C',
  dangerSoft: '#F6E4DE',
  overlay: 'rgba(42, 33, 24, 0.22)',
} as const;

export const fonts = {
  display: 'Fraunces_700Bold',
  body: 'SourceSans3_400Regular',
  bodyMedium: 'SourceSans3_500Medium',
  bodySemi: 'SourceSans3_600SemiBold',
  bodyBold: 'SourceSans3_700Bold',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
} as const;

/** Radius per component family, so buttons, cards and fields stay consistent. */
export const radii = {
  field: borderRadius.md,
  button: borderRadius.lg,
  card: borderRadius.xl,
  sheet: borderRadius.xxl,
  pill: borderRadius.full,
} as const;

export const layout = {
  fabHeight: 52,
  /** Height of inputs, pickers and regular buttons. */
  controlHeight: 48,
  /** Bottom list padding so the last row clears one floating button. */
  fabClearance: 96,
  /** Bottom list padding when a secondary button sits above the floating button. */
  fabStackClearance: 160,
  /** Separator inset that lines up with text after a 44 pt emoji badge. */
  listInset: 72,
  tabBarHeight: 80,
  /** Width of the "1." column in recipe steps. */
  stepIndexWidth: 28,
  dayColumnWidth: 86,
  emojiCell: 52,
  sheetHandle: { width: 36, height: 4 },
} as const;

/** Minimum touch target (Apple HIG / Material). */
export const hit = {
  min: 44,
  slop: 8,
} as const;

export const iconSize = {
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#2A2118',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#2A2118',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#2A2118',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export const typography = {
  h1: {
    fontFamily: fonts.display,
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 38,
  },
  h2: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  h3: {
    fontFamily: fonts.bodySemi,
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  displayTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
  emoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  emojiSmall: {
    fontSize: 20,
    lineHeight: 24,
  },
} as const;
