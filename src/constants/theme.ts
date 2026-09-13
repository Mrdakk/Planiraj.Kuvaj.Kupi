export const colors = {
  primary: '#C45C26',
  primaryDark: '#A84C1E',
  primaryLight: '#D4894A',
  onPrimary: '#FFFBF6',
  background: '#F4EFE6',
  surface: '#FFFBF6',
  surfaceRaised: '#EBE4D8',
  surfaceAlt: '#EFE8DC',
  sheet: '#FFFFFF',
  sheetField: '#FFFFFF',
  text: '#2A2118',
  textOnLight: '#2A2118',
  textOnLightMuted: '#6B6158',
  textSecondary: '#6B5E52',
  textMuted: '#8A7D72',
  border: '#E4D9CC',
  success: '#6B7F5A',
  successSoft: '#E7EDE1',
  danger: '#B54A3C',
  dangerSoft: '#F6E4DE',
  warning: '#C45C26',
  info: '#5C6B7A',
  overlay: 'rgba(42, 33, 24, 0.22)',
} as const;

export const fonts = {
  display: 'Fraunces_700Bold',
  displaySemi: 'Fraunces_600SemiBold',
  body: 'SourceSans3_400Regular',
  bodyMedium: 'SourceSans3_500Medium',
  bodySemi: 'SourceSans3_600SemiBold',
  bodyBold: 'SourceSans3_700Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
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
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
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
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
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
} as const;
