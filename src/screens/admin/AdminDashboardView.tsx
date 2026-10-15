import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { PlatformStats } from '../../types';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { soundService } from '../../services/soundService';

interface AdminDashboardViewProps {
  stats: PlatformStats | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tabKey: string) => void;
}

/**
 * Super-Admin Interactive Analytics Dashboard
 * Visual charts, KPI cards, and system indicators in Apple Liquid Glass design.
 */
export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  stats,
  loading,
  onRefresh,
  onNavigateTab,
}) => {
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.primary} />
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
          Calcul des statistiques globales...
        </Text>
      </View>
    );
  }

  const s = stats || {
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

  const activePercent = s.totalUsers > 0 ? Math.round((s.activeUsers / s.totalUsers) * 100) : 100;
  const taskCompletionPercent =
    s.totalCleaningTasks > 0 ? Math.round((s.completedTasks / s.totalCleaningTasks) * 100) : 0;

  // Max value for chart normalization
  const maxGroupCount = Math.max(
    s.groupSizeDistribution.single,
    s.groupSizeDistribution.small,
    s.groupSizeDistribution.medium,
    s.groupSizeDistribution.large,
    1
  );

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Platform Overview Banner */}
      <View
        style={[
          styles.overviewBanner,
          {
            backgroundColor: isDark ? 'rgba(255, 214, 10, 0.08)' : 'rgba(255, 214, 10, 0.12)',
            borderColor: tokens.adminGold,
          },
        ]}
      >
        <View style={styles.bannerHeader}>
          <View style={styles.bannerTitleRow}>
            <Text style={{ fontSize: 26, marginRight: 10 }}>👑</Text>
            <View>
              <Text variant="titleMedium" style={{ fontWeight: '900', color: tokens.text }}>
                Centre de Contrôle Global
              </Text>
              <Text variant="bodySmall" style={{ color: tokens.textSecondary }}>
                Supervision en temps réel de toute la base ColocManager
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              soundService.playPopSound();
              onRefresh();
            }}
            style={[
              styles.refreshButton,
              { backgroundColor: tokens.card, borderColor: tokens.border },
            ]}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.primary }}>
              🔄 Actualiser
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4 Primary KPI Cards */}
      <View style={styles.kpiGrid}>
        {/* Total Users */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateTab('users')}
          style={[styles.kpiCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}
        >
          <View style={styles.kpiHeader}>
            <View
              style={[
                styles.kpiIcon,
                { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.2)' : 'rgba(10, 132, 255, 0.1)' },
              ]}
            >
              <Text style={{ fontSize: 22 }}>👥</Text>
            </View>
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor: s.suspendedUsers > 0 ? 'rgba(255, 69, 58, 0.15)' : 'rgba(52, 199, 89, 0.15)',
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  color: s.suspendedUsers > 0 ? tokens.error : tokens.secondary,
                }}
              >
                {s.suspendedUsers > 0 ? `${s.suspendedUsers} restreint(s)` : '100% actifs'}
              </Text>
            </View>
          </View>
          <Text variant="displaySmall" style={[styles.kpiNumber, { color: tokens.text }]}>
            {s.totalUsers}
          </Text>
          <Text variant="labelMedium" style={{ color: tokens.textSecondary, fontWeight: '600' }}>
            Utilisateurs Totaux
          </Text>
          <Text variant="labelSmall" style={{ color: tokens.primary, marginTop: 4, fontWeight: '700' }}>
            {s.activeUsers} actifs · {s.superAdminsCount} super-admin(s) →
          </Text>
        </TouchableOpacity>

        {/* Total Flatshares */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateTab('groups')}
          style={[styles.kpiCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}
        >
          <View style={styles.kpiHeader}>
            <View
              style={[
                styles.kpiIcon,
                { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.1)' },
              ]}
            >
              <Text style={{ fontSize: 22 }}>🏠</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#F59E0B' }}>
                ~{s.averageMembersPerGroup} pers/coloc
              </Text>
            </View>
          </View>
          <Text variant="displaySmall" style={[styles.kpiNumber, { color: tokens.text }]}>
            {s.totalGroups}
          </Text>
          <Text variant="labelMedium" style={{ color: tokens.textSecondary, fontWeight: '600' }}>
            Colocations Actives
          </Text>
          <Text variant="labelSmall" style={{ color: '#F59E0B', marginTop: 4, fontWeight: '700' }}>
            Gérer les foyers & codes →
          </Text>
        </TouchableOpacity>

        {/* Cleaning Tasks */}
        <View style={[styles.kpiCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
          <View style={styles.kpiHeader}>
            <View
              style={[
                styles.kpiIcon,
                { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.1)' },
              ]}
            >
              <Text style={{ fontSize: 22 }}>🧹</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.secondary }}>
                {taskCompletionPercent}% fait
              </Text>
            </View>
          </View>
          <Text variant="displaySmall" style={[styles.kpiNumber, { color: tokens.text }]}>
            {s.totalCleaningTasks}
          </Text>
          <Text variant="labelMedium" style={{ color: tokens.textSecondary, fontWeight: '600' }}>
            Tâches Ménagères
          </Text>
          <Text variant="labelSmall" style={{ color: tokens.textSecondary, marginTop: 4 }}>
            {s.completedTasks} terminées avec succès
          </Text>
        </View>

        {/* Products Tracked */}
        <View style={[styles.kpiCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
          <View style={styles.kpiHeader}>
            <View
              style={[
                styles.kpiIcon,
                { backgroundColor: isDark ? 'rgba(175, 82, 222, 0.2)' : 'rgba(175, 82, 222, 0.1)' },
              ]}
            >
              <Text style={{ fontSize: 22 }}>🛒</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: 'rgba(175, 82, 222, 0.15)' }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#AF52DE' }}>
                Rotations actives
              </Text>
            </View>
          </View>
          <Text variant="displaySmall" style={[styles.kpiNumber, { color: tokens.text }]}>
            {s.totalProducts}
          </Text>
          <Text variant="labelMedium" style={{ color: tokens.textSecondary, fontWeight: '600' }}>
            Produits Communs
          </Text>
          <Text variant="labelSmall" style={{ color: tokens.textSecondary, marginTop: 4 }}>
            Articles sous suivi équitable
          </Text>
        </View>
      </View>

      {/* Visual Chart 1: Group Size Distribution */}
      <View
        style={[
          styles.chartCard,
          {
            backgroundColor: tokens.card,
            borderColor: tokens.border,
          },
        ]}
      >
        <View style={styles.chartTitleRow}>
          <Text style={{ fontSize: 20, marginRight: 8 }}>📊</Text>
          <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
            Répartition par Taille de Colocation
          </Text>
        </View>
        <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginBottom: 16 }}>
          Distribution du nombre de colocataires inscrits par foyer
        </Text>

        {/* Chart Bars */}
        <View style={styles.barsContainer}>
          {/* Solo */}
          <View style={styles.barRow}>
            <View style={styles.barLabelCol}>
              <Text style={[styles.barLabel, { color: tokens.text }]}>1 coloc</Text>
              <Text style={[styles.barSub, { color: tokens.textSecondary }]}>Solo / Créateur</Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.round((s.groupSizeDistribution.single / maxGroupCount) * 100)}%`,
                    backgroundColor: tokens.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barValue, { color: tokens.text }]}>{s.groupSizeDistribution.single}</Text>
          </View>

          {/* Small 2-3 */}
          <View style={styles.barRow}>
            <View style={styles.barLabelCol}>
              <Text style={[styles.barLabel, { color: tokens.text }]}>2 à 3 colocs</Text>
              <Text style={[styles.barSub, { color: tokens.textSecondary }]}>Petite coloc</Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.round((s.groupSizeDistribution.small / maxGroupCount) * 100)}%`,
                    backgroundColor: tokens.secondary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barValue, { color: tokens.text }]}>{s.groupSizeDistribution.small}</Text>
          </View>

          {/* Medium 4-5 */}
          <View style={styles.barRow}>
            <View style={styles.barLabelCol}>
              <Text style={[styles.barLabel, { color: tokens.text }]}>4 à 5 colocs</Text>
              <Text style={[styles.barSub, { color: tokens.textSecondary }]}>Moyenne coloc</Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.round((s.groupSizeDistribution.medium / maxGroupCount) * 100)}%`,
                    backgroundColor: '#F59E0B',
                  },
                ]}
              />
            </View>
            <Text style={[styles.barValue, { color: tokens.text }]}>{s.groupSizeDistribution.medium}</Text>
          </View>

          {/* Large 6+ */}
          <View style={styles.barRow}>
            <View style={styles.barLabelCol}>
              <Text style={[styles.barLabel, { color: tokens.text }]}>6+ colocs</Text>
              <Text style={[styles.barSub, { color: tokens.textSecondary }]}>Grande coloc / Résidence</Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.round((s.groupSizeDistribution.large / maxGroupCount) * 100)}%`,
                    backgroundColor: '#AF52DE',
                  },
                ]}
              />
            </View>
            <Text style={[styles.barValue, { color: tokens.text }]}>{s.groupSizeDistribution.large}</Text>
          </View>
        </View>
      </View>

      {/* Visual Chart 2: Platform Health & Ratios */}
      <View
        style={[
          styles.chartCard,
          {
            backgroundColor: tokens.card,
            borderColor: tokens.border,
          },
        ]}
      >
        <View style={styles.chartTitleRow}>
          <Text style={{ fontSize: 20, marginRight: 8 }}>📈</Text>
          <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
            Santé & Intégrité du Système
          </Text>
        </View>

        <View style={styles.healthGrid}>
          {/* Active Accounts Ratio */}
          <View style={styles.healthItem}>
            <Text variant="labelMedium" style={{ color: tokens.textSecondary, marginBottom: 6 }}>
              Comptes Utilisateurs Actifs
            </Text>
            <View style={styles.ratioRow}>
              <Text variant="headlineSmall" style={{ fontWeight: '900', color: tokens.secondary }}>
                {activePercent}%
              </Text>
              <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginLeft: 8 }}>
                ({s.activeUsers}/{s.totalUsers || 1})
              </Text>
            </View>
            <View style={[styles.ratioTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.ratioFill,
                  {
                    width: `${activePercent}%`,
                    backgroundColor: tokens.secondary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Tasks Ratio */}
          <View style={styles.healthItem}>
            <Text variant="labelMedium" style={{ color: tokens.textSecondary, marginBottom: 6 }}>
              Taux de Réalisation du Ménage
            </Text>
            <View style={styles.ratioRow}>
              <Text variant="headlineSmall" style={{ fontWeight: '900', color: tokens.primary }}>
                {taskCompletionPercent}%
              </Text>
              <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginLeft: 8 }}>
                ({s.completedTasks}/{s.totalCleaningTasks || 1})
              </Text>
            </View>
            <View style={[styles.ratioTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.ratioFill,
                  {
                    width: `${taskCompletionPercent}%`,
                    backgroundColor: tokens.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  overviewBanner: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 160,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  kpiNumber: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  chartCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  barsContainer: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabelCol: {
    width: 110,
  },
  barLabel: {
    fontWeight: '800',
    fontSize: 13,
  },
  barSub: {
    fontSize: 10,
  },
  barTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barValue: {
    width: 28,
    textAlign: 'right',
    fontWeight: '900',
    fontSize: 13,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  healthItem: {
    flex: 1,
    minWidth: 240,
  },
  ratioRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  ratioTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  ratioFill: {
    height: '100%',
    borderRadius: 5,
  },
});

export default AdminDashboardView;
