import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  Avatar,
  IconButton,
  Surface,
  Dialog,
  Portal,
  Snackbar,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { GroupMember } from '../../types';

interface ManageMembersScreenProps {
  navigation: {
    goBack: () => void;
  };
}

/**
 * Screen allowing administrators to manage room members, invite codes, and permissions.
 */
export const ManageMembersScreen: React.FC<ManageMembersScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { group, members, removeMember, regenerateInviteCode, loading, error: groupError } = useGroup();

  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const [removeDialogVisible, setRemoveDialogVisible] = useState(false);
  const [regenerateDialogVisible, setRegenerateDialogVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin =
    group?.adminUid === user?.uid ||
    members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin');

  /**
   * Copies the current invite code to system clipboard.
   */
  const handleCopyInviteCode = async () => {
    if (!group?.inviteCode) return;
    try {
      await Clipboard.setStringAsync(group.inviteCode);
      setSnackbarMessage('Code d\'invitation copié dans le presse-papier !');
      setSnackbarVisible(true);
    } catch {
      Alert.alert('Code d\'invitation', group.inviteCode);
    }
  };

  /**
   * Prompts and regenerates the group's invite code.
   */
  const handleConfirmRegenerateCode = async () => {
    setRegenerateDialogVisible(false);
    setActionLoading(true);
    try {
      await regenerateInviteCode();
      setSnackbarMessage('Nouveau code d\'invitation généré !');
      setSnackbarVisible(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du renouvellement du code.';
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Confirms removal of a room member.
   */
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    const targetId = memberToRemove.userId || memberToRemove.id;
    setRemoveDialogVisible(false);
    setActionLoading(true);
    try {
      await removeMember(targetId);
      setSnackbarMessage(`${memberToRemove.displayName || 'Le membre'} a été retiré.`);
      setSnackbarVisible(true);
      setMemberToRemove(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la suppression du membre.';
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Renders each individual member item.
   */
  const renderMemberItem = ({ item }: { item: GroupMember }) => {
    const isMemberAdmin = item.role === 'admin' || item.userId === group?.adminUid;
    const isSelf = item.userId === user?.uid || item.id === user?.uid;

    const initial = (item.displayName || item.email || '?')
      .charAt(0)
      .toUpperCase();

    return (
      <Surface style={styles.memberCard}>
        <View style={styles.memberLeft}>
          <Avatar.Text size={44} label={initial} style={styles.avatar} />
          <View style={styles.memberInfo}>
            <View style={styles.nameRow}>
              <Text variant="titleMedium" style={styles.memberName}>
                {item.displayName || 'Colocataire'}
              </Text>
              {isSelf && (
                <Text variant="bodySmall" style={styles.selfBadge}>
                  (Vous)
                </Text>
              )}
            </View>
            <Text variant="bodySmall" style={styles.memberEmail}>
              {item.email || 'Email non renseigné'}
            </Text>
          </View>
        </View>

        <View style={styles.memberRight}>
          {isMemberAdmin ? (
            <View style={styles.adminBadge}>
              <IconButton icon="crown" size={20} iconColor="#FFA000" style={styles.crownIcon} />
              <Text variant="labelSmall" style={styles.adminText}>
                Admin
              </Text>
            </View>
          ) : (
            isAdmin && (
              <IconButton
                icon="close-circle-outline"
                iconColor={colors.error}
                size={24}
                onPress={() => {
                  setMemberToRemove(item);
                  setRemoveDialogVisible(true);
                }}
              />
            )
          )}
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={styles.headerTitle}>
          Membres de la colocation
        </Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Admin Access Check */}
      {!isAdmin && (
        <Surface style={styles.nonAdminBanner}>
          <Text variant="bodySmall" style={styles.nonAdminText}>
            ℹ️ Seul l'administrateur peut exclure des membres ou régénérer le code d'invitation.
          </Text>
        </Surface>
      )}

      {/* Member Count */}
      <View style={styles.listHeader}>
        <Text variant="titleSmall" style={styles.listSubtitle}>
          {members.length} {members.length > 1 ? 'membres inscrits' : 'membre inscrit'}
        </Text>
      </View>

      {/* Member FlatList */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id || item.userId}
        renderItem={renderMemberItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.centered} size="large" color={colors.primary} />
          ) : (
            <Text style={styles.emptyText}>Aucun membre trouvé.</Text>
          )
        }
      />

      <Divider />

      {/* Invite Code Section at Bottom */}
      <Surface style={styles.inviteSection}>
        <Text variant="titleSmall" style={styles.inviteTitle}>
          Code d'invitation du groupe
        </Text>
        <Text variant="bodySmall" style={styles.inviteSubtitle}>
          Partagez ce code avec vos colocataires pour qu'ils rejoignent l'espace.
        </Text>

        <View style={styles.codeContainer}>
          <Text variant="headlineMedium" style={styles.inviteCode}>
            {group?.inviteCode || '------'}
          </Text>
          <IconButton
            icon="content-copy"
            size={24}
            iconColor={colors.primary}
            onPress={handleCopyInviteCode}
          />
        </View>

        {isAdmin && (
          <Button
            mode="outlined"
            icon="refresh"
            onPress={() => setRegenerateDialogVisible(true)}
            loading={actionLoading}
            disabled={actionLoading}
            style={styles.regenerateButton}
          >
            Régénérer le code
          </Button>
        )}
      </Surface>

      {/* Confirmation Dialog for Member Removal */}
      <Portal>
        <Dialog visible={removeDialogVisible} onDismiss={() => setRemoveDialogVisible(false)}>
          <Dialog.Title>Retirer le colocataire</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Êtes-vous sûr de vouloir retirer{' '}
              <Text style={{ fontWeight: '700' }}>
                {memberToRemove?.displayName || 'ce membre'}
              </Text>{' '}
              de la colocation ? Cette action est irréversible.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRemoveDialogVisible(false)}>Annuler</Button>
            <Button
              textColor={colors.error}
              onPress={handleConfirmRemoveMember}
              loading={actionLoading}
            >
              Retirer
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Confirmation Dialog for Code Regeneration */}
        <Dialog
          visible={regenerateDialogVisible}
          onDismiss={() => setRegenerateDialogVisible(false)}
        >
          <Dialog.Title>Régénérer le code d'invitation</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              L'ancien code deviendra immédiatement invalide. Vos futurs colocataires devront utiliser
              le nouveau code.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRegenerateDialogVisible(false)}>Annuler</Button>
            <Button
              mode="contained"
              onPress={handleConfirmRegenerateCode}
              loading={actionLoading}
            >
              Régénérer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Feedback Snackbar */}
      <Snackbar
        visible={snackbarVisible || Boolean(groupError)}
        onDismiss={() => {
          setSnackbarVisible(false);
          setSnackbarMessage(null);
        }}
        duration={3500}
        style={styles.snackbar}
      >
        {snackbarMessage || groupError || ''}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    elevation: 2,
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  nonAdminBanner: {
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFF8E1',
  },
  nonAdminText: {
    color: '#8D6E63',
  },
  listHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  listSubtitle: {
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    elevation: 1,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  memberInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontWeight: '600',
    color: colors.text,
  },
  selfBadge: {
    marginLeft: spacing.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  memberEmail: {
    color: colors.textSecondary,
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.sm,
    paddingRight: spacing.sm,
  },
  crownIcon: {
    margin: 0,
  },
  adminText: {
    color: '#F57F17',
    fontWeight: '700',
  },
  inviteSection: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    elevation: 4,
  },
  inviteTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  inviteSubtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviteCode: {
    fontWeight: '800',
    letterSpacing: 4,
    color: colors.primary,
  },
  regenerateButton: {
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  centered: {
    marginTop: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xl,
    color: colors.textSecondary,
  },
  snackbar: {
    backgroundColor: colors.text,
  },
});

export default ManageMembersScreen;
