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
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useShopping } from '../../hooks/useShopping';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { Product, GroupMember } from '../../types';

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
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

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
      setSnackbarMessage(`✓ Achat validé pour "${productName}" ! Le tour passe au colocataire suivant.`);
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
        ? (t('yourTurn') || 'À toi !')
        : getMemberName(currentBuyerUid, members)
      : 'Personne';

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
              backgroundColor: isMyTurn
                ? isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.08)'
                : tokens.card,
              borderColor: isMyTurn ? '#10B981' : tokens.border,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.productIconBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
              <Text style={styles.productIcon}>{item.icon || '🛒'}</Text>
            </View>
            <View style={styles.titleArea}>
              <Text variant="titleMedium" style={[styles.productName, { color: tokens.text }]}>
                {item.name}
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.turnText, { color: isMyTurn ? '#10B981' : tokens.textSecondary }]}
              >
                Tour :{' '}
                <Text style={{ fontWeight: '800', color: isMyTurn ? '#10B981' : tokens.text }}>
                  {currentBuyerName} {isMyTurn ? '👈' : ''}
                </Text>
              </Text>
            </View>

            {isMyTurn && (
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
          </View>

          {/* Last Purchase Information */}
          <View style={[styles.cardFooter, { borderTopColor: tokens.border }]}>
            <Text variant="bodySmall" style={[styles.lastPurchaseText, { color: tokens.textSecondary }]}>
              🕒 {t('lastPurchase') || 'Dernier achat :'}{' '}
              {item.lastPurchasedAt
                ? `${formatDate(item.lastPurchasedAt)}${lastBuyerName ? ` par ${lastBuyerName}` : ''}`
                : 'Aucun enregistrement'}
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
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={[styles.adminBarTitle, { color: tokens.accent }]}>👑 Administration Achats</Text>
              <Text style={[styles.adminBarSub, { color: tokens.textSecondary }]}>
                Ajoutez des produits et gérez l'ordre de passage.
              </Text>
            </View>
            <Button
              mode="contained"
              buttonColor={tokens.accent}
              compact
              style={styles.addBtnTop}
              labelStyle={{ fontSize: 12, fontWeight: '700' }}
              onPress={() => {
                soundService.playPopSound();
                navigation.navigate('AddProduct');
              }}
            >
              {t('newProduct') || '+ Produit'}
            </Button>
          </View>
        )}

        {/* Product FlatList */}
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContainer}
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
                    {t('newProduct') || '+ Ajouter un produit'}
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
          label={t('newProduct') || 'Ajouter'}
          style={[styles.fab, { backgroundColor: tokens.accent }]}
          color="#FFFFFF"
          onPress={() => {
            soundService.playPopSound();
            navigation.navigate('AddProduct');
          }}
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
