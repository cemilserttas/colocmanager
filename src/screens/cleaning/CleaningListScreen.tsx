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
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useCleaning } from '../../hooks/useCleaning';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';
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
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

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
   * Dispatches mark-as-completed for a given cleaning task with sound.
   */
  const handleMarkCleaned = async (taskId: string, taskName: string) => {
    soundService.playPopSound();
    setActionLoadingId(taskId);
    try {
      await markAsDone(taskId);
      soundService.playTaskCompleteSound();
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
        ? (t('yourTurn') || 'À toi !')
        : getMemberName(currentCleanerUid, members)
      : 'Personne';

    const overdue = isOverdue(item.nextDueDate);
    const isActionRunning = actionLoadingId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          soundService.playPopSound();
          navigation.navigate('CleaningDetail', { taskId: item.id });
        }}
      >
        <View
          style={[
            styles.taskCard,
            {
              backgroundColor: overdue
                ? isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.08)'
                : isMyTurn
                ? isDark ? 'rgba(2, 132, 199, 0.16)' : 'rgba(2, 132, 199, 0.08)'
                : tokens.card,
              borderColor: overdue ? '#EF4444' : isMyTurn ? '#0284C7' : tokens.border,
            },
          ]}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.taskIconBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
              <Text style={styles.areaIcon}>🧹</Text>
            </View>
            <View style={styles.titleInfo}>
              <View style={styles.nameBadgeRow}>
                <Text variant="titleMedium" style={[styles.taskName, { color: tokens.text }]}>
                  {item.name}
                </Text>
                <Chip
                  compact
                  style={[styles.frequencyChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                  textStyle={{ fontSize: 11, fontWeight: '700', color: tokens.textSecondary }}
                >
                  {FREQUENCY_LABELS[item.frequency] || item.frequency}
                </Chip>
              </View>
              <Text variant="bodySmall" style={[styles.areaText, { color: tokens.textSecondary }]}>
                {t('areaLabel') || 'Zone'} : {item.area || 'Parties communes'}
              </Text>
            </View>
          </View>

          {/* Turn and Due Date Status */}
          <View style={[styles.statusRow, { borderTopColor: tokens.border }]}>
            <View style={styles.assigneeContainer}>
              <Text variant="bodySmall" style={[styles.assigneeLabel, { color: tokens.textSecondary }]}>
                {t('responsible') || 'Responsable :'}
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.assigneeName,
                  { color: isMyTurn ? '#0284C7' : tokens.text },
                ]}
              >
                {currentCleanerName} {isMyTurn ? '👈' : ''}
              </Text>
            </View>

            <View style={styles.dateContainer}>
              <Text
                variant="bodySmall"
                style={[
                  styles.dueDateText,
                  { color: overdue ? '#EF4444' : tokens.textSecondary },
                ]}
              >
                {overdue ? (t('overdue') || '⚠️ En retard !') : (t('dueDate') || '📅 Échéance :')}
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.dueDateText,
                  { color: overdue ? '#EF4444' : tokens.text, fontWeight: '700' },
                ]}
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
                buttonColor={overdue ? '#EF4444' : '#0284C7'}
                loading={isActionRunning}
                disabled={isActionRunning}
                onPress={() => handleMarkCleaned(item.id, item.name)}
                style={styles.doneButton}
                labelStyle={styles.doneButtonLabel}
              >
                {t('done') || 'FAIT ✓'}
              </Button>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <View style={styles.contentWrapper}>
        {/* Admin Action Bar */}
        {isAdmin && (
          <View style={[styles.adminBar, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.adminBarTitle, { color: '#0284C7' }]}>👑 Administration Nettoyage</Text>
              <Text style={[styles.adminBarSub, { color: tokens.textSecondary }]}>
                Créez des corvées récurrentes et gérez les attributions.
              </Text>
            </View>
          </View>
        )}

        {/* Cleaning Tasks FlatList */}
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderCleaningItem}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 160 + insets.bottom }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#0284C7"
              colors={['#0284C7']}
            />
          }
          ListEmptyComponent={
            loading && !refreshing ? (
              <ActivityIndicator style={styles.centered} size="large" color="#0284C7" />
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
                <Text style={styles.emptyIcon}>✨</Text>
                <Text variant="titleMedium" style={[styles.emptyTitle, { color: tokens.text }]}>
                  {t('noChores') || 'Aucune tâche de ménage'}
                </Text>
                <Text variant="bodySmall" style={[styles.emptySubtitle, { color: tokens.textSecondary }]}>
                  {isAdmin
                    ? (t('noChoresAdminSub') || "Appuyez sur '+ Ménage' pour définir le planning d'entretien.")
                    : (t('noChoresMemberSub') || "Aucune tâche configurée. L'administrateur peut en créer.")}
                </Text>
                {isAdmin && (
                  <Button
                    mode="contained"
                    buttonColor="#0284C7"
                    style={{ marginTop: spacing.md, borderRadius: 20 }}
                    onPress={() => {
                      soundService.playPopSound();
                      navigation.navigate('AddCleaningTask');
                    }}
                  >
                    {t('newChore') || '+ Créer une tâche'}
                  </Button>
                )}
              </View>
            )
          }
        />
      </View>

      {/* Floating Action Button for Admin */}
      {isAdmin && (
        <FAB
          icon="plus"
          label={t('newChore') || 'Nouvelle tâche'}
          style={[styles.fab, { backgroundColor: '#0284C7', bottom: 104 + insets.bottom }]}
          color="#FFFFFF"
          onPress={() => {
            soundService.playPopSound();
            navigation.navigate('AddCleaningTask');
          }}
        />
      )}

      {/* Snackbar feedback - floats cleanly above the bottom navigation bar */}
      <Snackbar
        visible={snackbarVisible || Boolean(cleaningError)}
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
        {snackbarMessage || cleaningError || ''}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminBarTitle: {
    fontWeight: '800',
    fontSize: 13,
  },
  adminBarSub: {
    fontSize: 12,
    marginTop: 2,
  },
  addBtnTop: {
    borderRadius: 16,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 4,
  },
  taskCard: {
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  taskIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  areaIcon: {
    fontSize: 26,
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
    flex: 1,
    marginRight: spacing.xs,
  },
  frequencyChip: {
    borderRadius: 12,
  },
  areaText: {
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  assigneeContainer: {
    flex: 1,
  },
  assigneeLabel: {
    fontSize: 11,
  },
  assigneeName: {
    fontWeight: '800',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dueDateText: {
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  doneButton: {
    borderRadius: 18,
  },
  doneButtonLabel: {
    fontWeight: '800',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 80,
    borderRadius: 28,
  },
  centered: {
    marginTop: spacing.xl,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 20,
  },
  snackbar: {
    backgroundColor: '#1E293B',
  },
});

export default CleaningListScreen;
