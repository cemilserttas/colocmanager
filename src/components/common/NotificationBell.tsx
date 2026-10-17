import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text, Portal, Dialog, Button, Divider } from 'react-native-paper';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore, getLiquidGlassTokens } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { soundService } from '../../services/soundService';

import {
  translateNotificationTitle,
  translateNotificationBody,
} from '../../utils/notificationTranslation';
import { stripLeadingEmojis } from '../../utils/stripEmojis';

export const NotificationBell: React.FC = () => {
  const { isDark } = useThemeStore();
  const tokens = getLiquidGlassTokens(isDark);
  const { t, language } = useLanguageStore();
  const isEn = language === 'en';
  const user = useAuthStore((state) => state.user);
  const {
    notifications,
    markAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();
  const [modalVisible, setModalVisible] = useState(false);

  const userDisplayName = user?.displayName?.trim().toLowerCase();

  // Filter out any self-notifications that may exist in legacy DB
  const filteredNotifications = notifications.filter((notif) => {
    if (userDisplayName) {
      const bodyLower = (notif.body || '').toLowerCase();
      if (
        (bodyLower.includes(`${userDisplayName} signale`) ||
          bodyLower.includes(`${userDisplayName} reports`)) &&
        (bodyLower.includes("c'est votre tour") || bodyLower.includes("it's your turn"))
      ) {
        return false;
      }
    }
    return true;
  });

  const unreadCount = filteredNotifications.filter((n) => !n.isRead).length;

  const handleOpen = () => {
    soundService.playPopSound();
    setModalVisible(true);
  };

  const handleMarkAllRead = () => {
    filteredNotifications.forEach((n) => {
      if (!n.isRead) {
        markAsRead(n.id);
      }
    });
  };

  const handleClearAll = () => {
    soundService.playPopSound();
    clearAllNotifications();
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.7}
        style={[
          styles.bellButton,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: tokens.border,
          },
        ]}
      >
        <Text style={styles.bellEmoji}>🔔</Text>
        {unreadCount > 0 && (
          <View style={styles.redDotContainer}>
            <View style={styles.redDot} />
          </View>
        )}
      </TouchableOpacity>

      <Portal>
        <Dialog
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          style={[
            styles.dialog,
            {
              backgroundColor: isDark ? '#141622' : '#FFFFFF',
              borderColor: tokens.border,
            },
          ]}
        >
          <View style={styles.dialogHeader}>
            <View style={styles.dialogTitleRow}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>🔔</Text>
              <Text variant="titleMedium" style={{ fontWeight: '800', color: tokens.text }}>
                {t('notificationsCenter')}
              </Text>
              {unreadCount > 0 && (
                <View style={styles.counterBadge}>
                  <Text style={styles.counterText}>{unreadCount}</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {unreadCount > 0 && (
                <Button
                  mode="text"
                  compact
                  onPress={handleMarkAllRead}
                  labelStyle={{ fontSize: 12, color: tokens.primary }}
                >
                  {t('allRead')}
                </Button>
              )}
              {filteredNotifications.length > 0 && (
                <Button
                  mode="text"
                  compact
                  onPress={handleClearAll}
                  labelStyle={{ fontSize: 12, color: tokens.error || '#EF4444' }}
                >
                  {t('clearAllNotifs') || 'Vider'}
                </Button>
              )}
            </View>
          </View>

          <Dialog.Content style={{ maxHeight: 380, paddingHorizontal: 0 }}>
            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>✨</Text>
                <Text style={{ color: tokens.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  {t('noNotifications')}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredNotifications.map((notif, idx) => {
                  const getIcon = () => {
                    if (
                      notif.type === 'shopping' ||
                      notif.type === 'purchase_turn' ||
                      notif.type === ('product_added' as any)
                    ) return '🛒';
                    if (
                      notif.type === 'cleaning' ||
                      notif.type === 'cleaning_turn' ||
                      notif.type === ('cleaning_added' as any)
                    ) return '🧹';
                    if (
                      notif.type === 'group' ||
                      notif.type === 'admin' ||
                      notif.type === 'admin_transfer'
                    ) return '👑';
                    if (notif.type === 'member_joined' || notif.type === 'member_left') return '👋';
                    if (notif.type === 'reminder') return '⏰';
                    return '📢';
                  };

                  const cleanTitle = stripLeadingEmojis(notif.title);
                  const cleanBody = stripLeadingEmojis(notif.body);

                  return (
                    <TouchableOpacity
                      key={notif.id || `notif-${idx}`}
                      onPress={() => markAsRead(notif.id)}
                      activeOpacity={0.7}
                      style={[
                        styles.notifItem,
                        !notif.isRead && {
                          backgroundColor: isDark
                            ? 'rgba(10, 132, 255, 0.12)'
                            : 'rgba(10, 132, 255, 0.06)',
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 22, marginRight: 12 }}>{getIcon()}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text
                            variant="labelLarge"
                            style={{
                              fontWeight: notif.isRead ? '600' : '800',
                              color: tokens.text,
                              flex: 1,
                              marginRight: 6,
                            }}
                          >
                            {translateNotificationTitle(cleanTitle, isEn)}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {!notif.isRead && <View style={styles.unreadIndicator} />}
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                soundService.playPopSound();
                                deleteNotification(notif.id);
                              }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={{ padding: 4, marginLeft: 6 }}
                            >
                              <Text style={{ fontSize: 12, color: tokens.textSecondary, fontWeight: '700' }}>
                                ✕
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <Text
                          variant="bodySmall"
                          style={{ color: tokens.textSecondary, marginTop: 2, lineHeight: 17 }}
                        >
                          {translateNotificationBody(cleanBody, isEn)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </Dialog.Content>

          <Dialog.Actions>
            <Button
              onPress={() => setModalVisible(false)}
              textColor={tokens.primary}
              style={{ borderRadius: 20 }}
            >
              {t('close') || 'Fermer'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bellEmoji: {
    fontSize: 18,
  },
  redDotContainer: {
    position: 'absolute',
    top: 5,
    right: 5,
    padding: 2,
    backgroundColor: 'transparent',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF453A',
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  dialog: {
    borderRadius: 24,
    borderWidth: 1,
    maxHeight: 520,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dialogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBadge: {
    marginLeft: 8,
    backgroundColor: '#FF453A',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  counterText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  unreadIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0A84FF',
    marginLeft: 6,
  },
});

export default NotificationBell;
