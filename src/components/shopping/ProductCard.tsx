/**
 * Reusable product card component for the shopping list
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { theme } from '../../constants/theme';
import { Product, GroupMember } from '../../types';
import { getCurrentAssignee } from '../../utils/rotation';
import { formatDate } from '../../utils/dateUtils';

interface ProductCardProps {
  /** The product to display */
  product: Product;
  /** All group members for name resolution */
  members: GroupMember[];
  /** Current user's ID */
  currentUserId: string;
  /** Last purchase record info (optional) */
  lastPurchase?: { buyerName: string; date: Date };
  /** Called when user taps "Acheté" */
  onMarkPurchased?: () => void;
  /** Called when card is tapped */
  onPress?: () => void;
}

/**
 * Resolves a userId to a display name from the members list
 */
const getMemberName = (uid: string, members: GroupMember[], currentUserId: string): string => {
  if (uid === currentUserId) return 'Toi';
  const member = members.find((m) => m.userId === uid);
  return member ? `Membre ${(member.orderIndex ?? 0) + 1}` : 'Inconnu';
};

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  members,
  currentUserId,
  lastPurchase,
  onMarkPurchased,
  onPress,
}) => {
  const currentBuyerId = getCurrentAssignee(product.rotationOrder, product.currentTurnIndex);
  const isMyTurn = currentBuyerId === currentUserId;
  const buyerName = getMemberName(currentBuyerId, members, currentUserId);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface
        style={[
          styles.card,
          isMyTurn && styles.cardHighlight,
        ]}
        elevation={1}
      >
        <View style={styles.row}>
          <Text style={styles.icon}>{product.icon}</Text>
          <View style={styles.content}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={[styles.turnText, isMyTurn && styles.turnTextHighlight]}>
              Tour : {buyerName} {isMyTurn ? '👈' : ''}
            </Text>
            {lastPurchase && (
              <Text style={styles.lastPurchase}>
                Dernier : {lastPurchase.buyerName} ({formatDate(lastPurchase.date)})
              </Text>
            )}
          </View>
          {isMyTurn && onMarkPurchased && (
            <Button
              mode="contained"
              onPress={onMarkPurchased}
              buttonColor={theme.colors.success}
              textColor="#FFFFFF"
              compact
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              ACHETÉ ✓
            </Button>
          )}
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  productName: {
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
  lastPurchase: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  button: {
    marginLeft: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ProductCard;
