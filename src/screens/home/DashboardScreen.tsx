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
import { GroupMember, Product, CleaningTask } from '../../types';

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
        err instanceof Error ? err.message : "Erreur lors de la validation du ménage.";
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header with Group Name */}
        <Surface style={styles.headerSurface}>
          <View style={styles.headerRow}>
            <View>
              <Text variant="headlineSmall" style={styles.groupName}>
                {group?.name || 'Ma Colocation'}
              </Text>
              <Text variant="bodySmall" style={styles.greetingSub}>
                Bonjour {user?.displayName || 'colocataire'} 👋
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Avatar.Text
                size={40}
                label={(user?.displayName || 'U').charAt(0).toUpperCase()}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </Surface>

        {/* Global Summary Cards */}
        <View style={styles.summaryContainer}>
          <Card
            style={[styles.summaryCard, styles.shoppingSummaryCard]}
            onPress={() => navigation.navigate('Shopping')}
          >
            <Card.Content style={styles.summaryCardContent}>
              <Text style={styles.summaryIcon}>🛒</Text>
              <View>
                <Text variant="headlineMedium" style={styles.summaryNumber}>
                  {myShoppingTasks.length}
                </Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  {myShoppingTasks.length > 1 ? 'Courses à faire' : 'Course à faire'}
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card
            style={[styles.summaryCard, styles.cleaningSummaryCard]}
            onPress={() => navigation.navigate('Cleaning')}
          >
            <Card.Content style={styles.summaryCardContent}>
              <Text style={styles.summaryIcon}>🧹</Text>
              <View>
                <Text variant="headlineMedium" style={styles.summaryNumber}>
                  {myCleaningTasks.length}
                </Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  {myCleaningTasks.length > 1 ? 'Ménages prévus' : 'Ménage prévu'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* My Tasks Section */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Tes tâches en attente
          </Text>
          {totalMyTasks > 0 && (
            <Chip compact style={styles.counterChip}>
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
              Aucune tâche en attente !
            </Text>
            <Text variant="bodySmall" style={styles.emptySubtitle}>
              Vous êtes totalement à jour. Profitez bien de votre colocation !
            </Text>
          </Surface>
        ) : (
          <View style={styles.tasksList}>
            {/* My Shopping Items */}
            {myShoppingTasks.map((item) => {
              const isActionRunning = actionLoadingId === item.id;
              return (
                <Card key={`shop-${item.id}`} style={styles.taskCard}>
                  <Card.Content style={styles.taskCardContent}>
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
                  </Card.Content>
                </Card>
              );
            })}

            {/* My Cleaning Items */}
            {myCleaningTasks.map((task) => {
              const overdue = isOverdue(task.nextDueDate);
              const isActionRunning = actionLoadingId === task.id;
              return (
                <Card
                  key={`clean-${task.id}`}
                  style={[styles.taskCard, overdue && styles.overdueBorder]}
                >
                  <Card.Content style={styles.taskCardContent}>
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
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}
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
    paddingBottom: spacing.xl,
  },
  headerSurface: {
    backgroundColor: colors.surface,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    elevation: 2,
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
  avatar: {
    backgroundColor: colors.secondary,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    elevation: 2,
  },
  shoppingSummaryCard: {
    backgroundColor: '#E8F5E9',
  },
  cleaningSummaryCard: {
    backgroundColor: '#E3F2FD',
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
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  counterChip: {
    backgroundColor: colors.primary,
  },
  emptyStateCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
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
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    elevation: 1,
  },
  overdueBorder: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
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
    fontWeight: '600',
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
