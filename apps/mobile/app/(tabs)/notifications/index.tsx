import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Upcoming appraisal meeting',
      description: 'Your meeting starts in 30 minutes. Please ensure your portfolio is ready for review.',
      time: '10:30 AM',
      icon: 'event',
      iconColor: '#2563EB',
      iconBgColor: 'bg-blue-50',
      isRead: false,
      section: 'today',
    },
    {
      id: '2',
      title: 'New CPD requirements',
      description: 'GMC has updated the guidance for the 2024 revalidation cycle. Tap to read more.',
      time: '8:15 AM',
      icon: 'info',
      iconColor: '#F59E0B',
      iconBgColor: 'bg-amber-50',
      isRead: false,
      section: 'today',
    },
    {
      id: '3',
      title: 'Evidence upload confirmed',
      description: '"Audit of Surgical Outcomes 2023" has been successfully uploaded to your gallery.',
      time: '4:20 PM',
      icon: 'check-circle',
      iconColor: '#10B981',
      iconBgColor: 'bg-green-50',
      isRead: true,
      section: 'yesterday',
    },
    {
      id: '4',
      title: 'System Security Update',
      description: 'Multi-factor authentication is now mandatory for all users in your trust.',
      time: '9:00 AM',
      icon: 'verified-user',
      iconColor: '#64748B',
      iconBgColor: 'bg-slate-100',
      isRead: true,
      section: 'yesterday',
    },
    {
      id: '5',
      title: 'Colleague feedback ready',
      description: 'The results of your 360-degree multi-source feedback are now available.',
      time: 'Mon',
      icon: 'history-edu',
      iconColor: '#2563EB',
      iconBgColor: 'bg-blue-50',
      isRead: true,
      section: 'earlier',
    },
  ]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const todayNotifications = notifications.filter(n => n.section === 'today');
  const yesterdayNotifications = notifications.filter(n => n.section === 'yesterday');
  const earlierNotifications = notifications.filter(n => n.section === 'earlier');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Export unread count for use in other components
  // This could be moved to a context or store in the future

  const renderSection = (title: string, items: Notification[]) => {
    if (items.length === 0) return null;

    return (
      <View key={title}>
        <View className="px-4 py-2 bg-slate-100">
          <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </Text>
        </View>
        {items.map((notification) => (
          <Pressable
            key={notification.id}
            onPress={() => markAsRead(notification.id)}
            className={`flex-row items-center gap-4 px-4 py-4 bg-white border-b border-slate-100 ${
              !notification.isRead ? 'opacity-100' : 'opacity-80'
            }`}
          >
            <View className="relative">
              <View className={`w-12 h-12 rounded-xl ${notification.iconBgColor} items-center justify-center`}>
                <MaterialIcons 
                  name={notification.icon} 
                  size={24} 
                  color={notification.iconColor} 
                />
              </View>
              {!notification.isRead && (
                <View className="absolute -top-1 -right-1 w-3 h-3 bg-[#2563EB] border-2 border-white rounded-full" />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row justify-between items-baseline mb-1">
                <Text 
                  className={`text-[15px] flex-1 ${notification.isRead ? 'font-medium' : 'font-bold'} text-slate-800`}
                  numberOfLines={1}
                >
                  {notification.title}
                </Text>
                <Text 
                  className={`text-xs ml-2 shrink-0 ${
                    !notification.isRead 
                      ? 'font-medium text-[#2563EB]' 
                      : 'font-normal text-slate-500'
                  }`}
                >
                  {notification.time}
                </Text>
              </View>
              <Text 
                className="text-sm font-normal text-slate-500 leading-snug"
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

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="bg-white/80 px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable 
            onPress={() => router.back()}
            className="flex-row items-center gap-1"
          >
            <MaterialIcons name="chevron-left" size={28} color="#2563EB" />
            <Text className="text-base font-medium text-[#2563EB]">Back</Text>
          </Pressable>
          {unreadCount > 0 && (
            <Pressable onPress={markAllAsRead}>
              <Text className="text-sm font-semibold tracking-tight text-[#2563EB]">
                Mark all as read
              </Text>
            </Pressable>
          )}
        </View>
        <Text className="text-3xl font-bold tracking-tight text-slate-800 px-0.5">
          Notifications
        </Text>
      </View>

      {/* Notifications List */}
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {renderSection('TODAY', todayNotifications)}
        {renderSection('YESTERDAY', yesterdayNotifications)}
        {renderSection('EARLIER', earlierNotifications)}

        {/* End of notifications indicator */}
        <View className="py-12 items-center justify-center opacity-40">
          <MaterialIcons name="notifications-off" size={48} color="#94A3B8" />
          <Text className="text-sm text-slate-500 mt-2">End of notifications</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
