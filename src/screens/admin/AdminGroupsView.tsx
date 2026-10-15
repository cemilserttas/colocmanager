import React, { useState, useMemo } from 'react';
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
  Dialog,
  Portal,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { Group } from '../../types';
import { adminService } from '../../services/adminService';
import { groupService } from '../../services/groupService';
import { useAuth } from '../../hooks/useAuth';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { soundService } from '../../services/soundService';

interface AdminGroupsViewProps {
  groups: Group[];
  loading: boolean;
  onRefresh: () => void;
}

export const AdminGroupsView: React.FC<AdminGroupsViewProps> = ({
  groups,
  loading,
  onRefresh,
}) => {
  const { user: currentUser } = useAuth();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);

  const [searchQuery, setSearchQuery] = useState('');

  // Delete modal state
  const [deleteModalGroup, setDeleteModalGroup] = useState<Group | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Feedback Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name?.toLowerCase().includes(q) ||
        g.inviteCode?.toLowerCase().includes(q) ||
        g.id?.toLowerCase().includes(q) ||
        g.adminUid?.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  const handleCopyCode = async (code: string) => {
    soundService.playPopSound();
    await Clipboard.setStringAsync(code);
    setSnackbarMessage(`Code d'invitation "${code}" copié dans le presse-papier !`);
  };

  const handleRegenerateCode = async (groupId: string) => {
    soundService.playPopSound();
    try {
      const newCode = await groupService.regenerateInviteCode(groupId);
      soundService.playSuccessSound();
      setSnackbarMessage(`Nouveau code généré : ${newCode}`);
      onRefresh();
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Erreur lors de la régénération du code.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalGroup) return;
    soundService.playPopSound();
    setSubmittingAction(true);
    try {
      await adminService.deleteGroupCascade(deleteModalGroup.id, currentUser);
      soundService.playSuccessSound();
      setSnackbarMessage(`Colocation "${deleteModalGroup.name}" supprimée avec succès.`);
      setDeleteModalGroup(null);
      onRefresh();
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Erreur lors de la suppression de la colocation.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.headerControls}>
        <TextInput
          placeholder="Rechercher une colocation par nom, code (ex: ABC-1234)..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          left={<TextInput.Icon icon="magnify" />}
          right={searchQuery ? <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} /> : undefined}
          style={styles.searchInput}
          textColor={tokens.text}
          outlineColor={tokens.borderSubtle}
          activeOutlineColor={tokens.primary}
        />
        <Text variant="labelSmall" style={{ color: tokens.textSecondary, marginLeft: 4 }}>
          {filteredGroups.length} colocation(s) répertoriée(s)
        </Text>
      </View>

      {/* Group List */}
      {loading && groups.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.primary} />
          <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
            Chargement des colocations...
          </Text>
        </View>
      ) : filteredGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🏠</Text>
          <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
            Aucune colocation trouvée
          </Text>
          <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginTop: 4 }}>
            Vérifiez l'orthographe ou le code d'invitation.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filteredGroups.map((g) => {
            const memberCount = g.memberCount || 1;

            return (
              <View
                key={g.id}
                style={[
                  styles.groupCard,
                  {
                    backgroundColor: tokens.card,
                    borderColor: tokens.border,
                  },
                ]}
              >
                {/* Header Row */}
                <View style={styles.groupHeaderRow}>
                  <View
                    style={[
                      styles.iconBubble,
                      { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.12)' },
                    ]}
                  >
                    <Text style={{ fontSize: 24 }}>🏠</Text>
                  </View>

                  <View style={styles.groupInfo}>
                    <Text variant="titleMedium" style={[styles.groupName, { color: tokens.text }]}>
                      {g.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: tokens.textSecondary }}>
                      Admin local : {g.adminUid ? `ID ${g.adminUid.slice(0, 10)}...` : 'N/C'}
                    </Text>
                    <Text variant="labelSmall" style={{ color: tokens.textSecondary, marginTop: 2 }}>
                      Créée le {g.createdAt ? new Date(g.createdAt).toLocaleDateString('fr-FR') : 'N/C'}
                    </Text>
                  </View>

                  {/* Member count pill */}
                  <View style={[styles.memberPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9' }]}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.text }}>
                      👥 {memberCount} coloc{memberCount > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                {/* Invite Code Box */}
                <View
                  style={[
                    styles.inviteCodeBox,
                    {
                      backgroundColor: isDark ? 'rgba(10, 132, 255, 0.1)' : 'rgba(10, 132, 255, 0.06)',
                      borderColor: 'rgba(10, 132, 255, 0.3)',
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="labelSmall" style={{ color: tokens.textSecondary }}>
                      CODE D'INVITATION
                    </Text>
                    <Text variant="titleMedium" style={{ fontWeight: '900', color: tokens.primary, letterSpacing: 1.5 }}>
                      {g.inviteCode || 'N/C'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleCopyCode(g.inviteCode)}
                    style={[styles.smallBtn, { backgroundColor: tokens.primary }]}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                      📋 Copier
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Action Buttons Row */}
                <View style={styles.actionsRow}>
                  <Button
                    mode="outlined"
                    compact
                    icon="refresh"
                    onPress={() => handleRegenerateCode(g.id)}
                    style={[styles.actionBtn, { borderColor: tokens.border }]}
                    textColor={tokens.text}
                    labelStyle={{ fontSize: 12, fontWeight: '700' }}
                  >
                    Régénérer code
                  </Button>

                  <Button
                    mode="text"
                    compact
                    icon="delete-outline"
                    textColor={tokens.error}
                    onPress={() => {
                      soundService.playPopSound();
                      setDeleteModalGroup(g);
                    }}
                    style={styles.actionBtn}
                    labelStyle={{ fontSize: 12, fontWeight: '700' }}
                  >
                    Supprimer la colocation
                  </Button>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Delete Group Cascade Dialog */}
      <Portal>
        <Dialog
          visible={Boolean(deleteModalGroup)}
          onDismiss={() => setDeleteModalGroup(null)}
          style={{ backgroundColor: tokens.card, borderRadius: 24 }}
        >
          <Dialog.Title style={{ fontWeight: '900', color: tokens.error }}>
            ⚠️ Supprimer définitivement cette colocation ?
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: tokens.text }}>
              Êtes-vous certain de vouloir supprimer la colocation{' '}
              <Text style={{ fontWeight: '800' }}>"{deleteModalGroup?.name}"</Text> ?
            </Text>
            <Text variant="bodySmall" style={{ color: tokens.error, marginTop: 10 }}>
              Cette action supprimera également tous les enregistrements de membres, produits et tâches de ce foyer. Les membres redeviendront sans colocation.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setDeleteModalGroup(null)}
              textColor={tokens.textSecondary}
              disabled={submittingAction}
            >
              Annuler
            </Button>
            <Button
              onPress={handleConfirmDelete}
              textColor="#FFFFFF"
              buttonColor={tokens.error}
              loading={submittingAction}
              disabled={submittingAction}
              style={{ borderRadius: 16 }}
            >
              Supprimer tout
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Snackbar feedback */}
      <Snackbar
        visible={Boolean(snackbarMessage)}
        onDismiss={() => setSnackbarMessage(null)}
        duration={3500}
        style={{ backgroundColor: tokens.card, borderColor: tokens.border, borderWidth: 1 }}
      >
        <Text style={{ color: tokens.text }}>{snackbarMessage}</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerControls: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  searchInput: {
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  groupCard: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontWeight: '800',
  },
  memberPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  actionBtn: {
    borderRadius: 14,
  },
});

export default AdminGroupsView;
