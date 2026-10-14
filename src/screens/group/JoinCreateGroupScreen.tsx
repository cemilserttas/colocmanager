import React, { useState } from 'react';
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
  Card,
  Snackbar,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface JoinCreateGroupScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    replace?: (screen: string) => void;
    reset?: (state: any) => void;
  };
}

type Mode = 'idle' | 'create' | 'join';

/**
 * Screen presenting onboarding choice to either create a new shared flat group
 * or join an existing group with an invite code.
 */
export const JoinCreateGroupScreen: React.FC<JoinCreateGroupScreenProps> = ({ navigation }) => {
  const paperTheme = useTheme();
  const { user } = useAuth();
  const { createGroup, joinGroup, loading, error: groupError } = useGroup();

  const [activeMode, setActiveMode] = useState<Mode>('idle');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  /**
   * Dispatches new group creation.
   */
  const handleCreateGroup = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setErrorMessage('Veuillez renseigner un nom pour votre colocation.');
      setSnackbarVisible(true);
      return;
    }

    try {
      await createGroup(trimmedName);
      if (navigation.replace) {
        navigation.replace('Main');
      } else {
        navigation.navigate('Main');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Impossible de créer le groupe. Réessayez.';
      setErrorMessage(message);
      setSnackbarVisible(true);
    }
  };

  /**
   * Dispatches joining an existing group via invite code.
   */
  const handleJoinGroup = async () => {
    const trimmedCode = inviteCode.trim().toUpperCase();
    if (!trimmedCode) {
      setErrorMessage("Veuillez saisir le code d'invitation.");
      setSnackbarVisible(true);
      return;
    }

    try {
      await joinGroup(trimmedCode);
      if (navigation.replace) {
        navigation.replace('Main');
      } else {
        navigation.navigate('Main');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Code invalide ou introuvable. Vérifiez la saisie.';
      setErrorMessage(message);
      setSnackbarVisible(true);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flexContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.greeting}>
            Bienvenue{user?.displayName ? `, ${user.displayName}` : ''} ! 👋
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Pour commencer, configurez votre colocation ou rejoignez vos colocataires.
          </Text>
        </View>

        {/* Option 1: Create Group Card */}
        <Card
          style={[
            styles.card,
            activeMode === 'create' && { borderColor: paperTheme.colors.primary, borderWidth: 2 },
          ]}
          onPress={() => setActiveMode(activeMode === 'create' ? 'idle' : 'create')}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🏠</Text>
              <View style={styles.cardTitleContainer}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Créer un groupe
                </Text>
                <Text variant="bodySmall" style={styles.cardSubtitle}>
                  Vous êtes le premier colocataire ? Initialisez l'espace commun.
                </Text>
              </View>
            </View>

            {activeMode === 'create' && (
              <View style={styles.actionForm}>
                <TextInput
                  label="Nom de la colocation"
                  placeholder="Ex: Les Lauriers, Appart 4B..."
                  value={groupName}
                  onChangeText={setGroupName}
                  mode="outlined"
                  disabled={loading}
                  style={styles.input}
                  autoFocus
                />
                <Button
                  mode="contained"
                  onPress={handleCreateGroup}
                  loading={loading}
                  disabled={loading}
                  style={styles.actionButton}
                >
                  Valider et créer
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Option 2: Join Group Card */}
        <Card
          style={[
            styles.card,
            activeMode === 'join' && { borderColor: paperTheme.colors.primary, borderWidth: 2 },
          ]}
          onPress={() => setActiveMode(activeMode === 'join' ? 'idle' : 'join')}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🔗</Text>
              <View style={styles.cardTitleContainer}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Rejoindre un groupe
                </Text>
                <Text variant="bodySmall" style={styles.cardSubtitle}>
                  Utilisez le code à 6 caractères partagé par vos colocataires.
                </Text>
              </View>
            </View>

            {activeMode === 'join' && (
              <View style={styles.actionForm}>
                <TextInput
                  label="Code d'invitation"
                  placeholder="Ex: ABC123"
                  value={inviteCode}
                  onChangeText={(val) => setInviteCode(val.toUpperCase())}
                  mode="outlined"
                  autoCapitalize="characters"
                  disabled={loading}
                  style={styles.input}
                  autoFocus
                />
                <Button
                  mode="contained"
                  onPress={handleJoinGroup}
                  loading={loading}
                  disabled={loading}
                  style={styles.actionButton}
                >
                  Rejoindre le groupe
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {loading && (
          <ActivityIndicator
            animating
            size="large"
            color={colors.primary}
            style={styles.loadingIndicator}
          />
        )}

        {/* Error Feedback */}
        <Snackbar
          visible={snackbarVisible || Boolean(groupError)}
          onDismiss={() => {
            setSnackbarVisible(false);
            setErrorMessage(null);
          }}
          duration={4000}
          action={{
            label: 'OK',
            onPress: () => {
              setSnackbarVisible(false);
              setErrorMessage(null);
            },
          }}
          style={styles.snackbar}
        >
          {errorMessage || groupError || 'Une erreur est survenue.'}
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 36,
    marginRight: spacing.md,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionForm: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    marginBottom: spacing.md,
  },
  actionButton: {
    borderRadius: borderRadius.md,
  },
  loadingIndicator: {
    marginTop: spacing.md,
  },
  snackbar: {
    backgroundColor: colors.error,
  },
});

export default JoinCreateGroupScreen;
