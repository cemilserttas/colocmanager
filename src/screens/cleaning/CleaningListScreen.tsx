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
  return member?.displayName || member?.email || 'Membre inconnu';
};

/**
 * Maps task area string to a visual emoji icon.
 */
const getAreaIcon = (area: string): string => {
  const lower = (area || '').toLowerCase();
  if (lower.includes('cuisine')) return '🍳';
  if (lower.includes('bain') || lower.includes('douche')) return '🚿';
  if (lower.includes('salon') || lower.includes('séjour')) return '🛋️';
  if (lower.includes('wc') || lower.includes('toilette')) return '🚽';
  if (lower.includes('couloir') || lower.includes('entrée')) return '🚪';
  if (lower.includes('poubelle')) return '🗑️';
  return '🧹';
};

/**
 * Formats frequency enum to French label.
 */
const formatFrequency = (freq: string): string => {
  switch (freq) {
    case 'weekly':
      return 'Hebdo';
    case 'biweekly':
      return 'Bi-hebdo';
    case 'monthly':
      return 'Mensuel';
    default:
      return freq;
  }
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
 * Checks if a task due date is expired.
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

interface CleaningListScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

/**
 * Screen displaying shared household chores, due dates, turn rotations,
 * overdue warnings, and completion triggers.
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
    group?.adminUid === user?.uid ||
    members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin');

  /**
   * Refreshes chore tasks list.
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
   * Marks a cleaning chore as completed.
   */
  const handleMarkDone = async (taskId: string, taskName: string) => {
    setActionLoadingId(taskId);
    try {
      await markAsDone(taskId);
      setSnackbarMessage(`✓ Tâche terminée : "${taskName}" !`);
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
   * Renders each individual chore item card.
   */
  const renderTaskItem = ({ item }: { item: CleaningTask }) => {
    const rotationList = item.rotationOrder || [];
    const currentCleanerUid =
      rotationList.length > 0 ? rotationList[item.currentTurnIndex % rotationList.length] : null;

    const isMyTurn = currentCleanerUid === user?.uid;
    const cleanerName = currentCleanerUid
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
          {/* Card Top Row */}
          <View style={styles.cardHeader}>
            <Text style={styles.areaIcon}>{getAreaIcon(item.area)}</Text>
            <View style={styles.titleInfo}>
              <View style={styles.nameBadgeRow}>
                <Text variant="titleMedium" style={styles.taskName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Chip compact style={styles.frequencyChip}>
                  {formatFrequency(item.frequency)}
                </Chip>
              </View>

              <Text variant="bodySmall" style={styles.areaText}>
                Zone : {item.area}
              </Text>
            </View>
          </View>

          {/* Responsible Person and Due Date */}
          <View style={styles.statusRow}>
            <View style={styles.assigneeContainer}>
              <Text variant="bodyMedium" style={styles.assigneeLabel}>
                Responsable :{' '}
                <Text
                  style={[
                    styles.assigneeName,
                    isMyTurn && styles.myTurnText,
                  ]}
                >
                  {cleanerName}
                </Text>
              </Text>
            </View>

            <View style={styles.dateContainer}>
              <Text
                variant="bodySmall"
                style={[styles.dueDateText, overdue && styles.overdueDateText]}
              >
                {overdue ? '⚠️ ' : '📅 '}
                {formatDate(item.nextDueDate)}
              </Text>
            </View>
          </View>

          {/* Action Button if user's turn */}
          {isMyTurn && (
            <View style={styles.actionRow}>
              {overdue && (
                <Text variant="labelSmall" style={styles.overdueAlertLabel}>
                  En retard !
                </Text>
              )}
              <Button
                mode="contained"
                buttonColor={overdue ? colors.error : colors.primary}
                loading={isActionRunning}
                disabled={isActionRunning}
                onPress={() => handleMarkDone(item.id, item.name)}
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
      {/* FlatList of Tasks */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          loading && !refreshing ? (
            <ActivityIndicator style={styles.centered} size="large" color={colors.primary} />
          ) : (
            <Surface style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text variant="titleMedium" style={styles.emptyTitle}>
                Aucune tâche de ménage
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtitle}>
                {isAdmin
                  ? "Appuyez sur le bouton '+' pour définir vos premières corvées d'entretien."
                  : "Aucune tâche configurée. L'administrateur peut en créer."}
              </Text>
            </Surface>
          )
        }
      />

      {/* Admin FAB for New Task */}
      {isAdmin && (
        <FAB
          icon="plus"
          label="Nouvelle tâche"
          style={styles.fab}
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
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  overdueCard: {
    borderColor: colors.error,
    backgroundColor: '#FFEBEE',
  },
  myTurnCard: {
    borderColor: colors.primary,
    backgroundColor: '#F5F9FF',
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
    backgroundColor: '#ECEFF1',
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
  },
  assigneeName: {
    fontWeight: '700',
    color: colors.text,
  },
  myTurnText: {
    color: colors.primary,
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
    gap: spacing.sm,
  },
  overdueAlertLabel: {
    color: colors.error,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  doneButton: {
    borderRadius: borderRadius.md,
  },
  doneButtonLabel: {
    fontWeight: '700',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
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
  },
  snackbar: {
    backgroundColor: colors.text,
  },
});

export default CleaningListScreen;
