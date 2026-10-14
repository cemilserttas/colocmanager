import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  themePreference: ThemePreference;
  systemColorScheme: ColorSchemeName;
  isDark: boolean;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  updateSystemColorScheme: (scheme: ColorSchemeName) => void;
  initializeTheme: () => Promise<void>;
}

const STORAGE_KEY = '@coloc_theme_preference';

export const useThemeStore = create<ThemeState>((set, get) => ({
  themePreference: 'system',
  systemColorScheme: Appearance.getColorScheme() || 'dark',
  isDark: (Appearance.getColorScheme() || 'dark') === 'dark',

  initializeTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const system = Appearance.getColorScheme() || 'dark';
      const pref = (saved as ThemePreference) || 'system';
      const isDark = pref === 'system' ? system === 'dark' : pref === 'dark';

      set({
        themePreference: pref,
        systemColorScheme: system,
        isDark,
      });

      // Listen to system changes
      Appearance.addChangeListener(({ colorScheme }) => {
        get().updateSystemColorScheme(colorScheme);
      });
    } catch {
      // Fallback
    }
  },

  setThemePreference: async (pref: ThemePreference) => {
    const system = get().systemColorScheme || 'dark';
    const isDark = pref === 'system' ? system === 'dark' : pref === 'dark';
    set({ themePreference: pref, isDark });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // Non-blocking
    }
  },

  updateSystemColorScheme: (scheme: ColorSchemeName) => {
    const system = scheme || 'dark';
    const pref = get().themePreference;
    const isDark = pref === 'system' ? system === 'dark' : pref === 'dark';
    set({ systemColorScheme: system, isDark });
  },
}));

/**
 * Returns dynamic Liquid Glass design tokens according to current active theme
 */
export const getLiquidGlassTokens = (isDark: boolean) => ({
  isDark,
  bg: isDark ? '#090A0F' : '#F1F5F9',
  bgGradient: isDark
    ? ['#090A0F', '#121420', '#090A0F']
    : ['#F8FAFC', '#E2E8F0', '#F1F5F9'],
  surface: isDark ? 'rgba(22, 24, 34, 0.72)' : 'rgba(255, 255, 255, 0.82)',
  card: isDark ? 'rgba(26, 29, 42, 0.65)' : 'rgba(255, 255, 255, 0.78)',
  cardSolid: isDark ? '#161824' : '#FFFFFF',
  cardHighlight: isDark ? 'rgba(48, 209, 88, 0.15)' : 'rgba(48, 209, 88, 0.12)',
  bubbleActive: isDark
    ? 'rgba(255, 255, 255, 0.16)'
    : 'rgba(10, 132, 255, 0.14)',
  border: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.75)',
  borderSubtle: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
  borderGlow: isDark ? 'rgba(10, 132, 255, 0.4)' : 'rgba(10, 132, 255, 0.25)',
  text: isDark ? '#F8FAFC' : '#0F172A',
  textSecondary: isDark ? '#94A3B8' : '#64748B',
  textTertiary: isDark ? '#64748B' : '#94A3B8',
  primary: '#0A84FF',          // Apple iOS Blue
  accent: '#0A84FF',           // Apple Primary Accent
  secondary: '#5E5CE6',        // Apple Indigo
  success: '#30D158',          // Apple Emerald
  warning: '#FF9F0A',          // Apple Amber
  error: '#FF453A',            // Apple Coral Red
  purple: '#BF5AF2',           // Apple Purple
  adminGold: '#FFD60A',        // Apple Gold Crown
});

export default useThemeStore;
