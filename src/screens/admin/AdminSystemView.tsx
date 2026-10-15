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
  SegmentedButtons,
} from 'react-native-paper';
import { AuditLog, SystemBroadcast } from '../../types';
import { adminService } from '../../services/adminService';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { soundService } from '../../services/soundService';

interface AdminSystemViewProps {
  broadcasts: SystemBroadcast[];
  auditLogs: AuditLog[];
  onRefresh: () => void;
}

export const AdminSystemView: React.FC<AdminSystemViewProps> = ({
  broadcasts,
  auditLogs,
  onRefresh,
}) => {
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);

  const [activeSection, setActiveSection] = useState<'broadcasts' | 'audit'>('broadcasts');

  // Broadcast creation form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLevel, setBroadcastLevel] = useState<'info' | 'warning' | 'urgent'>('info');
  const [submitting, setSubmitting] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const handleCreateBroadcast = async () => {
    soundService.playPopSound();
    const trimmedTitle = broadcastTitle.trim();
    const trimmedMessage = broadcastMessage.trim();

    if (!trimmedTitle || !trimmedMessage) {
      setSnackbarMessage('Veuillez renseigner le titre et le contenu de l\'annonce.');
      return;
    }

    setSubmitting(true);
    try {
      await adminService.createBroadcast({
        title: trimmedTitle,
        message: trimmedMessage,
        level: broadcastLevel,
        active: true,
      });

      soundService.playSuccessSound();
      setSnackbarMessage('Annonce système publiée avec succès !');
      setBroadcastTitle('');
      setBroadcastMessage('');
      onRefresh();
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Erreur lors de la publication de l\'annonce.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBroadcast = async (id: string, active: boolean) => {
    soundService.playPopSound();
    try {
      await adminService.toggleBroadcast(id, active);
      onRefresh();
    } catch {}
  };

  const handleDeleteBroadcast = async (id: string) => {
    soundService.playPopSound();
    try {
      await adminService.deleteBroadcast(id);
      soundService.playSuccessSound();
      setSnackbarMessage('Annonce supprimée.');
      onRefresh();
    } catch {}
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Section Switcher */}
      <View style={styles.segmentedContainer}>
        <SegmentedButtons
          value={activeSection}
          onValueChange={(val) => {
            soundService.playPopSound();
            setActiveSection(val as any);
          }}
          buttons={[
            {
              value: 'broadcasts',
              label: `📢 Annonces (${broadcasts.length})`,
            },
            {
              value: 'audit',
              label: `📜 Journal d'Audit (${auditLogs.length})`,
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {activeSection === 'broadcasts' ? (
        <View style={styles.contentWrapper}>
          {/* Create Broadcast Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: tokens.card,
                borderColor: tokens.border,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 22, marginRight: 8 }}>📢</Text>
              <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
                Publier une Annonce Globale
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginBottom: 16 }}>
              Ce message sera diffusé en haut de l'écran d'accueil pour l'ensemble des utilisateurs de l'application.
            </Text>

            <TextInput
              label="Titre de l'annonce"
              placeholder="ex: Maintenance serveur ce soir à 23h"
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
              mode="outlined"
              style={styles.input}
              textColor={tokens.text}
              outlineColor={tokens.borderSubtle}
              activeOutlineColor={tokens.primary}
            />

            <TextInput
              label="Contenu détaillé"
              placeholder="ex: L'accès sera rétabli d'ici 30 minutes. Merci de votre patience !"
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              textColor={tokens.text}
              outlineColor={tokens.borderSubtle}
              activeOutlineColor={tokens.primary}
            />

            {/* Level selection */}
            <View style={{ marginBottom: 16 }}>
              <Text variant="labelSmall" style={{ color: tokens.textSecondary, marginBottom: 6 }}>
                NIVEAU D'URGENCE
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['info', 'warning', 'urgent'] as const).map((lvl) => {
                  const isSel = broadcastLevel === lvl;
                  const colorMap = {
                    info: tokens.primary,
                    warning: '#F59E0B',
                    urgent: tokens.error,
                  };
                  const labelMap = {
                    info: 'ℹ️ Information',
                    warning: '⚠️ Avertissement',
                    urgent: '🚨 Urgent',
                  };
                  return (
                    <TouchableOpacity
                      key={lvl}
                      onPress={() => {
                        soundService.playPopSound();
                        setBroadcastLevel(lvl);
                      }}
                      style={[
                        styles.levelChip,
                        {
                          backgroundColor: isSel ? colorMap[lvl] : tokens.card,
                          borderColor: isSel ? colorMap[lvl] : tokens.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: isSel ? '#FFFFFF' : tokens.text,
                        }}
                      >
                        {labelMap[lvl]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Button
              mode="contained"
              buttonColor={tokens.primary}
              textColor="#FFFFFF"
              onPress={handleCreateBroadcast}
              loading={submitting}
              disabled={submitting}
              style={{ borderRadius: 16 }}
              labelStyle={{ fontWeight: '800' }}
            >
              Diffuser l'annonce
            </Button>
          </View>

          {/* Broadcasts List */}
          <Text variant="titleMedium" style={{ fontWeight: '900', color: tokens.text, marginTop: 12, marginBottom: 12 }}>
            Annonces Existantes ({broadcasts.length})
          </Text>

          {broadcasts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>📭</Text>
              <Text variant="bodyMedium" style={{ color: tokens.textSecondary }}>
                Aucune annonce publiée pour le moment.
              </Text>
            </View>
          ) : (
            broadcasts.map((b) => {
              const borderColors = {
                info: tokens.primary,
                warning: '#F59E0B',
                urgent: tokens.error,
              };

              return (
                <View
                  key={b.id}
                  style={[
                    styles.broadcastItem,
                    {
                      backgroundColor: tokens.card,
                      borderColor: b.active ? borderColors[b.level] : tokens.border,
                      opacity: b.active ? 1 : 0.6,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text, flex: 1 }}>
                      {b.title}
                    </Text>
                    <Switch
                      value={b.active}
                      onValueChange={(val) => handleToggleBroadcast(b.id, val)}
                      color={tokens.primary}
                    />
                  </View>

                  <Text variant="bodyMedium" style={{ color: tokens.textSecondary, marginTop: 6 }}>
                    {b.message}
                  </Text>

                  <View style={styles.broadcastFooter}>
                    <Text variant="labelSmall" style={{ color: tokens.textSecondary }}>
                      {new Date(b.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>

                    <Button
                      mode="text"
                      compact
                      textColor={tokens.error}
                      onPress={() => handleDeleteBroadcast(b.id)}
                      labelStyle={{ fontSize: 11, fontWeight: '700' }}
                    >
                      Supprimer
                    </Button>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : (
        /* Audit Trail Section */
        <View style={styles.contentWrapper}>
          <Text variant="titleMedium" style={{ fontWeight: '900', color: tokens.text, marginBottom: 12 }}>
            Journal des Actions Administratives
          </Text>

          {auditLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>📜</Text>
              <Text variant="bodyMedium" style={{ color: tokens.textSecondary }}>
                Aucune action enregistrée pour le moment.
              </Text>
            </View>
          ) : (
            auditLogs.map((log) => {
              const actionColors: Record<string, string> = {
                SUSPEND_USER: tokens.error,
                ACTIVATE_USER: tokens.secondary,
                DELETE_USER: tokens.error,
                DELETE_GROUP: tokens.error,
                CREATE_USER: tokens.primary,
                PROMOTE_ADMIN: tokens.adminGold,
                DEMOTE_ADMIN: '#64748B',
              };

              return (
                <View
                  key={log.id}
                  style={[
                    styles.logCard,
                    {
                      backgroundColor: tokens.card,
                      borderColor: tokens.border,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View
                      style={[
                        styles.actionPill,
                        { backgroundColor: `${actionColors[log.action] || tokens.primary}20` },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: actionColors[log.action] || tokens.primary,
                        }}
                      >
                        {log.action}
                      </Text>
                    </View>

                    <Text variant="labelSmall" style={{ color: tokens.textSecondary }}>
                      {new Date(log.timestamp).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  <Text variant="titleSmall" style={{ fontWeight: '800', color: tokens.text, marginTop: 8 }}>
                    Cible : {log.targetName}
                  </Text>
                  <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginTop: 2 }}>
                    {log.details}
                  </Text>
                  <Text variant="labelSmall" style={{ color: tokens.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                    Par : {log.adminEmail}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      )}

      <Snackbar
        visible={Boolean(snackbarMessage)}
        onDismiss={() => setSnackbarMessage(null)}
        duration={3500}
        style={{ backgroundColor: tokens.card, borderColor: tokens.border, borderWidth: 1 }}
      >
        <Text style={{ color: tokens.text }}>{snackbarMessage}</Text>
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
  segmentedContainer: {
    width: '100%',
    maxWidth: 600,
    marginBottom: 16,
  },
  segmentedButtons: {
    borderRadius: 20,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 600,
    gap: 12,
  },
  card: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  levelChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  broadcastItem: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  broadcastFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  logCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 8,
  },
  actionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
});

export default AdminSystemView;
