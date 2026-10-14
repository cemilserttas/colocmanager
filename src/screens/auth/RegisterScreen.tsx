import React, { useState } from 'react';
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
  useTheme,
  IconButton,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface RegisterScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

/**
 * Registration screen for creating a new ColocManager user account.
 */
export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const paperTheme = useTheme();
  const { register, loading, error: authError } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  /**
   * Validates form inputs and dispatches registration.
   */
  const handleRegister = async () => {
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage('Veuillez renseigner votre nom complet ou pseudo.');
      setSnackbarVisible(true);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Veuillez saisir une adresse e-mail valide.');
      setSnackbarVisible(true);
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      setSnackbarVisible(true);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      setSnackbarVisible(true);
      return;
    }

    try {
      await register(trimmedEmail, password, trimmedName);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de l'inscription. Réessayez.";
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
        {/* Back Button */}
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
          <Text variant="headlineMedium" style={styles.screenTitle}>
            Créer un compte
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Rejoignez ou créez une colocation en quelques secondes
          </Text>
        </View>

        {/* Input Form */}
        <View style={styles.form}>
          <TextInput
            label="Nom ou Pseudo"
            value={displayName}
            onChangeText={setDisplayName}
            mode="outlined"
            autoCapitalize="words"
            left={<TextInput.Icon icon="account-outline" />}
            style={styles.input}
            disabled={loading}
          />

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

          <TextInput
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword((prev) => !prev)}
              />
            }
            style={styles.input}
            disabled={loading}
          />

          <TextInput
            label="Confirmer le mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            left={<TextInput.Icon icon="lock-check-outline" />}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword((prev) => !prev)}
              />
            }
            style={styles.input}
            disabled={loading}
          />

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
          >
            S'inscrire
          </Button>

          {/* Back to Login Link */}
          <View style={styles.footer}>
            <Text variant="bodyMedium" style={styles.footerText}>
              Vous avez déjà un compte ?{' '}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text
                variant="bodyMedium"
                style={[styles.linkBold, { color: paperTheme.colors.primary }]}
              >
                Se connecter
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Snackbar Notification */}
        <Snackbar
          visible={snackbarVisible || Boolean(authError)}
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
          {errorMessage || authError || 'Une erreur est survenue.'}
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
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  screenTitle: {
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
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
    marginBottom: spacing.md,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  footerText: {
    color: colors.textSecondary,
  },
  linkBold: {
    fontWeight: '700',
  },
  snackbar: {
    backgroundColor: colors.error,
  },
});

export default RegisterScreen;
