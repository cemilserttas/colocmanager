import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Dialog,
  Portal,
  Snackbar,
  ActivityIndicator,
  Chip,
  Avatar,
} from 'react-native-paper';
import { User } from '../../types';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { soundService } from '../../services/soundService';

interface AdminUsersViewProps {
  users: User[];
  loading: boolean;
  onRefresh: () => void;
}

type FilterType = 'all' | 'active' | 'suspended' | 'admins';

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({
  users,
  loading,
  onRefresh,
}) => {
  const { user: currentUser } = useAuth();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Suspension Dialog state
  const [suspendModalUser, setSuspendModalUser] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState('Non-respect des règles de vie commune');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Delete Confirmation Dialog state
  const [deleteModalUser, setDeleteModalUser] = useState<User | null>(null);

  // Feedback Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Filtered list
  const filteredUsers = useMemo(() => {
    let list = users;

    // Filter by type
    if (filter === 'active') {
      list = list.filter((u) => u.status !== 'suspended');
    } else if (filter === 'suspended') {
      list = list.filter((u) => u.status === 'suspended');
    } else if (filter === 'admins') {
      list = list.filter((u) => u.isSuperAdmin === true);
    }

    // Search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (u) =>
          u.displayName?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.uid?.toLowerCase().includes(query) ||
          u.groupId?.toLowerCase().includes(query)
      );
    }

    return list;
  }, [users, filter, searchQuery]);

  // Handle Suspension
  const handleConfirmSuspend = async () => {
    if (!suspendModalUser) return;
    soundService.playPopSound();
    setSubmittingAction(true);
    try {
      await adminService.setUserRestriction(
        suspendModalUser.uid,
        true,
        suspendReason,
        currentUser
      );
      soundService.playSuccessSound();
      setSnackbarMessage(`L'accès de ${suspendModalUser.displayName} a été restreint.`);
      setSuspendModalUser(null);
      onRefresh();
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Erreur lors de la restriction du compte.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Reactivation
  const handleReactivateUser = async (targetUser: User) => {
    soundService.playPopSound();
    try {
      await adminService.setUserRestriction(targetUser.uid, false, undefined, currentUser);
      soundService.playSuccessSound();
      setSnackbarMessage(`Le compte de ${targetUser.displayName} a été réactivé avec succès !`);
      onRefresh();
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Erreur lors de la réactivation.');
    }
  };

  // Handle SuperAdmin toggle
  const handleToggleSuperAdmin = async (targetUser: User) => {
    soundService.playPopSound();
    const newStatus = !targetUser.isSuperAdmin;
    try {
      await adminService.toggleSuperAdmin(targetUser.uid, newStatus, currentUser);
      soundService.playSuccessSound();
      setSnackbarMessage(
        newStatus
          ? `${targetUser.displayName} est maintenant Super-Administrateur !`
          : `Privilèges Super-Admin retirés pour ${targetUser.displayName}.`
      );
      onRefresh();
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Erreur lors de la modification des privilèges.');
    }
  };

  // Handle Delete User
  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return;
    soundService.playPopSound();
    setSubmittingAction(true);
    try {
      await adminService.deleteUserAccount(deleteModalUser.uid, currentUser);
      soundService.playSuccessSound();
      setSnackbarMessage(`Le compte de ${deleteModalUser.displayName} a été définitivement supprimé.`);
      setDeleteModalUser(null);
      onRefresh();
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Erreur lors de la suppression.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Bar & Filters */}
      <View style={styles.headerControls}>
        <TextInput
          placeholder="Rechercher par nom, e-mail, ID..."
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

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          <Chip
            selected={filter === 'all'}
            onPress={() => {
              soundService.playPopSound();
              setFilter('all');
            }}
            style={[styles.chip, filter === 'all' && { backgroundColor: tokens.primary }]}
            textStyle={{ color: filter === 'all' ? '#FFFFFF' : tokens.text, fontWeight: '700' }}
          >
            Tous ({users.length})
          </Chip>
          <Chip
            selected={filter === 'active'}
            onPress={() => {
              soundService.playPopSound();
              setFilter('active');
            }}
            style={[styles.chip, filter === 'active' && { backgroundColor: tokens.secondary }]}
            textStyle={{ color: filter === 'active' ? '#FFFFFF' : tokens.text, fontWeight: '700' }}
          >
            Actifs ({users.filter((u) => u.status !== 'suspended').length})
          </Chip>
          <Chip
            selected={filter === 'suspended'}
            onPress={() => {
              soundService.playPopSound();
              setFilter('suspended');
            }}
            style={[styles.chip, filter === 'suspended' && { backgroundColor: tokens.error }]}
            textStyle={{ color: filter === 'suspended' ? '#FFFFFF' : tokens.text, fontWeight: '700' }}
          >
            Restreints / Suspendus ({users.filter((u) => u.status === 'suspended').length})
          </Chip>
          <Chip
            selected={filter === 'admins'}
            onPress={() => {
              soundService.playPopSound();
              setFilter('admins');
            }}
            style={[styles.chip, filter === 'admins' && { backgroundColor: tokens.adminGold }]}
            textStyle={{ color: filter === 'admins' ? '#FFFFFF' : tokens.text, fontWeight: '700' }}
          >
            👑 Super-Admins ({users.filter((u) => u.isSuperAdmin === true).length})
          </Chip>
        </ScrollView>
      </View>

      {/* Users List */}
      {loading && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.primary} />
          <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
            Chargement des utilisateurs...
          </Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🔍</Text>
          <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
            Aucun utilisateur trouvé
          </Text>
          <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginTop: 4 }}>
            Essayez de modifier votre recherche ou vos filtres.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filteredUsers.map((u) => {
            const isSuspended = u.status === 'suspended';
            const isSuperAdmin = u.isSuperAdmin === true;
            const isSelf = u.uid === currentUser?.uid;

            return (
              <View
                key={u.uid}
                style={[
                  styles.userCard,
                  {
                    backgroundColor: tokens.card,
                    borderColor: isSuspended ? tokens.error : isSuperAdmin ? tokens.adminGold : tokens.border,
                  },
                ]}
              >
                {/* Header row: Avatar + Name + Badges */}
                <View style={styles.userCardHeader}>
                  <Avatar.Text
                    size={46}
                    label={(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                    style={{
                      backgroundColor: isSuspended
                        ? tokens.error
                        : isSuperAdmin
                        ? tokens.adminGold
                        : tokens.primary,
                    }}
                  />

                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text variant="titleMedium" style={[styles.userName, { color: tokens.text }]}>
                        {u.displayName || 'Sans nom'}
                      </Text>
                      {isSelf && (
                        <View style={styles.selfPill}>
                          <Text style={styles.selfPillText}>Vous</Text>
                        </View>
                      )}
                    </View>

                    <Text variant="bodySmall" style={{ color: tokens.textSecondary }}>
                      {u.email}
                    </Text>

                    <Text variant="labelSmall" style={{ color: tokens.textSecondary, marginTop: 2 }}>
                      Coloc : {u.groupId ? `🏠 ${u.groupId}` : 'Aucune'} · Inscrit le{' '}
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : 'N/C'}
                    </Text>
                  </View>

                  {/* Status Badges */}
                  <View style={styles.badgeColumn}>
                    {isSuspended ? (
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 69, 58, 0.15)' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.error }}>
                          🚫 Suspendu
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.secondary }}>
                          ✓ Actif
                        </Text>
                      </View>
                    )}

                    {isSuperAdmin && (
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 214, 10, 0.2)', marginTop: 4 }]}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                          👑 SuperAdmin
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Suspension reason banner if suspended */}
                {isSuspended && u.suspendedReason && (
                  <View
                    style={[
                      styles.reasonBox,
                      {
                        backgroundColor: isDark ? 'rgba(255, 69, 58, 0.08)' : 'rgba(255, 69, 58, 0.06)',
                        borderColor: tokens.error,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11, color: tokens.error, fontWeight: '700' }}>
                      Motif : "{u.suspendedReason}"
                    </Text>
                  </View>
                )}

                {/* Action Buttons Row */}
                <View style={styles.actionsRow}>
                  {/* Suspend or Reactivate button */}
                  {isSuspended ? (
                    <Button
                      mode="contained"
                      buttonColor={tokens.secondary}
                      textColor="#FFFFFF"
                      compact
                      icon="check-circle"
                      onPress={() => handleReactivateUser(u)}
                      style={styles.actionBtn}
                      labelStyle={{ fontSize: 12, fontWeight: '800' }}
                    >
                      Réactiver
                    </Button>
                  ) : (
                    <Button
                      mode="outlined"
                      textColor={tokens.error}
                      compact
                      icon="block-helper"
                      disabled={isSelf}
                      onPress={() => {
                        soundService.playPopSound();
                        setSuspendModalUser(u);
                        setSuspendReason('Non-respect des règles de vie commune');
                      }}
                      style={[styles.actionBtn, { borderColor: tokens.error }]}
                      labelStyle={{ fontSize: 12, fontWeight: '800' }}
                    >
                      Suspendre
                    </Button>
                  )}

                  {/* SuperAdmin toggle */}
                  <Button
                    mode="outlined"
                    textColor={isSuperAdmin ? '#B45309' : tokens.text}
                    compact
                    icon="crown"
                    disabled={isSelf}
                    onPress={() => handleToggleSuperAdmin(u)}
                    style={[styles.actionBtn, { borderColor: isSuperAdmin ? tokens.adminGold : tokens.border }]}
                    labelStyle={{ fontSize: 12, fontWeight: '700' }}
                  >
                    {isSuperAdmin ? 'Rétrograder' : 'Promouvoir Admin'}
                  </Button>

                  {/* Delete button */}
                  <Button
                    mode="text"
                    textColor={tokens.error}
                    compact
                    icon="delete-outline"
                    disabled={isSelf}
                    onPress={() => {
                      soundService.playPopSound();
                      setDeleteModalUser(u);
                    }}
                    style={styles.actionBtn}
                    labelStyle={{ fontSize: 12, fontWeight: '700' }}
                  >
                    Supprimer
                  </Button>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Suspend Reason Dialog */}
      <Portal>
        <Dialog
          visible={Boolean(suspendModalUser)}
          onDismiss={() => setSuspendModalUser(null)}
          style={{ backgroundColor: tokens.card, borderRadius: 24 }}
        >
          <Dialog.Title style={{ fontWeight: '900', color: tokens.text }}>
            🚫 Restreindre l'accès au compte
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: tokens.text, marginBottom: 12 }}>
              L'utilisateur{' '}
              <Text style={{ fontWeight: '800' }}>{suspendModalUser?.displayName}</Text> (
              {suspendModalUser?.email}) sera immédiatement bloqué sur l'écran d'accès restreint.
            </Text>

            <TextInput
              label="Motif explicite de la restriction"
              value={suspendReason}
              onChangeText={setSuspendReason}
              mode="outlined"
              multiline
              numberOfLines={3}
              textColor={tokens.text}
              outlineColor={tokens.borderSubtle}
              activeOutlineColor={tokens.error}
              style={{ backgroundColor: 'transparent' }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setSuspendModalUser(null)}
              textColor={tokens.textSecondary}
              disabled={submittingAction}
            >
              Annuler
            </Button>
            <Button
              onPress={handleConfirmSuspend}
              textColor="#FFFFFF"
              buttonColor={tokens.error}
              loading={submittingAction}
              disabled={submittingAction}
              style={{ borderRadius: 16 }}
            >
              Confirmer la suspension
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          visible={Boolean(deleteModalUser)}
          onDismiss={() => setDeleteModalUser(null)}
          style={{ backgroundColor: tokens.card, borderRadius: 24 }}
        >
          <Dialog.Title style={{ fontWeight: '900', color: tokens.error }}>
            ⚠️ Supprimer définitivement l'utilisateur ?
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: tokens.text }}>
              Êtes-vous certain de vouloir supprimer le compte de{' '}
              <Text style={{ fontWeight: '800' }}>{deleteModalUser?.displayName}</Text> (
              {deleteModalUser?.email}) ?
            </Text>
            <Text variant="bodySmall" style={{ color: tokens.error, marginTop: 8 }}>
              Cette action est irréversible et supprimera également toutes ses appartenances de colocation.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setDeleteModalUser(null)}
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
              Supprimer définitivement
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
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chip: {
    marginRight: 8,
    borderRadius: 16,
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
  userCard: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontWeight: '800',
  },
  selfPill: {
    marginLeft: 8,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  selfPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0A84FF',
  },
  badgeColumn: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  reasonBox: {
    marginTop: 10,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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

export default AdminUsersView;
