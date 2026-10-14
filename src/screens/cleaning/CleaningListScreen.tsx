import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  FAB,
  Chip,
  Surface,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useCleaning } from '../../hooks/useCleaning';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { CleaningTask, GroupMember } from '../../types';

/**
 * Resolves a user ID to a member display name.
 */
const getMemberName = (uid: string, members: GroupMember[]): string => {
  const member = members.find((m) => m.userId === uid || m.id === uid);
  return member?.displayName || member?.email || 'Membre';
};

/**
 * Formats ISO date string to localized readable format.
 */
const formatDate = (dateValue?: string | Date | null): string => {
  if (!dateValue) return 'Non définie';
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
 * Determines whether a task due date has passed.
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

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdo',
  biweekly: 'Bi-hebdo',
  monthly: 'Mensuel',
};

interface CleaningListScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

/**
 * Cleaning list screen displaying scheduled recurring chores,
 * assignment rotation order, and completion action triggers.
 */
export const CleaningListScreen: React.FC<CleaningListScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { group, members } = useGroup();
  const {
    tasks = [],
    loading,
    error: cleaningError,
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

  /**
   * Refreshes the chores list.
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (fetchTasks) {
        await fetchTasks();
      }
    } finally {
      setRefreshing(false);
    }
  }, [fetchTasks]);

  /**
   * Dispatches mark-as-completed for a given cleaning task.
   */
  const handleMarkCleaned = async (taskId: string, taskName: string) => {
    setActionLoadingId(taskId);
    try {
      await markAsDone(taskId);
      setSnackbarMessage(`✓ Nettoyage validé : "${taskName}" ! Le tour passe au colocataire suivant.`);
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

  /**
   * Renders an individual cleaning task card.
   */
  const renderCleaningItem = ({ item }: { item: CleaningTask }) => {
    const rotationList = item.rotationOrder || [];
    const currentCleanerUid =
      rotationList.length > 0 ? rotationList[item.currentTurnIndex % rotationList.length] : null;

    const isMyTurn = currentCleanerUid === user?.uid;
    const currentCleanerName = currentCleanerUid
      ? isMyTurn
        ? 'Vous'
        : getMemberName(currentCleanerUid, members)
      : 'Personne';

    const overdue = isOverdue(item.nextDueDate);
    const isActionRunning = actionLoadingId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('CleaningDetail', { taskId: item.id })}
      >
        <Surface
          style={[
            styles.taskCard,
            overdue && styles.overdueCard,
            isMyTurn && !overdue && styles.myTurnCard,
          ]}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.areaIcon}>🧹</Text>
            <View style={styles.titleInfo}>
              <View style={styles.nameBadgeRow}>
                <Text variant="titleMedium" style={styles.taskName}>
                  {item.name}
                </Text>
                <Chip compact style={styles.frequencyChip} textStyle={{ fontSize: 11, fontWeight: '700' }}>
                  {FREQUENCY_LABELS[item.frequency] || item.frequency}
                </Chip>
              </View>
              <Text variant="bodySmall" style={styles.areaText}>
                Zone : {item.area || 'Parties communes'}
              </Text>
            </View>
          </View>

          {/* Turn and Due Date Status */}
          <View style={styles.statusRow}>
            <View style={styles.assigneeContainer}>
              <Text variant="bodySmall" style={styles.assigneeLabel}>
                Tour actuel :
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.assigneeName,
                  isMyTurn && styles.myTurnText,
                ]}
              >
                {currentCleanerName} {isMyTurn ? '👈 (À toi !)' : ''}
              </Text>
            </View>

            <View style={styles.dateContainer}>
              <Text
                variant="bodySmall"
                style={[styles.dueDateText, overdue && styles.overdueDateText]}
              >
                {overdue ? '⚠️ En retard !' : '📅 Échéance :'}
              </Text>
              <Text
                variant="bodySmall"
                style={[styles.dueDateText, overdue && styles.overdueDateText]}
              >
                {formatDate(item.nextDueDate)}
              </Text>
            </View>
          </View>

          {/* Action Row */}
          {isMyTurn && (
            <View style={styles.actionRow}>
              <Button
                mode="contained"
                buttonColor={overdue ? colors.error : colors.primary}
                loading={isActionRunning}
                disabled={isActionRunning}
                onPress={() => handleMarkCleaned(item.id, item.name)}
                style={styles.doneButton}
                labelStyle={styles.doneButtonLabel}
              >
                FAIT ✓
              </Button>
            </View>
          )}
        </Surface>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Admin Action Bar */}
        {isAdmin && (
          <Surface style={styles.adminBar}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={styles.adminBarTitle}>👑 Administration Nettoyage</Text>
              <Text style={styles.adminBarSub}>
                Créez des corvées récurrentes et gérez les attributions.
              </Text>
            </View>
            <Button
              mode="contained"
              buttonColor={colors.secondary}
              compact
              style={styles.addBtnTop}
              labelStyle={{ fontSize: 12, fontWeight: '700' }}
              onPress={() => navigation.navigate('AddCleaningTask')}
            >
              + Ménage
            </Button>
          </Surface>
        )}

        {/* Cleaning Tasks FlatList */}
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderCleaningItem}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.secondary]}
            />
          }
          ListEmptyComponent={
            loading && !refreshing ? (
              <ActivityIndicator style={styles.centered} size="large" color={colors.secondary} />
            ) : (
              <Surface style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>✨</Text>
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  Aucune tâche de ménage
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtitle}>
                  {isAdmin
                    ? "Appuyez sur '+ Ménage' pour définir le planning d'entretien (cuisine, poubelles, salle de bain, etc.)."
                    : "Aucune tâche configurée. L'administrateur peut en créer."}
                </Text>
                {isAdmin && (
                  <Button
                    mode="contained"
                    buttonColor={colors.secondary}
                    style={{ marginTop: spacing.md, borderRadius: borderRadius.md }}
                    onPress={() => navigation.navigate('AddCleaningTask')}
                  >
                    + Créer une tâche de ménage
                  </Button>
                )}
              </Surface>
            )
          }
        />
      </View>

      {/* Floating Action Button for Admin */}
      {isAdmin && (
        <FAB
          icon="plus"
          label="Nouvelle tâche"
          style={styles.fab}
          color="#FFFFFF"
          onPress={() => navigation.navigate('AddCleaningTask')}
        />
      )}

      {/* Snackbar feedback */}
      <Snackbar
        visible={snackbarVisible || Boolean(cleaningError)}
        onDismiss={() => {
          setSnackbarVisible(false);
          setSnackbarMessage(null);
        }}
        duration={3500}
        style={styles.snackbar}
      >
        {snackbarMessage || cleaningError || ''}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  adminBar: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#E0F2FE',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
  },
  adminBarTitle: {
    fontWeight: '800',
    color: colors.secondary,
    fontSize: 13,
  },
  adminBarSub: {
    color: '#334155',
    fontSize: 12,
    marginTop: 2,
  },
  addBtnTop: {
    borderRadius: borderRadius.md,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 3,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overdueCard: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  myTurnCard: {
    borderColor: colors.secondary,
    backgroundColor: '#F0F9FF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  areaIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  titleInfo: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskName: {
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.xs,
  },
  frequencyChip: {
    backgroundColor: '#F1F5F9',
  },
  areaText: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  assigneeContainer: {
    flex: 1,
  },
  assigneeLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  assigneeName: {
    fontWeight: '800',
    color: colors.text,
  },
  myTurnText: {
    color: colors.secondary,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dueDateText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  overdueDateText: {
    color: colors.error,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  doneButton: {
    borderRadius: borderRadius.md,
  },
  doneButtonLabel: {
    fontWeight: '800',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.full,
  },
  centered: {
    marginTop: spacing.xl,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    elevation: 1,
  },
  emptyIcon: {
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
    paddingHorizontal: spacing.md,
    lineHeight: 20,
  },
  snackbar: {
    backgroundColor: colors.text,
  },
});

export default CleaningListScreen;
