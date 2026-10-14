/**
 * Reusable rotation order list component
 * Allows reordering members with up/down buttons (admin only)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton, Surface } from 'react-native-paper';
import { theme } from '../../constants/theme';

interface RotationMember {
  userId: string;
  displayName: string;
}

interface RotationOrderListProps {
  /** Ordered list of members in rotation */
  members: RotationMember[];
  /** Current turn index (highlighted) */
  currentTurnIndex?: number;
  /** Whether reorder buttons are shown */
  editable?: boolean;
  /** Called when order changes */
  onOrderChange?: (newOrder: string[]) => void;
}

const RotationOrderList: React.FC<RotationOrderListProps> = ({
  members,
  currentTurnIndex,
  editable = false,
  onOrderChange,
}) => {
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newMembers = [...members];
    [newMembers[index - 1], newMembers[index]] = [newMembers[index], newMembers[index - 1]];
    onOrderChange?.(newMembers.map((m) => m.userId));
  };

  const moveDown = (index: number) => {
    if (index === members.length - 1) return;
    const newMembers = [...members];
    [newMembers[index], newMembers[index + 1]] = [newMembers[index + 1], newMembers[index]];
    onOrderChange?.(newMembers.map((m) => m.userId));
  };

  return (
    <View style={styles.container}>
      {members.map((member, index) => {
        const isCurrent = currentTurnIndex !== undefined && index === currentTurnIndex;
        return (
          <Surface
            key={member.userId}
            style={[styles.row, isCurrent && styles.rowCurrent]}
            elevation={0}
          >
            <Text style={styles.index}>{index + 1}.</Text>
            <Text style={[styles.name, isCurrent && styles.nameCurrent]}>
              {member.displayName}
            </Text>
            {isCurrent && (
              <Text style={styles.badge}>👈 tour actuel</Text>
            )}
            {editable && (
              <View style={styles.buttons}>
                <IconButton
                  icon="chevron-up"
                  size={20}
                  onPress={() => moveUp(index)}
                  disabled={index === 0}
                  iconColor={theme.colors.primary}
                />
                <IconButton
                  icon="chevron-down"
                  size={20}
                  onPress={() => moveDown(index)}
                  disabled={index === members.length - 1}
                  iconColor={theme.colors.primary}
                />
              </View>
            )}
          </Surface>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowCurrent: {
    backgroundColor: '#E8F5E9',
  },
  index: {
    fontSize: theme.typography.fontSizes.body,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    width: 28,
  },
  name: {
    flex: 1,
    fontSize: theme.typography.fontSizes.body,
    color: theme.colors.text,
  },
  nameCurrent: {
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  badge: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.success,
    fontWeight: '600',
    marginRight: theme.spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
  },
});

export default RotationOrderList;
