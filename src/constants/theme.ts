import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';

export const colors = {
  primary: '#4F46E5',        // Modern Indigo
  primaryDark: '#4338CA',
  primaryLight: '#EEF2FF',
  secondary: '#0284C7',      // Sky Blue
  secondaryLight: '#E0F2FE',
  accent: '#F59E0B',         // Amber Accent
  success: '#10B981',        // Emerald Green
  successLight: '#ECFDF5',
  warning: '#F59E0B',        // Amber
  warningLight: '#FFFBEB',
  error: '#EF4444',          // Coral Red
  errorLight: '#FEF2F2',
  background: '#F8FAFC',     // Clean slate
  surface: '#FFFFFF',
  text: '#0F172A',           // Slate 900
  textSecondary: '#64748B',  // Slate 500
  border: '#E2E8F0',         // Slate 200
  adminGold: '#D97706',      // Golden crown accent
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  fontSizes: {
    h1: 28,
    h2: 22,
    h3: 18,
    body: 15,
    caption: 13,
    small: 11,
  },
} as const;

/**
 * Global application design tokens and theme configuration.
 */
export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
};

/**
 * React Native Paper MD3 light theme mapped to ColocManager design tokens.
 */
export const paperLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.accent,
    error: colors.error,
    background: colors.background,
    surface: colors.surface,
    outline: colors.border,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: colors.text,
    onBackground: colors.text,
    onSurfaceVariant: colors.textSecondary,
  },
};

/**
 * Backward compatible alias for paperLightTheme
 */
export const paperTheme: MD3Theme = paperLightTheme;

/**
 * React Native Paper MD3 dark theme mapped to ColocManager design tokens.
 */
export const paperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.accent,
    error: colors.error,
    background: '#0B0D17',
    surface: '#141624',
    outline: 'rgba(255, 255, 255, 0.14)',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#F8FAFC',
    onBackground: '#F8FAFC',
    onSurfaceVariant: '#94A3B8',
  },
};

export default theme;
