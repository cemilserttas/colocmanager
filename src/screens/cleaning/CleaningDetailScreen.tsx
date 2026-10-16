import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  Dialog,
  Portal,
  Snackbar,
  Divider,
  ActivityIndicator,
  Avatar,
  Chip,
  SegmentedButtons,
  TextInput,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useCleaning } from '../../hooks/useCleaning';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';
import { notificationService } from '../../services/notificationService';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { CleaningRecord, CleaningFrequency, GroupMember } from '../../types';
import { parseUserDate } from '../../services/cleaningService';

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
    case 'daily':
      return 'Quotidienne';
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
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

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

  // Frequency editing state
  const [frequencyDialogVisible, setFrequencyDialogVisible] = useState(false);
  const [tempFrequency, setTempFrequency] = useState<CleaningFrequency>(task?.frequency || 'weekly');
  const [savingFrequency, setSavingFrequency] = useState(false);

  // Due date editing state
  const [dueDateDialogVisible, setDueDateDialogVisible] = useState(false);
  const [tempDueDateText, setTempDueDateText] = useState('');
  const [savingDueDate, setSavingDueDate] = useState(false);

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
    soundService.playPopSound();
    if (task) {
      setTempOrder([...(task.rotationOrder || [])]);
      setReorderDialogVisible(true);
    }
  };

  const moveUp = (index: number) => {
    soundService.playPopSound();
    if (index <= 0) return;
    const newOrder = [...tempOrder];
    const item = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = item;
    setTempOrder(newOrder);
  };

  const moveDown = (index: number) => {
    soundService.playPopSound();
    if (index >= tempOrder.length - 1) return;
    const newOrder = [...tempOrder];
    const item = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = item;
    setTempOrder(newOrder);
  };

  const handleSaveOrder = async () => {
    soundService.playPopSound();
    if (!task || !updateTask) {
      setReorderDialogVisible(false);
      return;
    }
    setSavingOrder(true);
    try {
      await updateTask(task.id, { rotationOrder: tempOrder });
      setReorderDialogVisible(false);
      soundService.playSuccessSound();
      setSnackbarMessage(t('orderUpdated') || "L'ordre de rotation pour cette corvée a été mis à jour.");
      setSnackbarVisible(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('orderUpdateError') || "Erreur lors de la mise à jour de l'ordre.";
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleOpenFrequency = () => {
    soundService.playPopSound();
    if (task) {
      setTempFrequency(task.frequency);
      setFrequencyDialogVisible(true);
    }
  };

  const handleSaveFrequency = async () => {
    soundService.playPopSound();
    if (!task || !updateTask) return;
    setSavingFrequency(true);
    try {
      await updateTask(task.id, { frequency: tempFrequency });
      setFrequencyDialogVisible(false);
      soundService.playSuccessSound();
      setSnackbarMessage(t('orderUpdated') || `Fréquence mise à jour.`);
      setSnackbarVisible(true);
    } catch {
      setSnackbarMessage(t('orderUpdateError') || 'Erreur lors de la modification de la fréquence.');
      setSnackbarVisible(true);
    } finally {
      setSavingFrequency(false);
    }
  };

  const handleOpenDueDate = () => {
    soundService.playPopSound();
    if (task) {
      const parsed = parseUserDate(task.nextDueDate);
      setTempDueDateText(parsed ? parsed.toISOString().split('T')[0] : '');
      setDueDateDialogVisible(true);
    }
  };

  const handleSaveDueDate = async () => {
    soundService.playPopSound();
    if (!task || !updateTask) return;
    const parsed = parseUserDate(tempDueDateText);
    if (!parsed) {
      setSnackbarMessage(t('invalidDueDate') || 'Date invalide. Format AAAA-MM-JJ ou JJ/MM/AAAA.');
      setSnackbarVisible(true);
      return;
    }
    setSavingDueDate(true);
    try {
      await updateTask(task.id, { nextDueDate: parsed });
      setDueDateDialogVisible(false);
      soundService.playSuccessSound();
      setSnackbarMessage(t('orderUpdated') || "Date d'échéance mise à jour avec succès.");
      setSnackbarVisible(true);
    } catch {
      setSnackbarMessage(t('orderUpdateError') || "Erreur lors de la mise à jour de l'échéance.");
      setSnackbarVisible(true);
    } finally {
      setSavingDueDate(false);
    }
  };

  const handleDeleteTask = async () => {
    soundService.playPopSound();
    if (!task) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      setDeleteDialogVisible(false);
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('deleteError') || 'Erreur lors de la suppression de la tâche.';
      setSnackbarMessage(message);
      setSnackbarVisible(true);
      setDeleting(false);
    }
  };

  const handleSendReminder = async (targetUid: string, targetName: string) => {
    soundService.playPopSound();
    if (!task) return;
    try {
      await notificationService.sendPeerReminder(
        user?.displayName || t('roommate'),
        targetUid,
        'cleaning',
        task.name,
        task.id
      );
      soundService.playSuccessSound();
      setSnackbarMessage(t('reminderSent', { name: targetName }) || `✓ Rappel ménage envoyé à ${targetName} !`);
      setSnackbarVisible(true);
    } catch {
      setSnackbarMessage(t('reminderError') || "Erreur lors de l'envoi du rappel.");
      setSnackbarVisible(true);
    }
  };

  if (!task) {
    return (
      <View style={[styles.notFoundContainer, { backgroundColor: tokens.bg }]}>
        <Text variant="titleMedium" style={{ color: tokens.text }}>{t('taskNotFound')}</Text>
        <Button
          mode="contained"
          buttonColor={tokens.accent}
          onPress={() => {
            soundService.playPopSound();
            navigation.goBack();
          }}
          style={{ marginTop: spacing.md, borderRadius: 20 }}
        >
          {t('backToList')}
        </Button>
      </View>
    );
  }

  const rotationList = task.rotationOrder || [];
  const currentTurnIndex =
    rotationList.length > 0
      ? (((task.currentTurnIndex ?? 0) % rotationList.length) + rotationList.length) % rotationList.length
      : 0;
  const overdue = isOverdue(task.nextDueDate);

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <View style={styles.contentWrapper}>
        {/* Top Header */}
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: tokens.surface,
              borderBottomColor: tokens.border,
              paddingTop: Math.max(insets.top, 12),
            },
          ]}
        >
          <Button
            mode="text"
            onPress={() => {
              soundService.playPopSound();
              navigation.goBack();
            }}
            style={{ margin: 0 }}
            labelStyle={{ fontSize: 16, color: tokens.accent, fontWeight: '700' }}
          >
            ← {t('back')}
          </Button>
          <Text variant="titleMedium" style={[styles.screenTitle, { color: tokens.text }]} numberOfLines={1}>
            {task.name}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 50 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Task Overview Surface */}
          <View style={[styles.bannerSurface, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <View style={[styles.bannerIconBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
              <Text style={styles.bannerIcon}>{getAreaIcon(task.area)}</Text>
            </View>
            <Text variant="headlineSmall" style={[styles.bannerName, { color: tokens.text }]}>
              {task.name}
            </Text>
            <Text variant="bodyMedium" style={[styles.bannerArea, { color: tokens.textSecondary }]}>
              Zone d'entretien : {task.area}
            </Text>

            <View style={styles.chipsRow}>
              <TouchableOpacity
                disabled={!isAdmin}
                onPress={handleOpenFrequency}
                activeOpacity={0.7}
              >
                <Chip
                  style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}
                  textStyle={{ fontWeight: '600', color: tokens.text }}
                >
                  🔁 {formatFrequency(task.frequency)} {isAdmin ? '✏️' : ''}
                </Chip>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!isAdmin}
                onPress={handleOpenDueDate}
                activeOpacity={0.7}
              >
                <Chip
                  style={[styles.chip, overdue ? { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2' } : { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.2)' : '#E0F2FE' }]}
                  textStyle={overdue ? styles.overdueChipText : { fontWeight: '600', color: '#0284C7' }}
                >
                  {overdue ? '⚠️ En retard : ' : '📅 Échéance : '}
                  {formatDate(task.nextDueDate)} {isAdmin ? '✏️' : ''}
                </Chip>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rotation Order Section */}
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: tokens.text }]}>
              Ordre de passage ({rotationList.length})
            </Text>
            {isAdmin && (
              <Button mode="text" onPress={handleOpenReorder} textColor={tokens.accent} style={styles.editButton}>
                Modifier l'ordre
              </Button>
            )}
          </View>

          <View style={[styles.rotationCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            {rotationList.map((uid, index) => {
              const isCurrent = index === currentTurnIndex;
              const memberName = getMemberName(uid, members);
              const isSelf = uid === user?.uid;

              return (
                <React.Fragment key={`clean-rot-${uid}-${index}`}>
                  <View
                    style={[
                      styles.rotationRow,
                      isCurrent && {
                        backgroundColor: isDark ? 'rgba(2, 132, 199, 0.16)' : 'rgba(2, 132, 199, 0.08)',
                      },
                    ]}
                  >
                    <View style={styles.rotationOrderBadge}>
                      <Text
                        variant="labelLarge"
                        style={[
                          styles.rotationOrderNumber,
                          { color: isCurrent ? '#0284C7' : tokens.textSecondary },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <Avatar.Text
                      size={36}
                      label={memberName.charAt(0).toUpperCase()}
                      style={[
                        styles.memberAvatar,
                        { backgroundColor: isCurrent ? '#0284C7' : tokens.accent },
                      ]}
                    />
                    <View style={styles.memberNameContainer}>
                      <Text
                        variant="titleSmall"
                        style={[
                          styles.memberNameText,
                          { color: isCurrent ? '#0284C7' : tokens.text },
                        ]}
                      >
                        {memberName} {isSelf ? '(Vous)' : ''}
                      </Text>
                      {isCurrent && (
                        <Text variant="labelSmall" style={styles.currentTurnBadge}>
                          {t('theirTurnToClean')}
                        </Text>
                      )}
                    </View>
                    {isCurrent && !isSelf && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleSendReminder(uid, memberName)}
                        style={[
                          styles.remindButton,
                          {
                            borderColor: isDark ? 'rgba(2, 132, 199, 0.4)' : '#BAE6FD',
                            backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#F0F9FF',
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0284C7' }}>
                          {t('remindBtn')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {index < rotationList.length - 1 && <Divider style={{ backgroundColor: tokens.border }} />}
                </React.Fragment>
              );
            })}
          </View>

          {/* Cleaning Execution History Section */}
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: tokens.text }]}>
              {t('cleaningHistory')}
            </Text>
          </View>

          <View style={[styles.historyCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            {historyLoading ? (
              <ActivityIndicator style={styles.centered} size="small" color="#0284C7" />
            ) : history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text variant="bodyMedium" style={[styles.emptyHistoryText, { color: tokens.textSecondary }]}>
                  {task.lastCleanedAt
                    ? t('lastCleanRecorded', {
                        date: formatDate(task.lastCleanedAt),
                        name: task.lastCleanedBy ? getMemberName(task.lastCleanedBy, members) : t('roommate'),
                      })
                    : t('noCleaningsYet')}
                </Text>
              </View>
            ) : (
              history.map((record, idx) => (
                <React.Fragment key={record.id || `clean-hist-${idx}`}>
                  <View style={styles.historyRow}>
                    <Text style={{ fontSize: 20, marginRight: spacing.sm }}>✅</Text>
                    <View style={styles.historyDetails}>
                      <Text variant="bodyMedium" style={[styles.historyBuyer, { color: tokens.text }]}>
                        {t('cleanedBy', { name: getMemberName(record.cleanerUid, members) })}
                      </Text>
                      <Text variant="bodySmall" style={[styles.historyDate, { color: tokens.textSecondary }]}>
                        {formatDate(record.cleanedAt)}
                      </Text>
                    </View>
                  </View>
                  {idx < history.length - 1 && <Divider style={{ backgroundColor: tokens.border }} />}
                </React.Fragment>
              ))
            )}
          </View>

          {/* Admin Delete Action */}
          {isAdmin && (
            <Button
              mode="outlined"
              textColor="#EF4444"
              style={[styles.deleteButton, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}
              onPress={() => {
                soundService.playPopSound();
                setDeleteDialogVisible(true);
              }}
            >
              {t('deleteTask')}
            </Button>
          )}
        </ScrollView>
      </View>

      {/* Reorder Dialog */}
      <Portal>
        <Dialog
          visible={reorderDialogVisible}
          onDismiss={() => setReorderDialogVisible(false)}
          style={{ backgroundColor: tokens.card, borderRadius: 24, borderWidth: 1, borderColor: tokens.border }}
        >
          <Dialog.Title style={{ color: tokens.text, fontWeight: '800' }}>Modifier l'ordre de passage</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={[styles.dialogDescription, { color: tokens.textSecondary }]}>
              Définissez l'ordre de passage des colocataires pour cette tâche :
            </Text>
            <ScrollView style={styles.dialogList}>
              {tempOrder.map((uid, idx) => {
                const name = getMemberName(uid, members);
                return (
                  <View key={`reorder-clean-${uid}-${idx}`} style={styles.reorderRow}>
                    <Text variant="labelLarge" style={[styles.reorderIndex, { color: tokens.textSecondary }]}>
                      {idx + 1}.
                    </Text>
                    <Text variant="bodyMedium" style={[styles.reorderName, { color: tokens.text }]} numberOfLines={1}>
                      {name}
                    </Text>
                    <View style={styles.reorderArrows}>
                      <Button
                        mode="text"
                        compact
                        disabled={idx === 0}
                        onPress={() => moveUp(idx)}
                        textColor={tokens.accent}
                      >
                        ▲
                      </Button>
                      <Button
                        mode="text"
                        compact
                        disabled={idx === tempOrder.length - 1}
                        onPress={() => moveDown(idx)}
                        textColor={tokens.accent}
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
            <Button onPress={() => setReorderDialogVisible(false)} textColor={tokens.textSecondary}>Annuler</Button>
            <Button
              mode="contained"
              buttonColor="#0284C7"
              onPress={handleSaveOrder}
              loading={savingOrder}
              style={{ borderRadius: 16 }}
            >
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
          style={{ backgroundColor: tokens.card, borderRadius: 24, borderWidth: 1, borderColor: tokens.border }}
        >
          <Dialog.Title style={{ color: tokens.text, fontWeight: '800' }}>Supprimer la tâche</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: tokens.textSecondary }}>
              Voulez-vous vraiment supprimer définitivement la tâche "{task.name}" ?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)} textColor={tokens.textSecondary}>Annuler</Button>
            <Button
              textColor="#EF4444"
              onPress={handleDeleteTask}
              loading={deleting}
            >
              Supprimer
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Frequency Edit Dialog */}
        <Dialog
          visible={frequencyDialogVisible}
          onDismiss={() => setFrequencyDialogVisible(false)}
          style={{ backgroundColor: tokens.card, borderRadius: 24, borderWidth: 1, borderColor: tokens.border }}
        >
          <Dialog.Title style={{ color: tokens.text, fontWeight: '800' }}>Modifier la répétition</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginBottom: 14 }}>
              Choisissez la nouvelle fréquence de répétition pour "{task.name}" :
            </Text>
            <SegmentedButtons
              value={tempFrequency}
              onValueChange={(val) => {
                soundService.playPopSound();
                setTempFrequency(val as CleaningFrequency);
              }}
              buttons={[
                { value: 'daily', label: '1j' },
                { value: 'weekly', label: '7j' },
                { value: 'biweekly', label: '14j' },
                { value: 'monthly', label: 'Mois' },
              ]}
              style={{ marginBottom: 12 }}
            />
            <Text variant="labelSmall" style={{ color: tokens.primary, fontWeight: '600' }}>
              ℹ️ Répétition choisie : {formatFrequency(tempFrequency)}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setFrequencyDialogVisible(false)} textColor={tokens.textSecondary}>Annuler</Button>
            <Button
              mode="contained"
              buttonColor="#0284C7"
              onPress={handleSaveFrequency}
              loading={savingFrequency}
              style={{ borderRadius: 16 }}
            >
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Due Date Edit Dialog */}
        <Dialog
          visible={dueDateDialogVisible}
          onDismiss={() => setDueDateDialogVisible(false)}
          style={{ backgroundColor: tokens.card, borderRadius: 24, borderWidth: 1, borderColor: tokens.border }}
        >
          <Dialog.Title style={{ color: tokens.text, fontWeight: '800' }}>Modifier l'échéance</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginBottom: 14 }}>
              Définir la prochaine date d'échéance :
            </Text>
            {Platform.OS === 'web' ? (
              <View style={{ marginBottom: 12 }}>
                <input
                  type="date"
                  value={tempDueDateText}
                  onChange={(e: any) => setTempDueDateText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: `1.5px solid ${tokens.border}`,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
                    color: tokens.text,
                    fontSize: 15,
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                />
              </View>
            ) : (
              <TextInput
                placeholder="AAAA-MM-JJ (ex: 2026-10-21)"
                value={tempDueDateText}
                onChangeText={setTempDueDateText}
                mode="outlined"
                textColor={tokens.text}
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)', marginBottom: 12 }}
                outlineColor={tokens.border}
                activeOutlineColor={tokens.accent}
              />
            )}
            {tempDueDateText ? (
              <Text variant="labelSmall" style={{ color: parseUserDate(tempDueDateText) ? (isDark ? '#34D399' : '#059669') : '#EF4444', fontWeight: '700' }}>
                {(() => {
                  const d = parseUserDate(tempDueDateText);
                  return d
                    ? `✓ Nouvelle échéance : ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
                    : '⚠️ Format de date non valide';
                })()}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDueDateDialogVisible(false)} textColor={tokens.textSecondary}>Annuler</Button>
            <Button
              mode="contained"
              buttonColor="#0284C7"
              onPress={handleSaveDueDate}
              loading={savingDueDate}
              style={{ borderRadius: 16 }}
            >
              Enregistrer
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
        wrapperStyle={{ bottom: Math.max(insets.bottom, 16), zIndex: 99999 }}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle: {
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 3,
  },
  bannerSurface: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  bannerIconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  bannerIcon: {
    fontSize: 40,
  },
  bannerName: {
    fontWeight: '800',
    textAlign: 'center',
  },
  bannerArea: {
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
    borderRadius: 14,
  },
  overdueChipText: {
    color: '#EF4444',
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
  },
  editButton: {
    margin: 0,
  },
  rotationCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  rotationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rotationOrderBadge: {
    width: 28,
    alignItems: 'center',
  },
  rotationOrderNumber: {
    fontWeight: '800',
  },
  memberAvatar: {
    marginRight: spacing.sm,
  },
  memberNameContainer: {
    flex: 1,
  },
  memberNameText: {
    fontWeight: '700',
  },
  currentTurnBadge: {
    color: '#0284C7',
    fontWeight: '700',
    marginTop: 2,
  },
  remindButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  historyCard: {
    borderRadius: 20,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  emptyHistory: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyHistoryText: {
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
  },
  historyDate: {
    marginTop: 2,
    fontSize: 12,
  },
  deleteButton: {
    marginTop: spacing.xl,
    borderRadius: 20,
  },
  dialogDescription: {
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
    backgroundColor: '#1E293B',
  },
});

export default CleaningDetailScreen;
