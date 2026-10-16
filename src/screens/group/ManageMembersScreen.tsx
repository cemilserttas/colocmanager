import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  Avatar,
  Dialog,
  Portal,
  Snackbar,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';
import { GroupMember } from '../../types';

interface ManageMembersScreenProps {
  navigation: {
    goBack: () => void;
  };
}

/**
 * Screen allowing administrators to manage roommates,
 * transfer administrator role to another member, and share invite codes.
 */
export const ManageMembersScreen: React.FC<ManageMembersScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t } = useLanguageStore();

  const { user } = useAuth();
  const { group, members, removeMember, transferAdmin, regenerateInviteCode, loading, error: groupError } = useGroup();

  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const [memberToPromote, setMemberToPromote] = useState<GroupMember | null>(null);
  const [removeDialogVisible, setRemoveDialogVisible] = useState(false);
  const [transferDialogVisible, setTransferDialogVisible] = useState(false);
  const [regenerateDialogVisible, setRegenerateDialogVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin =
    Boolean(user?.uid) &&
    (group?.adminUid === user?.uid ||
      members.some((m) => (m.userId === user?.uid || m.id === user?.uid) && m.role === 'admin'));

  const handleCopyInviteCode = async () => {
    if (!group?.inviteCode) return;
    soundService.playPopSound();
    try {
      await Clipboard.setStringAsync(group.inviteCode);
      setSnackbarMessage(t('codeCopied'));
      setSnackbarVisible(true);
    } catch {
      Alert.alert(t('inviteCodeTitle'), group.inviteCode);
    }
  };

  const handleConfirmTransferAdmin = async () => {
    if (!memberToPromote || !group?.id) return;
    const targetUid = memberToPromote.userId || memberToPromote.id;
    setTransferDialogVisible(false);
    setActionLoading(true);
    try {
      await transferAdmin(group.id, targetUid);
      soundService.playSuccessSound();
      setSnackbarMessage(
        t('transferAdminSuccess', { name: memberToPromote.displayName || 'Le colocataire' })
      );
      setSnackbarVisible(true);
      setMemberToPromote(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du transfert des droits.';
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRegenerateCode = async () => {
    setRegenerateDialogVisible(false);
    setActionLoading(true);
    try {
      await regenerateInviteCode();
      soundService.playSuccessSound();
      setSnackbarMessage(t('codeRegenerated'));
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

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    const targetId = memberToRemove.userId || memberToRemove.id;
    setRemoveDialogVisible(false);
    setActionLoading(true);
    try {
      await removeMember(targetId);
      soundService.playPopSound();
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

  const renderMemberItem = ({ item }: { item: GroupMember }) => {
    const isMemberAdmin = item.role === 'admin' || item.userId === group?.adminUid;
    const isSelf = item.userId === user?.uid || item.id === user?.uid;
    const initial = (item.displayName || item.email || '?').charAt(0).toUpperCase();

    return (
      <View
        style={[
          styles.memberCard,
          {
            backgroundColor: tokens.card,
            borderColor: isMemberAdmin ? tokens.adminGold : tokens.border,
          },
        ]}
      >
        <View style={styles.memberLeft}>
          <Avatar.Text
            size={44}
            label={initial}
            color={isMemberAdmin ? '#451A03' : '#FFFFFF'}
            style={{
              backgroundColor: isMemberAdmin ? tokens.adminGold : tokens.primary,
            }}
          />
          <View style={styles.memberInfo}>
            <View style={styles.nameRow}>
              <Text variant="titleMedium" style={[styles.memberName, { color: tokens.text }]}>
                {item.displayName || 'Colocataire'}
              </Text>
              {isSelf && (
                <Text variant="bodySmall" style={[styles.selfBadge, { color: tokens.primary }]}>
                  ({t('you') || 'Vous'})
                </Text>
              )}
            </View>
            <Text variant="bodySmall" style={{ color: tokens.textSecondary }}>
              {item.email || t('noEmail') || 'Email non renseigné'}
            </Text>
          </View>
        </View>

        <View style={styles.memberRight}>
          {isMemberAdmin ? (
            <View style={styles.adminBadge}>
              <Text style={{ fontSize: 13, marginRight: 4 }}>👑</Text>
              <Text variant="labelSmall" style={styles.adminText}>
                Admin
              </Text>
            </View>
          ) : (
            isAdmin && (
              <View style={styles.adminActionsRow}>
                {/* Transfer Admin Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    soundService.playPopSound();
                    setMemberToPromote(item);
                    setTransferDialogVisible(true);
                  }}
                  style={[styles.actionPillBtn, { borderColor: tokens.adminGold }]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>
                    {t('transferAdminBtn')}
                  </Text>
                </TouchableOpacity>

                {/* Remove Member Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    soundService.playPopSound();
                    setMemberToRemove(item);
                    setRemoveDialogVisible(true);
                  }}
                  style={[styles.actionPillBtn, { borderColor: tokens.error, marginLeft: 6 }]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: tokens.error }}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <View style={styles.contentWrapper}>
        {/* Header Bar */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              paddingTop: Math.max(insets.top, 12),
            },
          ]}
        >
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
            textColor={tokens.primary}
            labelStyle={{ fontSize: 16 }}
          >
            ← {t('back')}
          </Button>
          <Text variant="titleMedium" style={[styles.headerTitle, { color: tokens.text }]}>
            {t('membersTitle')}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Admin Info Banner */}
        {isAdmin ? (
          <View style={[styles.infoBanner, { backgroundColor: 'rgba(255, 214, 10, 0.12)', borderColor: tokens.adminGold }]}>
            <Text variant="bodySmall" style={{ color: isDark ? '#FDE68A' : '#92400E', lineHeight: 18 }}>
              👑 Vous êtes l'Administrateur. Vous pouvez inviter des colocataires, ajuster les rôles ou céder la place d'administrateur à un autre membre.
            </Text>
          </View>
        ) : (
          <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', borderColor: tokens.border }]}>
            <Text variant="bodySmall" style={{ color: tokens.textSecondary, lineHeight: 18 }}>
              ℹ️ Seul l'administrateur peut inviter, exclure ou modifier les rôles de la colocation.
            </Text>
          </View>
        )}

        {/* Member Count Header */}
        <View style={styles.listHeader}>
          <Text style={[styles.listSubtitle, { color: tokens.textSecondary }]}>
            {members.length} {t('registeredMembers')}
          </Text>
        </View>

        {/* Member FlatList */}
        <FlatList
          data={members}
          keyExtractor={(item) => item.id || item.userId}
          renderItem={renderMemberItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={{ marginTop: 32 }} size="large" color={tokens.primary} />
            ) : (
              <Text style={{ textAlign: 'center', marginTop: 32, color: tokens.textSecondary }}>
                Aucun membre trouvé.
              </Text>
            )
          }
        />

        <Divider style={{ backgroundColor: tokens.border }} />

        {/* Invite Code Liquid Section */}
        <View
          style={[
            styles.inviteSection,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              paddingBottom: 24 + insets.bottom,
            },
          ]}
        >
          <Text variant="titleSmall" style={{ fontWeight: '800', color: tokens.text }}>
            {t('inviteCodeTitle')}
          </Text>
          <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginBottom: 12 }}>
            {t('inviteCodeSub')}
          </Text>

          <View
            style={[
              styles.codeContainer,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                borderColor: tokens.border,
              },
            ]}
          >
            <Text variant="headlineMedium" style={[styles.inviteCode, { color: tokens.primary }]}>
              {group?.inviteCode || '------'}
            </Text>
            <Button
              mode="contained"
              buttonColor={tokens.primary}
              textColor="#FFFFFF"
              compact
              onPress={handleCopyInviteCode}
              style={{ borderRadius: 16 }}
              labelStyle={{ fontSize: 13, fontWeight: '800' }}
            >
              {t('copyCode')}
            </Button>
          </View>

          {isAdmin && (
            <Button
              mode="outlined"
              onPress={() => setRegenerateDialogVisible(true)}
              loading={actionLoading}
              disabled={actionLoading}
              textColor={tokens.primary}
              style={{ borderColor: tokens.border, borderRadius: 16 }}
              labelStyle={{ fontSize: 13, fontWeight: '700' }}
            >
              {t('regenerateCode')}
            </Button>
          )}
        </View>
      </View>

      {/* Transfer Admin Dialog */}
      <Portal>
        <Dialog
          visible={transferDialogVisible}
          onDismiss={() => setTransferDialogVisible(false)}
          style={[styles.dialog, { backgroundColor: isDark ? '#141624' : '#FFFFFF', borderColor: tokens.border }]}
        >
          <Dialog.Title style={{ color: tokens.text, fontWeight: '800' }}>
            {t('transferAdminTitle')}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: tokens.textSecondary, lineHeight: 22 }}>
              {t('transferAdminMsg', { name: memberToPromote?.displayName || 'ce colocataire' })}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTransferDialogVisible(false)} textColor={tokens.textSecondary}>
              Annuler
            </Button>
            <Button
              mode="contained"
              buttonColor={tokens.adminGold}
              textColor="#543B00"
              onPress={handleConfirmTransferAdmin}
              loading={actionLoading}
              labelStyle={{ fontWeight: '800' }}
            >
              Transférer l'admin
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Remove Member Dialog */}
        <Dialog
          visible={removeDialogVisible}
          onDismiss={() => setRemoveDialogVisible(false)}
          style={[styles.dialog, { backgroundColor: isDark ? '#141624' : '#FFFFFF', borderColor: tokens.border }]}
        >
          <Dialog.Title style={{ color: tokens.text, fontWeight: '800' }}>
            Retirer le colocataire
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: tokens.textSecondary, lineHeight: 22 }}>
              {t('removeMemberConfirm', { name: memberToRemove?.displayName || 'ce membre' })}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRemoveDialogVisible(false)} textColor={tokens.textSecondary}>
              Annuler
            </Button>
            <Button
              textColor={tokens.error}
              onPress={handleConfirmRemoveMember}
              loading={actionLoading}
            >
              Retirer
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Regenerate Code Dialog */}
        <Dialog
          visible={regenerateDialogVisible}
          onDismiss={() => setRegenerateDialogVisible(false)}
          style={[styles.dialog, { backgroundColor: isDark ? '#141624' : '#FFFFFF', borderColor: tokens.border }]}
        >
          <Dialog.Title style={{ color: tokens.text, fontWeight: '800' }}>
            Renouveler le code d'accès
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: tokens.textSecondary, lineHeight: 22 }}>
              L'ancien code d'invitation ne sera plus valide. Les futurs colocataires devront utiliser le nouveau code.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRegenerateDialogVisible(false)} textColor={tokens.textSecondary}>
              Annuler
            </Button>
            <Button
              mode="contained"
              buttonColor={tokens.primary}
              onPress={handleConfirmRegenerateCode}
              loading={actionLoading}
            >
              Régénérer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Snackbar Feedback */}
      <Snackbar
        visible={snackbarVisible || Boolean(groupError)}
        onDismiss={() => {
          setSnackbarVisible(false);
          setSnackbarMessage(null);
        }}
        duration={3500}
        wrapperStyle={{ bottom: Math.max(insets.bottom, 16), zIndex: 99999 }}
        style={{
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.98)' : 'rgba(15, 23, 42, 0.96)',
          borderRadius: 18,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        {snackbarMessage || groupError || ''}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontWeight: '800',
  },
  infoBanner: {
    margin: 16,
    marginBottom: 0,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  listSubtitle: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 4,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontWeight: '800',
  },
  selfBadge: {
    marginLeft: 6,
    fontWeight: '800',
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 10, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFD60A',
  },
  adminText: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 11,
  },
  adminActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  inviteSection: {
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  inviteCode: {
    fontWeight: '900',
    letterSpacing: 4,
  },
  dialog: {
    borderRadius: 26,
    borderWidth: 1,
  },
});

export default ManageMembersScreen;
