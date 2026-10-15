import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  onSnapshot,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { Group, GroupMember } from '../types';
import { isDemoMode, mockStorage } from './mockStorage';
import { notificationService } from './notificationService';

/**
 * Helper to race any promise against a timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * Generates an invite code formatted as 'XXX-XXXX' (3 uppercase letters, dash, 4 digits).
 */
export function generateInviteCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';

  let codeLetters = '';
  for (let i = 0; i < 3; i++) {
    codeLetters += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  let codeDigits = '';
  for (let i = 0; i < 4; i++) {
    codeDigits += digits.charAt(Math.floor(Math.random() * digits.length));
  }

  return `${codeLetters}-${codeDigits}`;
}

const groupSubscribers = new Set<(group: Group) => void>();
const memberSubscribers = new Set<(members: GroupMember[]) => void>();

/**
 * Group service handling group creation, membership management, invite codes, and real-time listeners.
 */
export const groupService = {
  async createGroup(name: string, adminUid: string): Promise<Group> {
    if (isDemoMode()) {
      const newGroup: Group = {
        id: `group-${Date.now()}`,
        groupId: `group-${Date.now()}`,
        name: name.trim(),
        inviteCode: generateInviteCode(),
        adminUid,
        memberCount: 1,
        createdAt: new Date().toISOString(),
      };
      await mockStorage.setGroup(newGroup);
      groupSubscribers.forEach((cb) => cb(newGroup));
      return newGroup;
    }

    try {
      const now = new Date().toISOString();
      const inviteCode = generateInviteCode();
      const groupDocRef = doc(collection(db, 'groups'));
      const groupId = groupDocRef.id;

      const newGroup: Group = {
        id: groupId,
        name: name.trim(),
        adminUid,
        inviteCode,
        createdAt: now,
        updatedAt: now,
        memberCount: 1,
      };

      const batch = writeBatch(db);
      batch.set(groupDocRef, newGroup);

      const memberDocRef = doc(db, 'groups', groupId, 'members', adminUid);
      const adminMember: GroupMember = {
        id: adminUid,
        userId: adminUid,
        groupId,
        role: 'admin',
        orderIndex: 0,
        joinedAt: now,
        displayName: 'Admin',
        email: '',
        photoURL: null,
      };
      batch.set(memberDocRef, adminMember);

      // Keep user doc synchronized with current groupId
      const userDocRef = doc(db, 'users', adminUid);
      batch.set(userDocRef, { groupId, updatedAt: now }, { merge: true });

      await withTimeout(batch.commit(), 3500, null);

      return newGroup;
    } catch (error: any) {
      console.error('Firebase error in createGroup:', error);
      throw new Error(error?.message || 'Erreur lors de la création de la colocation.');
    }
  },

  async joinGroup(inviteCode: string, userId: string): Promise<Group> {
    if (isDemoMode()) {
      const group = await mockStorage.getGroup();
      return group || {
        id: 'group-1',
        name: '🏠 Coloc des Champions',
        inviteCode,
        adminUid: userId,
        memberCount: 1,
        createdAt: new Date().toISOString(),
      };
    }

    try {
      const sanitizedCode = inviteCode.trim().toUpperCase();
      const group = await groupService.getGroupByInviteCode(sanitizedCode);
      if (!group) {
        throw new Error("Code d'invitation invalide ou introuvable.");
      }

      const groupId = group.id || (group as any).groupId;
      const now = new Date().toISOString();

      const batch = writeBatch(db);

      // Add member record
      const memberDocRef = doc(db, 'groups', groupId, 'members', userId);
      const newMember: GroupMember = {
        id: userId,
        userId,
        groupId,
        role: 'member',
        orderIndex: (group.memberCount || 1),
        joinedAt: now,
        displayName: 'Colocataire',
        email: '',
        photoURL: null,
      };
      batch.set(memberDocRef, newMember, { merge: true });

      // Increment memberCount on group
      const groupDocRef = doc(db, 'groups', groupId);
      batch.update(groupDocRef, {
        memberCount: increment(1),
        updatedAt: now,
      });

      // Update user doc with groupId
      const userDocRef = doc(db, 'users', userId);
      batch.set(userDocRef, { groupId, updatedAt: now }, { merge: true });

      await withTimeout(batch.commit(), 3500, null);

      if (group.adminUid && group.adminUid !== userId) {
        notificationService
          .addNotificationToFirestore(
            group.adminUid,
            'member_joined',
            '👋 Nouveau colocataire !',
            `Un nouveau membre a rejoint la colocation "${group.name}".`,
            groupId
          )
          .catch((e) => console.warn('Failed to notify admin of member join:', e));
      }

      return {
        ...group,
        memberCount: (group.memberCount || 1) + 1,
      };
    } catch (error: any) {
      console.error('Firebase error in joinGroup:', error);
      throw new Error(error?.message || "Impossible de rejoindre la colocation avec ce code.");
    }
  },

  async getGroup(groupId: string): Promise<Group | null> {
    if (isDemoMode()) {
      return await mockStorage.getGroup();
    }
    try {
      const groupDocSnap = await withTimeout(
        getDoc(doc(db, 'groups', groupId)),
        2500,
        null
      );
      if (!groupDocSnap || !groupDocSnap.exists()) return null;
      return { id: groupDocSnap.id, ...groupDocSnap.data() } as Group;
    } catch {
      return null;
    }
  },

  async getGroupByInviteCode(code: string): Promise<Group | null> {
    if (isDemoMode()) {
      return await mockStorage.getGroup();
    }
    try {
      const sanitizedCode = code.trim().toUpperCase();
      const q = query(
        collection(db, 'groups'),
        where('inviteCode', '==', sanitizedCode),
        limit(1)
      );
      const querySnap = await withTimeout(getDocs(q), 3000, null);
      if (!querySnap || querySnap.empty) return null;
      const docSnap = querySnap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Group;
    } catch (err) {
      console.warn('Error fetching group by invite code:', err);
      return null;
    }
  },

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    if (isDemoMode()) {
      return await mockStorage.getMembers();
    }
    try {
      const membersRef = collection(db, 'groups', groupId, 'members');
      const querySnap = await withTimeout(getDocs(membersRef), 2500, null);
      if (!querySnap) return [];
      return querySnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as GroupMember));
    } catch {
      return [];
    }
  },

  /**
   * Finds the user's active flatshare.
   * Uses direct document lookup on users/{userId} and fallback to groups where adminUid == userId.
   * Completely avoids collectionGroup to guarantee instantaneous response without hanging.
   */
  async getUserGroup(
    userId: string
  ): Promise<{ group: Group; member: GroupMember } | null> {
    if (isDemoMode()) {
      const group = await mockStorage.getGroup();
      if (!group) return null;
      const members = await mockStorage.getMembers();
      const member = members.find((m) => m.userId === userId || m.id === userId);
      return member ? { group, member } : null;
    }

    try {
      // 1. Direct lookup on user doc
      const userDocSnap = await withTimeout(
        getDoc(doc(db, 'users', userId)),
        2000,
        null
      );

      if (userDocSnap && userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData?.groupId) {
          const group = await groupService.getGroup(userData.groupId);
          if (group) {
            const memberDocSnap = await withTimeout(
              getDoc(doc(db, 'groups', group.id, 'members', userId)),
              1500,
              null
            );
            const member: GroupMember = memberDocSnap && memberDocSnap.exists()
              ? (memberDocSnap.data() as GroupMember)
              : {
                  id: userId,
                  userId,
                  groupId: group.id,
                  role: group.adminUid === userId ? 'admin' : 'member',
                  orderIndex: 0,
                  joinedAt: group.createdAt,
                };
            return { group, member };
          }
        }
      }

      // 2. Fallback check: is user an admin of any group?
      const adminQuery = query(
        collection(db, 'groups'),
        where('adminUid', '==', userId),
        limit(1)
      );
      const adminSnap = await withTimeout(getDocs(adminQuery), 2000, null);
      if (adminSnap && !adminSnap.empty) {
        const groupDoc = adminSnap.docs[0];
        const group = { id: groupDoc.id, ...groupDoc.data() } as Group;

        // Auto sync user document with this groupId for fast future lookups
        setDoc(doc(db, 'users', userId), { groupId: group.id }, { merge: true }).catch(() => {});

        const member: GroupMember = {
          id: userId,
          userId,
          groupId: group.id,
          role: 'admin',
          orderIndex: 0,
          joinedAt: group.createdAt,
        };
        return { group, member };
      }

      return null;
    } catch (err) {
      console.warn('Error in getUserGroup:', err);
      return null;
    }
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    if (isDemoMode()) {
      const members = await mockStorage.getMembers();
      const updated = members.filter((m) => m.userId !== userId && m.id !== userId);
      await mockStorage.setMembers(updated);
      memberSubscribers.forEach((cb) => cb(updated));
      return;
    }
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'groups', groupId, 'members', userId));
      batch.update(doc(db, 'users', userId), { groupId: null });
      await withTimeout(batch.commit(), 2500, null);

      notificationService
        .addNotificationToFirestore(
          userId,
          'member_left',
          '👋 Départ de la colocation',
          'Vous avez été retiré de la colocation.',
          groupId
        )
        .catch((e) => console.warn('Failed to notify removed member:', e));
    } catch (error: any) {
      console.warn('Firebase error in removeMember:', error);
    }
  },

  async transferAdmin(groupId: string, newAdminUid: string): Promise<void> {
    if (isDemoMode()) {
      const group = await mockStorage.getGroup();
      if (group) {
        group.adminUid = newAdminUid;
        await mockStorage.setGroup(group);
        const members = await mockStorage.getMembers();
        const updated = members.map((m) => {
          if (m.userId === newAdminUid || m.id === newAdminUid) {
            return { ...m, role: 'admin' as const };
          }
          if (m.role === 'admin') {
            return { ...m, role: 'member' as const };
          }
          return m;
        });
        await mockStorage.setMembers(updated);
        groupSubscribers.forEach((cb) => cb(group));
        memberSubscribers.forEach((cb) => cb(updated));
      }
      return;
    }
    try {
      const batch = writeBatch(db);
      const groupRef = doc(db, 'groups', groupId);
      batch.update(groupRef, { adminUid: newAdminUid, updatedAt: new Date().toISOString() });

      const membersSnap = await withTimeout(
        getDocs(collection(db, 'groups', groupId, 'members')),
        2500,
        null
      );
      if (membersSnap) {
        membersSnap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.userId === newAdminUid || docSnap.id === newAdminUid) {
            batch.update(docSnap.ref, { role: 'admin' });
          } else if (data.role === 'admin') {
            batch.update(docSnap.ref, { role: 'member' });
          }
        });
      }
      await withTimeout(batch.commit(), 3000, null);

      notificationService
        .addNotificationToFirestore(
          newAdminUid,
          'admin_transfer',
          '👑 Rôle administrateur',
          'Vous êtes désormais le nouvel administrateur de la colocation.',
          groupId
        )
        .catch((e) => console.warn('Failed to notify new admin:', e));
    } catch (error: any) {
      console.warn('Firebase error in transferAdmin:', error);
    }
  },

  async regenerateInviteCode(groupId: string): Promise<string> {
    const newCode = generateInviteCode();
    if (isDemoMode()) {
      const group = await mockStorage.getGroup();
      if (group) {
        group.inviteCode = newCode;
        await mockStorage.setGroup(group);
        groupSubscribers.forEach((cb) => cb(group));
      }
      return newCode;
    }
    try {
      await withTimeout(
        updateDoc(doc(db, 'groups', groupId), {
          inviteCode: newCode,
          updatedAt: new Date().toISOString(),
        }),
        2500,
        null
      );
      return newCode;
    } catch {
      return newCode;
    }
  },

  async deleteGroup(groupId: string): Promise<void> {
    if (isDemoMode()) {
      await mockStorage.setGroup(null);
      return;
    }
    try {
      await withTimeout(deleteDoc(doc(db, 'groups', groupId)), 2500, null);
    } catch (error: any) {
      console.warn('Firebase error in deleteGroup:', error);
    }
  },

  subscribeToGroup(groupId: string, callback: (group: Group) => void): () => void {
    if (isDemoMode()) {
      groupSubscribers.add(callback);
      mockStorage.getGroup().then((g) => {
        if (g) callback(g);
      });
      return () => {
        groupSubscribers.delete(callback);
      };
    }
    return onSnapshot(
      doc(db, 'groups', groupId),
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() } as Group);
        }
      },
      (err) => {
        console.warn('subscribeToGroup error:', err);
      }
    );
  },

  subscribeToMembers(groupId: string, callback: (members: GroupMember[]) => void): () => void {
    if (isDemoMode()) {
      memberSubscribers.add(callback);
      mockStorage.getMembers().then(callback);
      return () => {
        memberSubscribers.delete(callback);
      };
    }
    return onSnapshot(
      collection(db, 'groups', groupId, 'members'),
      (snapshot) => {
        callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as GroupMember)));
      },
      (err) => {
        console.warn('subscribeToMembers error:', err);
      }
    );
  },
};

export default groupService;
