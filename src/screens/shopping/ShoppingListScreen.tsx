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
  Surface,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useShopping } from '../../hooks/useShopping';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { Product, GroupMember } from '../../types';

/**
 * Resolves a user ID to a member display name.
 */
const getMemberName = (uid: string, members: GroupMember[]): string => {
  const member = members.find((m) => m.userId === uid || m.id === uid);
  return member?.displayName || member?.email || 'Membre inconnu';
};

/**
 * Formats ISO date string to localized readable format.
 */
const formatDate = (dateValue?: string | Date | null): string => {
  if (!dateValue) return 'Aucun';
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

interface ShoppingListScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

/**
 * Shopping list screen displaying all recurring shared flat items,
 * rotation indicators, and turn execution triggers.
 */
export const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { group, members } = useGroup();
  const {
    products = [],
    loading,
    error: shoppingError,
    markAsPurchased,
    fetchProducts,
  } = useShopping();

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const isAdmin =
    group?.adminUid === user?.uid ||
    members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin');

  /**
   * Refreshes the product catalog.
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (fetchProducts) {
        await fetchProducts();
      }
    } finally {
      setRefreshing(false);
    }
  }, [fetchProducts]);

  /**
   * Dispatches mark-as-purchased for a given product.
   */
  const handleMarkPurchased = async (productId: string, productName: string) => {
    setActionLoadingId(productId);
    try {
      await markAsPurchased(productId);
      setSnackbarMessage(`✓ Achat enregistré pour "${productName}" !`);
      setSnackbarVisible(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'achat.";
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Renders an individual product card.
   */
  const renderProductItem = ({ item }: { item: Product }) => {
    const rotationList = item.rotationOrder || [];
    const currentBuyerUid =
      rotationList.length > 0 ? rotationList[item.currentTurnIndex % rotationList.length] : null;

    const isMyTurn = currentBuyerUid === user?.uid;
    const currentBuyerName = currentBuyerUid
      ? isMyTurn
        ? 'Vous'
        : getMemberName(currentBuyerUid, members)
      : 'Personne';

    const lastBuyerName = item.lastPurchasedBy
      ? getMemberName(item.lastPurchasedBy, members)
      : null;

    const isActionRunning = actionLoadingId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      >
        <Surface
          style={[
            styles.productCard,
            isMyTurn && styles.myTurnCard,
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.productIcon}>{item.icon || '🛒'}</Text>
            <View style={styles.titleArea}>
              <Text variant="titleMedium" style={styles.productName}>
                {item.name}
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.turnText, isMyTurn && styles.myTurnText]}
              >
                Tour : <Text style={{ fontWeight: '700' }}>{currentBuyerName}</Text>
              </Text>
            </View>

            {isMyTurn && (
              <Button
                mode="contained"
                buttonColor={colors.success}
                loading={isActionRunning}
                disabled={isActionRunning}
                onPress={() => handleMarkPurchased(item.id, item.name)}
                style={styles.boughtButton}
                labelStyle={styles.boughtButtonLabel}
              >
                ACHETÉ
              </Button>
            )}
          </View>

          {/* Last Purchase Information */}
          <View style={styles.cardFooter}>
            <Text variant="bodySmall" style={styles.lastPurchaseText}>
              Dernier achat :{' '}
              {item.lastPurchasedAt
                ? `${formatDate(item.lastPurchasedAt)}${lastBuyerName ? ` par ${lastBuyerName}` : ''}`
                : 'Aucun enregistrement'}
            </Text>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Product FlatList */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
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
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text variant="titleMedium" style={styles.emptyTitle}>
                Aucun produit
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtitle}>
                {isAdmin
                  ? "Vous êtes administrateur : appuyez sur le bouton '+' pour ajouter votre premier produit."
                  : "Aucun produit. L'admin peut en ajouter."}
              </Text>
            </Surface>
          )
        }
      />

      {/* Admin FAB to Add New Product */}
      {isAdmin && (
        <FAB
          icon="plus"
          label="Ajouter"
          style={styles.fab}
          onPress={() => navigation.navigate('AddProduct')}
        />
      )}

      {/* Snackbar feedback */}
      <Snackbar
        visible={snackbarVisible || Boolean(shoppingError)}
        onDismiss={() => {
          setSnackbarVisible(false);
          setSnackbarMessage(null);
        }}
        duration={3500}
        style={styles.snackbar}
      >
        {snackbarMessage || shoppingError || ''}
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
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  myTurnCard: {
    borderColor: colors.success,
    backgroundColor: '#F1F8E9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  titleArea: {
    flex: 1,
  },
  productName: {
    fontWeight: '700',
    color: colors.text,
  },
  turnText: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  myTurnText: {
    color: colors.success,
    fontWeight: '600',
  },
  boughtButton: {
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  boughtButtonLabel: {
    fontWeight: '700',
    fontSize: 12,
  },
  cardFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  lastPurchaseText: {
    color: colors.textSecondary,
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

export default ShoppingListScreen;
