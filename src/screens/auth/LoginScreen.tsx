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
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';

interface LoginScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

/**
 * Apple Liquid Glass Login Screen
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();
  const { login, loading, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const handleLogin = async () => {
    soundService.playPopSound();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Veuillez renseigner votre email et votre mot de passe.');
      setSnackbarVisible(true);
      return;
    }

    try {
      await login(trimmedEmail, password);
      soundService.playSuccessSound();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la connexion.';
      setErrorMessage(message);
      setSnackbarVisible(true);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flexContainer, { backgroundColor: tokens.bg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header with Liquid Glow */}
        <View style={styles.header}>
          <View
            style={[
              styles.logoBadge,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: tokens.border,
              },
            ]}
          >
            <Text style={styles.logoEmoji}>🏠</Text>
          </View>
          <Text variant="headlineMedium" style={[styles.appTitle, { color: tokens.text }]}>
            ColocManager
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: tokens.textSecondary }]}>
            {t('loginSubtitle')}
          </Text>
        </View>

        {/* Liquid Glass Form Card */}
        <View
          style={[
            styles.glassCard,
            {
              backgroundColor: tokens.card,
              borderColor: tokens.border,
            },
          ]}
        >
          <TextInput
            label={t('emailLabel')}
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            textColor={tokens.text}
            outlineColor={tokens.borderSubtle}
            activeOutlineColor={tokens.primary}
            disabled={loading}
          />

          <TextInput
            label={t('passwordLabel')}
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword((prev) => !prev)}
              />
            }
            style={styles.input}
            textColor={tokens.text}
            outlineColor={tokens.borderSubtle}
            activeOutlineColor={tokens.primary}
            disabled={loading}
          />

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPasswordContainer}
            disabled={loading}
          >
            <Text variant="bodySmall" style={{ color: tokens.primary, fontWeight: '600' }}>
              {t('forgotPasswordTitle')}
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            buttonColor={tokens.primary}
            textColor="#FFFFFF"
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
            labelStyle={{ fontWeight: '800', fontSize: 15 }}
          >
            {t('loginBtn')}
          </Button>

          {/* Register Link */}
          <View style={styles.footer}>
            <Text variant="bodyMedium" style={{ color: tokens.textSecondary }}>
              {t('newHere')}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
            >
              <Text variant="bodyMedium" style={{ color: tokens.primary, fontWeight: '800' }}>
                {t('registerTitle')}
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
            clearError?.();
          }}
          duration={4000}
          style={{ backgroundColor: tokens.error }}
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
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  logoEmoji: {
    fontSize: 42,
  },
  appTitle: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    textAlign: 'center',
  },
  glassCard: {
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 3,
  },
  input: {
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    paddingVertical: 4,
  },
  submitButton: {
    borderRadius: 20,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
});

export default LoginScreen;
