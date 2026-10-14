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
  Surface,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useShopping } from '../../hooks/useShopping';
import { useCleaning } from '../../hooks/useCleaning';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { GroupMember } from '../../types';

/**
 * Resolves a user ID to a member display name.
 */
const getMemberName = (uid: string, members: GroupMember[]): string => {
  const member = members.find((m) => m.userId === uid || m.id === uid);
  return member?.displayName || member?.email || 'Membre inconnu';
};

/**
 * Formats ISO date string to localized readable date.
 */
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

/**
 * Determines whether a due date has passed.
 */
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

/**
 * Main dashboard screen displaying group overview, task summaries,
 * and pending chores/purchases directly assigned to the current user.
 */
export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
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

  // Check admin privileges
  const isAdmin =
    Boolean(user?.uid) &&
    (group?.adminUid === user?.uid ||
      members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin'));

  // Admin name
  const adminMember = members.find(
    (m) => m.userId === group?.adminUid || m.id === group?.adminUid || m.role === 'admin'
  );
  const adminName = adminMember?.displayName || adminMember?.email || 'Admin';

  /**
   * Refreshes dashboard data feeds.
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        fetchProducts ? fetchProducts() : Promise.resolve(),
        fetchTasks ? fetchTasks() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchProducts, fetchTasks]);

  // Determine user tasks
  const myShoppingTasks = products.filter((p) => {
    if (!p.isActive || !p.rotationOrder || p.rotationOrder.length === 0) return false;
    const currentBuyerId = p.rotationOrder[p.currentTurnIndex % p.rotationOrder.length];
    return currentBuyerId === user?.uid;
  });

  const myCleaningTasks = tasks.filter((t) => {
    if (!t.isActive || !t.rotationOrder || t.rotationOrder.length === 0) return false;
    const currentCleanerId = t.rotationOrder[t.currentTurnIndex % t.rotationOrder.length];
    return currentCleanerId === user?.uid;
  });

  const totalMyTasks = myShoppingTasks.length + myCleaningTasks.length;

  /**
   * Quickly marks a shopping item as purchased.
   */
  const handleMarkPurchased = async (productId: string, productName: string) => {
    setActionLoadingId(productId);
    try {
      await markAsPurchased(productId);
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

  /**
   * Quickly marks a cleaning task as completed.
   */
  const handleMarkCleaned = async (taskId: string, taskName: string) => {
    setActionLoadingId(taskId);
    try {
      await markAsDone(taskId);
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
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.contentWrapper}>
          {/* Header Card with Coloc & Profile shortcut */}
          <Surface style={styles.headerSurface}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <Text variant="headlineSmall" style={styles.groupName} numberOfLines={1}>
                  {group?.name || 'Ma Colocation'}
                </Text>
                <Text variant="bodySmall" style={styles.greetingSub}>
                  Bonjour {user?.displayName || 'coloc'} 👋
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.8}
                style={styles.avatarButton}
              >
                <Avatar.Text
                  size={42}
                  label={(user?.displayName || 'U').charAt(0).toUpperCase()}
                  style={styles.avatar}
                />
              </TouchableOpacity>
            </View>

            {/* Admin Badge Banner */}
            <View style={styles.roleBannerRow}>
              <Surface
                style={[
                  styles.roleBanner,
                  isAdmin ? styles.adminBanner : styles.memberBanner,
                ]}
              >
                <Text
                  style={[
                    styles.roleBannerText,
                    isAdmin ? styles.adminBannerText : styles.memberBannerText,
                  ]}
                >
                  {isAdmin
                    ? "👑 Vous êtes Administrateur"
                    : `👤 Colocataire (Admin : ${adminName})`}
                </Text>
              </Surface>
            </View>
          </Surface>

          {/* Admin Quick Action Hub */}
          {isAdmin && (
            <Surface style={styles.adminHubCard}>
              <View style={styles.adminHubHeader}>
                <Text style={{ fontSize: 18, marginRight: spacing.xs }}>⚡</Text>
                <Text style={styles.adminHubTitle}>Actions Rapides Admin</Text>
              </View>
              <View style={styles.adminHubButtons}>
                <Button
                  mode="contained"
                  buttonColor={colors.primary}
                  compact
                  style={styles.hubBtn}
                  labelStyle={styles.hubBtnLabel}
                  onPress={() => navigation.navigate('Shopping', { screen: 'AddProduct' })}
                >
                  + Produit
                </Button>
                <Button
                  mode="contained"
                  buttonColor={colors.secondary}
                  compact
                  style={styles.hubBtn}
                  labelStyle={styles.hubBtnLabel}
                  onPress={() => navigation.navigate('Cleaning', { screen: 'AddCleaningTask' })}
                >
                  + Ménage
                </Button>
                <Button
                  mode="outlined"
                  compact
                  style={[styles.hubBtn, styles.hubBtnOutline]}
                  labelStyle={styles.hubBtnLabel}
                  onPress={() => navigation.navigate('Profile', { screen: 'ManageMembers' })}
                >
                  👥 Membres
                </Button>
              </View>
            </Surface>
          )}

          {/* Global Summary Cards */}
          <View style={styles.summaryContainer}>
            <Card
              style={[styles.summaryCard, styles.shoppingSummaryCard]}
              onPress={() => navigation.navigate('Shopping')}
              mode="elevated"
            >
              <Card.Content style={styles.summaryCardContent}>
                <Text style={styles.summaryIcon}>🛒</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="headlineMedium" style={styles.summaryNumber}>
                    {myShoppingTasks.length}
                  </Text>
                  <Text variant="bodySmall" style={styles.summaryLabel} numberOfLines={1}>
                    {myShoppingTasks.length > 1 ? 'Courses à faire' : 'Course à faire'}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            <Card
              style={[styles.summaryCard, styles.cleaningSummaryCard]}
              onPress={() => navigation.navigate('Cleaning')}
              mode="elevated"
            >
              <Card.Content style={styles.summaryCardContent}>
                <Text style={styles.summaryIcon}>🧹</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="headlineMedium" style={styles.summaryNumber}>
                    {myCleaningTasks.length}
                  </Text>
                  <Text variant="bodySmall" style={styles.summaryLabel} numberOfLines={1}>
                    {myCleaningTasks.length > 1 ? 'Ménages prévus' : 'Ménage prévu'}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </View>

          {/* My Tasks Section Header */}
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Tes tours en attente
            </Text>
            {totalMyTasks > 0 && (
              <Chip compact style={styles.counterChip} textStyle={{ color: '#FFFFFF', fontWeight: '800' }}>
                {totalMyTasks}
              </Chip>
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator style={styles.centered} size="large" color={colors.primary} />
          ) : totalMyTasks === 0 ? (
            <Surface style={styles.emptyStateCard}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text variant="titleMedium" style={styles.emptyTitle}>
                Tout est à jour !
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtitle}>
                Aucune corvée ni course ne repose sur toi actuellement.
              </Text>
            </Surface>
          ) : (
            <View style={styles.tasksList}>
              {/* My Shopping Items */}
              {myShoppingTasks.map((item) => {
                const isActionRunning = actionLoadingId === item.id;
                return (
                  <Surface key={`shop-${item.id}`} style={styles.taskCard}>
                    <View style={styles.taskCardContent}>
                      <View style={styles.taskLeft}>
                        <Text style={styles.taskIcon}>{item.icon || '📦'}</Text>
                        <View style={styles.taskInfo}>
                          <Text variant="titleMedium" style={styles.taskTitle}>
                            {item.name}
                          </Text>
                          <Text variant="bodySmall" style={styles.taskTagShop}>
                            🛒 C'est votre tour d'acheter
                          </Text>
                        </View>
                      </View>
                      <Button
                        mode="contained"
                        buttonColor={colors.success}
                        loading={isActionRunning}
                        disabled={isActionRunning}
                        onPress={() => handleMarkPurchased(item.id, item.name)}
                        style={styles.doneButton}
                        labelStyle={styles.doneButtonLabel}
                      >
                        Acheté ✓
                      </Button>
                    </View>
                  </Surface>
                );
              })}

              {/* My Cleaning Items */}
              {myCleaningTasks.map((task) => {
                const overdue = isOverdue(task.nextDueDate);
                const isActionRunning = actionLoadingId === task.id;
                return (
                  <Surface
                    key={`clean-${task.id}`}
                    style={[styles.taskCard, overdue && styles.overdueBorder]}
                  >
                    <View style={styles.taskCardContent}>
                      <View style={styles.taskLeft}>
                        <Text style={styles.taskIcon}>🧹</Text>
                        <View style={styles.taskInfo}>
                          <Text variant="titleMedium" style={styles.taskTitle}>
                            {task.name}
                          </Text>
                          <Text variant="bodySmall" style={styles.taskArea}>
                            Zone : {task.area}
                          </Text>
                          <Text
                            variant="labelSmall"
                            style={[styles.dueDateText, overdue && styles.overdueText]}
                          >
                            {overdue ? '⚠️ En retard ! Échéance : ' : '📅 Échéance : '}
                            {formatDate(task.nextDueDate)}
                          </Text>
                        </View>
                      </View>
                      <Button
                        mode="contained"
                        buttonColor={colors.primary}
                        loading={isActionRunning}
                        disabled={isActionRunning}
                        onPress={() => handleMarkCleaned(task.id, task.name)}
                        style={styles.doneButton}
                        labelStyle={styles.doneButtonLabel}
                      >
                        Fait ✓
                      </Button>
                    </View>
                  </Surface>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Snackbar feedback */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => {
          setSnackbarVisible(false);
          setSnackbarMessage(null);
        }}
        duration={3000}
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
  headerSurface: {
    backgroundColor: colors.surface,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupName: {
    fontWeight: '800',
    color: colors.primary,
  },
  greetingSub: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  avatarButton: {
    padding: 2,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  roleBannerRow: {
    marginTop: spacing.sm,
  },
  roleBanner: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    elevation: 0,
  },
  roleBannerText: {
    fontSize: 12,
  },
  adminBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  adminBannerText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 12,
  },
  memberBanner: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberBannerText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  adminHubCard: {
    backgroundColor: '#EEF2FF',
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    elevation: 1,
  },
  adminHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  adminHubTitle: {
    fontWeight: '800',
    color: colors.primary,
    fontSize: 14,
  },
  adminHubButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  hubBtn: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  hubBtnOutline: {
    borderColor: colors.primary,
  },
  hubBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 0,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  shoppingSummaryCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  cleaningSummaryCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  summaryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  summaryIcon: {
    fontSize: 32,
    marginRight: spacing.sm,
  },
  summaryNumber: {
    fontWeight: '800',
    color: colors.text,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontWeight: '800',
    color: colors.text,
  },
  counterChip: {
    backgroundColor: colors.primary,
  },
  emptyStateCard: {
    marginTop: spacing.xs,
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    elevation: 1,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tasksList: {
    gap: spacing.sm,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overdueBorder: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  taskIcon: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  taskTagShop: {
    color: colors.success,
    fontWeight: '700',
    marginTop: 2,
  },
  taskArea: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  dueDateText: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  overdueText: {
    color: colors.error,
    fontWeight: '700',
  },
  doneButton: {
    borderRadius: borderRadius.md,
  },
  doneButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  centered: {
    marginTop: spacing.xl,
  },
  snackbar: {
    backgroundColor: colors.text,
  },
});

export default DashboardScreen;
