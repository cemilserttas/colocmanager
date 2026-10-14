import {
  collection,
  collectionGroup,
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
import { Group, GroupMember, User } from '../types';
import { isDemoMode, mockStorage } from './mockStorage';

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
      let inviteCode = generateInviteCode();
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
      await batch.commit();

      return newGroup;
    } catch (error: any) {
      console.warn('Firebase error in createGroup, falling back to demo:', error.message);
      return this.createGroup(name, adminUid);
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
      if (!group) throw new Error("Code d'invitation invalide");
      return group;
    } catch (error: any) {
      console.warn('Firebase error in joinGroup:', error.message);
      const group = await mockStorage.getGroup();
      return group!;
    }
  },

  async getGroup(groupId: string): Promise<Group | null> {
    if (isDemoMode()) {
      return await mockStorage.getGroup();
    }
    try {
      const groupDocSnap = await getDoc(doc(db, 'groups', groupId));
      return groupDocSnap.exists() ? (groupDocSnap.data() as Group) : null;
    } catch {
      return await mockStorage.getGroup();
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
      const querySnap = await getDocs(q);
      return querySnap.empty ? null : (querySnap.docs[0].data() as Group);
    } catch {
      return await mockStorage.getGroup();
    }
  },

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    if (isDemoMode()) {
      return await mockStorage.getMembers();
    }
    try {
      const membersRef = collection(db, 'groups', groupId, 'members');
      const querySnap = await getDocs(membersRef);
      return querySnap.docs.map((docSnap) => docSnap.data() as GroupMember);
    } catch {
      return await mockStorage.getMembers();
    }
  },

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
      const membersQuery = query(
        collectionGroup(db, 'members'),
        where('userId', '==', userId),
        limit(1)
      );
      const querySnap = await getDocs(membersQuery);
      if (querySnap.empty) {
        return null;
      }
      const member = querySnap.docs[0].data() as GroupMember;
      const group = await groupService.getGroup(member.groupId);
      return group ? { group, member } : null;
    } catch (err) {
      console.warn('Error fetching user group in Firestore:', err);
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
      await deleteDoc(doc(db, 'groups', groupId, 'members', userId));
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
      batch.update(groupRef, { adminUid: newAdminUid });

      const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
      membersSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId === newAdminUid || docSnap.id === newAdminUid) {
          batch.update(docSnap.ref, { role: 'admin' });
        } else if (data.role === 'admin') {
          batch.update(docSnap.ref, { role: 'member' });
        }
      });
      await batch.commit();
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
      await updateDoc(doc(db, 'groups', groupId), { inviteCode: newCode });
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
      await deleteDoc(doc(db, 'groups', groupId));
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
    return onSnapshot(doc(db, 'groups', groupId), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as Group);
      }
    });
  },

  subscribeToMembers(groupId: string, callback: (members: GroupMember[]) => void): () => void {
    if (isDemoMode()) {
      memberSubscribers.add(callback);
      mockStorage.getMembers().then(callback);
      return () => {
        memberSubscribers.delete(callback);
      };
    }
    return onSnapshot(collection(db, 'groups', groupId, 'members'), (snapshot) => {
      callback(snapshot.docs.map((docSnap) => docSnap.data() as GroupMember));
    });
  },
};

export default groupService;
