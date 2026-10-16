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
  IconButton,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';

interface RegisterScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

/**
 * Apple Liquid Glass Registration Screen
 */
export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();
  const { register, loading, error: authError, clearError } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const handleRegister = async () => {
    soundService.playPopSound();
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
      soundService.playSuccessSound();
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
      style={[styles.flexContainer, { backgroundColor: tokens.bg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar with Back Button */}
        <View style={styles.topBar}>
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor={tokens.text}
            onPress={() => {
              soundService.playPopSound();
              navigation.goBack();
            }}
            style={[
              styles.backButton,
              {
                backgroundColor: tokens.card,
                borderColor: tokens.border,
                borderWidth: 1,
              },
            ]}
          />
        </View>

        {/* Header */}
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
            <Text style={{ fontSize: 36 }}>✨</Text>
          </View>
          <Text variant="headlineMedium" style={[styles.screenTitle, { color: tokens.text }]}>
            {t('registerTitle')}
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: tokens.textSecondary }]}>
            {t('registerSubtitle')}
          </Text>
        </View>

        {/* Glass Card Form */}
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
            label={t('nameLabel')}
            value={displayName}
            onChangeText={setDisplayName}
            mode="outlined"
            autoCapitalize="words"
            left={<TextInput.Icon icon="account-outline" />}
            style={styles.input}
            textColor={tokens.text}
            outlineColor={tokens.borderSubtle}
            activeOutlineColor={tokens.primary}
            disabled={loading}
          />

          <TextInput
            label={t('emailLabel')}
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            left={<TextInput.Icon icon="email-outline" />}
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
            left={<TextInput.Icon icon="lock-outline" />}
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

          <TextInput
            label={t('confirmPasswordLabel')}
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
            textColor={tokens.text}
            outlineColor={tokens.borderSubtle}
            activeOutlineColor={tokens.primary}
            disabled={loading}
          />

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            buttonColor={tokens.primary}
            textColor="#FFFFFF"
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
            labelStyle={{ fontWeight: '800', fontSize: 15 }}
          >
            {t('registerBtn')}
          </Button>

          {/* Back to Login Link */}
          <View style={styles.footer}>
            <Text variant="bodyMedium" style={{ color: tokens.textSecondary }}>
              {t('alreadyHaveAccount')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                soundService.playPopSound();
                navigation.navigate('Login');
              }}
              disabled={loading}
            >
              <Text variant="bodyMedium" style={{ color: tokens.primary, fontWeight: '800' }}>
                {t('loginBtn')}
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
    paddingVertical: 24,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  backButton: {
    borderRadius: 16,
    margin: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 3,
  },
  screenTitle: {
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
  submitButton: {
    borderRadius: 20,
    marginTop: 8,
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

export default RegisterScreen;
