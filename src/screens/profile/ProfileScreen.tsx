import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Avatar,
  List,
  Surface,
  Dialog,
  Portal,
  Snackbar,
  Divider,
} from 'react-native-paper';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { notificationService } from '../../services/notificationService';

interface ProfileScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    replace?: (screen: string) => void;
  };
}

/**
 * User profile screen with account settings, push notification trigger,
 * explicit admin status & management shortcuts, group exit, and logout.
 */
export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout, updateUserProfile } = useAuth();
  const { group, members, leaveGroup } = useGroup();

  // Notification toggle
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Edit profile dialog
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Complete history dialog
  const [historyDialogVisible, setHistoryDialogVisible] = useState(false);

  // Leave group dialog
  const [leaveGroupVisible, setLeaveGroupVisible] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);

  // Logout dialog
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Feedback states
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Admin status check
  const isAdmin =
    Boolean(user?.uid) &&
    (group?.adminUid === user?.uid ||
      members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin'));

  // Find admin name if not self
  const adminMember = members.find(
    (m) => m.userId === group?.adminUid || m.id === group?.adminUid || m.role === 'admin'
  );
  const adminName = adminMember?.displayName || adminMember?.email || 'Administrateur';

  /**
   * Toggles notification state and sends an immediate test notification to device/browser.
   */
  const handleToggleNotifications = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);

    if (enabled) {
      let triggered = false;

      // 1. Trigger Web Notification if in browser environment
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        try {
          if (Notification.permission === 'granted') {
            new Notification('🔔 Notifications ColocManager activées !', {
              body: "Tu recevras un rappel direct quand c'est ton tour d'acheter ou de nettoyer !",
              icon: '/favicon.ico',
            });
            triggered = true;
          } else if (Notification.permission !== 'denied') {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              new Notification('🔔 Notifications ColocManager activées !', {
                body: "Tu recevras un rappel direct quand c'est ton tour d'acheter ou de nettoyer !",
                icon: '/favicon.ico',
              });
              triggered = true;
            }
          }
        } catch (e) {
          console.warn('Web notification error:', e);
        }
      }

      // 2. Trigger native Expo Notification (iOS / Android)
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🔔 Notifications ColocManager activées !',
              body: "Tu recevras un rappel direct quand c'est ton tour d'acheter ou de nettoyer !",
              sound: true,
            },
            trigger: null,
          });
          triggered = true;
        }
      } catch (e) {
        console.warn('Native notification error:', e);
      }

      // 3. Save notification record to user history
      if (user?.uid) {
        try {
          await notificationService.addNotificationToFirestore(
            user.uid,
            'system',
            '🔔 Notifications activées',
            "Le service de notifications est prêt. Vous recevrez un rappel automatique pour vos tâches !"
          );
        } catch {
          // Non-blocking in offline/demo mode
        }
      }

      setSnackbarMessage(
        triggered
          ? "🔔 Notifications activées ! Une alerte vient d'apparaître sur ton écran."
          : "🔔 Notifications activées avec succès !"
      );
      setSnackbarVisible(true);
    } else {
      setSnackbarMessage('Notifications désactivées.');
      setSnackbarVisible(true);
    }
  };

  /**
   * Updates user display name.
   */
  const handleSaveProfile = async () => {
    const trimmed = newDisplayName.trim();
    if (!trimmed) {
      setSnackbarMessage('Le nom ne peut pas être vide.');
      setSnackbarVisible(true);
      return;
    }

    setUpdatingProfile(true);
    try {
      if (updateUserProfile) {
        await updateUserProfile({ displayName: trimmed });
      }
      setEditProfileVisible(false);
      setSnackbarMessage('Profil mis à jour avec succès !');
      setSnackbarVisible(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour du profil.';
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setUpdatingProfile(false);
    }
  };

  /**
   * Dispatches leaving the current colocation group.
   */
  const handleConfirmLeaveGroup = async () => {
    setLeavingGroup(true);
    try {
      await leaveGroup();
      setLeaveGroupVisible(false);
      if (navigation.replace) {
        navigation.replace('JoinCreateGroup');
      } else {
        navigation.navigate('JoinCreateGroup');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du départ du groupe.';
      setSnackbarMessage(message);
      setSnackbarVisible(true);
      setLeavingGroup(false);
    }
  };

  /**
   * Dispatches user logout.
   */
  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutVisible(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la déconnexion.';
      setSnackbarMessage(message);
      setSnackbarVisible(true);
      setLoggingOut(false);
    }
  };

  const initial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* User Profile Card Header */}
          <Surface style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              <Avatar.Text size={72} label={initial} style={styles.avatar} />
              {isAdmin && (
                <View style={styles.crownBadgeFloating}>
                  <Text style={{ fontSize: 16 }}>👑</Text>
                </View>
              )}
            </View>

            <Text variant="headlineSmall" style={styles.userName}>
              {user?.displayName || 'Colocataire'}
            </Text>
            <Text variant="bodyMedium" style={styles.userEmail}>
              {user?.email || 'email@exemple.com'}
            </Text>

            {/* Admin or Member Role Pill */}
            {group && (
              <Surface
                style={[
                  styles.rolePill,
                  isAdmin ? styles.adminPill : styles.memberPill,
                ]}
              >
                <Text
                  style={[
                    styles.rolePillText,
                    isAdmin ? styles.adminPillText : styles.memberPillText,
                  ]}
                >
                  {isAdmin
                    ? "👑 Vous êtes l'Administrateur"
                    : `👤 Colocataire (Admin: ${adminName})`}
                </Text>
              </Surface>
            )}
          </Surface>

          {/* Admin Dedicated Management Banner */}
          {isAdmin && (
            <Surface style={styles.adminControlCard}>
              <View style={styles.adminControlHeader}>
                <Text style={{ fontSize: 24, marginRight: spacing.sm }}>👑</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={styles.adminControlTitle}>
                    Espace Administrateur
                  </Text>
                  <Text variant="bodySmall" style={styles.adminControlDesc}>
                    Vous gérez la colocation : membres, produits, tâches et ordre de rotation.
                  </Text>
                </View>
              </View>

              <View style={styles.adminActionRow}>
                <Button
                  mode="contained"
                  buttonColor={colors.primary}
                  style={styles.adminButton}
                  onPress={() => navigation.navigate('ManageMembers')}
                >
                  👥 Gérer les membres ({members.length})
                </Button>
              </View>
            </Surface>
          )}

          {/* Settings Section: Mon Compte */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeaderTitle}>⚙️ MON COMPTE</Text>

            <List.Item
              title="Modifier mon profil"
              description="Changer de pseudo ou de nom"
              left={() => <Text style={styles.listEmojiIcon}>✏️</Text>}
              right={() => <Text style={styles.chevronIcon}>›</Text>}
              onPress={() => {
                setNewDisplayName(user?.displayName || '');
                setEditProfileVisible(true);
              }}
              style={styles.listItem}
            />

            <Divider style={styles.divider} />

            <List.Item
              title="Notifications en direct"
              description="Alertes quand c'est votre tour d'acheter ou nettoyer"
              left={() => <Text style={styles.listEmojiIcon}>🔔</Text>}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  thumbColor={notificationsEnabled ? colors.primary : '#E2E8F0'}
                  trackColor={{ true: colors.primaryLight, false: '#CBD5E1' }}
                />
              )}
              style={styles.listItem}
            />
          </View>

          {/* Settings Section: Ma Colocation */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeaderTitle}>🏠 MA COLOCATION</Text>

            <List.Item
              title="Membres & Code d'invitation"
              description={`${members.length} colocataire(s) actif(s)`}
              left={() => <Text style={styles.listEmojiIcon}>👥</Text>}
              right={() => <Text style={styles.chevronIcon}>›</Text>}
              onPress={() => navigation.navigate('ManageMembers')}
              style={styles.listItem}
            />

            <Divider style={styles.divider} />

            <List.Item
              title="Historique des activités"
              description="Achats et ménages validés"
              left={() => <Text style={styles.listEmojiIcon}>📜</Text>}
              right={() => <Text style={styles.chevronIcon}>›</Text>}
              onPress={() => setHistoryDialogVisible(true)}
              style={styles.listItem}
            />

            <Divider style={styles.divider} />

            <List.Item
              title="Quitter la colocation"
              description="Sortir du groupe actuel"
              left={() => <Text style={styles.listEmojiIcon}>🚪</Text>}
              titleStyle={{ color: colors.warning, fontWeight: '600' }}
              onPress={() => setLeaveGroupVisible(true)}
              style={styles.listItem}
            />
          </View>

          {/* Settings Section: Déconnexion */}
          <View style={[styles.sectionCard, styles.logoutCard]}>
            <List.Item
              title="Se déconnecter"
              left={() => <Text style={styles.listEmojiIcon}>🔴</Text>}
              titleStyle={{ color: colors.error, fontWeight: '700' }}
              onPress={() => setLogoutVisible(true)}
              style={styles.listItem}
            />
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Dialog */}
      <Portal>
        <Dialog visible={editProfileVisible} onDismiss={() => setEditProfileVisible(false)}>
          <Dialog.Title>Modifier mon profil</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nom ou Pseudo"
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              mode="outlined"
              style={{ marginTop: spacing.xs }}
              disabled={updatingProfile}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditProfileVisible(false)} disabled={updatingProfile}>
              Annuler
            </Button>
            <Button
              mode="contained"
              buttonColor={colors.primary}
              onPress={handleSaveProfile}
              loading={updatingProfile}
            >
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* History Dialog Info */}
        <Dialog visible={historyDialogVisible} onDismiss={() => setHistoryDialogVisible(false)}>
          <Dialog.Title>Historique complet</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ lineHeight: 22 }}>
              L'historique complet de chaque tâche et achat est conservé et consultable dans les onglets{' '}
              <Text style={{ fontWeight: '700' }}>Achats</Text> et{' '}
              <Text style={{ fontWeight: '700' }}>Nettoyage</Text> en cliquant sur chaque fiche !
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setHistoryDialogVisible(false)}>Compris</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Leave Group Dialog */}
        <Dialog visible={leaveGroupVisible} onDismiss={() => setLeaveGroupVisible(false)}>
          <Dialog.Title>Quitter la colocation</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ lineHeight: 22 }}>
              Êtes-vous certain de vouloir quitter "{group?.name || 'la colocation'}" ? Vos tâches et
              tours d'achat seront immédiatement redistribués aux autres colocataires.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLeaveGroupVisible(false)}>Annuler</Button>
            <Button
              textColor={colors.warning}
              onPress={handleConfirmLeaveGroup}
              loading={leavingGroup}
            >
              Quitter le groupe
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Logout Dialog */}
        <Dialog visible={logoutVisible} onDismiss={() => setLogoutVisible(false)}>
          <Dialog.Title>Déconnexion</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Voulez-vous vraiment vous déconnecter de votre compte ColocManager ?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutVisible(false)}>Annuler</Button>
            <Button
              textColor={colors.error}
              onPress={handleConfirmLogout}
              loading={loggingOut}
            >
              Déconnexion
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Snackbar Feedback */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => {
          setSnackbarVisible(false);
          setSnackbarMessage(null);
        }}
        duration={4000}
        style={styles.snackbar}
      >
        {snackbarMessage || ''}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  crownBadgeFloating: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: borderRadius.full,
    padding: 3,
  },
  userName: {
    fontWeight: '800',
    color: colors.text,
  },
  userEmail: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  rolePill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    elevation: 0,
  },
  rolePillText: {
    fontSize: 13,
  },
  adminPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  adminPillText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 13,
  },
  memberPill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberPillText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  adminControlCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#EEF2FF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    elevation: 1,
  },
  adminControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminControlTitle: {
    fontWeight: '800',
    color: colors.primary,
  },
  adminControlDesc: {
    color: '#475569',
    marginTop: 2,
    lineHeight: 18,
  },
  adminActionRow: {
    marginTop: spacing.sm,
  },
  adminButton: {
    borderRadius: borderRadius.md,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    paddingVertical: spacing.xs,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  listItem: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  listEmojiIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
    alignSelf: 'center',
  },
  chevronIcon: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: '300',
    alignSelf: 'center',
  },
  divider: {
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  logoutCard: {
    marginBottom: spacing.xl,
  },
  snackbar: {
    backgroundColor: colors.text,
  },
});

export default ProfileScreen;
