import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import {
  PlatformStats,
  User,
  Group,
  SystemBroadcast,
  AuditLog,
} from '../../types';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { soundService } from '../../services/soundService';

import AdminDashboardView from './AdminDashboardView';
import AdminUsersView from './AdminUsersView';
import AdminGroupsView from './AdminGroupsView';
import AdminCreateAccessView from './AdminCreateAccessView';
import AdminSystemView from './AdminSystemView';

interface AdminPortalScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}

type AdminTab = 'dashboard' | 'users' | 'groups' | 'create' | 'system';

export const AdminPortalScreen: React.FC<AdminPortalScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [broadcasts, setBroadcasts] = useState<SystemBroadcast[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, usersData, groupsData, broadcastsData, logsData] = await Promise.all([
        adminService.getPlatformStats(),
        adminService.getAllUsers(),
        adminService.getAllGroups(),
        adminService.getBroadcasts(),
        adminService.getAuditLogs(),
      ]);

      setStats(statsData);
      setUsers(usersData);
      setGroups(groupsData);
      setBroadcasts(broadcastsData);
      setAuditLogs(logsData);
    } catch (err) {
      console.warn('Error loading admin portal data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const tabs: { key: AdminTab; label: string; emoji: string }[] = [
    { key: 'dashboard', label: 'Dashboard', emoji: '📊' },
    { key: 'users', label: 'Utilisateurs', emoji: '👥' },
    { key: 'groups', label: 'Colocations', emoji: '🏠' },
    { key: 'create', label: 'Créer Accès', emoji: '➕' },
    { key: 'system', label: 'Système & Audit', emoji: '📢' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: tokens.bg }]}>
      {/* Super-Admin Top Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: isDark ? 'rgba(18, 20, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderBottomColor: tokens.border,
          },
        ]}
      >
        <View style={styles.topBarLeft}>
          <IconButton
            icon="arrow-left"
            size={22}
            iconColor={tokens.text}
            onPress={() => {
              soundService.playPopSound();
              navigation.goBack();
            }}
            style={[styles.backBtn, { backgroundColor: tokens.card, borderColor: tokens.border, borderWidth: 1 }]}
          />
          <View style={{ marginLeft: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="titleMedium" style={{ fontWeight: '900', color: tokens.text }}>
                Espace Super-Admin
              </Text>
              <View style={styles.adminPill}>
                <Text style={styles.adminPillText}>PLATEFORME</Text>
              </View>
            </View>
            <Text variant="labelSmall" style={{ color: tokens.textSecondary }}>
              Connecté en tant que {user?.displayName || user?.email}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            soundService.playPopSound();
            loadAllData();
          }}
          style={[styles.refreshPill, { backgroundColor: tokens.card, borderColor: tokens.border }]}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.primary }}>
            🔄 Rafraîchir
          </Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs Bar */}
      <View
        style={[
          styles.tabBarWrapper,
          {
            backgroundColor: isDark ? 'rgba(18, 20, 30, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            borderBottomColor: tokens.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {tabs.map((t) => {
            const isSelected = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                activeOpacity={0.8}
                onPress={() => {
                  soundService.playPopSound();
                  setActiveTab(t.key);
                }}
                style={[
                  styles.tabItem,
                  isSelected && [
                    styles.tabItemSelected,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(10, 132, 255, 0.12)',
                      borderColor: isDark ? tokens.border : tokens.primary,
                    },
                  ],
                ]}
              >
                <Text style={{ fontSize: 16, marginRight: 6 }}>{t.emoji}</Text>
                <Text
                  style={{
                    fontWeight: isSelected ? '800' : '600',
                    fontSize: 13,
                    color: isSelected ? tokens.primary : tokens.textSecondary,
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Tab View */}
      <View style={styles.contentContainer}>
        {activeTab === 'dashboard' && (
          <AdminDashboardView
            stats={stats}
            loading={loading}
            onRefresh={loadAllData}
            onNavigateTab={(tabKey) => setActiveTab(tabKey as AdminTab)}
          />
        )}

        {activeTab === 'users' && (
          <AdminUsersView
            users={users}
            loading={loading}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'groups' && (
          <AdminGroupsView
            groups={groups}
            loading={loading}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'create' && (
          <AdminCreateAccessView
            groups={groups}
            onUserCreated={loadAllData}
          />
        )}

        {activeTab === 'system' && (
          <AdminSystemView
            broadcasts={broadcasts}
            auditLogs={auditLogs}
            onRefresh={loadAllData}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    borderRadius: 14,
    margin: 0,
  },
  adminPill: {
    marginLeft: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  adminPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  refreshPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabBarWrapper: {
    borderBottomWidth: 1,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabItemSelected: {
    borderWidth: 1,
  },
  contentContainer: {
    flex: 1,
  },
});

export default AdminPortalScreen;
