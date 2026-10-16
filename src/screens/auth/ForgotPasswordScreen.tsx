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
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';

interface ForgotPasswordScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}

/**
 * Apple Liquid Glass Forgot Password Screen
 */
export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();
  const { resetPassword, loading, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const handleResetPassword = async () => {
    soundService.playPopSound();
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Veuillez saisir une adresse e-mail valide.');
      setSnackbarVisible(true);
      return;
    }

    try {
      await resetPassword(trimmedEmail);
      soundService.playSuccessSound();
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
      style={[styles.flexContainer, { backgroundColor: tokens.bg }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: 24 + insets.bottom,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Back */}
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
            <Text style={{ fontSize: 36 }}>🔑</Text>
          </View>
          <Text variant="headlineMedium" style={[styles.screenTitle, { color: tokens.text }]}>
            {t('forgotPasswordTitle')}
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: tokens.textSecondary }]}>
            {t('forgotPasswordSubtitle')}
          </Text>
        </View>

        {/* Reset Form */}
        <View
          style={[
            styles.glassCard,
            {
              backgroundColor: tokens.card,
              borderColor: tokens.border,
            },
          ]}
        >
          {successMessage ? (
            <View style={styles.successCard}>
              <Text variant="titleMedium" style={{ color: tokens.secondary, fontWeight: '800', marginBottom: 8 }}>
                ✓ E-mail envoyé avec succès !
              </Text>
              <Text variant="bodyMedium" style={{ color: tokens.text, textAlign: 'center', marginBottom: 16 }}>
                {successMessage}
              </Text>
              <Button
                mode="contained"
                onPress={() => {
                  soundService.playPopSound();
                  navigation.goBack();
                }}
                buttonColor={tokens.primary}
                textColor="#FFFFFF"
                style={styles.submitButton}
                labelStyle={{ fontWeight: '800' }}
              >
                {t('backToLogin')}
              </Button>
            </View>
          ) : (
            <>
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

              <Button
                mode="contained"
                onPress={handleResetPassword}
                loading={loading}
                disabled={loading}
                buttonColor={tokens.primary}
                textColor="#FFFFFF"
                style={styles.submitButton}
                contentStyle={styles.buttonContent}
                labelStyle={{ fontWeight: '800', fontSize: 15 }}
              >
                {t('sendResetLink')}
              </Button>

              <Button
                mode="text"
                onPress={() => {
                  soundService.playPopSound();
                  navigation.goBack();
                }}
                disabled={loading}
                textColor={tokens.textSecondary}
                style={styles.cancelButton}
              >
                {t('back')}
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
            clearError?.();
          }}
          duration={5000}
          wrapperStyle={{ bottom: Math.max(insets.bottom, 16), zIndex: 99999 }}
          style={{
            backgroundColor: successMessage ? tokens.secondary : tokens.error,
            borderRadius: 16,
          }}
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
    marginBottom: 10,
  },
  cancelButton: {
    borderRadius: 20,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});

export default ForgotPasswordScreen;
