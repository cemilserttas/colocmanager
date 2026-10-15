import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Avatar,
  Dialog,
  Portal,
  Snackbar,
  Divider,
  SegmentedButtons,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useThemeStore, getLiquidGlassTokens, ThemePreference } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { useNotificationPreferences } from '../../store/useNotificationPreferences';
import { notificationService } from '../../services/notificationService';
import { soundService } from '../../services/soundService';
import { adminService } from '../../services/adminService';

interface ProfileScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    replace?: (screen: string) => void;
  };
}

/**
 * User Profile & Settings Screen with Liquid Glass aesthetic,
 * Theme mode selection (System/Light/Dark), Erasmus bilingual toggle,
 * modular notification preferences, and admin space.
 */
export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDark, themePreference, setThemePreference } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t, erasmusMode, setErasmusMode } = useLanguageStore();

  const { user, logout, updateUserProfile } = useAuth();
  const { group, members, leaveGroup } = useGroup();

  const {
    notificationsEnabled,
    shoppingReminders,
    cleaningReminders,
    adminUpdates,
    setNotificationsEnabled,
    setShoppingReminders,
    setCleaningReminders,
    setAdminUpdates,
  } = useNotificationPreferences();

  // Edit profile dialog
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

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
    Boolean(user?.uid) &&
    (group?.adminUid === user?.uid ||
      members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin'));

  const isSuperAdmin = adminService.isSuperAdmin(user);

  const adminMember = members.find(
    (m) => m.userId === group?.adminUid || m.id === group?.adminUid || m.role === 'admin'
  );
  const adminName = adminMember?.displayName || adminMember?.email || 'Administrateur';

  /**
   * Toggles notification state and sends an immediate test notification to device/browser.
   */
  const handleToggleNotifications = async (enabled: boolean) => {
    soundService.playPopSound();
    await setNotificationsEnabled(enabled);

    if (enabled) {
      soundService.playNotificationSound();
      let triggered = false;

      // 1. Web Notification
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
        } catch {
          // Ignore
        }
      }

      // 2. Native Expo Notification
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
      } catch {
        // Ignore
      }

      setSnackbarMessage(
        triggered
          ? "🔔 Notifications activées ! Une alerte test vient d'apparaître sur ton écran."
          : "🔔 Notifications activées avec succès !"
      );
      setSnackbarVisible(true);
    } else {
      setSnackbarMessage('Notifications désactivées.');
      setSnackbarVisible(true);
    }
  };

  const handleToggleErasmus = async (enabled: boolean) => {
    soundService.playPopSound();
    await setErasmusMode(enabled);
    setSnackbarMessage(
      enabled
        ? '🌍 Mode Erasmus activé ! L\'application est désormais en anglais.'
        : '🌍 Mode standard restauré en français.'
    );
    setSnackbarVisible(true);
  };

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
      soundService.playSuccessSound();
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

  const handleConfirmLeaveGroup = async () => {
    setLeavingGroup(true);
    try {
      await leaveGroup();
      soundService.playPopSound();
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

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      soundService.playPopSound();
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
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentWrapper, { paddingTop: Math.max(insets.top, 14) }]}>
          {/* User Profile Glass Card */}
          <View
            style={[
              styles.profileHeader,
              {
                backgroundColor: tokens.card,
                borderColor: tokens.border,
              },
            ]}
          >
            <View style={styles.avatarWrapper}>
              <Avatar.Text
                size={76}
                label={initial}
                style={{ backgroundColor: isAdmin ? tokens.adminGold : tokens.primary }}
              />
              {isAdmin && (
                <View style={styles.crownBadgeFloating}>
                  <Text style={{ fontSize: 16 }}>👑</Text>
                </View>
              )}
            </View>

            <Text variant="headlineSmall" style={[styles.userName, { color: tokens.text }]}>
              {user?.displayName || 'Colocataire'}
            </Text>
            <Text variant="bodyMedium" style={{ color: tokens.textSecondary, marginTop: 2 }}>
              {user?.email || 'email@exemple.com'}
            </Text>

            {/* Admin or Member Role Pill */}
            {group && (
              <View
                style={[
                  styles.rolePill,
                  {
                    backgroundColor: isAdmin ? 'rgba(255, 214, 10, 0.16)' : 'rgba(150, 150, 150, 0.12)',
                    borderColor: isAdmin ? tokens.adminGold : tokens.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rolePillText,
                    { color: isAdmin ? (isDark ? '#FDE68A' : '#B45309') : tokens.textSecondary },
                  ]}
                >
                  {isAdmin ? t('adminBadge') : `${t('memberBadge')} (Admin: ${adminName})`}
                </Text>
              </View>
            )}
          </View>

          {/* Super-Administrator Portal Card (Application-wide control) */}
          {isSuperAdmin && (
            <View
              style={[
                styles.adminControlCard,
                {
                  backgroundColor: isDark ? 'rgba(255, 214, 10, 0.15)' : 'rgba(255, 214, 10, 0.18)',
                  borderColor: tokens.adminGold,
                  borderWidth: 2,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginRight: 10 }}>👑</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text variant="titleMedium" style={{ fontWeight: '900', color: isDark ? '#FDE68A' : '#78350F' }}>
                      Portail Super-Administrateur
                    </Text>
                    <View style={styles.superAdminPill}>
                      <Text style={styles.superAdminPillText}>GLOBAL</Text>
                    </View>
                  </View>
                  <Text variant="bodySmall" style={{ color: isDark ? '#FEF3C7' : '#92400E', marginTop: 2, lineHeight: 18 }}>
                    Gérez l'ensemble des utilisateurs, restrictions d'accès, colocations, création directe de comptes et statistiques globales.
                  </Text>
                </View>
              </View>

              <Button
                mode="contained"
                buttonColor="#B45309"
                textColor="#FFFFFF"
                icon="shield-crown"
                style={{ marginTop: 14, borderRadius: 16 }}
                labelStyle={{ fontWeight: '900' }}
                onPress={() => {
                  soundService.playPopSound();
                  navigation.navigate('AdminPortal');
                }}
              >
                Ouvrir le Panneau Super-Admin →
              </Button>
            </View>
          )}

          {/* Admin Space Card */}
          {isAdmin && (
            <View
              style={[
                styles.adminControlCard,
                {
                  backgroundColor: isDark ? 'rgba(255, 214, 10, 0.1)' : 'rgba(255, 214, 10, 0.12)',
                  borderColor: tokens.adminGold,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginRight: 10 }}>👑</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '800', color: isDark ? '#FDE68A' : '#92400E' }}>
                    Espace Administrateur
                  </Text>
                  <Text variant="bodySmall" style={{ color: isDark ? '#FEF3C7' : '#78350F', marginTop: 2, lineHeight: 18 }}>
                    Vous gérez la colocation : membres, invitations, ordre de rotation et transfert d'admin.
                  </Text>
                </View>
              </View>

              <Button
                mode="contained"
                buttonColor={tokens.primary}
                textColor="#FFFFFF"
                style={{ marginTop: 12, borderRadius: 16 }}
                onPress={() => {
                  soundService.playPopSound();
                  navigation.navigate('ManageMembers');
                }}
              >
                👥 {t('membersTitle')} ({members.length})
              </Button>
            </View>
          )}

          {/* Section: Apparence Liquid Glass (Dark / Light / System) */}
          <View style={[styles.sectionCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text style={[styles.sectionHeaderTitle, { color: tokens.textSecondary }]}>
              {t('appearance')}
            </Text>

            <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 }}>
              <SegmentedButtons
                value={themePreference}
                onValueChange={(val) => {
                  soundService.playPopSound();
                  setThemePreference(val as ThemePreference);
                }}
                buttons={[
                  { value: 'system', label: `🌓 ${t('themeSystem')}` },
                  { value: 'light', label: `☀️ ${t('themeLight')}` },
                  { value: 'dark', label: `🌙 ${t('themeDark')}` },
                ]}
                style={{ borderRadius: 20 }}
              />
            </View>
          </View>

          {/* Section: Option Erasmus (English Translation) */}
          <View style={[styles.sectionCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text style={[styles.sectionHeaderTitle, { color: tokens.textSecondary }]}>
              INTERNATIONAL
            </Text>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>🌍</Text>
                  <Text style={[styles.settingTitle, { color: tokens.text }]}>
                    {t('erasmusMode')}
                  </Text>
                </View>
                <Text style={[styles.settingSub, { color: tokens.textSecondary }]}>
                  {t('erasmusSub')}
                </Text>
              </View>
              <Switch
                value={erasmusMode}
                onValueChange={handleToggleErasmus}
                thumbColor={erasmusMode ? tokens.primary : '#ccc'}
                trackColor={{ true: 'rgba(10, 132, 255, 0.4)', false: '#CBD5E1' }}
              />
            </View>
          </View>

          {/* Section: Centre de Notifications Modulaires */}
          <View style={[styles.sectionCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text style={[styles.sectionHeaderTitle, { color: tokens.textSecondary }]}>
              {t('notifications').toUpperCase()}
            </Text>

            {/* Main Toggle */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>🔔</Text>
                  <Text style={[styles.settingTitle, { color: tokens.text }]}>
                    {t('liveNotifications')}
                  </Text>
                </View>
                <Text style={[styles.settingSub, { color: tokens.textSecondary }]}>
                  Activer ou désactiver les alertes automatiques
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                thumbColor={notificationsEnabled ? tokens.primary : '#ccc'}
                trackColor={{ true: 'rgba(10, 132, 255, 0.4)', false: '#CBD5E1' }}
              />
            </View>

            {notificationsEnabled && (
              <>
                <Divider style={{ backgroundColor: tokens.borderSubtle, marginHorizontal: 16 }} />

                {/* Shopping Reminders Sub-toggle */}
                <View style={styles.settingRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={[styles.subSettingTitle, { color: tokens.text }]}>
                      🛒 {t('shoppingAlerts')}
                    </Text>
                    <Text style={[styles.settingSub, { color: tokens.textSecondary }]}>
                      Alerte dès que c'est votre tour d'acheter
                    </Text>
                  </View>
                  <Switch
                    value={shoppingReminders}
                    onValueChange={(val) => {
                      soundService.playPopSound();
                      setShoppingReminders(val);
                    }}
                    thumbColor={shoppingReminders ? tokens.success : '#ccc'}
                  />
                </View>

                <Divider style={{ backgroundColor: tokens.borderSubtle, marginHorizontal: 16 }} />

                {/* Cleaning Reminders Sub-toggle */}
                <View style={styles.settingRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={[styles.subSettingTitle, { color: tokens.text }]}>
                      🧹 {t('cleaningAlerts')}
                    </Text>
                    <Text style={[styles.settingSub, { color: tokens.textSecondary }]}>
                      Rappels de planning et corvées en retard
                    </Text>
                  </View>
                  <Switch
                    value={cleaningReminders}
                    onValueChange={(val) => {
                      soundService.playPopSound();
                      setCleaningReminders(val);
                    }}
                    thumbColor={cleaningReminders ? tokens.secondary : '#ccc'}
                  />
                </View>

                <Divider style={{ backgroundColor: tokens.borderSubtle, marginHorizontal: 16 }} />

                {/* Admin Updates Sub-toggle */}
                <View style={styles.settingRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={[styles.subSettingTitle, { color: tokens.text }]}>
                      📢 {t('adminAlerts')}
                    </Text>
                    <Text style={[styles.settingSub, { color: tokens.textSecondary }]}>
                      Nouveaux produits ou tâches ajoutés par l'admin
                    </Text>
                  </View>
                  <Switch
                    value={adminUpdates}
                    onValueChange={(val) => {
                      soundService.playPopSound();
                      setAdminUpdates(val);
                    }}
                    thumbColor={adminUpdates ? tokens.warning : '#ccc'}
                  />
                </View>
              </>
            )}
          </View>

          {/* Section: Compte & Colocation Actions */}
          <View style={[styles.sectionCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text style={[styles.sectionHeaderTitle, { color: tokens.textSecondary }]}>
              {t('myColoc')}
            </Text>

            <TouchableOpacity
              onPress={() => {
                soundService.playPopSound();
                setNewDisplayName(user?.displayName || '');
                setEditProfileVisible(true);
              }}
              style={styles.actionListItem}
            >
              <Text style={{ fontSize: 18, marginRight: 10 }}>✏️</Text>
              <Text style={[styles.actionListText, { color: tokens.text }]}>Modifier mon profil</Text>
              <Text style={{ color: tokens.textSecondary, fontSize: 18 }}>›</Text>
            </TouchableOpacity>

            <Divider style={{ backgroundColor: tokens.borderSubtle, marginHorizontal: 16 }} />

            <TouchableOpacity
              onPress={() => {
                soundService.playPopSound();
                navigation.navigate('ManageMembers');
              }}
              style={styles.actionListItem}
            >
              <Text style={{ fontSize: 18, marginRight: 10 }}>👥</Text>
              <Text style={[styles.actionListText, { color: tokens.text }]}>{t('membersTitle')}</Text>
              <Text style={{ color: tokens.textSecondary, fontSize: 18 }}>›</Text>
            </TouchableOpacity>

            <Divider style={{ backgroundColor: tokens.borderSubtle, marginHorizontal: 16 }} />

            <TouchableOpacity
              onPress={() => {
                soundService.playPopSound();
                setLeaveGroupVisible(true);
              }}
              style={styles.actionListItem}
            >
              <Text style={{ fontSize: 18, marginRight: 10 }}>🚪</Text>
              <Text style={[styles.actionListText, { color: tokens.warning }]}>{t('leaveGroup')}</Text>
              <Text style={{ color: tokens.warning, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Logout Button Card */}
          <View style={[styles.sectionCard, styles.logoutCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <TouchableOpacity
              onPress={() => {
                soundService.playPopSound();
                setLogoutVisible(true);
              }}
              style={styles.actionListItem}
            >
              <Text style={{ fontSize: 18, marginRight: 10 }}>🔴</Text>
              <Text style={[styles.actionListText, { color: tokens.error, fontWeight: '800' }]}>
                {t('logout')}
              </Text>
              <Text style={{ color: tokens.error, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Dialog */}
      <Portal>
        <Dialog
          visible={editProfileVisible}
          onDismiss={() => setEditProfileVisible(false)}
          style={[styles.dialog, { backgroundColor: isDark ? '#141624' : '#FFFFFF', borderColor: tokens.border }]}
        >
          <Dialog.Title style={{ color: tokens.text, fontWeight: '800' }}>Modifier mon profil</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nom ou Pseudo"
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              mode="outlined"
              style={{ marginTop: 6 }}
              textColor={tokens.text}
              disabled={updatingProfile}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditProfileVisible(false)} textColor={tokens.textSecondary}>
              Annuler
            </Button>
            <Button
              mode="contained"
              buttonColor={tokens.primary}
              textColor="#FFFFFF"
              onPress={handleSaveProfile}
              loading={updatingProfile}
            >
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Leave Group Dialog */}
        <Dialog
          visible={leaveGroupVisible}
          onDismiss={() => setLeaveGroupVisible(false)}
          style={[styles.dialog, { backgroundColor: isDark ? '#141624' : '#FFFFFF', borderColor: tokens.border }]}
        >
          <Dialog.Title style={{ color: tokens.text, fontWeight: '800' }}>Quitter la colocation</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: tokens.textSecondary, lineHeight: 22 }}>
              Êtes-vous certain de vouloir quitter "{group?.name || 'la colocation'}" ? Vos tâches et
              tours d'achat seront immédiatement réattribués.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLeaveGroupVisible(false)} textColor={tokens.textSecondary}>Annuler</Button>
            <Button
              textColor={tokens.warning}
              onPress={handleConfirmLeaveGroup}
              loading={leavingGroup}
            >
              Quitter
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Logout Dialog */}
        <Dialog
          visible={logoutVisible}
          onDismiss={() => setLogoutVisible(false)}
          style={[styles.dialog, { backgroundColor: isDark ? '#141624' : '#FFFFFF', borderColor: tokens.border }]}
        >
          <Dialog.Title style={{ color: tokens.text, fontWeight: '800' }}>Déconnexion</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: tokens.textSecondary }}>
              Voulez-vous vraiment vous déconnecter de ColocManager ?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutVisible(false)} textColor={tokens.textSecondary}>Annuler</Button>
            <Button
              textColor={tokens.error}
              onPress={handleConfirmLogout}
              loading={loggingOut}
            >
              Déconnexion
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Snackbar Feedback - floats cleanly above the bottom navigation bar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => {
          setSnackbarVisible(false);
          setSnackbarMessage(null);
        }}
        duration={3500}
        wrapperStyle={{ bottom: 88 + insets.bottom, zIndex: 99999 }}
        style={{
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.98)' : 'rgba(15, 23, 42, 0.96)',
          borderRadius: 18,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        {snackbarMessage || ''}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // space for floating bottom bar
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 28,
    marginTop: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  crownBadgeFloating: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 16,
    padding: 3,
  },
  userName: {
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  rolePill: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  rolePillText: {
    fontWeight: '800',
    fontSize: 12,
  },
  adminControlCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  superAdminPill: {
    marginLeft: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  superAdminPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  sectionCard: {
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    paddingVertical: 6,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  settingTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  subSettingTitle: {
    fontWeight: '700',
    fontSize: 13,
  },
  settingSub: {
    fontSize: 12,
    marginTop: 2,
  },
  actionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionListText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  logoutCard: {
    marginBottom: 24,
  },
  dialog: {
    borderRadius: 26,
    borderWidth: 1,
  },
});

export default ProfileScreen;
