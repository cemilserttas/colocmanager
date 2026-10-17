import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Portal, Dialog, Button, Text } from 'react-native-paper';
import { useNotificationPreferences } from '../../store/useNotificationPreferences';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useGroupStore } from '../../store/useGroupStore';
import { soundService } from '../../services/soundService';

export const NotificationStartupModal: React.FC = () => {
  const { hasPromptedStartup, setNotificationsEnabled, setHasPromptedStartup } =
    useNotificationPreferences();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const user = useAuthStore((s) => s.user);
  const group = useGroupStore((s) => s.group);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only prompt once the user is authenticated and part of a flatshare
    if (!user || !group) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      if (!hasPromptedStartup && user && group) {
        setVisible(true);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [hasPromptedStartup, user, group]);

  const handleEnable = async () => {
    soundService.playPopSound();
    await setNotificationsEnabled(true);
    await setHasPromptedStartup();
    setVisible(false);
    soundService.playNotificationSound();
  };

  const handleDismiss = async () => {
    soundService.playPopSound();
    await setHasPromptedStartup();
    setVisible(false);
  };

  const isStandalone =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    ((window.navigator as any)?.standalone === true ||
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches));
  const isBrowserTab = Platform.OS === 'web' && !isStandalone;

  if (!user || !group || !visible) return null;

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={handleDismiss}
        style={[
          styles.dialog,
          {
            backgroundColor: isDark ? '#141624' : '#FFFFFF',
            borderColor: tokens.border,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Text style={{ fontSize: 44 }}>🔔</Text>
        </View>

        <Dialog.Title style={[styles.title, { color: tokens.text }]}>
          Activer les notifications ?
        </Dialog.Title>

        <Dialog.Content>
          <Text
            variant="bodyMedium"
            style={[styles.description, { color: tokens.textSecondary }]}
          >
            Recevez une alerte discrète dès que c'est votre tour de faire les courses, de
            nettoyer une pièce, ou lors de nouveautés ajoutées par l'administrateur.
          </Text>

          {isBrowserTab && (
            <View
              style={[
                styles.pwaNoticeBox,
                {
                  backgroundColor: isDark ? 'rgba(79, 70, 229, 0.16)' : '#EEF2FF',
                  borderColor: tokens.primary,
                },
              ]}
            >
              <Text
                variant="labelSmall"
                style={{ color: tokens.primary, fontWeight: '800', marginBottom: 2 }}
              >
                📲 Mode Application Web :
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: tokens.text, lineHeight: 17, fontSize: 12 }}
              >
                Pour utiliser ColocManager comme une application (sans barre de navigateur) et
                recevoir les notifications sur votre écran de verrouillage : touchez Partager 📤
                (ou la boussole 🧭) puis "Sur l'écran d'accueil".
              </Text>
            </View>
          )}

          <Text
            variant="bodySmall"
            style={{ color: tokens.textTertiary, textAlign: 'center', marginTop: 8 }}
          >
            Vous pourrez ajuster précisément vos préférences à tout moment dans votre profil.
          </Text>
        </Dialog.Content>

        <Dialog.Actions style={styles.actions}>
          <Button
            mode="text"
            onPress={handleDismiss}
            textColor={tokens.textSecondary}
            style={styles.buttonLater}
          >
            Plus tard
          </Button>
          <Button
            mode="contained"
            buttonColor={tokens.primary}
            textColor="#FFFFFF"
            onPress={handleEnable}
            style={styles.buttonEnable}
            labelStyle={{ fontWeight: '800' }}
          >
            Activer
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 28,
    borderWidth: 1,
    paddingTop: 12,
    maxWidth: 440,
    alignSelf: 'center',
    width: '90%',
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 20,
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  buttonLater: {
    flex: 1,
    borderRadius: 16,
    marginRight: 8,
  },
  buttonEnable: {
    flex: 1.2,
    borderRadius: 16,
  },
  pwaNoticeBox: {
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
});

export default NotificationStartupModal;
