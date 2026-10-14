import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Text,
  Button,
  Surface,
  Dialog,
  Portal,
  Snackbar,
  Divider,
  ActivityIndicator,
  Avatar,
  Chip,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useShopping } from '../../hooks/useShopping';
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
  const { productId } = route.params;
  const { user } = useAuth();
  const { group, members } = useGroup();
  const {
    products = [],
    deleteProduct,
    updateRotationOrder,
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
    if (product) {
      setTempOrder([...(product.rotationOrder || [])]);
      setReorderDialogVisible(true);
    }
  };

  // Move member up in order
  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...tempOrder];
    const item = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = item;
    setTempOrder(newOrder);
  };

  // Move member down in order
  const moveDown = (index: number) => {
    if (index >= tempOrder.length - 1) return;
    const newOrder = [...tempOrder];
    const item = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = item;
    setTempOrder(newOrder);
  };

  // Save new rotation order
  const handleSaveOrder = async () => {
    if (!product || !updateRotationOrder) {
      setReorderDialogVisible(false);
      return;
    }
    setSavingOrder(true);
    try {
      await updateRotationOrder(product.id, tempOrder);
      setReorderDialogVisible(false);
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

  if (!product) {
    return (
      <View style={styles.notFoundContainer}>
        <Text variant="titleMedium">Produit introuvable.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
          Retour à la liste
        </Button>
      </View>
    );
  }

  const rotationList = product.rotationOrder || [];
  const currentTurnIndex = product.currentTurnIndex % (rotationList.length || 1);

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={styles.topBar}>
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
            labelStyle={{ fontSize: 16 }}
          >
            ← Retour
          </Button>
          <Text variant="titleMedium" style={styles.screenTitle} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Product Banner */}
          <Surface style={styles.bannerSurface}>
            <Text style={styles.bannerIcon}>{product.icon || '🛒'}</Text>
            <Text variant="headlineSmall" style={styles.bannerName}>
              {product.name}
            </Text>
            <Chip style={styles.rotationChip} textStyle={{ color: '#065F46', fontWeight: '700' }}>
              🔄 {rotationList.length} colocataires en rotation
            </Chip>
          </Surface>

          {/* Rotation Order Section */}
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Ordre de passage
            </Text>
            {isAdmin && (
              <Button mode="text" onPress={handleOpenReorder} style={styles.editButton}>
                Modifier l'ordre
              </Button>
            )}
          </View>

          <Surface style={styles.rotationCard}>
            {rotationList.map((uid, index) => {
              const isCurrent = index === currentTurnIndex;
              const memberName = getMemberName(uid, members);
              const isSelf = uid === user?.uid;

              return (
                <React.Fragment key={`rotation-${uid}-${index}`}>
                  <View style={[styles.rotationRow, isCurrent && styles.activeRotationRow]}>
                    <View style={styles.rotationOrderBadge}>
                      <Text
                        variant="labelLarge"
                        style={[styles.rotationOrderNumber, isCurrent && styles.activeOrderNumber]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <Avatar.Text
                      size={36}
                      label={memberName.charAt(0).toUpperCase()}
                      style={[styles.memberAvatar, isCurrent && styles.activeAvatar]}
                    />
                    <View style={styles.memberNameContainer}>
                      <Text
                        variant="titleSmall"
                        style={[styles.memberNameText, isCurrent && styles.activeMemberName]}
                      >
                        {memberName} {isSelf ? '(Vous)' : ''}
                      </Text>
                      {isCurrent && (
                        <Text variant="labelSmall" style={styles.currentTurnBadge}>
                          ★ C'est son tour d'acheter !
                        </Text>
                      )}
                    </View>
                  </View>
                  {index < rotationList.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </Surface>

          {/* Purchase History Section */}
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Historique des achats
            </Text>
          </View>

          <Surface style={styles.historyCard}>
            {historyLoading ? (
              <ActivityIndicator style={styles.centered} size="small" color={colors.primary} />
            ) : history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text variant="bodyMedium" style={styles.emptyHistoryText}>
                  {product.lastPurchasedAt
                    ? `Dernier achat enregistré le ${formatDate(product.lastPurchasedAt)} par ${
                        product.lastPurchasedBy ? getMemberName(product.lastPurchasedBy, members) : 'un coloc'
                      }.`
                    : 'Aucun achat validé pour le moment.'}
                </Text>
              </View>
            ) : (
              history.map((record, idx) => (
                <React.Fragment key={record.id || `hist-${idx}`}>
                  <View style={styles.historyRow}>
                    <Text style={{ fontSize: 20, marginRight: spacing.sm }}>✅</Text>
                    <View style={styles.historyDetails}>
                      <Text variant="bodyMedium" style={styles.historyBuyer}>
                        Acheté par {getMemberName(record.buyerUid, members)}
                      </Text>
                      <Text variant="bodySmall" style={styles.historyDate}>
                        {formatDate(record.purchasedAt)}
                      </Text>
                    </View>
                  </View>
                  {idx < history.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </Surface>

          {/* Admin Delete Action */}
          {isAdmin && (
            <Button
              mode="outlined"
              textColor={colors.error}
              style={styles.deleteButton}
              onPress={() => setDeleteDialogVisible(true)}
            >
              🗑️ Supprimer ce produit
            </Button>
          )}
        </ScrollView>
      </View>

      {/* Reorder Dialog */}
      <Portal>
        <Dialog visible={reorderDialogVisible} onDismiss={() => setReorderDialogVisible(false)}>
          <Dialog.Title>Modifier l'ordre de passage</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={styles.dialogDescription}>
              Utilisez les boutons monter / descendre pour réorganiser l'ordre d'achat :
            </Text>
            <ScrollView style={styles.dialogList}>
              {tempOrder.map((uid, idx) => {
                const name = getMemberName(uid, members);
                return (
                  <View key={`reorder-${uid}-${idx}`} style={styles.reorderRow}>
                    <Text variant="labelLarge" style={styles.reorderIndex}>
                      {idx + 1}.
                    </Text>
                    <Text variant="bodyMedium" style={styles.reorderName} numberOfLines={1}>
                      {name}
                    </Text>
                    <View style={styles.reorderArrows}>
                      <Button
                        mode="text"
                        compact
                        disabled={idx === 0}
                        onPress={() => moveUp(idx)}
                      >
                        ▲
                      </Button>
                      <Button
                        mode="text"
                        compact
                        disabled={idx === tempOrder.length - 1}
                        onPress={() => moveDown(idx)}
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
            <Button onPress={() => setReorderDialogVisible(false)}>Annuler</Button>
            <Button
              mode="contained"
              buttonColor={colors.primary}
              onPress={handleSaveOrder}
              loading={savingOrder}
            >
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Supprimer le produit</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Voulez-vous vraiment supprimer définitivement "{product.name}" de la colocation ?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Annuler</Button>
            <Button
              textColor={colors.error}
              onPress={handleDeleteProduct}
              loading={deleting}
            >
              Supprimer
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
        style={styles.snackbar}
      >
        {snackbarMessage || ''}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
    elevation: 2,
  },
  screenTitle: {
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  bannerSurface: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    elevation: 2,
    marginBottom: spacing.md,
  },
  bannerIcon: {
    fontSize: 52,
    marginBottom: spacing.xs,
  },
  bannerName: {
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  rotationChip: {
    backgroundColor: '#ECFDF5',
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
    color: colors.text,
  },
  editButton: {
    margin: 0,
  },
  rotationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    elevation: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rotationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  activeRotationRow: {
    backgroundColor: '#F0FDF4',
  },
  rotationOrderBadge: {
    width: 28,
    alignItems: 'center',
  },
  rotationOrderNumber: {
    fontWeight: '800',
    color: colors.textSecondary,
  },
  activeOrderNumber: {
    color: colors.success,
  },
  memberAvatar: {
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  activeAvatar: {
    backgroundColor: colors.success,
  },
  memberNameContainer: {
    flex: 1,
  },
  memberNameText: {
    fontWeight: '700',
    color: colors.text,
  },
  activeMemberName: {
    color: colors.success,
    fontWeight: '800',
  },
  currentTurnBadge: {
    color: colors.success,
    fontWeight: '700',
    marginTop: 2,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    elevation: 1,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyHistory: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyHistoryText: {
    color: colors.textSecondary,
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
    color: colors.text,
  },
  historyDate: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    marginTop: spacing.xl,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
  },
  dialogDescription: {
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.text,
  },
});

export default ProductDetailScreen;
