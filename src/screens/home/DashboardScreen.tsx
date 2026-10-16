import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Avatar,
  Chip,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useShopping } from '../../hooks/useShopping';
import { useCleaning } from '../../hooks/useCleaning';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';
import { notificationService } from '../../services/notificationService';
import { NotificationBell } from '../../components/common/NotificationBell';
import { GroupMember, SystemBroadcast } from '../../types';
import { adminService } from '../../services/adminService';
import { getCurrentAssignee } from '../../utils/rotation';

const getMemberName = (uid: string, members: GroupMember[]): string => {
  const member = members.find((m) => m.userId === uid || m.id === uid);
  return member?.displayName || member?.email || 'Membre inconnu';
};

const formatDate = (dateValue?: string | Date | null): string => {
  if (!dateValue) return 'Date non définie';
  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return String(dateValue);
  }
};

const isOverdue = (dateValue?: string | Date | null): boolean => {
  if (!dateValue) return false;
  try {
    const due = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return due.getTime() < Date.now();
  } catch {
    return false;
  }
};

interface DashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

  const { user } = useAuth();
  const { group, members, loading: groupLoading } = useGroup();
  const {
    products = [],
    loading: shoppingLoading,
    markAsPurchased,
    fetchProducts,
  } = useShopping();
  const {
    tasks = [],
    loading: cleaningLoading,
    markAsDone,
    fetchTasks,
  } = useCleaning();

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const isAdmin =
    Boolean(user?.uid) &&
    (group?.adminUid === user?.uid ||
      members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin'));

  const adminMember = members.find(
    (m) => m.userId === group?.adminUid || m.id === group?.adminUid || m.role === 'admin'
  );
  const adminName = adminMember?.displayName || adminMember?.email || 'Admin';

  const [broadcasts, setBroadcasts] = useState<SystemBroadcast[]>([]);

  React.useEffect(() => {
    adminService.getBroadcasts().then((b) => {
      setBroadcasts(b.filter((item) => item.active));
    }).catch(() => {});
  }, []);

  // Check and generate reminder notifications in Firestore for user turns & due chores
  React.useEffect(() => {
    if (user?.uid && group?.id && (products.length > 0 || tasks.length > 0)) {
      notificationService.checkAndGenerateReminders(user.uid, group.id, products, tasks).catch(() => {});
    }
  }, [user?.uid, group?.id, products.length, tasks.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        fetchProducts ? fetchProducts() : Promise.resolve(),
        fetchTasks ? fetchTasks() : Promise.resolve(),
        adminService.getBroadcasts().then((b) => setBroadcasts(b.filter((item) => item.active))).catch(() => {}),
        user?.uid && group?.id
          ? notificationService.checkAndGenerateReminders(user.uid, group.id, products, tasks).catch(() => {})
          : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchProducts, fetchTasks, user?.uid, group?.id, products, tasks]);

  const myShoppingTasks = products.filter((p) => {
    if (!p.isActive || !p.rotationOrder || p.rotationOrder.length === 0) return false;
    const currentBuyerId = getCurrentAssignee(p.rotationOrder, p.currentTurnIndex ?? 0);
    return currentBuyerId === user?.uid;
  });

  const myCleaningTasks = tasks.filter((t) => {
    if (!t.isActive || !t.rotationOrder || t.rotationOrder.length === 0) return false;
    const currentCleanerId = getCurrentAssignee(t.rotationOrder, t.currentTurnIndex ?? 0);
    return currentCleanerId === user?.uid;
  });

  const totalMyTasks = myShoppingTasks.length + myCleaningTasks.length;

  const handleMarkPurchased = async (productId: string, productName: string) => {
    setActionLoadingId(productId);
    try {
      await markAsPurchased(productId);
      soundService.playPurchaseSound();
      setSnackbarMessage(`✓ Achat enregistré : "${productName}" !`);
      setSnackbarVisible(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'achat.";
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkCleaned = async (taskId: string, taskName: string) => {
    setActionLoadingId(taskId);
    try {
      await markAsDone(taskId);
      soundService.playTaskCompleteSound();
      setSnackbarMessage(`✓ Tâche validée : "${taskName}" !`);
      setSnackbarVisible(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la validation du ménage.';
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setActionLoadingId(null);
    }
  };

  const isLoading = (groupLoading || shoppingLoading || cleaningLoading) && !refreshing;

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[tokens.primary]}
          />
        }
      >
        <View style={[styles.contentWrapper, { paddingTop: Math.max(insets.top, 14) }]}>
          {/* Header Card with Notification Bell */}
          <View
            style={[
              styles.headerSurface,
              {
                backgroundColor: tokens.card,
                borderColor: tokens.border,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text variant="headlineSmall" style={[styles.groupName, { color: tokens.primary }]} numberOfLines={1}>
                  {group?.name || 'Ma Colocation'}
                </Text>
                <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginTop: 2 }}>
                  {t('greeting')} {user?.displayName || t('roommate')} 👋
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Notification Bell with red dot */}
                <NotificationBell />

                <TouchableOpacity
                  onPress={() => {
                    soundService.playPopSound();
                    navigation.navigate('Profile');
                  }}
                  activeOpacity={0.8}
                  style={styles.avatarButton}
                >
                  <Avatar.Text
                    size={38}
                    label={(user?.displayName || 'U').charAt(0).toUpperCase()}
                    style={{ backgroundColor: isAdmin ? tokens.adminGold : tokens.primary }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* System Broadcast Announcements */}
            {broadcasts.map((b) => {
              const borderColors = {
                info: tokens.primary,
                warning: '#F59E0B',
                urgent: tokens.error,
              };
              const bgColors = {
                info: isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(10, 132, 255, 0.1)',
                warning: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                urgent: isDark ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255, 69, 58, 0.1)',
              };
              const icons = {
                info: '📢',
                warning: '⚠️',
                urgent: '🚨',
              };

              return (
                <View
                  key={b.id}
                  style={[
                    styles.broadcastBanner,
                    {
                      backgroundColor: bgColors[b.level] || bgColors.info,
                      borderColor: borderColors[b.level] || borderColors.info,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 18, marginRight: 8 }}>{icons[b.level] || '📢'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="labelMedium" style={{ fontWeight: '900', color: tokens.text }}>
                      {b.title}
                    </Text>
                    <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginTop: 2 }}>
                      {b.message}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Admin or Member Role Banner */}
            <View style={styles.roleBannerRow}>
              <View
                style={[
                  styles.roleBanner,
                  {
                    backgroundColor: isAdmin ? 'rgba(255, 214, 10, 0.16)' : 'rgba(150, 150, 150, 0.12)',
                    borderColor: isAdmin ? tokens.adminGold : tokens.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleBannerText,
                    { color: isAdmin ? (isDark ? '#FDE68A' : '#B45309') : tokens.textSecondary },
                  ]}
                >
                  {isAdmin
                    ? t('adminBadge')
                    : `${t('memberBadge')} (Admin : ${adminName})`}
                </Text>
              </View>
            </View>
          </View>

          {/* Admin Quick Action Hub */}
          {isAdmin && (
            <View
              style={[
                styles.adminHubCard,
                {
                  backgroundColor: isDark ? 'rgba(255, 214, 10, 0.08)' : 'rgba(255, 214, 10, 0.1)',
                  borderColor: tokens.adminGold,
                },
              ]}
            >
              <View style={styles.adminHubHeader}>
                <Text style={{ fontSize: 18, marginRight: 6 }}>⚡</Text>
                <Text style={[styles.adminHubTitle, { color: isDark ? '#FDE68A' : '#B45309' }]}>
                  {t('adminQuickActions')}
                </Text>
              </View>
              <View style={styles.adminHubButtons}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.hubActionCard,
                    {
                      backgroundColor: isDark ? 'rgba(10, 132, 255, 0.16)' : '#EFF6FF',
                      borderColor: isDark ? 'rgba(10, 132, 255, 0.35)' : '#BFDBFE',
                    },
                  ]}
                  onPress={() => {
                    soundService.playPopSound();
                    navigation.navigate('Shopping', { screen: 'AddProduct' });
                  }}
                >
                  <Text style={styles.hubActionIcon}>🛒</Text>
                  <Text style={[styles.hubActionLabel, { color: tokens.primary }]}>
                    + {t('newProduct')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.hubActionCard,
                    {
                      backgroundColor: isDark ? 'rgba(175, 82, 222, 0.16)' : '#FAF5FF',
                      borderColor: isDark ? 'rgba(175, 82, 222, 0.35)' : '#E9D5FF',
                    },
                  ]}
                  onPress={() => {
                    soundService.playPopSound();
                    navigation.navigate('Cleaning', { screen: 'AddCleaningTask' });
                  }}
                >
                  <Text style={styles.hubActionIcon}>🧹</Text>
                  <Text style={[styles.hubActionLabel, { color: tokens.secondary }]}>
                    + {t('newChore')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.hubActionCard,
                    {
                      backgroundColor: isDark ? 'rgba(255, 214, 10, 0.14)' : '#FEFCE8',
                      borderColor: isDark ? 'rgba(255, 214, 10, 0.3)' : '#FEF08A',
                    },
                  ]}
                  onPress={() => {
                    soundService.playPopSound();
                    navigation.navigate('Profile', { screen: 'ManageMembers' });
                  }}
                >
                  <Text style={styles.hubActionIcon}>👥</Text>
                  <Text style={[styles.hubActionLabel, { color: isDark ? '#FDE68A' : '#B45309' }]}>
                    {t('membersBtn')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Global Summary Cards */}
          <View style={styles.summaryContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                soundService.playPopSound();
                navigation.navigate('Shopping');
              }}
              style={[
                styles.summaryCard,
                {
                  backgroundColor: isDark ? 'rgba(48, 209, 88, 0.14)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(48, 209, 88, 0.3)' : '#A7F3D0',
                },
              ]}
            >
              <Text style={styles.summaryIcon}>🛒</Text>
              <View style={{ flex: 1 }}>
                <Text variant="headlineMedium" style={[styles.summaryNumber, { color: tokens.text }]}>
                  {myShoppingTasks.length}
                </Text>
                <Text variant="bodySmall" style={{ color: tokens.textSecondary, fontWeight: '700' }} numberOfLines={1}>
                  {myShoppingTasks.length > 1 ? t('groceriesPlural') : t('groceriesToDo')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                soundService.playPopSound();
                navigation.navigate('Cleaning');
              }}
              style={[
                styles.summaryCard,
                {
                  backgroundColor: isDark ? 'rgba(10, 132, 255, 0.14)' : '#F0F9FF',
                  borderColor: isDark ? 'rgba(10, 132, 255, 0.3)' : '#BAE6FD',
                },
              ]}
            >
              <Text style={styles.summaryIcon}>🧹</Text>
              <View style={{ flex: 1 }}>
                <Text variant="headlineMedium" style={[styles.summaryNumber, { color: tokens.text }]}>
                  {myCleaningTasks.length}
                </Text>
                <Text variant="bodySmall" style={{ color: tokens.textSecondary, fontWeight: '700' }} numberOfLines={1}>
                  {myCleaningTasks.length > 1 ? t('cleaningScheduledPlural') : t('cleaningScheduled')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* My Tasks Section Header */}
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: tokens.text }]}>
              {t('pendingTurns')}
            </Text>
            {totalMyTasks > 0 && (
              <Chip
                compact
                style={{ backgroundColor: tokens.primary, borderRadius: 12 }}
                textStyle={{ color: '#FFFFFF', fontWeight: '800' }}
              >
                {totalMyTasks}
              </Chip>
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 32 }} size="large" color={tokens.primary} />
          ) : totalMyTasks === 0 ? (
            <View
              style={[
                styles.emptyStateCard,
                {
                  backgroundColor: tokens.card,
                  borderColor: tokens.border,
                },
              ]}
            >
              <Text style={{ fontSize: 44, marginBottom: 8 }}>🎉</Text>
              <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
                {t('allUpToDate')}
              </Text>
              <Text variant="bodySmall" style={{ color: tokens.textSecondary, textAlign: 'center', marginTop: 4 }}>
                {t('allUpToDateSub')}
              </Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {/* My Shopping Items */}
              {myShoppingTasks.map((item) => {
                const isActionRunning = actionLoadingId === item.id;
                return (
                  <View
                    key={`shop-${item.id}`}
                    style={[
                      styles.taskCard,
                      {
                        backgroundColor: tokens.card,
                        borderColor: tokens.border,
                      },
                    ]}
                  >
                    <View style={styles.taskCardContent}>
                      <View style={styles.taskLeft}>
                        <Text style={styles.taskIcon}>{item.icon || '📦'}</Text>
                        <View style={styles.taskInfo}>
                          <Text variant="titleMedium" style={[styles.taskTitle, { color: tokens.text }]}>
                            {item.name}
                          </Text>
                          <Text variant="bodySmall" style={{ color: tokens.success, fontWeight: '700', marginTop: 2 }}>
                            🛒 {t('yourTurnToBuy')}
                          </Text>
                        </View>
                      </View>
                      <Button
                        mode="contained"
                        buttonColor={tokens.success}
                        textColor="#FFFFFF"
                        loading={isActionRunning}
                        disabled={isActionRunning}
                        onPress={() => handleMarkPurchased(item.id, item.name)}
                        style={styles.doneButton}
                        labelStyle={styles.doneButtonLabel}
                      >
                        {t('bought')}
                      </Button>
                    </View>
                  </View>
                );
              })}

              {/* My Cleaning Items */}
              {myCleaningTasks.map((task) => {
                const overdue = isOverdue(task.nextDueDate);
                const isActionRunning = actionLoadingId === task.id;
                return (
                  <View
                    key={`clean-${task.id}`}
                    style={[
                      styles.taskCard,
                      {
                        backgroundColor: tokens.card,
                        borderColor: overdue ? tokens.error : tokens.border,
                      },
                    ]}
                  >
                    <View style={styles.taskCardContent}>
                      <View style={styles.taskLeft}>
                        <Text style={styles.taskIcon}>🧹</Text>
                        <View style={styles.taskInfo}>
                          <Text variant="titleMedium" style={[styles.taskTitle, { color: tokens.text }]}>
                            {task.name}
                          </Text>
                          <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginTop: 2 }}>
                            {t('areaLabel')} : {task.area}
                          </Text>
                          <Text
                            variant="labelSmall"
                            style={{
                              color: overdue ? tokens.error : tokens.textSecondary,
                              fontWeight: overdue ? '800' : '600',
                              marginTop: 2,
                            }}
                          >
                            {overdue ? t('overdue') + ' ' : `📅 ${t('dueDate')} `}
                            {formatDate(task.nextDueDate)}
                          </Text>
                        </View>
                      </View>
                      <Button
                        mode="contained"
                        buttonColor={overdue ? tokens.error : tokens.primary}
                        textColor="#FFFFFF"
                        loading={isActionRunning}
                        disabled={isActionRunning}
                        onPress={() => handleMarkCleaned(task.id, task.name)}
                        style={styles.doneButton}
                        labelStyle={styles.doneButtonLabel}
                      >
                        {t('done')}
                      </Button>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Snackbar feedback - floats cleanly above the bottom navigation bar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => {
          setSnackbarVisible(false);
          setSnackbarMessage(null);
        }}
        duration={3200}
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
    paddingBottom: 110, // space for floating bottom bar
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  headerSurface: {
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderRadius: 26,
    marginTop: 8,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupName: {
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  avatarButton: {
    padding: 2,
    marginLeft: 8,
  },
  roleBannerRow: {
    marginTop: 8,
  },
  roleBanner: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  roleBannerText: {
    fontWeight: '800',
    fontSize: 12,
  },
  adminHubCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1.2,
  },
  adminHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  adminHubTitle: {
    fontWeight: '900',
    fontSize: 13,
  },
  adminHubButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  broadcastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 10,
  },
  hubActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1.2,
  },
  hubActionIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  hubActionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  summaryContainer: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  summaryIcon: {
    fontSize: 30,
    marginRight: 10,
  },
  summaryNumber: {
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontWeight: '900',
  },
  emptyStateCard: {
    marginTop: 4,
    padding: 28,
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1.2,
  },
  tasksList: {
    gap: 10,
  },
  taskCard: {
    borderRadius: 22,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  taskIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontWeight: '800',
  },
  doneButton: {
    borderRadius: 16,
  },
  doneButtonLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
});

export default DashboardScreen;
