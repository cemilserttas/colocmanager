import { MD3LightTheme, MD3Theme } from 'react-native-paper';

export const colors = {
  primary: '#4A90D9',
  secondary: '#5C6BC0',
  accent: '#FF7043',
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
} as const;

export const typography = {
  fontSizes: {
    h1: 28,
    h2: 24,
    h3: 20,
    body: 16,
    caption: 14,
    small: 12,
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
 * React Native Paper MD3 theme mapped to ColocManager design tokens.
 */
export const paperTheme: MD3Theme = {
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

export default theme;
