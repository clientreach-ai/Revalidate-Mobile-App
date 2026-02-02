import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { useNotificationStore } from '@/features/notifications/notification.store';
import '../../global.css';

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  iconBgColor: string;
  isRead: boolean;
  section: 'today' | 'yesterday' | 'earlier';
  createdAt: Date;
  type?: string;
}

interface ApiNotification {
  id: number;
  title: string;
  body: string;
  data?: any;
  type?: string;
  createdAt: string;
  isRead?: boolean | number | string;
}

export default function NotificationsScreen() {
  const {
    notificationId,
    notificationTitle,
    notificationBody,
    notificationTime,
    notificationType,
  } = useLocalSearchParams<{
    notificationId?: string;
    notificationTitle?: string;
    notificationBody?: string;
    notificationTime?: string;
    notificationType?: string;
  }>();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();
  const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const isMountedRef = useRef(true);
  const autoOpenedRef = useRef<string | null>(null);

  // Modal states for calendar invites
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [addToCpd, setAddToCpd] = useState(true);
  const [currentAttendeeId, setCurrentAttendeeId] = useState<string | null>(
    null
  );
  const [isModalFetching, setIsModalFetching] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadNotifications(true);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!notificationId || typeof notificationId !== 'string') return;
    if (autoOpenedRef.current === notificationId) return;

    const target = notifications.find((n) => n.id === notificationId);
    if (target) {
      autoOpenedRef.current = notificationId;
      handleNotificationPress(target);
    }
  }, [loading, notificationId, notifications]);

  useEffect(() => {
    if (!notificationId || typeof notificationId !== 'string') return;
    markAsRead(notificationId);
  }, [notificationId]);

  const loadNotifications = async (forceRefresh = false) => {
    try {
      if (isMountedRef.current) {
        setLoading(true);
      }
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        try {
          router.replace('/(auth)/login');
        } catch (e) {
          console.warn('Navigation not ready for login redirect:', e);
        }
        return;
      }

      const response = await apiService.get<{
        success: boolean;
        data: ApiNotification[];
      }>(`${API_ENDPOINTS.NOTIFICATIONS.LIST}?limit=50`, token, forceRefresh);

      if (response?.data) {
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        const mappedNotifications: Notification[] = response.data.map((n) => {
          const createdAt = new Date(n.createdAt);
          const isRead =
            n.isRead === true || n.isRead === 1 || n.isRead === '1';

          // Determine section based on date
          let section: 'today' | 'yesterday' | 'earlier' = 'earlier';
          if (createdAt >= today) {
            section = 'today';
          } else if (createdAt >= yesterday) {
            section = 'yesterday';
          }

          // Format time display
          const time = formatTimeDisplay(createdAt, section);

          // Determine icon based on title or data
          const iconInfo = getIconForNotification(n.title, n.type);

          return {
            id: String(n.id),
            title: n.title || 'Notification',
            description: n.body || '',
            time,
            icon: iconInfo.icon,
            iconColor: iconInfo.color,
            iconBgColor: iconInfo.bgColor,
            isRead,
            section,
            createdAt,
            type: n.type,
          };
        });

        // Sort by date (newest first)
        mappedNotifications.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );

        if (isMountedRef.current) {
          setNotifications(mappedNotifications);
        }
      }
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      if (!error?.message?.includes('OFFLINE_MODE')) {
        // Don't show error for notifications - silently fail
        console.warn('Notifications API error:', error?.message);
      }
      if (isMountedRef.current) {
        setNotifications([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const formatTimeDisplay = (date: Date, section: string): string => {
    if (section === 'today' || section === 'yesterday') {
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    // For earlier, show day of week or date
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (diffDays < 7) {
      return dayNames[date.getDay()] || 'Unknown';
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getIconForNotification = (
    title: string,
    type?: string
  ): {
    icon: keyof typeof MaterialIcons.glyphMap;
    color: string;
    bgColor: string;
  } => {
    const titleLower = title?.toLowerCase() || '';
    const typeLower = type?.toLowerCase() || '';

    if (
      typeLower.startsWith('calendar_invite') ||
      titleLower.includes('invited') ||
      titleLower.includes('calendar')
    ) {
      return {
        icon: 'event-available',
        color: '#2B5F9E',
        bgColor: 'bg-blue-50',
      };
    }
    if (typeLower.startsWith('calendar_response')) {
      return { icon: 'event-note', color: '#10B981', bgColor: 'bg-green-50' };
    }
    if (titleLower.includes('appraisal') || titleLower.includes('meeting')) {
      return { icon: 'event', color: '#2563EB', bgColor: 'bg-blue-50' };
    }
    if (
      titleLower.includes('cpd') ||
      titleLower.includes('training') ||
      titleLower.includes('requirements')
    ) {
      return { icon: 'info', color: '#F59E0B', bgColor: 'bg-amber-50' };
    }
    if (
      titleLower.includes('upload') ||
      titleLower.includes('confirmed') ||
      titleLower.includes('success')
    ) {
      return { icon: 'check-circle', color: '#10B981', bgColor: 'bg-green-50' };
    }
    if (
      titleLower.includes('security') ||
      titleLower.includes('password') ||
      titleLower.includes('authentication')
    ) {
      return {
        icon: 'verified-user',
        color: '#64748B',
        bgColor: 'bg-slate-100',
      };
    }
    if (titleLower.includes('feedback') || titleLower.includes('colleague')) {
      return { icon: 'history-edu', color: '#2563EB', bgColor: 'bg-blue-50' };
    }
    if (titleLower.includes('reminder') || titleLower.includes('deadline')) {
      return { icon: 'alarm', color: '#EF4444', bgColor: 'bg-red-50' };
    }

    // Default
    return { icon: 'notifications', color: '#6B7280', bgColor: 'bg-gray-100' };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(true);
  };

  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      if (isMountedRef.current) {
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      }
      await apiService.patch(
        `${API_ENDPOINTS.NOTIFICATIONS.MARK_READ}/read-all`,
        {},
        token
      );
      refreshUnreadCount();
    } catch (error: any) {
      console.warn('Failed to mark all notifications read:', error);
      showToast.error('Failed to mark all as read');
    }
  };

  const markAsRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (target?.isRead) return;

    if (isMountedRef.current) {
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      await apiService.patch(
        `${API_ENDPOINTS.NOTIFICATIONS.MARK_READ}/${id}`,
        {},
        token
      );
      refreshUnreadCount();
    } catch (error: any) {
      console.warn('Failed to mark notification read:', error);
      showToast.error('Failed to mark notification as read');
    }
  };

  const handleResponse = async (status: 'accepted' | 'declined') => {
    if (!selectedEvent || !currentAttendeeId) return;
    if (isMountedRef.current) {
      setIsResponding(true);
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      await apiService.post(
        `${API_ENDPOINTS.CALENDAR.EVENTS}/${selectedEvent.id}/respond`,
        { attendeeId: currentAttendeeId, status },
        token
      );

      // Handle CPD Recording if accepted
      if (status === 'accepted' && addToCpd) {
        try {
          let duration = 60;
          if (selectedEvent.startTime && selectedEvent.endTime) {
            const [sh, sm] = selectedEvent.startTime.split(':').map(Number);
            const [eh, em] = selectedEvent.endTime.split(':').map(Number);
            if (!isNaN(sh) && !isNaN(eh)) {
              duration = eh * 60 + em - (sh * 60 + sm);
              if (duration <= 0) duration = 60;
            }
          }

          await apiService.post(
            '/api/v1/cpd-hours',
            {
              training_name: selectedEvent.title,
              activity_date: selectedEvent.date,
              duration_minutes: duration,
              activity_type: 'participatory',
              learning_method: 'course attendance',
              cpd_learning_type: 'formal and educational',
            },
            token
          );
        } catch (cpdErr) {
          console.warn('Failed to auto-record CPD:', cpdErr);
        }
      }

      showToast.success(
        status === 'accepted' ? 'Invitation accepted' : 'Invitation declined',
        'Success'
      );
      if (isMountedRef.current) {
        setShowAcceptModal(false);
        setSelectedEvent(null);
      }
    } catch (error: any) {
      console.error('Failed to respond to invite:', error);
      showToast.error(error?.message || 'Failed to update response');
    } finally {
      if (isMountedRef.current) {
        setIsResponding(false);
      }
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    await markAsRead(notification.id);

    // Handle calendar invites directly with a modal
    if (
      notification.type &&
      (notification.type.startsWith('calendar_invite:') ||
        notification.type === 'calendar_invite')
    ) {
      const parts = notification.type.split(':');
      const eventId = parts.length > 1 ? parts[1] : null;

      if (eventId) {
        try {
          setIsModalFetching(true);
          const token = await AsyncStorage.getItem('authToken');
          if (!token) return;

          const response = await apiService.get<any>(
            `${API_ENDPOINTS.CALENDAR.GET_BY_ID}/${eventId}`,
            token
          );

          if (response?.data) {
            const userDataStr = await AsyncStorage.getItem('userData');
            if (userDataStr) {
              const userData = JSON.parse(userDataStr);
              // Find attendee by userId or email with robust matching
              const attendee = response.data.attendees?.find(
                (a: any) =>
                  (a.userId &&
                    userData.id &&
                    String(a.userId) === String(userData.id)) ||
                  (a.email &&
                    userData.email &&
                    String(a.email).toLowerCase() ===
                    String(userData.email).toLowerCase())
              );

              if (
                attendee &&
                (attendee.status === 'pending' || attendee.status === 'invited')
              ) {
                setSelectedEvent(response.data);
                setCurrentAttendeeId(attendee.id.toString());
                setShowAcceptModal(true);
              } else {
                // Already responded or not an attendee, just navigate to see details
                router.push(`/calendar/${eventId}` as any);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching event for modal:', error);
          // Fallback to navigation if modal fails
          router.push(`/calendar/${eventId}` as any);
        } finally {
          setIsModalFetching(false);
        }
      } else {
        // No event ID found in type, just navigate to calendar
        router.push('/calendar' as any);
      }
    } else if (
      notification.type &&
      notification.type.startsWith('calendar_response:')
    ) {
      const parts = notification.type.split(':');
      const eventId = parts.length > 1 ? parts[1] : null;
      if (eventId) {
        router.push(`/calendar/${eventId}` as any);
      }
    }
  };

  const todayNotifications = notifications.filter((n) => n.section === 'today');
  const yesterdayNotifications = notifications.filter(
    (n) => n.section === 'yesterday'
  );
  const earlierNotifications = notifications.filter(
    (n) => n.section === 'earlier'
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderSection = (title: string, items: Notification[]) => {
    if (items.length === 0) return null;

    return (
      <View key={title}>
        <View
          className={`px-4 py-2 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
        >
          <Text
            className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'
              }`}
          >
            {title}
          </Text>
        </View>
        {items.map((notification) => (
          <Pressable
            key={notification.id}
            onPress={() => handleNotificationPress(notification)}
            className={`flex-row items-center gap-4 px-4 py-4 border-b ${isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-slate-100'
              } ${!notification.isRead ? 'opacity-100' : 'opacity-80'}`}
          >
            <View className="relative">
              <View
                className={`w-12 h-12 rounded-xl ${notification.iconBgColor} items-center justify-center`}
              >
                <MaterialIcons
                  name={notification.icon}
                  size={24}
                  color={notification.iconColor}
                />
              </View>
              {!notification.isRead && (
                <View
                  className={`absolute -top-1 -right-1 w-3 h-3 bg-[#2563EB] border-2 rounded-full ${isDark ? 'border-slate-800' : 'border-white'
                    }`}
                />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row justify-between items-baseline mb-1">
                <Text
                  className={`text-[15px] flex-1 ${notification.isRead ? 'font-medium' : 'font-bold'} ${isDark ? 'text-white' : 'text-slate-800'
                    }`}
                  numberOfLines={1}
                >
                  {notification.title}
                </Text>
                <Text
                  className={`text-xs ml-2 shrink-0 ${!notification.isRead
                    ? 'font-medium text-[#2563EB]'
                    : isDark
                      ? 'font-normal text-gray-400'
                      : 'font-normal text-slate-500'
                    }`}
                >
                  {notification.time}
                </Text>
              </View>
              <Text
                className={`text-sm font-normal leading-snug ${isDark ? 'text-gray-400' : 'text-slate-500'
                  }`}
                numberOfLines={2}
              >
                {notification.description}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  const isDetailMode = !!notificationId && typeof notificationId === 'string';
  const detailNotification: Notification | null = isDetailMode
    ? notifications.find((n) => n.id === notificationId) ||
    (() => {
      const safeTitle =
        typeof notificationTitle === 'string' && notificationTitle
          ? notificationTitle
          : 'Notification';
      const safeBody =
        typeof notificationBody === 'string' ? notificationBody : '';
      const safeTime =
        typeof notificationTime === 'string' ? notificationTime : '';
      const iconInfo = getIconForNotification(
        safeTitle,
        typeof notificationType === 'string' ? notificationType : undefined
      );
      return {
        id: notificationId,
        title: safeTitle,
        description: safeBody,
        time: safeTime,
        icon: iconInfo.icon,
        iconColor: iconInfo.color,
        iconBgColor: iconInfo.bgColor,
        isRead: true,
        section: 'today',
        createdAt: new Date(),
        type:
          typeof notificationType === 'string' ? notificationType : undefined,
      } as Notification;
    })()
    : null;

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background-light'}`}
      edges={['top']}
    >
      {/* Header */}
      <View
        className={`px-4 pt-4 pb-2 ${isDark ? 'bg-slate-800/80' : 'bg-white/80'
          }`}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-1"
          >
            <MaterialIcons name="chevron-left" size={28} color="#2563EB" />
            <Text className="text-base font-medium text-[#2563EB]">Back</Text>
          </Pressable>
          {!isDetailMode && unreadCount > 0 && (
            <Pressable onPress={markAllAsRead}>
              <Text className="text-sm font-semibold tracking-tight text-[#2563EB]">
                Mark all as read
              </Text>
            </Pressable>
          )}
        </View>
        <Text
          className={`text-3xl font-bold tracking-tight px-0.5 ${isDark ? 'text-white' : 'text-slate-800'
            }`}
        >
          {isDetailMode ? 'Notification' : 'Notifications'}
        </Text>
      </View>

      {isDetailMode && detailNotification && !loading && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            className={`mx-4 mt-4 p-5 rounded-3xl border ${isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-slate-100'
              }`}
          >
            <View className="flex-row items-center mb-4">
              <View
                className={`w-12 h-12 rounded-2xl ${detailNotification.iconBgColor} items-center justify-center mr-3`}
              >
                <MaterialIcons
                  name={detailNotification.icon}
                  size={24}
                  color={detailNotification.iconColor}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'
                    }`}
                >
                  {detailNotification.title}
                </Text>
                {!!detailNotification.time && (
                  <Text
                    className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'
                      }`}
                  >
                    {detailNotification.time}
                  </Text>
                )}
              </View>
            </View>
            {!!detailNotification.description && (
              <Text
                className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-600'
                  }`}
              >
                {detailNotification.description}
              </Text>
            )}
            <Pressable
              onPress={() => handleNotificationPress(detailNotification)}
              className="mt-6 px-5 py-3 rounded-2xl bg-blue-600 items-center"
            >
              <Text className="text-white font-semibold">Open Details</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Loading State */}
      {loading && !refreshing && !isDetailMode && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={isDark ? accentColor : '#2B5F9E'}
          />
          <Text
            className={`mt-4 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
          >
            Loading notifications...
          </Text>
        </View>
      )}

      {/* Notifications List */}
      {!loading && !isDetailMode && (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? accentColor : '#2B5F9E'}
              colors={[accentColor, '#2B5F9E']}
            />
          }
        >
          {notifications.length > 0 ? (
            <>
              {renderSection('TODAY', todayNotifications)}
              {renderSection('YESTERDAY', yesterdayNotifications)}
              {renderSection('EARLIER', earlierNotifications)}
            </>
          ) : (
            <View
              className={`p-8 mx-4 mt-4 rounded-2xl border items-center ${isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-white border-slate-100'
                }`}
            >
              <MaterialIcons
                name="notifications-none"
                size={48}
                color={isDark ? '#4B5563' : '#CBD5E1'}
              />
              <Text
                className={`mt-4 text-center font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}
              >
                No notifications yet
              </Text>
              <Text
                className={`mt-2 text-center text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
              >
                You'll see notifications here when there's activity
              </Text>
            </View>
          )}

          {/* End of notifications indicator */}
          {notifications.length > 0 && (
            <View className="py-12 items-center justify-center opacity-40">
              <MaterialIcons
                name="notifications-off"
                size={48}
                color={isDark ? '#4B5563' : '#94A3B8'}
              />
              <Text
                className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}
              >
                End of notifications
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Fetching Event Spinner Overaly */}
      {isModalFetching && (
        <View className="absolute inset-0 bg-black/5 items-center justify-center pointer-events-none">
          <View
            className={`px-6 py-4 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-white'} shadow-xl items-center`}
          >
            <ActivityIndicator size="small" color="#2563EB" />
            <Text
              className={`text-xs mt-2 font-medium ${isDark ? 'text-gray-300' : 'text-slate-600'}`}
            >
              Fetching event...
            </Text>
          </View>
        </View>
      )}

      {/* Invitation Acceptance Modal */}
      {selectedEvent && (
        <Modal
          visible={showAcceptModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAcceptModal(false)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-6">
            <View
              className={`w-full max-w-sm rounded-[32px] p-8 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}
            >
              <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center mb-6 mx-auto">
                <Text style={{ fontSize: 32 }}>📅</Text>
              </View>
              <Text
                className={`text-xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                Event Invitation
              </Text>
              <Text
                className={`text-center mb-8 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
              >
                You have been invited to "{selectedEvent.title}". Would you like
                to attend?
              </Text>

              <View
                className="mb-8 p-4 rounded-2xl bg-slate-50 flex-row items-center"
                style={{ gap: 12 }}
              >
                <Pressable
                  onPress={() => setAddToCpd(!addToCpd)}
                  className={`w-6 h-6 rounded border items-center justify-center ${addToCpd ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}
                >
                  {addToCpd && (
                    <MaterialIcons name="check" size={16} color="white" />
                  )}
                </Pressable>
                <View className="flex-1">
                  <Text className="text-slate-700 font-bold text-sm">
                    Add to CPD Portfolio
                  </Text>
                  <Text className="text-slate-500 text-[10px]">
                    Track hours automatically for revalidation
                  </Text>
                </View>
              </View>

              <View className="gap-3">
                <Pressable
                  onPress={() => handleResponse('accepted')}
                  disabled={isResponding}
                  className="w-full py-4 rounded-2xl bg-blue-600 items-center justify-center active:opacity-90"
                >
                  {isResponding ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base">
                      Accept Invitation
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => handleResponse('declined')}
                  disabled={isResponding}
                  className={`w-full py-4 rounded-2xl items-center justify-center active:bg-slate-100 ${isDark ? 'border border-slate-700' : 'bg-slate-50'}`}
                >
                  <Text
                    className={`font-semibold ${isDark ? 'text-gray-300' : 'text-slate-600'}`}
                  >
                    Decline
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowAcceptModal(false)}
                  className="mt-2 items-center"
                >
                  <Text className="text-slate-400 text-sm">Decide Later</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
