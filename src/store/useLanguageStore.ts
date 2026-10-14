import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, TranslationKey } from '../i18n/translations';

export type Language = 'fr' | 'en';

interface LanguageState {
  language: Language;
  erasmusMode: boolean;
  initializeLanguage: () => Promise<void>;
  setErasmusMode: (enabled: boolean) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
}

const STORAGE_KEY = '@coloc_erasmus_mode';

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'fr',
  erasmusMode: false,

  initializeLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const isErasmus = saved === 'true';
      set({
        erasmusMode: isErasmus,
        language: isErasmus ? 'en' : 'fr',
      });
    } catch {
      // Fallback to fr
    }
  },

  setErasmusMode: async (enabled: boolean) => {
    const lang = enabled ? 'en' : 'fr';
    set({
      erasmusMode: enabled,
      language: lang,
    });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // Non-blocking
    }
  },

  t: (key: TranslationKey, params?: Record<string, string>): string => {
    const lang = get().language;
    const dict = translations[lang] || translations.fr;
    let text: string = (dict as any)[key] || (translations.fr as any)[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), val);
      });
    }

    return text;
  },
}));

export default useLanguageStore;
