import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import {
  Text,
  Button,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { soundService } from '../../services/soundService';

/**
 * Screen presented to users whose account status has been set to 'suspended' by a Super-Administrator.
 * Blocks application access until reactivated.
 */
export const SuspendedAccountScreen: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);

  const [refreshing, setRefreshing] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    soundService.playPopSound();
    setRefreshing(true);
    try {
      if (user?.uid) {
        const freshUser = await authService.getUserProfile(user.uid);
        if (freshUser) {
          useAuthStore.getState().setUser(freshUser);
          if (freshUser.status !== 'suspended') {
            soundService.playSuccessSound();
            setSnackbarMessage('Votre compte a été réactivé ! Redirection...');
            setRefreshing(false);
            return;
          }
        }
      }
      setSnackbarMessage("Votre compte est toujours en attente de réactivation par l'administrateur.");
    } catch {
      setSnackbarMessage('Impossible de vérifier le statut. Veuillez réessayer.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleContactSupport = () => {
    soundService.playPopSound();
    const mailUrl = `mailto:support@colocmanager.app?subject=Demande%20de%20réactivation%20compte%20${encodeURIComponent(user?.email || '')}`;
    Linking.openURL(mailUrl).catch(() => {
      setSnackbarMessage("Écrivez à support@colocmanager.app pour demander votre réactivation.");
    });
  };

  const handleLogout = async () => {
    soundService.playPopSound();
    try {
      await signOut();
    } catch {}
  };

  const formattedDate = user?.suspendedAt
    ? new Date(user.suspendedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Restriction Shield Badge */}
          <View
            style={[
              styles.shieldBadge,
              {
                backgroundColor: isDark ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255, 59, 48, 0.12)',
                borderColor: tokens.error,
              },
            ]}
          >
            <Text style={{ fontSize: 44 }}>🚫</Text>
          </View>

          <Text variant="headlineMedium" style={[styles.title, { color: tokens.text }]}>
            Accès Restreint
          </Text>

          <Text variant="bodyMedium" style={[styles.subtitle, { color: tokens.textSecondary }]}>
            Votre compte utilisateur a été temporairement suspendu par l'administrateur de l'application.
          </Text>

          {/* Reason Glass Card */}
          <View
            style={[
              styles.reasonCard,
              {
                backgroundColor: tokens.card,
                borderColor: tokens.border,
              },
            ]}
          >
            <Text variant="labelMedium" style={[styles.reasonLabel, { color: tokens.error }]}>
              MOTIF DE LA RESTRICTION
            </Text>
            <Text variant="bodyLarge" style={[styles.reasonText, { color: tokens.text }]}>
              "{user?.suspendedReason || 'Accès restreint pour non-respect des règles ou révision administrative.'}"
            </Text>

            {formattedDate && (
              <Text variant="labelSmall" style={{ color: tokens.textSecondary, marginTop: 12 }}>
                Appliqué le {formattedDate}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              mode="contained"
              buttonColor={tokens.primary}
              textColor="#FFFFFF"
              icon="refresh"
              onPress={handleRefresh}
              loading={refreshing}
              disabled={refreshing}
              style={styles.actionButton}
              labelStyle={{ fontWeight: '800' }}
            >
              Vérifier la réactivation
            </Button>

            <Button
              mode="outlined"
              textColor={tokens.text}
              icon="email-outline"
              onPress={handleContactSupport}
              style={[styles.actionButton, { borderColor: tokens.border }]}
              labelStyle={{ fontWeight: '700' }}
            >
              Contacter le support
            </Button>

            <Button
              mode="text"
              textColor={tokens.error}
              icon="logout"
              onPress={handleLogout}
              loading={loading}
              style={styles.logoutButton}
              labelStyle={{ fontWeight: '800' }}
            >
              Se déconnecter
            </Button>
          </View>
        </View>

        <Snackbar
          visible={Boolean(snackbarMessage)}
          onDismiss={() => setSnackbarMessage(null)}
          duration={4000}
          style={{ backgroundColor: tokens.card, borderColor: tokens.border, borderWidth: 1 }}
        >
          <Text style={{ color: tokens.text }}>{snackbarMessage}</Text>
        </Snackbar>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },
  shieldBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  reasonCard: {
    width: '100%',
    padding: 22,
    borderRadius: 24,
    borderWidth: 1.5,
    marginTop: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
  },
  reasonLabel: {
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
    fontSize: 11,
  },
  reasonText: {
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    borderRadius: 20,
    paddingVertical: 4,
  },
  logoutButton: {
    marginTop: 8,
  },
});

export default SuspendedAccountScreen;
