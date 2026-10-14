/**
 * Reusable product card component for the shopping list
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { colors, spacing, borderRadius } from '../../constants/theme';
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
  const member = members.find((m) => m.userId === uid || m.id === uid);
  return member?.displayName || member?.email || 'Membre';
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ width: '100%' }}>
      <Surface
        style={[
          styles.card,
          isMyTurn && styles.cardHighlight,
        ]}
        elevation={1}
      >
        <View style={styles.row}>
          <Text style={styles.icon}>{product.icon || '🛒'}</Text>
          <View style={styles.content}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={[styles.turnText, isMyTurn && styles.turnTextHighlight]}>
              Tour : {buyerName} {isMyTurn ? '👈 (À toi !)' : ''}
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
              buttonColor={colors.success}
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
    width: '100%',
    marginVertical: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHighlight: {
    borderColor: colors.success,
    backgroundColor: '#F0FDF4',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  productName: {
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
    color: colors.success,
    fontWeight: '700',
  },
  lastPurchase: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  button: {
    marginLeft: spacing.sm,
    borderRadius: borderRadius.md,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
});

export default ProductCard;
