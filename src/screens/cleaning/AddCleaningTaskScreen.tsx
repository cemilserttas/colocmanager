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
  SegmentedButtons,
  Chip,
  Snackbar,
  Avatar,
  Divider,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useCleaning } from '../../hooks/useCleaning';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';
import { notificationService } from '../../services/notificationService';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { CleaningFrequency, GroupMember } from '../../types';
import { parseUserDate } from '../../services/cleaningService';

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
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t, language } = useLanguageStore();
  const isEn = language === 'en';

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
    soundService.playPopSound();
    if (index <= 0) return;
    const newOrder = [...rotationOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    setRotationOrder(newOrder);
  };

  const moveDown = (index: number) => {
    soundService.playPopSound();
    if (index >= rotationOrder.length - 1) return;
    const newOrder = [...rotationOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    setRotationOrder(newOrder);
  };

  const handleAddTask = async () => {
    soundService.playPopSound();
    const trimmedName = name.trim();
    const trimmedArea = area.trim();

    if (!trimmedName) {
      setErrorMessage(t('choreNameRequired'));
      setSnackbarVisible(true);
      return;
    }

    if (!trimmedArea) {
      setErrorMessage(t('areaRequired'));
      setSnackbarVisible(true);
      return;
    }

    const parsedDate = parseUserDate(dueDateText);
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      setErrorMessage(t('invalidDueDate'));
      setSnackbarVisible(true);
      return;
    }

    if (rotationOrder.length < 2 && members.length >= 2) {
      setErrorMessage(t('rotationMinMembers'));
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
        nextDueDate: parsedDate,
      });

      // Notify roommates in Firestore & local mobile push
      const firstCleanerUid = rotationOrder[0];
      if (firstCleanerUid) {
        try {
          await notificationService.addNotificationToFirestore(
            firstCleanerUid,
            'cleaning_turn',
            '🧹 C\'est votre tour pour le ménage !',
            `La tâche "${trimmedName}" (${trimmedArea}) a été planifiée. Vous êtes le premier assigné (échéance : ${dueDateText}) !`
          );
        } catch {}
      }

      const otherMembers = members.filter(
        (m) => (m.userId || m.id) !== user?.uid && (m.userId || m.id) !== firstCleanerUid
      );
      for (const m of otherMembers) {
        const uid = m.userId || m.id;
        try {
          await notificationService.addNotificationToFirestore(
            uid,
            'cleaning',
            '🧹 Nouvelle tâche de ménage !',
            `L'administrateur a programmé "${trimmedName}" (${trimmedArea}).`
          );
        } catch {}
      }

      soundService.playSuccessSound();
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : isEn ? 'Error creating cleaning chore.' : 'Erreur lors de la création de la tâche.';
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
          Accès réservé à l'administrateur
        </Text>
        <Text variant="bodyMedium" style={{ color: tokens.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 24 }}>
          Seul l'administrateur peut programmer de nouvelles corvées de ménage récurrentes.
        </Text>
        <Button
          mode="contained"
          onPress={() => {
            soundService.playPopSound();
            navigation.goBack();
          }}
          style={{ marginTop: spacing.md, backgroundColor: tokens.accent, borderRadius: 20 }}
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
        {/* Liquid Glass Header */}
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
          <Text variant="titleMedium" style={[styles.screenTitle, { color: tokens.text }]}>
            {t('addChoreTitle') || 'Nouvelle Tâche'}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 50 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name and Area */}
          <View style={[styles.cardSection, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text variant="titleSmall" style={[styles.sectionLabel, { color: tokens.text }]}>
              {t('choreNameLabel') || 'Détails de la tâche'}
            </Text>

            <TextInput
              label={t('choreNameLabel') || 'Nom de la tâche'}
              placeholder={t('choreNamePlaceholder') || 'Ex: Nettoyer la cuisine, Vider les poubelles...'}
              value={name}
              onChangeText={setName}
              mode="outlined"
              textColor={tokens.text}
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)' }]}
              outlineColor={tokens.border}
              activeOutlineColor={tokens.accent}
              disabled={submitting}
            />

            <TextInput
              label={t('areaLabel') || 'Zone ou pièce'}
              placeholder={t('areaPlaceholder') || 'Ex: Cuisine, Salle de bain, Salon, WC...'}
              value={area}
              onChangeText={setArea}
              mode="outlined"
              textColor={tokens.text}
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)' }]}
              outlineColor={tokens.border}
              activeOutlineColor={tokens.accent}
              disabled={submitting}
            />
          </View>

          {/* Frequency Segmented Buttons */}
          <View style={[styles.cardSection, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text variant="titleSmall" style={[styles.sectionLabel, { color: tokens.text }]}>
              {t('frequencyLabel') || 'Fréquence de répétition'}
            </Text>
            <SegmentedButtons
              value={frequency}
              onValueChange={(val) => {
                soundService.playPopSound();
                setFrequency(val as CleaningFrequency);
              }}
              buttons={[
                { value: 'daily', label: t('daily') || 'Quotidien' },
                { value: 'weekly', label: t('weekly') || 'Hebdo (7j)' },
                { value: 'biweekly', label: t('biweekly') || '2 sem.' },
                { value: 'monthly', label: t('monthly') || 'Mois' },
              ]}
              style={styles.segmentedButtons}
            />

            {/* Recurrence Explanation Card */}
            <View
              style={{
                marginTop: spacing.sm,
                padding: spacing.sm + 2,
                borderRadius: 14,
                backgroundColor: isDark ? 'rgba(2, 132, 199, 0.12)' : 'rgba(2, 132, 199, 0.08)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(2, 132, 199, 0.3)' : 'rgba(2, 132, 199, 0.2)',
              }}
            >
              <Text style={{ fontSize: 13, color: isDark ? '#7DD3FC' : '#0369A1', lineHeight: 18, fontWeight: '500' }}>
                🔄 <Text style={{ fontWeight: '700' }}>Répétition continue :</Text> Cette tâche débutera le{' '}
                <Text style={{ fontWeight: '700' }}>
                  {(() => {
                    const d = parseUserDate(dueDateText);
                    return d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : dueDateText;
                  })()}
                </Text>{' '}
                et se répètera automatiquement{' '}
                <Text style={{ fontWeight: '700' }}>
                  {frequency === 'daily'
                    ? 'tous les jours'
                    : frequency === 'weekly'
                    ? 'chaque semaine'
                    : frequency === 'biweekly'
                    ? 'toutes les 2 semaines'
                    : 'chaque mois'}
                </Text>
                . Dès qu'un colocataire valide le ménage, l'échéance avance automatiquement et le tour passe au colocataire suivant jusqu'à ce que vous supprimiez la tâche.
              </Text>
            </View>
          </View>

          {/* First Due Date */}
          <View style={[styles.cardSection, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text variant="titleSmall" style={[styles.sectionLabel, { color: tokens.text }]}>
              {t('dueDate') || "Première date d'échéance"}
            </Text>
            
            {/* HTML5 native date picker on web, standard TextInput on mobile */}
            {Platform.OS === 'web' ? (
              <View style={{ marginBottom: 12 }}>
                <input
                  type="date"
                  value={dueDateText}
                  onChange={(e: any) => setDueDateText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: `1.5px solid ${tokens.border}`,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
                    color: tokens.text,
                    fontSize: 15,
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                  disabled={submitting}
                />
              </View>
            ) : (
              <TextInput
                placeholder="AAAA-MM-JJ (ex: 2026-10-21)"
                value={dueDateText}
                onChangeText={setDueDateText}
                mode="outlined"
                textColor={tokens.text}
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)' }]}
                outlineColor={tokens.border}
                activeOutlineColor={tokens.accent}
                disabled={submitting}
              />
            )}

            {/* Quick helper preview */}
            {dueDateText ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                }}
              >
                <Text variant="labelMedium" style={{ color: parseUserDate(dueDateText) ? (isDark ? '#34D399' : '#059669') : '#EF4444', fontWeight: '700' }}>
                  {(() => {
                    const d = parseUserDate(dueDateText);
                    return d
                      ? `✓ Début programmé : ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
                      : '⚠️ Format de date non reconnu (ex: 2026-10-21 ou 21/10/2026)';
                  })()}
                </Text>
              </View>
            ) : null}

            {/* Date presets */}
            <View style={styles.presetsRow}>
              <Chip
                compact
                onPress={() => {
                  soundService.playPopSound();
                  setDueDateText(getFutureDateString(0));
                }}
                style={[styles.presetChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                textStyle={{ color: tokens.text, fontSize: 12 }}
              >
                Aujourd'hui
              </Chip>
              <Chip
                compact
                onPress={() => {
                  soundService.playPopSound();
                  setDueDateText(getFutureDateString(1));
                }}
                style={[styles.presetChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                textStyle={{ color: tokens.text, fontSize: 12 }}
              >
                Demain
              </Chip>
              <Chip
                compact
                onPress={() => {
                  soundService.playPopSound();
                  setDueDateText(getFutureDateString(7));
                }}
                style={[styles.presetChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                textStyle={{ color: tokens.text, fontSize: 12 }}
              >
                Dans 1 semaine
              </Chip>
              <Chip
                compact
                onPress={() => {
                  soundService.playPopSound();
                  setDueDateText(getFutureDateString(14));
                }}
                style={[styles.presetChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                textStyle={{ color: tokens.text, fontSize: 12 }}
              >
                Dans 2 semaines
              </Chip>
            </View>
          </View>

          {/* Rotation Order Section */}
          <View style={[styles.cardSection, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text variant="titleSmall" style={[styles.sectionLabel, { color: tokens.text }]}>
              {t('rotationOrder') || 'Ordre de passage'} ({rotationOrder.length} colocataires)
            </Text>
            <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: tokens.textSecondary }]}>
              {t('rotationOrderSub') || 'Le colocataire #1 effectuera la tâche en premier.'}
            </Text>

            <View style={styles.rotationList}>
              {rotationOrder.map((uid, index) => {
                const memberName = getMemberName(uid, members);
                const isFirst = index === 0;
                const isLast = index === rotationOrder.length - 1;

                return (
                  <React.Fragment key={`add-clean-rot-${uid}`}>
                    <View style={styles.memberRow}>
                      <View style={[styles.orderBadge, { backgroundColor: index === 0 ? 'rgba(16, 185, 129, 0.15)' : 'transparent' }]}>
                        <Text variant="labelLarge" style={[styles.orderBadgeText, { color: index === 0 ? '#10B981' : tokens.textSecondary }]}>
                          {index + 1}
                        </Text>
                      </View>

                      <Avatar.Text
                        size={34}
                        label={memberName.charAt(0).toUpperCase()}
                        style={[styles.memberAvatar, { backgroundColor: '#10B981' }]}
                      />

                      <Text variant="bodyMedium" style={[styles.memberName, { color: tokens.text }]} numberOfLines={1}>
                        {memberName} {index === 0 ? ' (Prochain)' : ''}
                      </Text>

                      <View style={styles.orderButtons}>
                        <Button
                          mode="text"
                          compact
                          disabled={isFirst || submitting}
                          onPress={() => moveUp(index)}
                          textColor={tokens.accent}
                        >
                          ▲
                        </Button>
                        <Button
                          mode="text"
                          compact
                          disabled={isLast || submitting}
                          onPress={() => moveDown(index)}
                          textColor={tokens.accent}
                        >
                          ▼
                        </Button>
                      </View>
                    </View>
                    {index < rotationOrder.length - 1 && <Divider style={{ backgroundColor: tokens.border }} />}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* Submit Button */}
          <Button
            mode="contained"
            buttonColor="#10B981"
            onPress={handleAddTask}
            loading={submitting || loading}
            disabled={submitting || loading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            {t('createChoreBtn') || 'Créer la tâche de ménage'}
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle: {
    fontWeight: '800',
    fontSize: 18,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 3,
  },
  cardSection: {
    padding: spacing.md,
    borderRadius: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  sectionLabel: {
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
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
    borderRadius: 14,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    fontWeight: '800',
  },
  memberAvatar: {
    marginRight: spacing.sm,
    marginLeft: spacing.xs,
  },
  memberName: {
    flex: 1,
    fontWeight: '600',
  },
  orderButtons: {
    flexDirection: 'row',
  },
  submitButton: {
    borderRadius: 24,
    marginTop: spacing.sm,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  lockIcon: {
    fontSize: 54,
    marginBottom: spacing.md,
  },
  snackbar: {
    backgroundColor: colors.error,
  },
});

export default AddCleaningTaskScreen;
