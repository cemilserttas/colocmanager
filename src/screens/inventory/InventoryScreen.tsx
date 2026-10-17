import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  Checkbox,
  Snackbar,
  ActivityIndicator,
  Chip,
  Avatar,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useShopping } from '../../hooks/useShopping';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';
import { notificationService } from '../../services/notificationService';
import { Product, GroupMember } from '../../types';
import { getCurrentAssignee } from '../../utils/rotation';
import { NotificationBell } from '../../components/common/NotificationBell';

const getMemberName = (uid: string, members: GroupMember[]): string => {
  const member = members.find((m) => m.userId === uid || m.id === uid);
  return member?.displayName || member?.email || 'Membre';
};

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

export const InventoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t, language } = useLanguageStore();
  const isEn = language === 'en';

  const { user } = useAuth();
  const { members } = useGroup();
  const {
    products = [],
    loading,
    fetchProducts,
    requestRestockMultiple,
    cancelRestock,
    cancelRestockMultiple,
  } = useShopping();

  const [filterMode, setFilterMode] = useState<'purchased' | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const displayedProducts = useMemo(() => {
    if (filterMode === 'purchased') {
      return products.filter((p) => p.isActive !== false && Boolean(p.lastPurchasedAt));
    }
    return products.filter((p) => p.isActive !== false);
  }, [products, filterMode]);

  const selectedItems = useMemo(() => {
    return displayedProducts.filter((p) => selectedIds.has(p.id));
  }, [displayedProducts, selectedIds]);

  const hasRestockNeededSelected = selectedItems.some((p) => p.needsRestock !== false);
  const hasInStockSelected = selectedItems.some((p) => p.needsRestock === false);

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

  const toggleSelect = (id: string) => {
    soundService.playPopSound();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    soundService.playPopSound();
    if (selectedIds.size === displayedProducts.length && displayedProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedProducts.map((p) => p.id)));
    }
  };

  const handleCancelRestockSingle = async (productId: string, productName: string) => {
    soundService.playPopSound();
    try {
      await cancelRestock(productId);
      soundService.playSuccessSound();
      setSnackbarMessage(
        t('cancelRestockSuccess', { name: productName }) ||
          `✓ Demande de rachat annulée pour "${productName}".`
      );
    } catch {
      setSnackbarMessage(
        isEn
          ? 'Error cancelling restock request.'
          : 'Erreur lors de l’annulation du réapprovisionnement.'
      );
    }
  };

  const handleCancelRestockBatch = async () => {
    const toCancelIds = selectedItems
      .filter((p) => p.needsRestock !== false)
      .map((p) => p.id);
    if (toCancelIds.length === 0) return;

    soundService.playPopSound();
    setSubmitting(true);
    try {
      await cancelRestockMultiple(toCancelIds);
      soundService.playSuccessSound();
      setSnackbarMessage(
        t('cancelRestockMultipleSuccess') ||
          'Demandes de rachat annulées. Produits remis en stock.'
      );
      setSelectedIds(new Set());
    } catch {
      setSnackbarMessage(
        isEn
          ? 'Error cancelling restock requests.'
          : 'Erreur lors de l’annulation du réapprovisionnement.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRestock = async () => {
    const toRequestIds = selectedItems
      .filter((p) => p.needsRestock === false)
      .map((p) => p.id);

    const idsToUse = toRequestIds.length > 0 ? toRequestIds : Array.from(selectedIds);
    if (idsToUse.length === 0) {
      setSnackbarMessage(t('selectAtLeastOne'));
      return;
    }

    soundService.playPopSound();
    setSubmitting(true);

    try {
      const senderName = user?.displayName || user?.email || (isEn ? 'A roommate' : 'Un colocataire');

      // Marks products as needsRestock: true in Firestore/mockStorage & dispatches turn alert to responsible buyers
      await requestRestockMultiple(idsToUse, senderName);

      soundService.playSuccessSound();
      setSnackbarMessage(t('restockSuccess'));
      setSelectedIds(new Set());
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isEn
          ? 'Error sending notification.'
          : 'Erreur lors de l’envoi de la notification.';
      setSnackbarMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const allSelected = displayedProducts.length > 0 && selectedIds.size === displayedProducts.length;

  const renderProductItem = ({ item }: { item: Product }) => {
    const isChecked = selectedIds.has(item.id);
    const rotationList = item.rotationOrder || [];
    const currentBuyerUid = getCurrentAssignee(rotationList, item.currentTurnIndex ?? 0);
    const currentBuyerName = currentBuyerUid
      ? currentBuyerUid === user?.uid
        ? (t('yourTurn') || 'À toi !')
        : getMemberName(currentBuyerUid, members)
      : (t('nobody') || 'Personne');

    const lastBuyerName = item.lastPurchasedBy
      ? getMemberName(item.lastPurchasedBy, members)
      : null;

    const isInStock = item.needsRestock === false;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => toggleSelect(item.id)}
        style={[
          styles.itemCard,
          {
            backgroundColor: isChecked
              ? (isDark ? 'rgba(10, 132, 255, 0.16)' : 'rgba(10, 132, 255, 0.08)')
              : tokens.card,
            borderColor: isChecked ? tokens.primary : tokens.border,
          },
        ]}
      >
        <View style={styles.cardContent}>
          {/* Checkbox */}
          <Checkbox.Android
            status={isChecked ? 'checked' : 'unchecked'}
            onPress={() => toggleSelect(item.id)}
            color={tokens.primary}
            uncheckedColor={tokens.textSecondary}
          />

          {/* Product Icon */}
          <View
            style={[
              styles.iconBubble,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' },
            ]}
          >
            <Text style={{ fontSize: 24 }}>{item.icon || '🛒'}</Text>
          </View>

          {/* Product Info */}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text, flex: 1, marginRight: 6 }}>
                {item.name}
              </Text>
              <Chip
                compact
                style={{
                  backgroundColor: isInStock
                    ? (isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5')
                    : (isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2'),
                  borderRadius: 12,
                  height: 24,
                }}
                textStyle={{
                  color: isInStock ? '#10B981' : '#EF4444',
                  fontWeight: '800',
                  fontSize: 10.5,
                }}
              >
                {isInStock ? (t('inStock') || 'En stock') : (t('itemToRepurchase') || 'À racheter')}
              </Chip>
            </View>

            {item.comment ? (
              <Text variant="bodySmall" style={{ color: tokens.primary, marginTop: 2, fontStyle: 'italic' }}>
                💬 {item.comment}
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              <Text variant="bodySmall" style={{ color: tokens.textSecondary }}>
                {isInStock ? (t('nextTurn') || 'Prochain tour :') : (t('turnLabel') || 'Tour :')}{' '}
                <Text style={{ fontWeight: '700', color: tokens.text }}>{currentBuyerName}</Text>
              </Text>
            </View>

            <Text variant="labelSmall" style={{ color: tokens.textSecondary, marginTop: 2 }}>
              🕒 {t('lastPurchase')} {item.lastPurchasedAt ? `${formatDate(item.lastPurchasedAt, isEn)}${lastBuyerName ? ` ${t('by')} ${lastBuyerName}` : ''}` : t('noPurchaseRecord')}
            </Text>

            {!isInStock && (
              <View style={{ marginTop: 8, flexDirection: 'row' }}>
                <Button
                  mode="outlined"
                  compact
                  textColor="#10B981"
                  style={{
                    borderColor: 'rgba(16, 185, 129, 0.45)',
                    borderRadius: 14,
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)',
                  }}
                  labelStyle={{ fontSize: 11, fontWeight: '700' }}
                  onPress={() => handleCancelRestockSingle(item.id, item.name)}
                >
                  ✓ {t('cancelRestockBtn') || 'Remettre en stock'}
                </Button>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            paddingTop: Math.max(insets.top, 14),
          },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={{ fontWeight: '900', color: tokens.text }}>
              {t('inventoryTitle')}
            </Text>
            <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginTop: 2 }}>
              {t('inventorySub')}
            </Text>
          </View>
          <NotificationBell />
        </View>

        {/* Filter Chips & Select All Action */}
        <View style={styles.actionsBar}>
          <View style={styles.filterChipsRow}>
            <Chip
              selected={filterMode === 'purchased'}
              onPress={() => {
                soundService.playPopSound();
                setFilterMode('purchased');
              }}
              style={[
                styles.chip,
                filterMode === 'purchased' && { backgroundColor: tokens.primary },
              ]}
              textStyle={{
                color: filterMode === 'purchased' ? '#FFFFFF' : tokens.text,
                fontWeight: '700',
                fontSize: 12,
              }}
              compact
            >
              {t('purchasedOnly')}
            </Chip>

            <Chip
              selected={filterMode === 'all'}
              onPress={() => {
                soundService.playPopSound();
                setFilterMode('all');
              }}
              style={[
                styles.chip,
                filterMode === 'all' && { backgroundColor: tokens.primary },
              ]}
              textStyle={{
                color: filterMode === 'all' ? '#FFFFFF' : tokens.text,
                fontWeight: '700',
                fontSize: 12,
              }}
              compact
            >
              {t('allProductsCatalog')}
            </Chip>
          </View>

          {displayedProducts.length > 0 && (
            <Button
              mode="text"
              compact
              onPress={handleSelectAll}
              textColor={tokens.primary}
              labelStyle={{ fontSize: 13, fontWeight: '700' }}
            >
              {allSelected ? t('deselectAll') : t('selectAll')}
            </Button>
          )}
        </View>
      </View>

      {/* Main List */}
      <FlatList
        data={displayedProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 170 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={tokens.primary}
            colors={[tokens.primary]}
          />
        }
        ListEmptyComponent={
          loading && !refreshing ? (
            <ActivityIndicator style={{ marginTop: 40 }} size="large" color={tokens.primary} />
          ) : filterMode === 'purchased' && products.length > 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
              <Text style={{ fontSize: 44, marginBottom: 8 }}>📦</Text>
              <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
                {t('noInventory')}
              </Text>
              <Text variant="bodySmall" style={{ color: tokens.textSecondary, textAlign: 'center', marginTop: 4, paddingHorizontal: 16 }}>
                {t('noInventorySub')}
              </Text>
              <Button
                mode="outlined"
                textColor={tokens.primary}
                style={{ marginTop: 14, borderRadius: 18 }}
                onPress={() => {
                  soundService.playPopSound();
                  setFilterMode('all');
                }}
              >
                {t('allProductsCatalog')} ({products.length})
              </Button>
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
              <Text style={{ fontSize: 44, marginBottom: 8 }}>📦</Text>
              <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
                {t('noInventory')}
              </Text>
              <Text variant="bodySmall" style={{ color: tokens.textSecondary, textAlign: 'center', marginTop: 4, paddingHorizontal: 16 }}>
                {t('noInventorySub')}
              </Text>
            </View>
          )
        }
      />

      {/* Bottom Floating Restock Request Bar */}
      {selectedIds.size > 0 && (
        <View
          style={[
            styles.floatingBar,
            {
              bottom: 92 + insets.bottom,
              backgroundColor: isDark ? 'rgba(20, 24, 38, 0.96)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: tokens.border,
            },
          ]}
        >
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text variant="titleSmall" style={{ fontWeight: '900', color: tokens.text }}>
              {selectedIds.size} {t('itemsSelected')}
            </Text>
            <Text variant="bodySmall" style={{ color: tokens.textSecondary }}>
              {hasRestockNeededSelected && !hasInStockSelected
                ? (t('itemToRepurchase') || 'À racheter')
                : (t('inventoryTitle') || 'Inventaire')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {hasRestockNeededSelected && (
              <Button
                mode="contained"
                buttonColor="#10B981"
                textColor="#FFFFFF"
                loading={submitting}
                disabled={submitting}
                onPress={handleCancelRestockBatch}
                style={[styles.restockButton, hasInStockSelected && { marginRight: 8 }]}
                labelStyle={{ fontWeight: '800', fontSize: 12 }}
              >
                {t('cancelRestockBtn') || 'Remettre en stock'}
              </Button>
            )}

            {hasInStockSelected && (
              <Button
                mode="contained"
                buttonColor="#EF4444"
                textColor="#FFFFFF"
                loading={submitting}
                disabled={submitting}
                onPress={handleRequestRestock}
                style={styles.restockButton}
                labelStyle={{ fontWeight: '800', fontSize: 12 }}
              >
                {t('requestRestockBtn')}
              </Button>
            )}
          </View>
        </View>
      )}

      {/* Feedback Snackbar */}
      <Snackbar
        visible={Boolean(snackbarMessage)}
        onDismiss={() => setSnackbarMessage(null)}
        duration={3500}
        wrapperStyle={{ bottom: 88 + insets.bottom, zIndex: 99999 }}
        style={{
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.98)' : 'rgba(15, 23, 42, 0.96)',
          borderRadius: 18,
        }}
      >
        {snackbarMessage || ''}
      </Snackbar>
    </View>
  );
};

export default InventoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    borderRadius: 16,
    height: 32,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  itemCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginTop: 40,
    marginHorizontal: 16,
  },
  floatingBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 12,
  },
  restockButton: {
    borderRadius: 16,
  },
});
