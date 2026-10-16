import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Switch,
  Snackbar,
} from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { Group, User } from '../../types';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { soundService } from '../../services/soundService';

interface AdminCreateAccessViewProps {
  groups: Group[];
  onUserCreated: () => void;
}

export const AdminCreateAccessView: React.FC<AdminCreateAccessViewProps> = ({
  groups,
  onUserCreated,
}) => {
  const { user: currentUser } = useAuth();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdSummary, setCreatedSummary] = useState<{
    user: User;
    rawPass: string;
  } | null>(null);

  const handleCreate = async () => {
    soundService.playPopSound();
    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    if (!trimmedEmail || !password || !trimmedName) {
      setErrorMessage('Veuillez renseigner le nom, l\'email et le mot de passe.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const newUser = await adminService.createUserDirect(
        {
          email: trimmedEmail,
          password,
          displayName: trimmedName,
          isSuperAdmin,
          groupId: selectedGroupId,
        },
        currentUser
      );

      soundService.playSuccessSound();
      setCreatedSummary({ user: newUser, rawPass: password });
      setEmail('');
      setPassword('');
      setDisplayName('');
      setIsSuperAdmin(false);
      setSelectedGroupId(null);
      onUserCreated();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur lors de la création de l\'accès.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAccessCard = async () => {
    if (!createdSummary) return;
    soundService.playPopSound();
    const text = `🎉 Bienvenue sur ColocManager !\n\nVoici vos accès direct :\n📧 Email : ${createdSummary.user.email}\n🔑 Mot de passe : ${createdSummary.rawPass}\n🌐 Accès : https://colocmanager.vercel.app/\n\nConnectez-vous dès maintenant !`;
    await Clipboard.setStringAsync(text);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentWrapper}>
        {/* Banner */}
        <View
          style={[
            styles.banner,
            {
              backgroundColor: isDark ? 'rgba(10, 132, 255, 0.1)' : 'rgba(10, 132, 255, 0.08)',
              borderColor: tokens.primary,
            },
          ]}
        >
          <Text style={{ fontSize: 24, marginRight: 10 }}>➕</Text>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
              Provisionnement d'Accès Direct
            </Text>
            <Text variant="bodySmall" style={{ color: tokens.textSecondary }}>
              Créez un compte utilisateur et attribuez-lui des droits sans passer par le formulaire public.
            </Text>
          </View>
        </View>

        {/* Success Card with Credentials if created */}
        {createdSummary && (
          <View
            style={[
              styles.successCard,
              {
                backgroundColor: isDark ? 'rgba(52, 199, 89, 0.12)' : 'rgba(52, 199, 89, 0.1)',
                borderColor: tokens.secondary,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 22, marginRight: 8 }}>✅</Text>
              <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.secondary }}>
                Compte créé avec succès !
              </Text>
            </View>

            <View style={styles.credsBox}>
              <Text style={[styles.credLine, { color: tokens.text }]}>
                👤 Nom : <Text style={{ fontWeight: '800' }}>{createdSummary.user.displayName}</Text>
              </Text>
              <Text style={[styles.credLine, { color: tokens.text }]}>
                📧 Email : <Text style={{ fontWeight: '800' }}>{createdSummary.user.email}</Text>
              </Text>
              <Text style={[styles.credLine, { color: tokens.text }]}>
                🔑 Mot de passe : <Text style={{ fontWeight: '800' }}>{createdSummary.rawPass}</Text>
              </Text>
              <Text style={[styles.credLine, { color: tokens.text }]}>
                👑 Rôle :{' '}
                <Text style={{ fontWeight: '800' }}>
                  {createdSummary.user.isSuperAdmin ? 'Super-Administrateur' : 'Standard'}
                </Text>
              </Text>
            </View>

            <Button
              mode="contained"
              buttonColor={tokens.secondary}
              textColor="#FFFFFF"
              icon="content-copy"
              onPress={handleCopyAccessCard}
              style={{ marginTop: 12, borderRadius: 16 }}
              labelStyle={{ fontWeight: '800' }}
            >
              Copier la fiche d'accès
            </Button>
          </View>
        )}

        {/* Form Card */}
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: tokens.card,
              borderColor: tokens.border,
            },
          ]}
        >
          <TextInput
            label="Nom complet ou Pseudo"
            value={displayName}
            onChangeText={setDisplayName}
            mode="outlined"
            placeholder="ex: Thomas Martin"
            style={styles.input}
            textColor={tokens.text}
            outlineColor={tokens.borderSubtle}
            activeOutlineColor={tokens.primary}
            disabled={loading}
          />

          <TextInput
            label="Adresse e-mail"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="ex: thomas@exemple.fr"
            style={styles.input}
            textColor={tokens.text}
            outlineColor={tokens.borderSubtle}
            activeOutlineColor={tokens.primary}
            disabled={loading}
          />

          <TextInput
            label="Mot de passe initial"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            placeholder="Minimum 6 caractères"
            style={styles.input}
            textColor={tokens.text}
            outlineColor={tokens.borderSubtle}
            activeOutlineColor={tokens.primary}
            disabled={loading}
          />

          {/* SuperAdmin Toggle */}
          <View
            style={[
              styles.toggleRow,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                borderColor: tokens.border,
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, marginRight: 6 }}>👑</Text>
                <Text variant="titleSmall" style={{ fontWeight: '800', color: tokens.text }}>
                  Droits Super-Administrateur
                </Text>
              </View>
              <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginTop: 2 }}>
                Donne un accès complet au panneau de contrôle global de la plateforme.
              </Text>
            </View>
            <Switch
              value={isSuperAdmin}
              onValueChange={(val) => {
                soundService.playPopSound();
                setIsSuperAdmin(val);
              }}
              color={tokens.adminGold}
            />
          </View>

          {/* Group assignment selection */}
          <View style={{ marginTop: 16 }}>
            <Text variant="labelMedium" style={{ fontWeight: '800', color: tokens.textSecondary, marginBottom: 8 }}>
              AFFECTER À UNE COLOCATION (OPTIONNEL)
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                onPress={() => {
                  soundService.playPopSound();
                  setSelectedGroupId(null);
                }}
                style={[
                  styles.groupChip,
                  {
                    backgroundColor: selectedGroupId === null ? tokens.primary : tokens.card,
                    borderColor: selectedGroupId === null ? tokens.primary : tokens.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 12,
                    color: selectedGroupId === null ? '#FFFFFF' : tokens.text,
                  }}
                >
                  Aucune (Onboarding)
                </Text>
              </TouchableOpacity>

              {groups.map((g) => {
                const isSelected = selectedGroupId === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => {
                      soundService.playPopSound();
                      setSelectedGroupId(g.id);
                    }}
                    style={[
                      styles.groupChip,
                      {
                        backgroundColor: isSelected ? tokens.secondary : tokens.card,
                        borderColor: isSelected ? tokens.secondary : tokens.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontWeight: '800',
                        fontSize: 12,
                        color: isSelected ? '#FFFFFF' : tokens.text,
                      }}
                    >
                      🏠 {g.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Submit Button */}
          <Button
            mode="contained"
            buttonColor={tokens.primary}
            textColor="#FFFFFF"
            onPress={handleCreate}
            loading={loading}
            disabled={loading}
            style={styles.submitBtn}
            contentStyle={{ paddingVertical: 6 }}
            labelStyle={{ fontWeight: '800', fontSize: 15 }}
          >
            Créer l'accès maintenant
          </Button>
        </View>
      </View>

      <Snackbar
        visible={Boolean(errorMessage)}
        onDismiss={() => setErrorMessage(null)}
        duration={4000}
        style={{ backgroundColor: tokens.error }}
      >
        {errorMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 600,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  successCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  credsBox: {
    gap: 4,
    marginVertical: 6,
  },
  credLine: {
    fontSize: 13,
  },
  formCard: {
    padding: 22,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 2,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
  },
  groupChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  submitBtn: {
    marginTop: 22,
    borderRadius: 18,
  },
});

export default AdminCreateAccessView;
