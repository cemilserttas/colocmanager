import React, { useState, useCallback, useMemo } from 'react';
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
  Snackbar,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useShopping } from '../../hooks/useShopping';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { Product, GroupMember } from '../../types';
import { getCurrentAssignee } from '../../utils/rotation';

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
const formatDate = (dateValue?: string | Date | null, isEnglish: boolean = false): string => {
  if (!dateValue) return isEnglish ? 'None' : 'Aucun';
  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleDateString(isEnglish ? 'en-US' : 'fr-FR', {
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
 * Shopping list screen displaying recurring shared flat items,
 * rotation indicators, in-stock status, and turn execution triggers.
 */
export const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t, language } = useLanguageStore();
  const isEn = language === 'en';

  const { user } = useAuth();
  const { group, members } = useGroup();
  const {
    products = [],
    loading,
    error: shoppingError,
    markAsPurchased,
    requestRestock,
    fetchProducts,
  } = useShopping();

  const [filter, setFilter] = useState<'toBuy' | 'inStock' | 'all'>('toBuy');
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const toBuyProducts = useMemo(
    () => products.filter((p) => p.isActive !== false && p.needsRestock !== false),
    [products]
  );
  const inStockProducts = useMemo(
    () => products.filter((p) => p.isActive !== false && p.needsRestock === false),
    [products]
  );

  const displayedProducts = useMemo(() => {
    if (filter === 'toBuy') return toBuyProducts;
    if (filter === 'inStock') return inStockProducts;
    return products.filter((p) => p.isActive !== false);
  }, [products, filter, toBuyProducts, inStockProducts]);

  const isAdmin =
    Boolean(user?.uid) &&
    (group?.adminUid === user?.uid ||
      members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin'));

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
   * Dispatches mark-as-purchased for a given product with sound.
   */
  const handleMarkPurchased = async (productId: string, productName: string) => {
    soundService.playPopSound();
    setActionLoadingId(productId);
    try {
      await markAsPurchased(productId);
      soundService.playPurchaseSound();
      setSnackbarMessage(
        t('purchaseSuccess', { name: productName }) ||
          `✓ Achat validé pour "${productName}" ! Le produit est désormais en stock.`
      );
      setSnackbarVisible(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t('purchaseError') || "Erreur lors de l'enregistrement de l'achat.";
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Dispatches request-restock for an in-stock product with sound and notification.
   */
  const handleRequestRestock = async (productId: string, productName: string) => {
    soundService.playPopSound();
    setActionLoadingId(productId);
    try {
      await requestRestock(productId, user?.displayName || undefined);
      soundService.playSuccessSound();
      setSnackbarMessage(
        t('restockSuccess') || `Demande de rachat envoyée pour "${productName}" !`
      );
      setSnackbarVisible(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t('purchaseError') || "Erreur lors de la demande de réapprovisionnement.";
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Renders an individual product card with stock status.
   */
  const renderProductItem = ({ item }: { item: Product }) => {
    const rotationList = item.rotationOrder || [];
    const currentBuyerUid = getCurrentAssignee(rotationList, item.currentTurnIndex ?? 0) || null;
    const isInStock = item.needsRestock === false;

    const isMyTurn = currentBuyerUid === user?.uid;
    const isMyTurnToBuy = isMyTurn && !isInStock;

    const currentBuyerName = currentBuyerUid
      ? isMyTurn
        ? (t('yourTurn') || 'À toi !')
        : getMemberName(currentBuyerUid, members)
      : (t('nobody') || 'Personne');

    const lastBuyerName = item.lastPurchasedBy
      ? getMemberName(item.lastPurchasedBy, members)
      : null;

    const isActionRunning = actionLoadingId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          soundService.playPopSound();
          navigation.navigate('ProductDetail', { productId: item.id });
        }}
      >
        <View
          style={[
            styles.productCard,
            {
              backgroundColor: isMyTurnToBuy
                ? isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.08)'
                : tokens.card,
              borderColor: isMyTurnToBuy
                ? '#10B981'
                : !isInStock
                ? (isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.25)')
                : tokens.border,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.productIconBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
              <Text style={styles.productIcon}>{item.icon || '🛒'}</Text>
            </View>
            <View style={styles.titleArea}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 4 }}>
                <Text variant="titleMedium" style={[styles.productName, { color: tokens.text, flex: 1, marginRight: 6 }]}>
                  {item.name}
                </Text>
                <Chip
                  compact
                  style={{
                    backgroundColor: isInStock
                      ? (isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5')
                      : (isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2'),
                    borderRadius: 12,
                    height: 22,
                  }}
                  textStyle={{
                    color: isInStock ? '#10B981' : '#EF4444',
                    fontWeight: '800',
                    fontSize: 10,
                  }}
                >
                  {isInStock ? `✓ ${t('inStock') || 'En stock'}` : `⚠️ ${t('toBuy') || 'À acheter'}`}
                </Chip>
              </View>

              {item.comment ? (
                <Text
                  variant="bodySmall"
                  style={{ color: tokens.accent, marginTop: 1, fontStyle: 'italic' }}
                  numberOfLines={2}
                >
                  💬 {item.comment}
                </Text>
              ) : null}

              <Text
                variant="bodyMedium"
                style={[
                  styles.turnText,
                  { color: isMyTurnToBuy ? '#10B981' : tokens.textSecondary },
                ]}
              >
                {isInStock ? (t('nextTurn') || 'Prochain tour :') : (t('turnLabel') || 'Tour :')}{' '}
                <Text style={{ fontWeight: '800', color: isMyTurnToBuy ? '#10B981' : tokens.text }}>
                  {currentBuyerName} {isMyTurnToBuy ? '👈' : ''}
                </Text>
              </Text>
            </View>

            {isMyTurnToBuy && (
              <Button
                mode="contained"
                buttonColor="#10B981"
                loading={isActionRunning}
                disabled={isActionRunning}
                onPress={() => handleMarkPurchased(item.id, item.name)}
                style={styles.boughtButton}
                labelStyle={styles.boughtButtonLabel}
              >
                {t('bought') || 'ACHETÉ ✓'}
              </Button>
            )}

            {isInStock && (
              <Button
                mode="outlined"
                textColor="#EF4444"
                loading={isActionRunning}
                disabled={isActionRunning}
                onPress={() => handleRequestRestock(item.id, item.name)}
                style={[styles.boughtButton, { borderColor: 'rgba(239, 68, 68, 0.35)', borderRadius: 14 }]}
                labelStyle={{ fontSize: 11, fontWeight: '800' }}
                compact
              >
                {t('signalEmpty') || 'Épuisé'}
              </Button>
            )}
          </View>

          {/* Last Purchase Information */}
          <View style={[styles.cardFooter, { borderTopColor: tokens.border }]}>
            <Text variant="bodySmall" style={[styles.lastPurchaseText, { color: tokens.textSecondary }]}>
              🕒 {t('lastPurchase') || 'Dernier achat :'}{' '}
              {item.lastPurchasedAt
                ? `${formatDate(item.lastPurchasedAt, isEn)}${lastBuyerName ? ` ${t('by') || 'par'} ${lastBuyerName}` : ''}`
                : (t('noPurchaseRecord') || 'Aucun enregistrement')}
            </Text>
          </View>
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
              <Text style={[styles.adminBarTitle, { color: tokens.accent }]}>{t('adminShoppingTitle')}</Text>
              <Text style={[styles.adminBarSub, { color: tokens.textSecondary }]}>
                {t('adminShoppingSub')}
              </Text>
            </View>
          </View>
        )}

        {/* Filter Chips: À acheter / En stock / Tous */}
        {products.length > 0 && (
          <View style={styles.filterChipsRow}>
            <Chip
              selected={filter === 'toBuy'}
              onPress={() => {
                soundService.playPopSound();
                setFilter('toBuy');
              }}
              style={[
                styles.filterChip,
                filter === 'toBuy' && { backgroundColor: tokens.primary },
              ]}
              textStyle={{
                color: filter === 'toBuy' ? '#FFFFFF' : tokens.text,
                fontWeight: '700',
                fontSize: 12,
              }}
              compact
            >
              {t('toBuy') || 'À acheter'} ({toBuyProducts.length})
            </Chip>

            <Chip
              selected={filter === 'inStock'}
              onPress={() => {
                soundService.playPopSound();
                setFilter('inStock');
              }}
              style={[
                styles.filterChip,
                filter === 'inStock' && { backgroundColor: tokens.primary },
              ]}
              textStyle={{
                color: filter === 'inStock' ? '#FFFFFF' : tokens.text,
                fontWeight: '700',
                fontSize: 12,
              }}
              compact
            >
              {t('inStock') || 'En stock'} ({inStockProducts.length})
            </Chip>

            <Chip
              selected={filter === 'all'}
              onPress={() => {
                soundService.playPopSound();
                setFilter('all');
              }}
              style={[
                styles.filterChip,
                filter === 'all' && { backgroundColor: tokens.primary },
              ]}
              textStyle={{
                color: filter === 'all' ? '#FFFFFF' : tokens.text,
                fontWeight: '700',
                fontSize: 12,
              }}
              compact
            >
              {isEn ? 'All' : 'Tous'} ({products.length})
            </Chip>
          </View>
        )}

        {/* Product FlatList */}
        <FlatList
          data={displayedProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 160 + insets.bottom }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={tokens.accent}
              colors={[tokens.accent]}
            />
          }
          ListEmptyComponent={
            loading && !refreshing ? (
              <ActivityIndicator style={styles.centered} size="large" color={tokens.accent} />
            ) : filter === 'toBuy' && inStockProducts.length > 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text variant="titleMedium" style={[styles.emptyTitle, { color: tokens.text }]}>
                  {t('inStock') || 'En stock'}
                </Text>
                <Text variant="bodySmall" style={[styles.emptySubtitle, { color: tokens.textSecondary }]}>
                  {t('allInStockSub') || 'Tous les produits partagés sont actuellement en stock ! 🎉'}
                </Text>
                <Button
                  mode="outlined"
                  textColor={tokens.primary}
                  style={{ marginTop: spacing.md, borderRadius: 20 }}
                  onPress={() => {
                    soundService.playPopSound();
                    setFilter('inStock');
                  }}
                >
                  {t('inStock') || 'En stock'} ({inStockProducts.length})
                </Button>
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
                <Text style={styles.emptyIcon}>🛒</Text>
                <Text variant="titleMedium" style={[styles.emptyTitle, { color: tokens.text }]}>
                  {t('noProducts') || 'Aucun produit dans la liste'}
                </Text>
                <Text variant="bodySmall" style={[styles.emptySubtitle, { color: tokens.textSecondary }]}>
                  {isAdmin
                    ? (t('noProductsAdminSub') || "Appuyez sur le bouton '+ Produit' ci-dessus pour ajouter le papier toilette, le liquide vaisselle, etc.")
                    : (t('noProductsMemberSub') || "Votre administrateur n'a pas encore ajouté de produits partagés.")}
                </Text>
                {isAdmin && (
                  <Button
                    mode="contained"
                    buttonColor={tokens.accent}
                    style={{ marginTop: spacing.md, borderRadius: 20 }}
                    onPress={() => {
                      soundService.playPopSound();
                      navigation.navigate('AddProduct');
                    }}
                  >
                    + {t('product')}
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
          label={t('product') || 'Produit'}
          style={[styles.fab, { backgroundColor: tokens.accent, bottom: 104 + insets.bottom }]}
          color="#FFFFFF"
          onPress={() => {
            soundService.playPopSound();
            navigation.navigate('AddProduct');
          }}
        />
      )}

      {/* Snackbar feedback - floats cleanly above the bottom navigation bar */}
      <Snackbar
        visible={snackbarVisible || Boolean(shoppingError)}
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
        {snackbarMessage || shoppingError || ''}
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
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  filterChip: {
    borderRadius: 16,
    height: 32,
  },
  addBtnTop: {
    borderRadius: 16,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 4,
  },
  productCard: {
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  productIcon: {
    fontSize: 26,
  },
  titleArea: {
    flex: 1,
  },
  productName: {
    fontWeight: '700',
  },
  turnText: {
    marginTop: 2,
  },
  boughtButton: {
    borderRadius: 18,
    marginLeft: spacing.sm,
  },
  boughtButtonLabel: {
    fontWeight: '800',
    fontSize: 12,
  },
  cardFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  lastPurchaseText: {
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

export default ShoppingListScreen;
