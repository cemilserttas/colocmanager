import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useShopping } from '../../hooks/useShopping';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';
import { notificationService } from '../../services/notificationService';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { PurchaseRecord, GroupMember } from '../../types';

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
  if (!dateValue) return 'Date inconnue';
  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateValue);
  }
};

interface ProductDetailScreenProps {
  route: {
    params: {
      productId: string;
    };
  };
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: any) => void;
  };
}

/**
 * Product detail view presenting member rotation order, purchase history,
 * order modification options, and admin deletion controls.
 */
export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

  const { productId } = route.params;
  const { user } = useAuth();
  const { group, members } = useGroup();
  const {
    products = [],
    deleteProduct,
    updateRotationOrder,
    requestRestock,
    fetchProductHistory,
  } = useShopping();

  const product = products.find((p) => p.id === productId);

  const [history, setHistory] = useState<PurchaseRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Reorder modal state
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

  // Load history if function available
  useEffect(() => {
    let isMounted = true;
    if (fetchProductHistory && productId) {
      setHistoryLoading(true);
      fetchProductHistory(productId)
        .then((records: PurchaseRecord[]) => {
          if (isMounted && records) {
            setHistory(records);
          }
        })
        .catch(() => {
          // silently catch or use empty
        })
        .finally(() => {
          if (isMounted) setHistoryLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [fetchProductHistory, productId]);

  // Open reorder dialog
  const handleOpenReorder = () => {
    soundService.playPopSound();
    if (product) {
      setTempOrder([...(product.rotationOrder || [])]);
      setReorderDialogVisible(true);
    }
  };

  // Move member up in order
  const moveUp = (index: number) => {
    soundService.playPopSound();
    if (index <= 0) return;
    const newOrder = [...tempOrder];
    const item = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = item;
    setTempOrder(newOrder);
  };

  // Move member down in order
  const moveDown = (index: number) => {
    soundService.playPopSound();
    if (index >= tempOrder.length - 1) return;
    const newOrder = [...tempOrder];
    const item = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = item;
    setTempOrder(newOrder);
  };

  // Save new rotation order
  const handleSaveOrder = async () => {
    soundService.playPopSound();
    if (!product || !updateRotationOrder) {
      setReorderDialogVisible(false);
      return;
    }
    setSavingOrder(true);
    try {
      await updateRotationOrder(product.id, tempOrder);
      setReorderDialogVisible(false);
      soundService.playSuccessSound();
      setSnackbarMessage("L'ordre de rotation a été mis à jour.");
      setSnackbarVisible(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la modification de l\'ordre.';
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setSavingOrder(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async () => {
    soundService.playPopSound();
    if (!product) return;
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      setDeleteDialogVisible(false);
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la suppression du produit.';
      setSnackbarMessage(message);
      setSnackbarVisible(true);
      setDeleting(false);
    }
  };

  const handleSendReminder = async (targetUid: string, targetName: string) => {
    soundService.playPopSound();
    if (!product) return;
    try {
      await notificationService.sendPeerReminder(
        user?.displayName || t('roommate'),
        targetUid,
        'shopping',
        product.name,
        product.id
      );
      soundService.playSuccessSound();
      setSnackbarMessage(t('reminderSent', { name: targetName }) || `✓ Rappel envoyé à ${targetName} !`);
      setSnackbarVisible(true);
    } catch {
      setSnackbarMessage(t('reminderError') || "Erreur lors de l'envoi du rappel.");
      setSnackbarVisible(true);
    }
  };

  const handleRequestRestock = async () => {
    soundService.playPopSound();
    if (!product) return;
    try {
      await requestRestock(product.id, user?.displayName || undefined);
      soundService.playSuccessSound();
      setSnackbarMessage(t('restockSuccess') || `Demande de rachat envoyée pour "${product.name}" !`);
      setSnackbarVisible(true);
    } catch {
      setSnackbarMessage(t('purchaseError') || "Erreur lors de la demande de réapprovisionnement.");
      setSnackbarVisible(true);
    }
  };

  if (!product) {
    return (
      <View style={[styles.notFoundContainer, { backgroundColor: tokens.bg }]}>
        <Text variant="titleMedium" style={{ color: tokens.text, fontWeight: '700' }}>
          {t('productNotFound')}
        </Text>
        <Button
          mode="contained"
          buttonColor={tokens.primary}
          textColor="#FFFFFF"
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing.md, borderRadius: 16 }}
        >
          {t('backToList')}
        </Button>
      </View>
    );
  }

  const rotationList = product.rotationOrder || [];
  const currentTurnIndex =
    rotationList.length > 0
      ? (((product.currentTurnIndex ?? 0) % rotationList.length) + rotationList.length) % rotationList.length
      : 0;
  const isInStock = product.needsRestock === false;

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <View style={styles.contentWrapper}>
        {/* Header */}
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
            {product.name}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 50 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Product Banner */}
          <View style={[styles.bannerSurface, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <View style={[styles.bannerIconBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
              <Text style={styles.bannerIcon}>{product.icon || '🛒'}</Text>
            </View>
            <Text variant="headlineSmall" style={[styles.bannerName, { color: tokens.text }]}>
              {product.name}
            </Text>
            {product.comment ? (
              <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginBottom: 8, fontStyle: 'italic', textAlign: 'center' }}>
                💬 {product.comment}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Chip
                style={{
                  backgroundColor: isInStock
                    ? (isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5')
                    : (isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2'),
                  borderRadius: 16,
                }}
                textStyle={{
                  color: isInStock ? '#10B981' : '#EF4444',
                  fontWeight: '700',
                }}
              >
                {isInStock ? `✓ ${t('inStock') || 'En stock'}` : `⚠️ ${t('toBuy') || 'À acheter'}`}
              </Chip>
              <Chip style={[styles.rotationChip, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.16)' : '#EFF6FF' }]} textStyle={{ color: tokens.primary, fontWeight: '700' }}>
                🔄 {rotationList.length} {t('members').toLowerCase()}
              </Chip>
            </View>

            {isInStock && (
              <Button
                mode="outlined"
                textColor="#EF4444"
                onPress={handleRequestRestock}
                style={{ marginTop: 12, borderRadius: 18, borderColor: 'rgba(239, 68, 68, 0.35)' }}
                labelStyle={{ fontWeight: '800', fontSize: 12 }}
              >
                📢 {t('requestRestockBtn') || "Informer qu'il faut en racheter"}
              </Button>
            )}
          </View>

          {/* Rotation Order Section */}
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: tokens.text }]}>
              {t('turnOrder')}
            </Text>
            {isAdmin && (
              <Button mode="text" onPress={handleOpenReorder} textColor={tokens.accent} style={styles.editButton}>
                {t('modifyOrder')}
              </Button>
            )}
          </View>

          <View style={[styles.rotationCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            {rotationList.map((uid, index) => {
              const isCurrent = index === currentTurnIndex;
              const memberName = getMemberName(uid, members);
              const isSelf = uid === user?.uid;

              return (
                <React.Fragment key={`rotation-${uid}-${index}`}>
                  <View
                    style={[
                      styles.rotationRow,
                      isCurrent && {
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.08)',
                      },
                    ]}
                  >
                    <View style={styles.rotationOrderBadge}>
                      <Text
                        variant="labelLarge"
                        style={[
                          styles.rotationOrderNumber,
                          { color: isCurrent ? '#10B981' : tokens.textSecondary },
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
                        { backgroundColor: isCurrent ? '#10B981' : tokens.accent },
                      ]}
                    />
                    <View style={styles.memberNameContainer}>
                      <Text
                        variant="titleSmall"
                        style={[
                          styles.memberNameText,
                          { color: isCurrent ? '#10B981' : tokens.text },
                        ]}
                      >
                        {memberName} {isSelf ? '(Vous)' : ''}
                      </Text>
                      {isCurrent && (
                        <Text variant="labelSmall" style={[styles.currentTurnBadge, isInStock && { color: tokens.textSecondary }]}>
                          {isInStock
                            ? (t('nextTurn') || "Prochain tour d'achat")
                            : t('theirTurnToBuy')}
                        </Text>
                      )}
                    </View>
                    {isCurrent && !isSelf && !isInStock && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleSendReminder(uid, memberName)}
                        style={[
                          styles.remindButton,
                          {
                            borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0',
                            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#10B981' }}>
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

          {/* Purchase History Section */}
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: tokens.text }]}>
              {t('purchaseHistory')}
            </Text>
          </View>

          <View style={[styles.historyCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            {historyLoading ? (
              <ActivityIndicator style={styles.centered} size="small" color={tokens.accent} />
            ) : history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text variant="bodyMedium" style={[styles.emptyHistoryText, { color: tokens.textSecondary }]}>
                  {product.lastPurchasedAt
                    ? t('lastPurchaseRecorded', {
                        date: formatDate(product.lastPurchasedAt),
                        name: product.lastPurchasedBy ? getMemberName(product.lastPurchasedBy, members) : t('roommate'),
                      })
                    : t('noPurchasesYet')}
                </Text>
              </View>
            ) : (
              history.map((record, idx) => (
                <React.Fragment key={record.id || `hist-${idx}`}>
                  <View style={styles.historyRow}>
                    <Text style={{ fontSize: 20, marginRight: spacing.sm }}>✅</Text>
                    <View style={styles.historyDetails}>
                      <Text variant="bodyMedium" style={[styles.historyBuyer, { color: tokens.text }]}>
                        {t('boughtBy', { name: getMemberName(record.buyerUid, members) })}
                      </Text>
                      <Text variant="bodySmall" style={[styles.historyDate, { color: tokens.textSecondary }]}>
                        {formatDate(record.purchasedAt)}
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
              {t('deleteProduct')}
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
          <Dialog.Title style={{ color: tokens.text, fontWeight: '800' }}>{t('modifyOrderTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={[styles.dialogDescription, { color: tokens.textSecondary }]}>
              {t('modifyOrderSub')}
            </Text>
            <ScrollView style={styles.dialogList}>
              {tempOrder.map((uid, idx) => {
                const name = getMemberName(uid, members);
                return (
                  <View key={`reorder-${uid}-${idx}`} style={styles.reorderRow}>
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
            <Button onPress={() => setReorderDialogVisible(false)} textColor={tokens.textSecondary}>{t('cancel')}</Button>
            <Button
              mode="contained"
              buttonColor={tokens.accent}
              onPress={handleSaveOrder}
              loading={savingOrder}
              style={{ borderRadius: 16 }}
            >
              {t('save')}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
          style={{ backgroundColor: tokens.card, borderRadius: 24, borderWidth: 1, borderColor: tokens.border }}
        >
          <Dialog.Title style={{ color: tokens.text, fontWeight: '800' }}>{t('deleteProductTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: tokens.textSecondary }}>
              {t('deleteProductConfirm', { name: product.name })}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)} textColor={tokens.textSecondary}>{t('cancel')}</Button>
            <Button
              textColor="#EF4444"
              onPress={handleDeleteProduct}
              loading={deleting}
            >
              {t('delete')}
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
    marginBottom: spacing.xs,
  },
  rotationChip: {
    borderRadius: 16,
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
    color: '#10B981',
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

export default ProductDetailScreen;
