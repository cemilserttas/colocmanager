import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  IconButton,
  Surface,
  SegmentedButtons,
  Snackbar,
  Avatar,
  Divider,
  Chip,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useCleaning } from '../../hooks/useCleaning';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { GroupMember, CleaningFrequency } from '../../types';

/**
 * Resolves a user ID to a member display name.
 */
const getMemberName = (uid: string, members: GroupMember[]): string => {
  const member = members.find((m) => m.userId === uid || m.id === uid);
  return member?.displayName || member?.email || 'Membre inconnu';
};

/**
 * Returns formatted date string (YYYY-MM-DD) for days in the future.
 */
const getFutureDateString = (daysAhead: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

interface AddCleaningTaskScreenProps {
  navigation: {
    goBack: () => void;
  };
}

/**
 * Screen enabling admins to configure a new recurring cleaning chore,
 * frequency, due date, and member rotation order.
 */
export const AddCleaningTaskScreen: React.FC<AddCleaningTaskScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { group, members } = useGroup();
  const { addTask, loading } = useCleaning();

  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [frequency, setFrequency] = useState<CleaningFrequency>('weekly');
  const [dueDateText, setDueDateText] = useState(getFutureDateString(7));
  const [rotationOrder, setRotationOrder] = useState<string[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin =
    group?.adminUid === user?.uid ||
    members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin');

  // Initialize rotation order with all member IDs
  useEffect(() => {
    if (members && members.length > 0 && rotationOrder.length === 0) {
      const uids = members.map((m) => m.userId || m.id);
      setRotationOrder(uids);
    }
  }, [members, rotationOrder.length]);

  /**
   * Moves a member up one rank in rotation.
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
   * Moves a member down one rank in rotation.
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
   * Validates form and submits new chore task creation.
   */
  const handleAddTask = async () => {
    const trimmedName = name.trim();
    const trimmedArea = area.trim();
    const trimmedDate = dueDateText.trim();

    if (!trimmedName) {
      setErrorMessage('Veuillez renseigner le nom de la tâche (ex: Nettoyer la cuisine).');
      setSnackbarVisible(true);
      return;
    }

    if (!trimmedArea) {
      setErrorMessage('Veuillez spécifier la zone ou pièce (ex: Cuisine, Salle de bain...).');
      setSnackbarVisible(true);
      return;
    }

    // Basic date validation YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(trimmedDate) || isNaN(new Date(trimmedDate).getTime())) {
      setErrorMessage('Format de date invalide. Utilisez AAAA-MM-JJ (ex: 2026-10-25).');
      setSnackbarVisible(true);
      return;
    }

    if (rotationOrder.length < 1) {
      setErrorMessage('Veuillez inclure au moins un colocataire dans la rotation.');
      setSnackbarVisible(true);
      return;
    }

    setSubmitting(true);
    try {
      await addTask({
        name: trimmedName,
        area: trimmedArea,
        frequency,
        rotationOrder,
        nextDueDate: new Date(trimmedDate).toISOString(),
      });
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la création de la tâche de ménage.';
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
          Accès administrateur requis
        </Text>
        <Text variant="bodyMedium" style={styles.unauthorizedSubtitle}>
          Seul l'administrateur peut planifier de nouvelles corvées d'entretien.
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
      {/* Top Bar */}
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={styles.screenTitle}>
          Nouvelle tâche de ménage
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name and Area */}
        <Surface style={styles.cardSection}>
          <Text variant="titleSmall" style={styles.sectionLabel}>
            Détails de la tâche
          </Text>

          <TextInput
            label="Nom de la tâche"
            placeholder="Ex: Passer la serpillère, Vider les poubelles..."
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            disabled={submitting}
          />

          <TextInput
            label="Zone ou pièce"
            placeholder="Ex: Cuisine, Salon, Salle de bain, WC..."
            value={area}
            onChangeText={setArea}
            mode="outlined"
            style={styles.input}
            disabled={submitting}
          />
        </Surface>

        {/* Frequency Segmented Buttons */}
        <Surface style={styles.cardSection}>
          <Text variant="titleSmall" style={styles.sectionLabel}>
            Fréquence de répétition
          </Text>
          <SegmentedButtons
            value={frequency}
            onValueChange={(val) => setFrequency(val as CleaningFrequency)}
            buttons={[
              { value: 'weekly', label: 'Hebdo' },
              { value: 'biweekly', label: 'Bi-hebdo' },
              { value: 'monthly', label: 'Mensuelle' },
            ]}
            style={styles.segmentedButtons}
          />
        </Surface>

        {/* First Due Date */}
        <Surface style={styles.cardSection}>
          <Text variant="titleSmall" style={styles.sectionLabel}>
            Première date d'échéance (AAAA-MM-JJ)
          </Text>
          <TextInput
            placeholder="2026-10-25"
            value={dueDateText}
            onChangeText={setDueDateText}
            mode="outlined"
            left={<TextInput.Icon icon="calendar" />}
            style={styles.input}
            disabled={submitting}
          />

          {/* Date presets */}
          <View style={styles.presetsRow}>
            <Chip
              compact
              onPress={() => setDueDateText(getFutureDateString(1))}
              style={styles.presetChip}
            >
              Demain
            </Chip>
            <Chip
              compact
              onPress={() => setDueDateText(getFutureDateString(3))}
              style={styles.presetChip}
            >
              Dans 3 jours
            </Chip>
            <Chip
              compact
              onPress={() => setDueDateText(getFutureDateString(7))}
              style={styles.presetChip}
            >
              Dans 7 jours
            </Chip>
            <Chip
              compact
              onPress={() => setDueDateText(getFutureDateString(14))}
              style={styles.presetChip}
            >
              Dans 14 jours
            </Chip>
          </View>
        </Surface>

        {/* Rotation Order Section */}
        <Surface style={styles.cardSection}>
          <Text variant="titleSmall" style={styles.sectionLabel}>
            Ordre de rotation ({rotationOrder.length} membres)
          </Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>
            Le colocataire #1 effectuera le ménage pour la première échéance.
          </Text>

          <View style={styles.rotationList}>
            {rotationOrder.map((uid, index) => {
              const memberName = getMemberName(uid, members);
              const isFirst = index === 0;
              const isLast = index === rotationOrder.length - 1;

              return (
                <React.Fragment key={`add-clean-rot-${uid}`}>
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
                      <IconButton
                        icon="arrow-up"
                        size={18}
                        disabled={isFirst || submitting}
                        onPress={() => moveUp(index)}
                      />
                      <IconButton
                        icon="arrow-down"
                        size={18}
                        disabled={isLast || submitting}
                        onPress={() => moveDown(index)}
                      />
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
          onPress={handleAddTask}
          loading={submitting || loading}
          disabled={submitting || loading}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          Créer la tâche
        </Button>
      </ScrollView>

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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    elevation: 2,
  },
  screenTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  cardSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    elevation: 1,
  },
  sectionLabel: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    marginBottom: spacing.sm,
  },
  segmentedButtons: {
    marginTop: spacing.xs,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  presetChip: {
    backgroundColor: '#ECEFF1',
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
    fontWeight: '700',
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
    fontWeight: '700',
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

export default AddCleaningTaskScreen;
