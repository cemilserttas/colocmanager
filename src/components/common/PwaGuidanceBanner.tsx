import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from 'react-native-paper';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';

export const PWA_BANNER_DISMISSED_KEY = '@coloc_pwa_banner_dismissed';

interface PwaGuidanceBannerProps {
  compact?: boolean;
  style?: any;
}

export const PwaGuidanceBanner: React.FC<PwaGuidanceBannerProps> = ({ compact, style }) => {
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { language } = useLanguageStore();
  const isEn = language === 'en';

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const isStandalone =
        (window.navigator as any)?.standalone === true ||
        (typeof window.matchMedia === 'function' &&
          window.matchMedia('(display-mode: standalone)').matches);

      if (!isStandalone) {
        AsyncStorage.getItem(PWA_BANNER_DISMISSED_KEY)
          .then((val) => {
            if (val !== 'true') {
              setVisible(true);
            }
          })
          .catch(() => {
            setVisible(true);
          });
      }
    }
  }, []);

  const handleDismiss = async () => {
    soundService.playPopSound();
    setVisible(false);
    try {
      await AsyncStorage.setItem(PWA_BANNER_DISMISSED_KEY, 'true');
    } catch {
      // Non-blocking
    }
  };

  if (!visible) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: isDark ? 'rgba(79, 70, 229, 0.18)' : '#EEF2FF',
          borderColor: tokens.primary,
        },
        compact && styles.compactBanner,
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>📲</Text>
          <Text
            variant="labelMedium"
            style={{ fontWeight: '800', color: tokens.primary }}
          >
            {isEn ? 'Web App Mode' : 'Mode Application Web'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={isEn ? 'Dismiss banner' : 'Fermer le bandeau'}
        >
          <Text
            style={{
              fontSize: 16,
              color: tokens.textTertiary,
              paddingHorizontal: 4,
              fontWeight: '700',
            }}
          >
            ✕
          </Text>
        </TouchableOpacity>
      </View>
      <Text
        variant="bodySmall"
        style={[styles.bodyText, { color: tokens.text }]}
      >
        {isEn
          ? "To use ColocManager as a real app (without Safari browser bars) and receive lock-screen alerts: tap Share 📤 (or Safari compass 🧭) then 'Add to Home Screen'."
          : "Pour utiliser ColocManager comme une vraie application (sans barre Safari) et recevoir les alertes : touchez Partager 📤 (ou la boussole 🧭) puis \"Sur l'écran d'accueil\"."}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  compactBanner: {
    padding: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bodyText: {
    marginTop: 4,
    lineHeight: 18,
    fontSize: 13,
  },
});

export default PwaGuidanceBanner;
