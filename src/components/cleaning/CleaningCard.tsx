/**
 * Reusable cleaning task card component
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Chip, Surface } from 'react-native-paper';
import { theme } from '../../constants/theme';
import { CleaningTask, GroupMember } from '../../types';
import { getCurrentAssignee } from '../../utils/rotation';
import { formatRelativeDate, isOverdue, getDaysUntilDue } from '../../utils/dateUtils';
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
  weekly: 'Hebdo',
  biweekly: 'Bi-hebdo',
  monthly: 'Mensuel',
};

const getMemberName = (uid: string, members: GroupMember[], currentUserId: string): string => {
  if (uid === currentUserId) return 'Toi';
  const member = members.find((m) => m.userId === uid);
  return member ? `Membre ${(member.orderIndex ?? 0) + 1}` : 'Inconnu';
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface
        style={[
          styles.card,
          isMyTurn && styles.cardHighlight,
          overdue && styles.cardOverdue,
        ]}
        elevation={1}
      >
        <View style={styles.header}>
          <Text style={styles.icon}>{areaIcon}</Text>
          <View style={styles.content}>
            <Text style={styles.taskName}>{task.name}</Text>
            <Text style={[styles.turnText, isMyTurn && styles.turnTextHighlight]}>
              Responsable : {cleanerName} {isMyTurn ? '🔔' : ''}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.dueDate, overdue && styles.dueDateOverdue]}>
                Échéance : {formatRelativeDate(new Date(task.nextDueDate))}
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
            buttonColor={theme.colors.success}
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
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
  },
  cardHighlight: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  cardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  taskName: {
    fontSize: theme.typography.fontSizes.body,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  turnText: {
    fontSize: theme.typography.fontSizes.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  turnTextHighlight: {
    color: theme.colors.success,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  dueDate: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.textSecondary,
  },
  dueDateOverdue: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  chip: {
    height: 24,
    backgroundColor: theme.colors.background,
  },
  chipText: {
    fontSize: 10,
    lineHeight: 14,
  },
  button: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CleaningCard;
