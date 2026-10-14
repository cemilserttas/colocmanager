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
    Boolean(user?.uid) &&
    (group?.adminUid === user?.uid ||
      members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin'));

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
              <Text style={{ fontSize: 14, marginRight: 4 }}>👑</Text>
              <Text variant="labelSmall" style={styles.adminText}>
                Admin
              </Text>
            </View>
          ) : (
            isAdmin && (
              <Button
                mode="text"
                textColor={colors.error}
                compact
                onPress={() => {
                  setMemberToRemove(item);
                  setRemoveDialogVisible(true);
                }}
              >
                Retirer
              </Button>
            )
          )}
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Top Header */}
        <View style={styles.header}>
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
            labelStyle={{ fontSize: 16 }}
          >
            ← Retour
          </Button>
          <Text variant="titleMedium" style={styles.headerTitle}>
            Gestion des Colocataires
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Admin Access Check */}
        {!isAdmin ? (
          <Surface style={styles.nonAdminBanner}>
            <Text variant="bodySmall" style={styles.nonAdminText}>
              ℹ️ Seul l'administrateur peut exclure des membres ou régénérer le code d'invitation.
            </Text>
          </Surface>
        ) : (
          <Surface style={styles.adminInfoBanner}>
            <Text variant="bodySmall" style={styles.adminInfoText}>
              👑 En tant qu'administrateur, vous pouvez partager le code d'invitation ci-dessous avec vos colocataires pour qu'ils rejoignent l'application.
            </Text>
          </Surface>
        )}

        {/* Member Count */}
        <View style={styles.listHeader}>
          <Text variant="titleSmall" style={styles.listSubtitle}>
            {members.length} {members.length > 1 ? 'membres dans la colocation' : 'membre dans la colocation'}
          </Text>
        </View>

        {/* Member FlatList */}
        <FlatList
          data={members}
          keyExtractor={(item) => item.id || item.userId}
          renderItem={renderMemberItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          showsVerticalScrollIndicator={false}
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
            Code d'invitation de la colocation
          </Text>
          <Text variant="bodySmall" style={styles.inviteSubtitle}>
            Partage ce code à tes nouveaux colocataires pour qu'ils rejoignent le groupe.
          </Text>

          <View style={styles.codeContainer}>
            <Text variant="headlineMedium" style={styles.inviteCode}>
              {group?.inviteCode || '------'}
            </Text>
            <Button
              mode="contained"
              buttonColor={colors.primary}
              compact
              onPress={handleCopyInviteCode}
              style={{ borderRadius: borderRadius.md }}
              labelStyle={{ fontSize: 12, fontWeight: '700' }}
            >
              📋 Copier
            </Button>
          </View>

          {isAdmin && (
            <Button
              mode="outlined"
              onPress={() => setRegenerateDialogVisible(true)}
              loading={actionLoading}
              disabled={actionLoading}
              style={styles.regenerateButton}
              labelStyle={{ fontSize: 13, fontWeight: '600' }}
            >
              🔄 Renouveler le code d'accès
            </Button>
          )}
        </Surface>
      </View>

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
              de la colocation ? Cette action réattribuera ses tâches.
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
              L'ancien code deviendra immédiatement invalide. Vos futurs colocataires devront entrer le
              nouveau code.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRegenerateDialogVisible(false)}>Annuler</Button>
            <Button
              mode="contained"
              buttonColor={colors.primary}
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
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    elevation: 2,
  },
  headerTitle: {
    fontWeight: '800',
    color: colors.text,
  },
  nonAdminBanner: {
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  nonAdminText: {
    color: '#92400E',
    fontSize: 13,
  },
  adminInfoBanner: {
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  adminInfoText: {
    color: '#3730A3',
    fontSize: 13,
    lineHeight: 18,
  },
  listHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  listSubtitle: {
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontWeight: '700',
    color: colors.text,
  },
  selfBadge: {
    marginLeft: spacing.xs,
    color: colors.primary,
    fontWeight: '700',
  },
  memberEmail: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs - 1,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  adminText: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 11,
  },
  inviteSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    elevation: 4,
  },
  inviteTitle: {
    fontWeight: '800',
    color: colors.text,
  },
  inviteSubtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
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
