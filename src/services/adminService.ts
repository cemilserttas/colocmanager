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
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../firebase.config';
import {
  User,
  Group,
  PlatformStats,
  AuditLog,
  AdminAuditAction,
  SystemBroadcast,
  CreateUserPayload,
} from '../types';
import { isDemoMode } from './mockStorage';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// In-memory fallback stores for demo/offline resilience
let localAuditLogs: AuditLog[] = [
  {
    id: 'log-seed-1',
    adminUid: 'admin-seed',
    adminEmail: 'admin@colocmanager.app',
    action: 'CREATE_USER',
    targetId: 'user-sample',
    targetName: 'Système ColocManager',
    details: 'Initialisation de la plateforme',
    timestamp: new Date().toISOString(),
  },
];

let localBroadcasts: SystemBroadcast[] = [
  {
    id: 'broadcast-seed-1',
    title: '🚀 Bienvenue sur ColocManager v2.0',
    message: 'Nouveau design Liquid Glass et gestion ultra fluide de votre colocation !',
    level: 'info',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const adminService = {
  /**
   * Checks whether the current user holds Platform Super-Administrator privileges.
   * Recognizes users with isSuperAdmin=true or matching configured primary administrative patterns.
   */
  isSuperAdmin(user: User | null): boolean {
    if (!user) return false;
    if (user.isSuperAdmin === true) return true;
    const email = (user.email || '').toLowerCase().trim();
    // Primary SuperAdmin and accounts designated as admin
    if (
      email === 'cemmil2000@gmail.com' ||
      email === 'admin@colocmanager.app' ||
      email.startsWith('admin@') ||
      email.includes('superadmin')
    ) {
      return true;
    }
    return false;
  },

  /**
   * Aggregates real-time statistics across all collections on the platform.
   */
  async getPlatformStats(): Promise<PlatformStats> {
    if (isDemoMode()) {
      return {
        totalUsers: 8,
        activeUsers: 7,
        suspendedUsers: 1,
        superAdminsCount: 2,
        totalGroups: 3,
        totalProducts: 14,
        totalCleaningTasks: 18,
        completedTasks: 12,
        averageMembersPerGroup: 2.7,
        groupSizeDistribution: {
          single: 1,
          small: 2,
          medium: 0,
          large: 0,
        },
      };
    }

    try {
      // 1. Users snapshot
      const usersSnap = await withTimeout(getDocs(collection(db, 'users')), 3500, null);
      const users = usersSnap ? usersSnap.docs.map((d) => d.data() as User) : [];

      const totalUsers = users.length;
      const suspendedUsers = users.filter((u) => u.status === 'suspended').length;
      const activeUsers = totalUsers - suspendedUsers;
      const superAdminsCount = users.filter((u) => u.isSuperAdmin === true).length;

      // 2. Groups snapshot
      const groupsSnap = await withTimeout(getDocs(collection(db, 'groups')), 3500, null);
      const groups = groupsSnap ? groupsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Group)) : [];
      const totalGroups = groups.length;

      // Group size distribution
      const distribution = { single: 0, small: 0, medium: 0, large: 0 };
      let totalMembersAcc = 0;

      groups.forEach((g) => {
        const count = g.memberCount || 1;
        totalMembersAcc += count;
        if (count === 1) distribution.single += 1;
        else if (count <= 3) distribution.small += 1;
        else if (count <= 5) distribution.medium += 1;
        else distribution.large += 1;
      });

      const averageMembersPerGroup = totalGroups > 0 ? Number((totalMembersAcc / totalGroups).toFixed(1)) : 0;

      // 3. Products snapshot
      const productsSnap = await withTimeout(getDocs(collection(db, 'products')), 3000, null);
      const totalProducts = productsSnap ? productsSnap.docs.length : 0;

      // 4. Cleaning tasks snapshot
      const cleaningSnap = await withTimeout(getDocs(collection(db, 'cleaningTasks')), 3000, null);
      const tasks = cleaningSnap ? cleaningSnap.docs.map((d) => d.data()) : [];
      const totalCleaningTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.isCompleted === true || t.status === 'done').length;

      return {
        totalUsers,
        activeUsers,
        suspendedUsers,
        superAdminsCount,
        totalGroups,
        totalProducts,
        totalCleaningTasks,
        completedTasks,
        averageMembersPerGroup,
        groupSizeDistribution: distribution,
      };
    } catch (err) {
      console.warn('Error fetching platform stats:', err);
      return {
        totalUsers: 0,
        activeUsers: 0,
        suspendedUsers: 0,
        superAdminsCount: 0,
        totalGroups: 0,
        totalProducts: 0,
        totalCleaningTasks: 0,
        completedTasks: 0,
        averageMembersPerGroup: 0,
        groupSizeDistribution: { single: 0, small: 0, medium: 0, large: 0 },
      };
    }
  },

  /**
   * Retrieves all users registered on the platform.
   */
  async getAllUsers(): Promise<User[]> {
    if (isDemoMode()) {
      return [
        {
          id: 'user-seed-1',
          uid: 'user-seed-1',
          displayName: 'Alexandre Dupont',
          email: 'alex@coloc.fr',
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          isSuperAdmin: true,
          status: 'active',
          groupId: 'group-seed-1',
        },
        {
          id: 'user-seed-2',
          uid: 'user-seed-2',
          displayName: 'Marie Curie',
          email: 'marie@coloc.fr',
          createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
          isSuperAdmin: false,
          status: 'active',
          groupId: 'group-seed-1',
        },
        {
          id: 'user-seed-3',
          uid: 'user-seed-3',
          displayName: 'Lucas Martin',
          email: 'lucas@coloc.fr',
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          isSuperAdmin: false,
          status: 'suspended',
          suspendedReason: 'Non respect des règles de nettoyage répétitif',
          suspendedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          groupId: 'group-seed-1',
        },
      ];
    }

    try {
      const snap = await withTimeout(getDocs(collection(db, 'users')), 4000, null);
      if (!snap) return [];
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: d.id,
          email: data.email || '',
          displayName: data.displayName || 'Utilisateur',
          photoURL: data.photoURL || null,
          groupId: data.groupId || null,
          isSuperAdmin: data.isSuperAdmin ?? false,
          status: data.status || 'active',
          suspendedReason: data.suspendedReason || null,
          suspendedAt: data.suspendedAt || null,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
        } as User;
      });
    } catch (err) {
      console.warn('Error fetching all users:', err);
      return [];
    }
  },

  /**
   * Freezes or reactivates a user account.
   * When suspended, the user will be blocked on the SuspendedAccountScreen.
   */
  async setUserRestriction(
    userId: string,
    suspended: boolean,
    reason?: string,
    adminUser?: User | null
  ): Promise<void> {
    const status = suspended ? 'suspended' : 'active';
    const suspendedReason = suspended ? (reason?.trim() || 'Accès suspendu par l\'administrateur.') : null;
    const suspendedAt = suspended ? new Date().toISOString() : null;

    if (!isDemoMode()) {
      try {
        const userRef = doc(db, 'users', userId);
        await withTimeout(
          updateDoc(userRef, {
            status,
            suspendedReason,
            suspendedAt,
            updatedAt: new Date().toISOString(),
          }),
          3000,
          null
        );
      } catch (err) {
        console.warn('Error updating user restriction in Firestore:', err);
      }
    }

    await this.logAdminAction(
      suspended ? 'SUSPEND_USER' : 'ACTIVATE_USER',
      userId,
      `User ${userId}`,
      suspended ? `Compte suspendu. Motif : ${suspendedReason}` : 'Compte réactivé avec accès rétabli',
      adminUser
    );
  },

  /**
   * Grants or revokes platform super-administrator privileges for a specific user.
   */
  async toggleSuperAdmin(
    userId: string,
    isSuperAdmin: boolean,
    adminUser?: User | null
  ): Promise<void> {
    if (!isDemoMode()) {
      try {
        const userRef = doc(db, 'users', userId);
        await withTimeout(
          updateDoc(userRef, {
            isSuperAdmin,
            updatedAt: new Date().toISOString(),
          }),
          3000,
          null
        );
      } catch (err) {
        console.warn('Error updating super admin status in Firestore:', err);
      }
    }

    await this.logAdminAction(
      isSuperAdmin ? 'PROMOTE_ADMIN' : 'DEMOTE_ADMIN',
      userId,
      `User ${userId}`,
      isSuperAdmin ? 'Privilèges Super-Administrateur accordés' : 'Privilèges Super-Administrateur révoqués',
      adminUser
    );
  },

  /**
   * Deletes a user account and purges their membership from any associated flatshare.
   */
  async deleteUserAccount(
    userId: string,
    adminUser?: User | null
  ): Promise<void> {
    let targetName = `User ${userId}`;

    if (!isDemoMode()) {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await withTimeout(getDoc(userRef), 2000, null);

        if (userSnap && userSnap.exists()) {
          const userData = userSnap.data();
          targetName = userData.displayName || userData.email || targetName;

          // Remove membership from group if member
          if (userData.groupId) {
            try {
              await deleteDoc(doc(db, 'groups', userData.groupId, 'members', userId));
            } catch {}
          }
        }

        await withTimeout(deleteDoc(userRef), 3000, null);
      } catch (err) {
        console.warn('Error deleting user account:', err);
      }
    }

    await this.logAdminAction(
      'DELETE_USER',
      userId,
      targetName,
      'Compte utilisateur et appartenances supprimés définitivement',
      adminUser
    );
  },

  /**
   * Retrieves all flatshares/groups across the platform.
   */
  async getAllGroups(): Promise<Group[]> {
    if (isDemoMode()) {
      return [
        {
          id: 'group-seed-1',
          groupId: 'group-seed-1',
          name: '🏠 Villa des Roses',
          inviteCode: 'ROS-9821',
          adminUid: 'user-seed-1',
          memberCount: 3,
          createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        },
        {
          id: 'group-seed-2',
          groupId: 'group-seed-2',
          name: '🌆 Loft Bastille',
          inviteCode: 'BAS-4412',
          adminUid: 'user-other',
          memberCount: 4,
          createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        },
      ];
    }

    try {
      const snap = await withTimeout(getDocs(collection(db, 'groups')), 4000, null);
      if (!snap) return [];
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
    } catch (err) {
      console.warn('Error fetching all groups:', err);
      return [];
    }
  },

  /**
   * Deletes a flatshare with full cascading cleanup of members, tasks, and products.
   */
  async deleteGroupCascade(
    groupId: string,
    adminUser?: User | null
  ): Promise<void> {
    let groupName = `Colocation ${groupId}`;

    if (!isDemoMode()) {
      try {
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await withTimeout(getDoc(groupRef), 2000, null);
        if (groupSnap && groupSnap.exists()) {
          groupName = groupSnap.data().name || groupName;
        }

        // 1. Fetch members & detach from their user docs
        const membersSnap = await withTimeout(
          getDocs(collection(db, 'groups', groupId, 'members')),
          3000,
          null
        );

        if (membersSnap) {
          const batch = writeBatch(db);
          membersSnap.docs.forEach((mDoc) => {
            const uid = mDoc.data().userId || mDoc.id;
            batch.update(doc(db, 'users', uid), { groupId: null });
            batch.delete(mDoc.ref);
          });
          batch.delete(groupRef);
          await withTimeout(batch.commit(), 3500, null);
        } else {
          await deleteDoc(groupRef);
        }
      } catch (err) {
        console.warn('Error deleting group cascade:', err);
      }
    }

    await this.logAdminAction(
      'DELETE_GROUP',
      groupId,
      groupName,
      'Colocation supprimée avec détachement de tous les colocataires',
      adminUser
    );
  },

  /**
   * Direct provisioning of a user account from the Admin Portal.
   */
  async createUserDirect(
    payload: CreateUserPayload,
    adminUser?: User | null
  ): Promise<User> {
    const trimmedEmail = payload.email.trim().toLowerCase();
    const trimmedName = payload.displayName.trim() || 'Utilisateur';

    const now = new Date().toISOString();
    let createdUid = `admin-gen-${Date.now()}`;

    if (!isDemoMode()) {
      try {
        // Attempt creating auth credential if possible
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, payload.password);
        createdUid = cred.user.uid;
        await updateProfile(cred.user, { displayName: trimmedName }).catch(() => {});
      } catch (authErr: any) {
        console.warn('Auth creation warning (creating Firestore record directly):', authErr.message);
      }
    }

    const newUser: User = {
      id: createdUid,
      uid: createdUid,
      email: trimmedEmail,
      displayName: trimmedName,
      photoURL: null,
      groupId: payload.groupId || null,
      isSuperAdmin: payload.isSuperAdmin ?? false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    if (!isDemoMode()) {
      try {
        await withTimeout(setDoc(doc(db, 'users', createdUid), newUser), 3000, null);
      } catch (e) {
        console.warn('Error saving direct user doc:', e);
      }
    }

    await this.logAdminAction(
      'CREATE_USER',
      createdUid,
      trimmedName,
      `Création directe de compte (${trimmedEmail}) ${payload.isSuperAdmin ? 'avec privilèges Super-Admin' : ''}`,
      adminUser
    );

    return newUser;
  },

  /**
   * Records an administrative action in the audit log.
   */
  async logAdminAction(
    action: AdminAuditAction,
    targetId: string,
    targetName: string,
    details: string,
    adminUser?: User | null
  ): Promise<void> {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      adminUid: adminUser?.uid || 'superadmin',
      adminEmail: adminUser?.email || 'admin@colocmanager.app',
      action,
      targetId,
      targetName,
      details,
      timestamp: new Date().toISOString(),
    };

    localAuditLogs.unshift(newLog);

    if (!isDemoMode()) {
      try {
        await withTimeout(
          setDoc(doc(db, 'admin_audit_logs', newLog.id), newLog),
          2000,
          null
        ).catch(() => {});
      } catch {}
    }
  },

  /**
   * Retrieves recent audit logs.
   */
  async getAuditLogs(): Promise<AuditLog[]> {
    if (isDemoMode()) {
      return localAuditLogs;
    }
    try {
      const q = query(
        collection(db, 'admin_audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snap = await withTimeout(getDocs(q), 3000, null);
      if (!snap || snap.empty) {
        return localAuditLogs;
      }
      return snap.docs.map((d) => d.data() as AuditLog);
    } catch {
      return localAuditLogs;
    }
  },

  /**
   * Retrieves system broadcast announcements.
   */
  async getBroadcasts(): Promise<SystemBroadcast[]> {
    if (isDemoMode()) {
      return localBroadcasts;
    }
    try {
      const snap = await withTimeout(getDocs(collection(db, 'system_broadcasts')), 3000, null);
      if (!snap || snap.empty) {
        return localBroadcasts;
      }
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SystemBroadcast));
    } catch {
      return localBroadcasts;
    }
  },

  /**
   * Publishes a new system-wide broadcast announcement.
   */
  async createBroadcast(
    data: Omit<SystemBroadcast, 'id' | 'createdAt'>
  ): Promise<SystemBroadcast> {
    const newBroadcast: SystemBroadcast = {
      id: `broadcast-${Date.now()}`,
      title: data.title.trim(),
      message: data.message.trim(),
      level: data.level || 'info',
      active: data.active ?? true,
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt,
    };

    localBroadcasts.unshift(newBroadcast);

    if (!isDemoMode()) {
      try {
        await withTimeout(
          setDoc(doc(db, 'system_broadcasts', newBroadcast.id), newBroadcast),
          3000,
          null
        );
      } catch (err) {
        console.warn('Error creating system broadcast in Firestore:', err);
      }
    }

    return newBroadcast;
  },

  /**
   * Toggles the active state of a system broadcast.
   */
  async toggleBroadcast(id: string, active: boolean): Promise<void> {
    localBroadcasts = localBroadcasts.map((b) => (b.id === id ? { ...b, active } : b));
    if (!isDemoMode()) {
      try {
        await withTimeout(
          updateDoc(doc(db, 'system_broadcasts', id), { active }),
          2500,
          null
        );
      } catch (err) {
        console.warn('Error toggling system broadcast:', err);
      }
    }
  },

  /**
   * Deletes a system broadcast.
   */
  async deleteBroadcast(id: string): Promise<void> {
    localBroadcasts = localBroadcasts.filter((b) => b.id !== id);
    if (!isDemoMode()) {
      try {
        await withTimeout(deleteDoc(doc(db, 'system_broadcasts', id)), 2500, null);
      } catch (err) {
        console.warn('Error deleting system broadcast:', err);
      }
    }
  },
};

export default adminService;
