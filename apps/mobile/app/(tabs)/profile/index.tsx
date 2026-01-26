import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { useProfile } from '@/hooks/useProfile';
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
  const router = useRouter();
  const { isDark } = useThemeStore();
  const { profile, isLoading, isRefreshing, refresh } = useProfile();

  const onRefresh = async () => {
    await refresh();
  };

  // Calculate days until revalidation
  const getDaysUntilRevalidation = (revalidationDate: string | null): number | null => {
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

  const daysLeft = profile?.revalidationDate ? getDaysUntilRevalidation(profile.revalidationDate) : null;
  const progressPercentage = getProgressPercentage(daysLeft);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      showToast.success('Logged out successfully', 'Success');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error during logout:', error);
      showToast.error('Error during logout', 'Error');
      router.replace('/(auth)/login');
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

  const backgroundColor = isDark ? 'bg-background-dark' : 'bg-background-light';
  const headerBgColor = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-800' : 'border-white';
  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const secondaryTextColor = isDark ? 'text-gray-400' : 'text-gray-600';

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
            tintColor={isDark ? '#D4AF37' : '#2B5F9E'}
            colors={['#D4AF37', '#2B5F9E']}
          />
        }
      >
        {isLoading && !profile ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
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
                <View className={`w-32 h-32 rounded-full border-4 overflow-hidden shadow-sm ${borderColor}`}>
                  <View className="w-full h-full bg-teal-200 items-center justify-center">
                    <MaterialIcons name="person" size={64} color="#14B8A6" />
                  </View>
                </View>
                <Pressable className={`absolute bottom-1 right-1 bg-[#2563EB] p-2 rounded-full border-2 shadow-lg ${borderColor}`}>
                  <MaterialIcons name="edit" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
              <Text className={`mt-4 text-2xl font-bold ${textColor}`}>
                {profile?.name || 'User'}
              </Text>
              {profile?.professionalRole && (
                <View className="mt-2 flex-row items-center px-3 py-1 rounded-full bg-blue-100">
                  <Text className="text-[#2563EB] text-xs font-semibold uppercase tracking-wider">
                    {getRoleDisplayName(profile.professionalRole)}
                  </Text>
                </View>
              )}
            </View>

            {/* NMC Revalidation Due Card */}
            {profile?.revalidationDate && (
              <View className="px-6 mb-8">
                <View className="bg-[#2563EB] p-5 rounded-2xl text-white shadow-xl">
                  <View className="flex-row justify-between items-start mb-4">
                    <View>
                      <Text className="text-blue-100 text-sm opacity-80 mb-1">
                        NMC Revalidation Due
                      </Text>
                      <Text className="text-xl font-bold text-white">
                        {formatDate(profile.revalidationDate)}
                      </Text>
                    </View>
                    <View className="bg-white/20 p-2 rounded-lg">
                      <MaterialIcons name="event-repeat" size={24} color="#FFFFFF" />
                    </View>
                  </View>
                  
                  {/* Progress Bar */}
                  <View className="w-full bg-white/20 rounded-full h-2 mb-3">
                    <View 
                      className="bg-white h-2 rounded-full" 
                      style={{ width: `${progressPercentage}%` }} 
                    />
                  </View>
                  
                  {daysLeft !== null && (
                    <View className="bg-white/20 self-start px-2 py-1 rounded">
                      <Text className="text-xs text-white font-medium">
                        {daysLeft > 0 ? `${daysLeft} Days Left` : daysLeft === 0 ? 'Due Today' : `${Math.abs(daysLeft)} Days Overdue`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Menu Items */}
            <View className="px-6" style={{ gap: 12 }}>
              {menuItems.map((item) => {
                const itemBgColor = item.isDestructive ? 'bg-red-50' : headerBgColor;
                const itemTextColor = item.isDestructive ? 'text-red-600' : textColor;
                const subtitleColor = isDark ? 'text-gray-400' : 'text-slate-400';
                const chevronColor = item.isDestructive ? '#DC2626' : (isDark ? '#64748B' : '#94A3B8');
                
                return (
                  <Pressable
                    key={item.id}
                    onPress={item.onPress}
                    className={`w-full flex-row items-center p-4 rounded-2xl shadow-sm ${itemBgColor}`}
                  >
                    <View className={`w-10 h-10 rounded-xl ${item.iconBgColor} items-center justify-center mr-4`}>
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
                          {item.subtitle}
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
