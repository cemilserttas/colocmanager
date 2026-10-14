import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
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
  useTheme,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface ProfileScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    replace?: (screen: string) => void;
    reset?: (state: any) => void;
  };
}

/**
 * User profile screen with account settings, push notification preferences,
 * member management shortcut (admin only), group departure, and logout.
 */
export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const paperTheme = useTheme();
  const { user, logout, updateUserProfile } = useAuth();
  const { group, members, leaveGroup } = useGroup();

  // Notification toggle
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Edit profile dialog
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Complete history dialog / info
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

  const isAdmin =
    group?.adminUid === user?.uid ||
    members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin');

  /**
   * Updates user's display name.
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Card Header */}
        <Surface style={styles.profileHeader}>
          <Avatar.Text size={72} label={initial} style={styles.avatar} />
          <Text variant="headlineSmall" style={styles.userName}>
            {user?.displayName || 'Colocataire'}
          </Text>
          <Text variant="bodyMedium" style={styles.userEmail}>
            {user?.email || 'email@exemple.com'}
          </Text>

          {group && (
            <Surface style={styles.groupBadge}>
              <Text variant="labelMedium" style={styles.groupBadgeText}>
                🏠 Colocation : {group.name} {isAdmin ? '👑 (Admin)' : ''}
              </Text>
            </Surface>
          )}
        </Surface>

        {/* Settings Sections */}
        <List.Section style={styles.listSection}>
          <List.Subheader style={styles.subheader}>Mon Compte</List.Subheader>

          <List.Item
            title="Modifier profil"
            description="Changer de nom ou de pseudo"
            left={(props) => <List.Icon {...props} icon="account-edit-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              setNewDisplayName(user?.displayName || '');
              setEditProfileVisible(true);
            }}
            style={styles.listItem}
          />

          <Divider />

          <List.Item
            title="Notifications"
            description="Rappels de courses et de ménage"
            left={(props) => <List.Icon {...props} icon="bell-outline" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                thumbColor={notificationsEnabled ? colors.primary : '#ccc'}
                trackColor={{ true: '#BBDEFB', false: '#e0e0e0' }}
              />
            )}
            style={styles.listItem}
          />
        </List.Section>

        {/* Group Section */}
        <List.Section style={styles.listSection}>
          <List.Subheader style={styles.subheader}>Ma Colocation</List.Subheader>

          {isAdmin && (
            <>
              <List.Item
                title="Gestion des membres"
                description="Codes d'invitation et rôles"
                left={(props) => (
                  <List.Icon {...props} icon="account-group-outline" color={colors.primary} />
                )}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => navigation.navigate('ManageMembers')}
                style={styles.listItem}
              />
              <Divider />
            </>
          )}

          <List.Item
            title="Historique complet"
            description="Toutes les activités de la colocation"
            left={(props) => <List.Icon {...props} icon="history" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setHistoryDialogVisible(true)}
            style={styles.listItem}
          />

          <Divider />

          <List.Item
            title="Quitter le groupe"
            description="Sortir de cette colocation"
            left={(props) => (
              <List.Icon {...props} icon="exit-to-app" color={colors.warning} />
            )}
            titleStyle={{ color: colors.warning }}
            onPress={() => setLeaveGroupVisible(true)}
            style={styles.listItem}
          />
        </List.Section>

        {/* Session Section */}
        <List.Section style={styles.listSection}>
          <List.Item
            title="Déconnexion"
            left={(props) => <List.Icon {...props} icon="logout" color={colors.error} />}
            titleStyle={{ color: colors.error, fontWeight: '700' }}
            onPress={() => setLogoutVisible(true)}
            style={styles.listItem}
          />
        </List.Section>
      </ScrollView>

      {/* Edit Profile Dialog */}
      <Portal>
        <Dialog visible={editProfileVisible} onDismiss={() => setEditProfileVisible(false)}>
          <Dialog.Title>Modifier le profil</Dialog.Title>
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
            <Button mode="contained" onPress={handleSaveProfile} loading={updatingProfile}>
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* History Dialog Info */}
        <Dialog visible={historyDialogVisible} onDismiss={() => setHistoryDialogVisible(false)}>
          <Dialog.Title>Historique complet</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              L'historique détaillé de chaque tâche et achat est consultable directement depuis la fiche
              de chaque produit et corvée.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setHistoryDialogVisible(false)}>Fermer</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Leave Group Dialog */}
        <Dialog visible={leaveGroupVisible} onDismiss={() => setLeaveGroupVisible(false)}>
          <Dialog.Title>Quitter la colocation</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Êtes-vous certain de vouloir quitter le groupe "{group?.name}" ? Vous ne recevrez plus les
              notifications et vos tâches seront réassignées.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLeaveGroupVisible(false)}>Annuler</Button>
            <Button
              textColor={colors.warning}
              onPress={handleConfirmLeaveGroup}
              loading={leavingGroup}
            >
              Quitter
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

      {/* Snackbar feedback */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => {
          setSnackbarVisible(false);
          setSnackbarMessage(null);
        }}
        duration={3500}
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    elevation: 2,
  },
  avatar: {
    backgroundColor: colors.primary,
    marginBottom: spacing.sm,
  },
  userName: {
    fontWeight: '800',
    color: colors.text,
  },
  userEmail: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  groupBadge: {
    marginTop: spacing.md,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  groupBadgeText: {
    color: colors.primary,
    fontWeight: '700',
  },
  listSection: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    elevation: 1,
  },
  subheader: {
    fontWeight: '700',
    color: colors.textSecondary,
    backgroundColor: colors.surface,
  },
  listItem: {
    paddingVertical: spacing.xs,
  },
  snackbar: {
    backgroundColor: colors.text,
  },
});

export default ProfileScreen;
