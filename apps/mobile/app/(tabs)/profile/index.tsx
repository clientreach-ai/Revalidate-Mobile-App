import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { useAuthStore } from '@/features/auth/auth.store';
import { useTimerStore } from '@/features/timer/timer.store';
import { useProfile } from '@/hooks/useProfile';
import { usePremium } from '@/hooks/usePremium';
import { API_CONFIG } from '@revalidation-tracker/constants';
import { showToast } from '@/utils/toast';
import '../../global.css';

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  isDestructive?: boolean;
  onPress?: () => void;
}

export default function ProfileScreen() {
  const { isDark } = useThemeStore();
  const { profile, isLoading, isRefreshing, refresh } = useProfile();
  const { isPremium } = usePremium();
  const timerStore = useTimerStore();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    loadLocalProfileImage();
  }, []);

  useEffect(() => {
    if (profile?.image) {
      // If it's a relative path, prefix with base URL
      const imageUrl = profile.image.startsWith('http')
        ? profile.image
        : `${API_CONFIG.BASE_URL}${profile.image.startsWith('/') ? '' : '/'}${profile.image}`;
      setProfileImage(imageUrl);
    }
  }, [profile]);

  const loadLocalProfileImage = async () => {
    try {
      const key = profile?.id
        ? `profile_image_uri_${profile.id}`
        : 'profile_image_uri';
      let savedImage = await AsyncStorage.getItem(key);

      // migrate legacy key to per-user key when possible
      if (!savedImage && profile?.id) {
        const legacy = await AsyncStorage.getItem('profile_image_uri');
        if (legacy) {
          savedImage = legacy;
          await AsyncStorage.setItem(`profile_image_uri_${profile.id}`, legacy);
          await AsyncStorage.removeItem('profile_image_uri');
        }
      }

      if (savedImage) setProfileImage(savedImage);
    } catch (e) {
      console.log('Failed to load local profile image', e);
    }
  };

  const onRefresh = async () => {
    await refresh();
    await loadLocalProfileImage();
  };

  // Calculate days until revalidation
  const getDaysUntilRevalidation = (
    revalidationDate: string | null
  ): number | null => {
    if (!revalidationDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const revalidation = new Date(revalidationDate);
    revalidation.setHours(0, 0, 0, 0);

    const diffTime = revalidation.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Not set';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Get professional role display name
  const getRoleDisplayName = (role: string | null): string => {
    if (!role) return 'Not set';

    const roleMap: Record<string, string> = {
      doctor: 'Doctor',
      nurse: 'Nurse',
      pharmacist: 'Pharmacist',
      other: 'Other',
      other_healthcare: 'Other Healthcare',
    };

    return roleMap[role] || role;
  };

  // Calculate progress percentage (assuming 3 years = 1095 days)
  const getProgressPercentage = (daysLeft: number | null): number => {
    if (daysLeft === null) return 0;
    const totalDays = 1095; // 3 years
    const daysPassed = totalDays - daysLeft;
    const percentage = (daysPassed / totalDays) * 100;
    return Math.max(0, Math.min(100, percentage));
  };

  const daysLeft = profile?.revalidationDate
    ? getDaysUntilRevalidation(profile.revalidationDate)
    : null;
  const progressPercentage = getProgressPercentage(daysLeft);

  const handleLogout = async () => {
    try {
      await useAuthStore.getState().logout();
      timerStore.reset();
      showToast.success('Logged out successfully', 'Success');
      try {
        router.replace('/(auth)/login');
      } catch (e) {
        console.warn('Navigation not ready for login redirect:', e);
      }
    } catch (error) {
      console.error('Error during logout:', error);
      showToast.error('Error during logout', 'Error');
      try {
        router.replace('/(auth)/login');
      } catch (e) {
        console.warn('Navigation not ready for login redirect:', e);
      }
    }
  };

  const handleMenuPress = (itemId: string) => {
    switch (itemId) {
      case '1':
        router.push('/(tabs)/profile/account-settings');
        break;
      case '2':
        router.push('/(tabs)/profile/all-stats');
        break;
      case '3':
        router.push('/(tabs)/profile/subscription');
        break;
      case '4':
        router.push('/(tabs)/profile/settings');
        break;
      case '5':
        handleLogout();
        break;
      default:
        break;
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: '1',
      title: 'Account Settings',
      icon: 'person',
      iconBgColor: 'bg-slate-100',
      iconColor: '#64748B',
      onPress: () => handleMenuPress('1'),
    },
    {
      id: '2',
      title: 'All Stats',
      icon: 'analytics',
      iconBgColor: 'bg-slate-100',
      iconColor: '#64748B',
      onPress: () => handleMenuPress('2'),
    },
    ...(isPremium
      ? [
          {
            id: 'export',
            title: 'Export Data',
            subtitle: 'Download PDF Report',
            icon: 'file-download' as keyof typeof MaterialIcons.glyphMap,
            iconBgColor: 'bg-blue-50',
            iconColor: '#3B82F6',
            onPress: () => router.push('/export'),
          },
        ]
      : []),
    {
      id: '3',
      title: 'Subscription',
      subtitle: 'Upgrade to Pro',
      icon: 'workspace-premium',
      iconBgColor: 'bg-amber-50',
      iconColor: '#F59E0B',
      onPress: () => handleMenuPress('3'),
    },
    {
      id: '4',
      title: 'Settings',
      icon: 'settings',
      iconBgColor: 'bg-slate-100',
      iconColor: '#64748B',
      onPress: () => handleMenuPress('4'),
    },
    {
      id: '5',
      title: 'Log Out',
      icon: 'logout',
      iconBgColor: 'bg-red-100',
      iconColor: '#DC2626',
      isDestructive: true,
      onPress: () => handleMenuPress('5'),
    },
  ];

  const backgroundColor = isDark ? 'bg-background-dark' : 'bg-slate-50';
  const headerBgColor = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const secondaryTextColor = isDark ? 'text-gray-400' : 'text-slate-600';
  const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';

  return (
    <SafeAreaView className={`flex-1 ${backgroundColor}`} edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? accentColor : '#2B5F9E'}
            colors={[accentColor, '#2B5F9E']}
          />
        }
      >
        {isLoading && !profile ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator
              size="large"
              color={isDark ? accentColor : '#2B5F9E'}
            />
            <Text className={`mt-4 ${secondaryTextColor}`}>
              Loading profile...
            </Text>
          </View>
        ) : (
          <View>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-8 px-6 pt-4">
              <View className="w-10" />
              <Text className={`text-lg font-semibold ${textColor}`}>
                Profile
              </Text>
              <View className="w-10" />
            </View>

            {/* Profile Section */}
            <View className="items-center mb-8">
              <View className="relative">
                <View
                  className={`w-32 h-32 rounded-full border-4 overflow-hidden shadow-sm ${isPremium ? 'border-[#D4AF37]' : borderColor}`}
                >
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      className="w-full h-full"
                    />
                  ) : (
                    <View
                      className={`w-full h-full items-center justify-center ${isPremium ? 'bg-premium-400' : 'bg-teal-200'}`}
                    >
                      <MaterialIcons
                        name="person"
                        size={64}
                        color={isPremium ? '#1F2937' : '#14B8A6'}
                      />
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={() =>
                    router.push('/(tabs)/profile/account-settings')
                  }
                  className={`absolute bottom-1 right-1 ${isPremium ? 'bg-[#D4AF37] border-[#fff]' : 'bg-[#2563EB]'} p-2 rounded-full border-2 shadow-lg ${borderColor}`}
                >
                  <MaterialIcons name="edit" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
              <Text
                className={`mt-4 text-2xl font-bold ${isPremium ? 'text-[#D4AF37]' : textColor}`}
              >
                {profile?.name || 'User'}
              </Text>
              {profile?.professionalRole && (
                <View
                  className={`mt-2 flex-row items-center px-3 py-1 rounded-full ${isPremium ? 'bg-[#FFF5D6]' : 'bg-blue-100'}`}
                >
                  <Text
                    className={`${isPremium ? 'text-[#B87E00]' : 'text-[#2563EB]'} text-xs font-semibold uppercase tracking-wider`}
                  >
                    {getRoleDisplayName(profile.professionalRole)}
                  </Text>
                </View>
              )}

              {isPremium && (
                <View className="mt-3 flex-row items-center space-x-2">
                  <View className="px-3 py-1 rounded-full bg-premium-400">
                    <Text className="text-sm font-semibold text-[#1F2937]">
                      ⭐ Premium
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* NMC Revalidation Due Card */}
            {profile?.revalidationDate && (
              <View className="px-6 mb-8">
                <View
                  className={`${isPremium ? 'bg-premium-400' : 'bg-primary-600'} p-5 rounded-2xl shadow-xl`}
                >
                  <View className="flex-row justify-between items-start mb-4">
                    <View>
                      <Text
                        className={`${isPremium ? 'text-amber-900' : 'text-blue-100'} text-sm opacity-80 mb-1`}
                      >
                        NMC Revalidation Due
                      </Text>
                      <Text
                        className={`text-xl font-bold ${isPremium ? 'text-[#1F2937]' : 'text-white'}`}
                      >
                        {formatDate(profile.revalidationDate)}
                      </Text>
                    </View>
                    <View
                      className={`${isPremium ? 'bg-black/10' : 'bg-white/20'} p-2 rounded-lg`}
                    >
                      <MaterialIcons
                        name="event-repeat"
                        size={24}
                        color={isPremium ? '#1F2937' : '#FFFFFF'}
                      />
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View
                    className={`w-full ${isPremium ? 'bg-black/10' : 'bg-white/20'} rounded-full h-2 mb-3`}
                  >
                    <View
                      className={`${isPremium ? 'bg-[#1F2937]' : 'bg-white'} h-2 rounded-full`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </View>

                  {daysLeft !== null && (
                    <View
                      className={`${isPremium ? 'bg-black/10' : 'bg-white/20'} self-start px-2 py-1 rounded`}
                    >
                      <Text
                        className={`text-xs font-medium ${isPremium ? 'text-[#1F2937]' : 'text-white'}`}
                      >
                        {daysLeft > 0
                          ? `${daysLeft} Days Left`
                          : daysLeft === 0
                            ? 'Due Today'
                            : `${Math.abs(daysLeft)} Days Overdue`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Menu Items */}
            <View className="px-6" style={{ gap: 12 }}>
              {menuItems.map((item) => {
                const itemBgColor = item.isDestructive
                  ? 'bg-red-50'
                  : headerBgColor;
                const itemTextColor = item.isDestructive
                  ? 'text-red-600'
                  : textColor;
                const subtitleColor = isDark
                  ? 'text-gray-400'
                  : 'text-slate-500';
                const chevronColor = item.isDestructive
                  ? '#DC2626'
                  : isDark
                    ? '#64748B'
                    : '#CBD5E1';

                return (
                  <Pressable
                    key={item.id}
                    onPress={item.onPress}
                    className={`w-full flex-row items-center p-4 rounded-2xl shadow-sm ${itemBgColor}`}
                  >
                    <View
                      className={`w-10 h-10 rounded-xl ${item.iconBgColor} items-center justify-center mr-4`}
                    >
                      <MaterialIcons
                        name={item.icon}
                        size={20}
                        color={item.iconColor}
                      />
                    </View>
                    {item.subtitle ? (
                      <View className="flex-1">
                        <Text className={`font-medium ${itemTextColor}`}>
                          {item.title}
                        </Text>
                        <Text className={`text-xs mt-0.5 ${subtitleColor}`}>
                          {item.id === '3' && isPremium
                            ? 'Premium'
                            : item.subtitle}
                        </Text>
                      </View>
                    ) : (
                      <Text className={`flex-1 font-medium ${itemTextColor}`}>
                        {item.title}
                      </Text>
                    )}
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color={chevronColor}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
