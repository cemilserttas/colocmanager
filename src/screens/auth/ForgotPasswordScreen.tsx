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
  Snackbar,
  IconButton,
  Surface,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface ForgotPasswordScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}

/**
 * Screen enabling users to request a password reset email.
 */
export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const { resetPassword, loading, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  /**
   * Dispatches the reset password request for the given email.
   */
  const handleResetPassword = async () => {
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Veuillez saisir une adresse e-mail valide.');
      setSnackbarVisible(true);
      return;
    }

    try {
      await resetPassword(trimmedEmail);
      setSuccessMessage(
        'Un e-mail de réinitialisation vous a été envoyé. Veuillez vérifier votre boîte de réception.'
      );
      setSnackbarVisible(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer l'e-mail de réinitialisation. Vérifiez l'adresse.";
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
        {/* Navigation Back */}
        <View style={styles.topBar}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.icon}>
            🔑
          </Text>
          <Text variant="headlineMedium" style={styles.screenTitle}>
            Mot de passe oublié
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Saisissez votre e-mail pour recevoir les instructions de réinitialisation.
          </Text>
        </View>

        {/* Reset Form */}
        <View style={styles.form}>
          {successMessage ? (
            <Surface style={styles.successCard}>
              <Text variant="titleMedium" style={styles.successTitle}>
                ✓ E-mail envoyé
              </Text>
              <Text variant="bodyMedium" style={styles.successText}>
                {successMessage}
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.goBack()}
                style={styles.returnButton}
              >
                Retour à la connexion
              </Button>
            </Surface>
          ) : (
            <>
              <TextInput
                label="Adresse e-mail"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                left={<TextInput.Icon icon="email-outline" />}
                style={styles.input}
                disabled={loading}
              />

              <Button
                mode="contained"
                onPress={handleResetPassword}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
                contentStyle={styles.buttonContent}
              >
                Réinitialiser
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.goBack()}
                disabled={loading}
                style={styles.cancelButton}
              >
                Annuler
              </Button>
            </>
          )}
        </View>

        {/* Feedback Snackbar */}
        <Snackbar
          visible={snackbarVisible || Boolean(authError)}
          onDismiss={() => {
            setSnackbarVisible(false);
            setErrorMessage(null);
          }}
          duration={5000}
          action={{
            label: 'OK',
            onPress: () => {
              setSnackbarVisible(false);
              setErrorMessage(null);
            },
          }}
          style={successMessage ? styles.successSnackbar : styles.errorSnackbar}
        >
          {errorMessage || authError || successMessage || ''}
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
    paddingVertical: spacing.lg,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    marginBottom: spacing.xs,
  },
  backButton: {
    margin: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  screenTitle: {
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  form: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    marginBottom: spacing.lg,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  cancelButton: {
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  successCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
  },
  successTitle: {
    color: colors.success,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  successText: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  returnButton: {
    borderRadius: borderRadius.md,
    width: '100%',
  },
  errorSnackbar: {
    backgroundColor: colors.error,
  },
  successSnackbar: {
    backgroundColor: colors.success,
  },
});

export default ForgotPasswordScreen;
