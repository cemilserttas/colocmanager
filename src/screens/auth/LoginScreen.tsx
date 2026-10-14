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
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface LoginScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

/**
 * Login screen allowing users to authenticate with email and password.
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const paperTheme = useTheme();
  const { login, loading, signInDemo, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      if (signInDemo) {
        await signInDemo();
      }
    } catch {
      setErrorMessage('Erreur lors du lancement de la démo.');
      setSnackbarVisible(true);
    } finally {
      setDemoLoading(false);
    }
  };

  /**
   * Validates input fields and attempts user login.
   */
  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Veuillez saisir votre adresse e-mail.');
      setSnackbarVisible(true);
      return;
    }
    if (!password) {
      setErrorMessage('Veuillez saisir votre mot de passe.');
      setSnackbarVisible(true);
      return;
    }

    try {
      await login(trimmedEmail, password);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Échec de la connexion. Vérifiez vos identifiants.';
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
        {/* Logo and Brand Header */}
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.logoEmoji}>
            🏠
          </Text>
          <Text variant="headlineLarge" style={styles.appTitle}>
            ColocManager
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Organisez votre colocation en toute sérénité
          </Text>
        </View>

        {/* Input Form */}
        <View style={styles.form}>
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

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPasswordContainer}
            disabled={loading}
          >
            <Text
              variant="bodySmall"
              style={[styles.linkText, { color: paperTheme.colors.primary }]}
            >
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
          >
            Se connecter
          </Button>

          {/* Quick Demo Button */}
          <Button
            mode="outlined"
            onPress={handleDemoLogin}
            loading={demoLoading}
            disabled={loading || demoLoading}
            style={[styles.submitButton, { marginTop: 12, borderColor: paperTheme.colors.primary }]}
            contentStyle={styles.buttonContent}
            textColor={paperTheme.colors.primary}
          >
            🚀 Démo Immédiate (Sans compte)
          </Button>

          {/* Register Link */}
          <View style={styles.footer}>
            <Text variant="bodyMedium" style={styles.footerText}>
              Pas encore de compte ?{' '}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
            >
              <Text
                variant="bodyMedium"
                style={[styles.linkBold, { color: paperTheme.colors.primary }]}
              >
                S'inscrire
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Snackbar Error Feedback */}
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
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoEmoji: {
    fontSize: 54,
    marginBottom: spacing.xs,
  },
  appTitle: {
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  linkText: {
    fontWeight: '500',
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

export default LoginScreen;
