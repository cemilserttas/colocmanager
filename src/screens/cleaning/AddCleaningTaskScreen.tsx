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
  Surface,
  SegmentedButtons,
  Chip,
  Snackbar,
  Avatar,
  Divider,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useCleaning } from '../../hooks/useCleaning';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { CleaningFrequency, GroupMember } from '../../types';

/**
 * Resolves a user ID to a member display name.
 */
const getMemberName = (uid: string, members: GroupMember[]): string => {
  const member = members.find((m) => m.userId === uid || m.id === uid);
  return member?.displayName || member?.email || 'Membre inconnu';
};

/**
 * Returns future date string formatted YYYY-MM-DD.
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
 * Screen enabling admins to define recurring house chores,
 * cleaning frequency, initial deadlines, and assignment rotation.
 */
export const AddCleaningTaskScreen: React.FC<AddCleaningTaskScreenProps> = ({
  navigation,
}) => {
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
    const newOrder = [...rotationOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    setRotationOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index >= rotationOrder.length - 1) return;
    const newOrder = [...rotationOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    setRotationOrder(newOrder);
  };

  const handleAddTask = async () => {
    const trimmedName = name.trim();
    const trimmedArea = area.trim();

    if (!trimmedName) {
      setErrorMessage('Veuillez saisir le nom de la tâche.');
      setSnackbarVisible(true);
      return;
    }

    if (!trimmedArea) {
      setErrorMessage('Veuillez spécifier la zone ou pièce concernée.');
      setSnackbarVisible(true);
      return;
    }

    const parsedDate = new Date(dueDateText);
    if (isNaN(parsedDate.getTime())) {
      setErrorMessage('La date d\'échéance est invalide. Format attendu : AAAA-MM-JJ');
      setSnackbarVisible(true);
      return;
    }

    if (rotationOrder.length < 2 && members.length >= 2) {
      setErrorMessage('La rotation doit comporter au moins 2 colocataires.');
      setSnackbarVisible(true);
      return;
    }

    setSubmitting(true);
    try {
      await addTask(
        trimmedName,
        trimmedArea,
        frequency,
        parsedDate.toISOString(),
        rotationOrder
      );
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la création de la tâche.';
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
          Seul l'administrateur peut programmer de nouvelles corvées de ménage récurrentes.
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
            Nouvelle Tâche de Ménage
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name and Area */}
          <Surface style={styles.cardSection}>
            <Text variant="titleSmall" style={styles.sectionLabel}>
              Détails de la tâche
            </Text>

            <TextInput
              label="Nom de la tâche"
              placeholder="Ex: Nettoyer la cuisine, Vider les poubelles..."
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              disabled={submitting}
            />

            <TextInput
              label="Zone ou pièce"
              placeholder="Ex: Cuisine, Salle de bain, Salon, WC..."
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
              Ordre de passage ({rotationOrder.length} colocataires)
            </Text>
            <Text variant="bodySmall" style={styles.sectionSubtitle}>
              Le colocataire #1 effectuera la tâche en premier.
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
            buttonColor={colors.secondary}
            onPress={handleAddTask}
            loading={submitting || loading}
            disabled={submitting || loading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            Créer la tâche de ménage
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
    backgroundColor: '#F1F5F9',
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
    backgroundColor: colors.secondary,
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

export default AddCleaningTaskScreen;
