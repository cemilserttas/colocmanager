import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Text,
  Button,
  Surface,
  Dialog,
  Portal,
  Snackbar,
  Divider,
  ActivityIndicator,
  Avatar,
  Chip,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useCleaning } from '../../hooks/useCleaning';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { CleaningRecord, GroupMember } from '../../types';

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
      return 'Hebdomadaire';
    case 'biweekly':
      return 'Bi-hebdomadaire';
    case 'monthly':
      return 'Mensuelle';
    default:
      return freq;
  }
};

/**
 * Formats ISO date string to localized readable format.
 */
const formatDate = (dateValue?: string | Date | null): string => {
  if (!dateValue) return 'Date non définie';
  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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

interface CleaningDetailScreenProps {
  route: {
    params: {
      taskId: string;
    };
  };
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: any) => void;
  };
}

/**
 * Screen presenting detailed parameters of a cleaning task,
 * rotation sequence, execution history, and admin modification/deletion tools.
 */
export const CleaningDetailScreen: React.FC<CleaningDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { taskId } = route.params;
  const { user } = useAuth();
  const { group, members } = useGroup();
  const {
    tasks = [],
    deleteTask,
    updateTask,
    fetchTaskHistory,
  } = useCleaning();

  const task = tasks.find((t) => t.id === taskId);

  const [history, setHistory] = useState<CleaningRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Reorder rotation state
  const [reorderDialogVisible, setReorderDialogVisible] = useState(false);
  const [tempOrder, setTempOrder] = useState<string[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  // Deletion modal state
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Feedback states
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const isAdmin =
    Boolean(user?.uid) &&
    (group?.adminUid === user?.uid ||
      members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin'));

  // Load history records
  useEffect(() => {
    let isMounted = true;
    if (fetchTaskHistory && taskId) {
      setHistoryLoading(true);
      fetchTaskHistory(taskId)
        .then((records: CleaningRecord[]) => {
          if (isMounted && records) {
            setHistory(records);
          }
        })
        .catch(() => {
          // Fallback to empty history
        })
        .finally(() => {
          if (isMounted) setHistoryLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [fetchTaskHistory, taskId]);

  const handleOpenReorder = () => {
    if (task) {
      setTempOrder([...(task.rotationOrder || [])]);
      setReorderDialogVisible(true);
    }
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...tempOrder];
    const item = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = item;
    setTempOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index >= tempOrder.length - 1) return;
    const newOrder = [...tempOrder];
    const item = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = item;
    setTempOrder(newOrder);
  };

  const handleSaveOrder = async () => {
    if (!task || !updateTask) {
      setReorderDialogVisible(false);
      return;
    }
    setSavingOrder(true);
    try {
      await updateTask(task.id, { rotationOrder: tempOrder });
      setReorderDialogVisible(false);
      setSnackbarMessage("L'ordre de rotation pour cette corvée a été mis à jour.");
      setSnackbarVisible(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la mise à jour de l'ordre.";
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      setDeleteDialogVisible(false);
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la suppression de la tâche.';
      setSnackbarMessage(message);
      setSnackbarVisible(true);
      setDeleting(false);
    }
  };

  if (!task) {
    return (
      <View style={styles.notFoundContainer}>
        <Text variant="titleMedium">Tâche de ménage introuvable.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
          Retour à la liste
        </Button>
      </View>
    );
  }

  const rotationList = task.rotationOrder || [];
  const currentTurnIndex = task.currentTurnIndex % (rotationList.length || 1);
  const overdue = isOverdue(task.nextDueDate);

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
            labelStyle={{ fontSize: 16 }}
          >
            ← Retour
          </Button>
          <Text variant="titleMedium" style={styles.screenTitle} numberOfLines={1}>
            {task.name}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Task Overview Surface */}
          <Surface style={styles.bannerSurface}>
            <Text style={styles.bannerIcon}>{getAreaIcon(task.area)}</Text>
            <Text variant="headlineSmall" style={styles.bannerName}>
              {task.name}
            </Text>
            <Text variant="bodyMedium" style={styles.bannerArea}>
              Zone d'entretien : {task.area}
            </Text>

            <View style={styles.chipsRow}>
              <Chip style={styles.chip} textStyle={{ fontWeight: '600' }}>
                🔁 {formatFrequency(task.frequency)}
              </Chip>
              <Chip
                style={[styles.chip, overdue ? styles.overdueChip : styles.calendarChip]}
                textStyle={overdue ? styles.overdueChipText : { fontWeight: '600' }}
              >
                {overdue ? '⚠️ En retard : ' : '📅 Échéance : '}
                {formatDate(task.nextDueDate)}
              </Chip>
            </View>
          </Surface>

          {/* Rotation Order Section */}
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Ordre de passage ({rotationList.length})
            </Text>
            {isAdmin && (
              <Button mode="text" onPress={handleOpenReorder} style={styles.editButton}>
                Modifier l'ordre
              </Button>
            )}
          </View>

          <Surface style={styles.rotationCard}>
            {rotationList.map((uid, index) => {
              const isCurrent = index === currentTurnIndex;
              const memberName = getMemberName(uid, members);
              const isSelf = uid === user?.uid;

              return (
                <React.Fragment key={`clean-rot-${uid}-${index}`}>
                  <View style={[styles.rotationRow, isCurrent && styles.activeRotationRow]}>
                    <View style={styles.rotationOrderBadge}>
                      <Text
                        variant="labelLarge"
                        style={[styles.rotationOrderNumber, isCurrent && styles.activeOrderNumber]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <Avatar.Text
                      size={36}
                      label={memberName.charAt(0).toUpperCase()}
                      style={[styles.memberAvatar, isCurrent && styles.activeAvatar]}
                    />
                    <View style={styles.memberNameContainer}>
                      <Text
                        variant="titleSmall"
                        style={[styles.memberNameText, isCurrent && styles.activeMemberName]}
                      >
                        {memberName} {isSelf ? '(Vous)' : ''}
                      </Text>
                      {isCurrent && (
                        <Text variant="labelSmall" style={styles.currentTurnBadge}>
                          ★ Actuellement responsable du ménage
                        </Text>
                      )}
                    </View>
                  </View>
                  {index < rotationList.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </Surface>

          {/* Cleaning Execution History Section */}
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Historique des nettoyages
            </Text>
          </View>

          <Surface style={styles.historyCard}>
            {historyLoading ? (
              <ActivityIndicator style={styles.centered} size="small" color={colors.secondary} />
            ) : history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text variant="bodyMedium" style={styles.emptyHistoryText}>
                  {task.lastCleanedAt
                    ? `Dernier nettoyage effectué le ${formatDate(task.lastCleanedAt)} par ${
                        task.lastCleanedBy ? getMemberName(task.lastCleanedBy, members) : 'un coloc'
                      }.`
                    : 'Aucun enregistrement pour le moment.'}
                </Text>
              </View>
            ) : (
              history.map((record, idx) => (
                <React.Fragment key={record.id || `clean-hist-${idx}`}>
                  <View style={styles.historyRow}>
                    <Text style={{ fontSize: 20, marginRight: spacing.sm }}>✅</Text>
                    <View style={styles.historyDetails}>
                      <Text variant="bodyMedium" style={styles.historyBuyer}>
                        Nettoyé par {getMemberName(record.cleanerUid, members)}
                      </Text>
                      <Text variant="bodySmall" style={styles.historyDate}>
                        {formatDate(record.cleanedAt)}
                      </Text>
                    </View>
                  </View>
                  {idx < history.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </Surface>

          {/* Admin Delete Action */}
          {isAdmin && (
            <Button
              mode="outlined"
              textColor={colors.error}
              style={styles.deleteButton}
              onPress={() => setDeleteDialogVisible(true)}
            >
              🗑️ Supprimer cette tâche
            </Button>
          )}
        </ScrollView>
      </View>

      {/* Reorder Dialog */}
      <Portal>
        <Dialog visible={reorderDialogVisible} onDismiss={() => setReorderDialogVisible(false)}>
          <Dialog.Title>Modifier l'ordre de passage</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={styles.dialogDescription}>
              Définissez l'ordre de passage des colocataires pour cette tâche :
            </Text>
            <ScrollView style={styles.dialogList}>
              {tempOrder.map((uid, idx) => {
                const name = getMemberName(uid, members);
                return (
                  <View key={`reorder-clean-${uid}-${idx}`} style={styles.reorderRow}>
                    <Text variant="labelLarge" style={styles.reorderIndex}>
                      {idx + 1}.
                    </Text>
                    <Text variant="bodyMedium" style={styles.reorderName} numberOfLines={1}>
                      {name}
                    </Text>
                    <View style={styles.reorderArrows}>
                      <Button
                        mode="text"
                        compact
                        disabled={idx === 0}
                        onPress={() => moveUp(idx)}
                      >
                        ▲
                      </Button>
                      <Button
                        mode="text"
                        compact
                        disabled={idx === tempOrder.length - 1}
                        onPress={() => moveDown(idx)}
                      >
                        ▼
                      </Button>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReorderDialogVisible(false)}>Annuler</Button>
            <Button
              mode="contained"
              buttonColor={colors.secondary}
              onPress={handleSaveOrder}
              loading={savingOrder}
            >
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Supprimer la tâche</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Voulez-vous vraiment supprimer définitivement la tâche "{task.name}" ?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Annuler</Button>
            <Button
              textColor={colors.error}
              onPress={handleDeleteTask}
              loading={deleting}
            >
              Supprimer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Snackbar */}
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
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    elevation: 2,
  },
  screenTitle: {
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  bannerSurface: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    elevation: 2,
    marginBottom: spacing.md,
  },
  bannerIcon: {
    fontSize: 52,
    marginBottom: spacing.xs,
  },
  bannerName: {
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  bannerArea: {
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: '#F1F5F9',
  },
  calendarChip: {
    backgroundColor: '#E0F2FE',
  },
  overdueChip: {
    backgroundColor: '#FEF2F2',
  },
  overdueChipText: {
    color: colors.error,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontWeight: '800',
    color: colors.text,
  },
  editButton: {
    margin: 0,
  },
  rotationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    elevation: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rotationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  activeRotationRow: {
    backgroundColor: '#F0F9FF',
  },
  rotationOrderBadge: {
    width: 28,
    alignItems: 'center',
  },
  rotationOrderNumber: {
    fontWeight: '800',
    color: colors.textSecondary,
  },
  activeOrderNumber: {
    color: colors.secondary,
  },
  memberAvatar: {
    backgroundColor: colors.secondary,
    marginRight: spacing.sm,
  },
  activeAvatar: {
    backgroundColor: colors.secondary,
  },
  memberNameContainer: {
    flex: 1,
  },
  memberNameText: {
    fontWeight: '700',
    color: colors.text,
  },
  activeMemberName: {
    color: colors.secondary,
    fontWeight: '800',
  },
  currentTurnBadge: {
    color: colors.secondary,
    fontWeight: '700',
    marginTop: 2,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    elevation: 1,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyHistory: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyHistoryText: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  historyDetails: {
    flex: 1,
  },
  historyBuyer: {
    fontWeight: '700',
    color: colors.text,
  },
  historyDate: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    marginTop: spacing.xl,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
  },
  dialogDescription: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  dialogList: {
    maxHeight: 250,
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  reorderIndex: {
    width: 24,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  reorderName: {
    flex: 1,
    fontWeight: '600',
  },
  reorderArrows: {
    flexDirection: 'row',
  },
  centered: {
    padding: spacing.md,
  },
  snackbar: {
    backgroundColor: colors.text,
  },
});

export default CleaningDetailScreen;
