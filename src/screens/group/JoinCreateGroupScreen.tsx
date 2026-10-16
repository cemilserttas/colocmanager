import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';
import { adminService } from '../../services/adminService';

interface JoinCreateGroupScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    replace?: (screen: string) => void;
  };
}

type Mode = 'idle' | 'create' | 'join';

/**
 * Onboarding screen for room assignment:
 * 1. Join an existing flatshare using invite code
 * 2. Create a new flatshare and become Administrator
 */
export const JoinCreateGroupScreen: React.FC<JoinCreateGroupScreenProps> = ({ navigation }) => {
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

  const { user, logout } = useAuth();
  const { createGroup, joinGroup, loading, error: groupError } = useGroup();

  const [activeMode, setActiveMode] = useState<Mode>('idle');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const handleCreateGroup = async () => {
    soundService.playPopSound();
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setErrorMessage('Veuillez renseigner un nom pour votre colocation.');
      setSnackbarVisible(true);
      return;
    }

    try {
      await createGroup(trimmedName);
      soundService.playSuccessSound();
      if (navigation.replace) {
        navigation.replace('Main');
      } else {
        navigation.navigate('Main');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Impossible de créer la colocation.';
      setErrorMessage(message);
      setSnackbarVisible(true);
    }
  };

  const handleJoinGroup = async () => {
    soundService.playPopSound();
    const trimmedCode = inviteCode.trim().toUpperCase();
    if (!trimmedCode) {
      setErrorMessage("Veuillez saisir le code d'invitation.");
      setSnackbarVisible(true);
      return;
    }

    try {
      await joinGroup(trimmedCode);
      soundService.playSuccessSound();
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
      style={[styles.flexContainer, { backgroundColor: tokens.bg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
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
            <Text style={{ fontSize: 38 }}>🔑</Text>
          </View>
          <Text variant="headlineSmall" style={[styles.greeting, { color: tokens.text }]}>
            {t('welcome')}{user?.displayName ? `, ${user.displayName}` : ''} ! 👋
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: tokens.textSecondary }]}>
            {t('onboardingSub')}
          </Text>
        </View>

        {/* Option 1: Join Existing Group */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            soundService.playPopSound();
            setActiveMode(activeMode === 'join' ? 'idle' : 'join');
          }}
          style={[
            styles.liquidCard,
            {
              backgroundColor: tokens.card,
              borderColor: activeMode === 'join' ? tokens.primary : tokens.border,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor: isDark ? 'rgba(10, 132, 255, 0.2)' : 'rgba(10, 132, 255, 0.1)',
                },
              ]}
            >
              <Text style={{ fontSize: 28 }}>🔗</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
                {t('joinGroupTitle')}
              </Text>
              <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginTop: 2 }}>
                {t('joinGroupSub')}
              </Text>
            </View>
          </View>

          {activeMode === 'join' && (
            <View style={styles.expandedForm}>
              <TextInput
                label="Code d'invitation (ex: ABC-1234)"
                placeholder="ABC-1234"
                value={inviteCode}
                onChangeText={(val) => setInviteCode(val.toUpperCase())}
                mode="outlined"
                autoCapitalize="characters"
                disabled={loading}
                style={styles.input}
                textColor={tokens.text}
                outlineColor={tokens.borderSubtle}
                activeOutlineColor={tokens.primary}
                autoFocus
              />
              <Button
                mode="contained"
                buttonColor={tokens.primary}
                textColor="#FFFFFF"
                onPress={handleJoinGroup}
                loading={loading}
                disabled={loading}
                style={styles.actionButton}
                labelStyle={{ fontWeight: '800' }}
              >
                {t('validateJoin')}
              </Button>
            </View>
          )}
        </TouchableOpacity>

        {/* Option 2: Create Group & Become Admin */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            soundService.playPopSound();
            setActiveMode(activeMode === 'create' ? 'idle' : 'create');
          }}
          style={[
            styles.liquidCard,
            {
              backgroundColor: tokens.card,
              borderColor: activeMode === 'create' ? tokens.adminGold : tokens.border,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor: isDark ? 'rgba(255, 214, 10, 0.2)' : 'rgba(255, 214, 10, 0.15)',
                },
              ]}
            >
              <Text style={{ fontSize: 28 }}>👑</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
                  {t('createGroupTitle')}
                </Text>
                <View style={styles.adminPill}>
                  <Text style={styles.adminPillText}>Admin</Text>
                </View>
              </View>
              <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginTop: 2 }}>
                {t('createGroupSub')}
              </Text>
            </View>
          </View>

          {activeMode === 'create' && (
            <View style={styles.expandedForm}>
              <TextInput
                label="Nom de la colocation"
                placeholder={t('colocNamePlaceholder')}
                value={groupName}
                onChangeText={setGroupName}
                mode="outlined"
                disabled={loading}
                style={styles.input}
                textColor={tokens.text}
                outlineColor={tokens.borderSubtle}
                activeOutlineColor={tokens.primary}
                autoFocus
              />
              <Button
                mode="contained"
                buttonColor={tokens.secondary}
                textColor="#FFFFFF"
                onPress={handleCreateGroup}
                loading={loading}
                disabled={loading}
                style={styles.actionButton}
                labelStyle={{ fontWeight: '800' }}
              >
                {t('validateCreate')}
              </Button>
            </View>
          )}
        </TouchableOpacity>

        {/* Direct Super-Admin Portal Access Button */}
        {adminService.isSuperAdmin(user) && (
          <Button
            mode="contained-tonal"
            buttonColor={isDark ? 'rgba(255, 214, 10, 0.2)' : 'rgba(255, 214, 10, 0.25)'}
            textColor={tokens.adminGold}
            onPress={() => {
              soundService.playPopSound();
              navigation.navigate('AdminPortal');
            }}
            style={{ marginTop: 20, borderRadius: 16 }}
            labelStyle={{ fontWeight: '800' }}
          >
            🛡️ Accéder au Panneau Super-Administrateur
          </Button>
        )}

        {/* Explicit Logout Button */}
        <Button
          mode="text"
          textColor={tokens.error}
          onPress={async () => {
            soundService.playPopSound();
            await logout();
          }}
          style={{ marginTop: 12 }}
          labelStyle={{ fontWeight: '700' }}
        >
          🚪 {t('logout') || 'Déconnexion'}
        </Button>

        {loading && (
          <ActivityIndicator
            animating
            size="large"
            color={tokens.primary}
            style={{ marginTop: 24 }}
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
          style={{ backgroundColor: tokens.error }}
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
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
  },
  greeting: {
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  liquidCard: {
    padding: 20,
    borderRadius: 26,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminPill: {
    marginLeft: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  adminPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  expandedForm: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  actionButton: {
    borderRadius: 18,
    paddingVertical: 4,
  },
});

export default JoinCreateGroupScreen;
