/**
 * Reusable cleaning task card component
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Chip, Surface } from 'react-native-paper';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { CleaningTask, GroupMember } from '../../types';
import { getCurrentAssignee } from '../../utils/rotation';
import { formatRelativeDate, isOverdue } from '../../utils/dateUtils';
import { getIcon } from '../../constants/icons';

interface CleaningCardProps {
  /** The cleaning task to display */
  task: CleaningTask;
  /** All group members for name resolution */
  members: GroupMember[];
  /** Current user's ID */
  currentUserId: string;
  /** Called when user taps "Fait" */
  onMarkCompleted?: () => void;
  /** Called when card is tapped */
  onPress?: () => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdo',
  biweekly: 'Bi-hebdo',
  monthly: 'Mensuel',
};

const getMemberName = (uid: string, members: GroupMember[], currentUserId: string): string => {
  if (uid === currentUserId) return 'Toi';
  const member = members.find((m) => m.userId === uid);
  return member?.displayName || member?.email || 'Membre';
};

const CleaningCard: React.FC<CleaningCardProps> = ({
  task,
  members,
  currentUserId,
  onMarkCompleted,
  onPress,
}) => {
  const currentCleanerId = getCurrentAssignee(task.rotationOrder, task.currentTurnIndex);
  const isMyTurn = currentCleanerId === currentUserId;
  const cleanerName = getMemberName(currentCleanerId, members, currentUserId);
  const overdue = isOverdue(new Date(task.nextDueDate));
  const areaIcon = getIcon('cleaning', task.area.toLowerCase());

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ width: '100%' }}>
      <Surface
        style={[
          styles.card,
          isMyTurn && styles.cardHighlight,
          overdue && styles.cardOverdue,
        ]}
        elevation={1}
      >
        <View style={styles.header}>
          <Text style={styles.icon}>{areaIcon || '🧹'}</Text>
          <View style={styles.content}>
            <Text style={styles.taskName}>{task.name}</Text>
            <Text style={[styles.turnText, isMyTurn && styles.turnTextHighlight]}>
              Responsable : {cleanerName} {isMyTurn ? '👈 (À toi !)' : ''}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.dueDate, overdue && styles.dueDateOverdue]}>
                {overdue ? '⚠️ En retard : ' : 'Échéance : '}
                {formatRelativeDate(new Date(task.nextDueDate))}
              </Text>
              <Chip
                compact
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {FREQUENCY_LABELS[task.frequency] || task.frequency}
              </Chip>
            </View>
          </View>
        </View>
        {isMyTurn && onMarkCompleted && (
          <Button
            mode="contained"
            onPress={onMarkCompleted}
            buttonColor={overdue ? colors.error : colors.primary}
            textColor="#FFFFFF"
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            FAIT ✓
          </Button>
        )}
      </Surface>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginVertical: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHighlight: {
    borderColor: colors.secondary,
    backgroundColor: '#F0F9FF',
  },
  cardOverdue: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 32,
    marginRight: spacing.md,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  turnText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  turnTextHighlight: {
    color: colors.secondary,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  dueDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dueDateOverdue: {
    color: colors.error,
    fontWeight: '800',
  },
  chip: {
    height: 24,
    backgroundColor: '#F1F5F9',
  },
  chipText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
  button: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
});

export default CleaningCard;
