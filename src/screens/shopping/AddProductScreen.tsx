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
  Surface,
  Snackbar,
  Avatar,
  Divider,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useShopping } from '../../hooks/useShopping';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { GroupMember } from '../../types';

/**
 * Resolves a user ID to a member display name.
 */
const getMemberName = (uid: string, members: GroupMember[]): string => {
  const member = members.find((m) => m.userId === uid || m.id === uid);
  return member?.displayName || member?.email || 'Membre inconnu';
};

const SUGGESTED_ICONS = [
  '🧻',
  '🧼',
  '☕',
  '🧽',
  '🥛',
  '🍞',
  '🍳',
  '🧴',
  '🗑️',
  '🧂',
  '🍎',
  '🧃',
  '🍷',
  '🍕',
  '🧺',
  '🧯',
];

interface AddProductScreenProps {
  navigation: {
    goBack: () => void;
  };
}

/**
 * Screen enabling admins to add a recurring shared shopping item
 * and configure its initial buyer rotation sequence.
 */
export const AddProductScreen: React.FC<AddProductScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { group, members } = useGroup();
  const { addProduct, loading } = useShopping();

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🧻');
  const [rotationOrder, setRotationOrder] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin =
    Boolean(user?.uid) &&
    (group?.adminUid === user?.uid ||
      members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin'));

  // Initialize rotation order with all member user IDs
  useEffect(() => {
    if (members && members.length > 0 && rotationOrder.length === 0) {
      const uids = members.map((m) => m.userId || m.id);
      setRotationOrder(uids);
    }
  }, [members, rotationOrder.length]);

  /**
   * Moves a member up one rank in rotation order.
   */
  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...rotationOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    setRotationOrder(newOrder);
  };

  /**
   * Moves a member down one rank in rotation order.
   */
  const moveDown = (index: number) => {
    if (index >= rotationOrder.length - 1) return;
    const newOrder = [...rotationOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    setRotationOrder(newOrder);
  };

  /**
   * Validates and submits new product creation.
   */
  const handleAddProduct = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Veuillez saisir le nom du produit.');
      setSnackbarVisible(true);
      return;
    }

    if (rotationOrder.length < 2 && members.length >= 2) {
      setErrorMessage("L'ordre de rotation doit contenir au moins 2 colocataires.");
      setSnackbarVisible(true);
      return;
    }

    if (rotationOrder.length === 0) {
      setErrorMessage('Veuillez inclure au moins un membre dans la rotation.');
      setSnackbarVisible(true);
      return;
    }

    setSubmitting(true);
    try {
      await addProduct(trimmedName, selectedIcon, rotationOrder);
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la création du produit.';
      setErrorMessage(message);
      setSnackbarVisible(true);
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.unauthorizedContainer}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text variant="titleMedium" style={styles.unauthorizedTitle}>
          Accès réservé à l'administrateur
        </Text>
        <Text variant="bodyMedium" style={styles.unauthorizedSubtitle}>
          Seul l'administrateur de la colocation peut ajouter des produits partagés à la rotation.
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
          Retour
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flexContainer}
    >
      <View style={styles.contentWrapper}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
            labelStyle={{ fontSize: 16 }}
          >
            ← Retour
          </Button>
          <Text variant="titleMedium" style={styles.screenTitle}>
            Nouveau Produit
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name Input */}
          <Surface style={styles.cardSection}>
            <Text variant="titleSmall" style={styles.sectionLabel}>
              Nom de l'article partagé
            </Text>
            <TextInput
              placeholder="Ex: Papier toilette, Lessive, Liquide vaisselle..."
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              disabled={submitting}
            />
          </Surface>

          {/* Icon Picker */}
          <Surface style={styles.cardSection}>
            <Text variant="titleSmall" style={styles.sectionLabel}>
              Icône associée : {selectedIcon}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.iconsRow}
            >
              {SUGGESTED_ICONS.map((icon) => {
                const isSelected = selectedIcon === icon;
                return (
                  <TouchableOpacity
                    key={`icon-${icon}`}
                    onPress={() => setSelectedIcon(icon)}
                    style={[styles.iconChip, isSelected && styles.selectedIconChip]}
                  >
                    <Text style={styles.iconEmoji}>{icon}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Surface>

          {/* Rotation Order Section */}
          <Surface style={styles.cardSection}>
            <Text variant="titleSmall" style={styles.sectionLabel}>
              Ordre de passage ({rotationOrder.length} colocataires)
            </Text>
            <Text variant="bodySmall" style={styles.sectionSubtitle}>
              Le colocataire #1 achètera en premier. Ajustez avec les boutons ▲ et ▼ :
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
                        <Text variant="labelLarge" style={styles.orderBadgeText}>
                          {index + 1}
                        </Text>
                      </View>

                      <Avatar.Text
                        size={34}
                        label={memberName.charAt(0).toUpperCase()}
                        style={styles.memberAvatar}
                      />

                      <Text variant="bodyMedium" style={styles.memberName} numberOfLines={1}>
                        {memberName}
                      </Text>

                      <View style={styles.orderButtons}>
                        <Button
                          mode="text"
                          compact
                          disabled={isFirst || submitting}
                          onPress={() => moveUp(index)}
                        >
                          ▲
                        </Button>
                        <Button
                          mode="text"
                          compact
                          disabled={isLast || submitting}
                          onPress={() => moveDown(index)}
                        >
                          ▼
                        </Button>
                      </View>
                    </View>
                    {index < rotationOrder.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </View>
          </Surface>

          {/* Submit Button */}
          <Button
            mode="contained"
            buttonColor={colors.primary}
            onPress={handleAddProduct}
            loading={submitting || loading}
            disabled={submitting || loading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            Ajouter à la rotation
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
        style={styles.snackbar}
      >
        {errorMessage || ''}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: colors.background,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    elevation: 2,
  },
  screenTitle: {
    fontWeight: '800',
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  cardSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
  input: {
    marginTop: spacing.xs,
  },
  iconsRow: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  iconChip: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  selectedIconChip: {
    borderColor: colors.primary,
    backgroundColor: '#EEF2FF',
  },
  iconEmoji: {
    fontSize: 22,
  },
  rotationList: {
    marginTop: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  orderBadge: {
    width: 24,
    alignItems: 'center',
  },
  orderBadgeText: {
    fontWeight: '800',
    color: colors.textSecondary,
  },
  memberAvatar: {
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
    marginLeft: spacing.xs,
  },
  memberName: {
    flex: 1,
    fontWeight: '600',
    color: colors.text,
  },
  orderButtons: {
    flexDirection: 'row',
  },
  submitButton: {
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  submitButtonContent: {
    paddingVertical: spacing.xs,
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  lockIcon: {
    fontSize: 54,
    marginBottom: spacing.md,
  },
  unauthorizedTitle: {
    fontWeight: '800',
    color: colors.text,
  },
  unauthorizedSubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  snackbar: {
    backgroundColor: colors.error,
  },
});

export default AddProductScreen;
