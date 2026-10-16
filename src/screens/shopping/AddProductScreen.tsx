import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Snackbar,
  Avatar,
  Divider,
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
import { GroupMember } from '../../types';

const getMemberName = (uid: string, members: GroupMember[]): string => {
  const member = members.find((m) => m.userId === uid || m.id === uid);
  return member?.displayName || member?.email || 'Membre inconnu';
};

interface AddProductScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export const AddProductScreen: React.FC<AddProductScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t, language } = useLanguageStore();
  const isEn = language === 'en';

  const { user } = useAuth();
  const { group, members } = useGroup();
  const { addProduct, loading } = useShopping();

  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [rotationOrder, setRotationOrder] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin =
    Boolean(user?.uid) &&
    (group?.adminUid === user?.uid ||
      members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin'));

  useEffect(() => {
    if (members && members.length > 0 && rotationOrder.length === 0) {
      const uids = members.map((m) => m.userId || m.id);
      setRotationOrder(uids);
    }
  }, [members, rotationOrder.length]);

  const moveUp = (index: number) => {
    if (index <= 0) return;
    soundService.playPopSound();
    const newOrder = [...rotationOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    setRotationOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index >= rotationOrder.length - 1) return;
    soundService.playPopSound();
    const newOrder = [...rotationOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    setRotationOrder(newOrder);
  };

  const handleAddProduct = async () => {
    soundService.playPopSound();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage(t('productNameRequired'));
      setSnackbarVisible(true);
      return;
    }

    if (rotationOrder.length < 2 && members.length >= 2) {
      setErrorMessage(t('rotationMinMembers'));
      setSnackbarVisible(true);
      return;
    }

    if (rotationOrder.length === 0) {
      setErrorMessage(t('rotationAtLeastOne'));
      setSnackbarVisible(true);
      return;
    }

    setSubmitting(true);
    try {
      await addProduct(trimmedName, '🛒', rotationOrder, comment.trim() || undefined);

      // Notify roommates in Firestore & mobile push
      const firstBuyerUid = rotationOrder[0];
      if (firstBuyerUid) {
        try {
          await notificationService.addNotificationToFirestore(
            firstBuyerUid,
            'purchase_turn',
            '🛒 C\'est votre tour d\'acheter !',
            `Le produit "${trimmedName}" a été ajouté. Vous êtes le premier responsable de cet achat !`
          );
        } catch {}
      }

      const otherMembers = members.filter(
        (m) => (m.userId || m.id) !== user?.uid && (m.userId || m.id) !== firstBuyerUid
      );
      for (const m of otherMembers) {
        const uid = m.userId || m.id;
        try {
          await notificationService.addNotificationToFirestore(
            uid,
            'shopping',
            '🛒 Nouveau produit ajouté !',
            `L'administrateur a ajouté "${trimmedName}" à la liste des courses partagées.`
          );
        } catch {}
      }

      soundService.playSuccessSound();
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : isEn ? 'Error creating product.' : 'Erreur lors de la création du produit.';
      setErrorMessage(message);
      setSnackbarVisible(true);
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={[styles.unauthorizedContainer, { backgroundColor: tokens.bg }]}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
          {t('adminShoppingTitle')}
        </Text>
        <Text variant="bodyMedium" style={{ color: tokens.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 24 }}>
          {t('adminShoppingSub')}
        </Text>
        <Button
          mode="contained"
          buttonColor={tokens.primary}
          textColor="#FFFFFF"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 16, borderRadius: 16 }}
        >
          {t('back')}
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flexContainer, { backgroundColor: tokens.bg }]}
    >
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              paddingTop: Math.max(insets.top, 12),
            },
          ]}
        >
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
            textColor={tokens.primary}
            labelStyle={{ fontSize: 16 }}
          >
            ← {t('back')}
          </Button>
          <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
            {t('addProductTitle')}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 50 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name Input */}
          <View style={[styles.cardSection, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text variant="titleSmall" style={[styles.sectionLabel, { color: tokens.text }]}>
              {t('productNameLabel')}
            </Text>
            <TextInput
              placeholder={t('productNamePlaceholder')}
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={{ backgroundColor: 'transparent' }}
              textColor={tokens.text}
              outlineColor={tokens.borderSubtle}
              activeOutlineColor={tokens.primary}
              disabled={submitting}
            />
          </View>

          {/* Comment Input */}
          <View style={[styles.cardSection, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text variant="titleSmall" style={[styles.sectionLabel, { color: tokens.text }]}>
              {t('commentLabel')}
            </Text>
            <TextInput
              placeholder={t('commentPlaceholder')}
              value={comment}
              onChangeText={setComment}
              mode="outlined"
              style={{ backgroundColor: 'transparent' }}
              textColor={tokens.text}
              outlineColor={tokens.borderSubtle}
              activeOutlineColor={tokens.primary}
              disabled={submitting}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Rotation Order Section */}
          <View style={[styles.cardSection, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text variant="titleSmall" style={[styles.sectionLabel, { color: tokens.text }]}>
              {t('rotationOrder')} ({rotationOrder.length})
            </Text>
            <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginBottom: 12 }}>
              {t('rotationOrderSub')}
            </Text>

            <View style={styles.rotationList}>
              {rotationOrder.map((uid, index) => {
                const memberName = getMemberName(uid, members);
                const isFirst = index === 0;
                const isLast = index === rotationOrder.length - 1;

                return (
                  <React.Fragment key={`add-rot-${uid}`}>
                    <View style={styles.memberRow}>
                      <View style={styles.orderBadge}>
                        <Text variant="labelLarge" style={{ fontWeight: '800', color: tokens.primary }}>
                          {index + 1}
                        </Text>
                      </View>

                      <Avatar.Text
                        size={34}
                        label={memberName.charAt(0).toUpperCase()}
                        style={{ backgroundColor: tokens.primary, marginRight: 10, marginLeft: 4 }}
                      />

                      <Text variant="bodyMedium" style={{ flex: 1, fontWeight: '700', color: tokens.text }} numberOfLines={1}>
                        {memberName}
                      </Text>

                      <View style={styles.orderButtons}>
                        <Button
                          mode="text"
                          compact
                          textColor={tokens.primary}
                          disabled={isFirst || submitting}
                          onPress={() => moveUp(index)}
                        >
                          ▲
                        </Button>
                        <Button
                          mode="text"
                          compact
                          textColor={tokens.primary}
                          disabled={isLast || submitting}
                          onPress={() => moveDown(index)}
                        >
                          ▼
                        </Button>
                      </View>
                    </View>
                    {index < rotationOrder.length - 1 && <Divider style={{ backgroundColor: tokens.borderSubtle }} />}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* Submit Button */}
          <Button
            mode="contained"
            buttonColor={tokens.primary}
            textColor="#FFFFFF"
            onPress={handleAddProduct}
            loading={submitting || loading}
            disabled={submitting || loading}
            style={styles.submitButton}
            contentStyle={{ paddingVertical: 6 }}
            labelStyle={{ fontWeight: '800', fontSize: 15 }}
          >
            {t('addRotationBtn')}
          </Button>
        </ScrollView>
      </View>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => {
          setSnackbarVisible(false);
          setErrorMessage(null);
        }}
        duration={3500}
        wrapperStyle={{ bottom: Math.max(insets.bottom, 16), zIndex: 99999 }}
        style={{ backgroundColor: tokens.error, borderRadius: 16 }}
      >
        {errorMessage || ''}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  cardSection: {
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1.2,
  },
  sectionLabel: {
    fontWeight: '800',
    marginBottom: 6,
  },
  iconsRow: {
    paddingVertical: 6,
    gap: 8,
  },
  iconChip: {
    padding: 10,
    borderRadius: 18,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
    minHeight: 46,
  },
  iconEmoji: {
    fontSize: 22,
  },
  rotationList: {
    marginTop: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  orderBadge: {
    width: 24,
    alignItems: 'center',
  },
  orderButtons: {
    flexDirection: 'row',
  },
  submitButton: {
    borderRadius: 20,
    marginTop: 8,
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  lockIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
});

export default AddProductScreen;
