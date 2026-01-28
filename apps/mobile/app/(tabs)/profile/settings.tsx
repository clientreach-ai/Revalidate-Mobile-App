import { View, Text, ScrollView, Pressable, Switch, RefreshControl, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useThemeStore } from '@/features/theme/theme.store';
import { showToast } from '@/utils/toast';
import '../../global.css';

interface SettingItemProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  iconBgColor: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

function SettingItem({
  title,
  subtitle,
  icon,
  iconColor,
  iconBgColor,
  onPress,
  rightElement
}: SettingItemProps) {
  const { isDark } = useThemeStore();

  return (
    <Pressable
      onPress={onPress}
      className={`w-full flex-row items-center p-4 rounded-2xl shadow-sm ${isDark ? "bg-slate-800" : "bg-white"
        }`}
    >
      <View className={`w-10 h-10 rounded-xl ${iconBgColor} items-center justify-center mr-4`}>
        <MaterialIcons name={icon} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className={`font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
          {title}
        </Text>
        {subtitle && (
          <Text className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement || (
        <MaterialIcons
          name="chevron-right"
          size={20}
          color={isDark ? "#64748B" : "#94A3B8"}
        />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, toggleTheme } = useThemeStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out Revalidate - the best app for tracking your NMC revalidation requirements! Download now: https://revalidate.app',
        title: 'Share Revalidate App',
      });
    } catch (error: any) {
      console.error('Error sharing:', error);
    }
  };

  const handleContactSupport = () => {
    const email = 'support@revalidate.app';
    const subject = 'Support Request - Revalidate App';
    const mailUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

    Linking.openURL(mailUrl).catch(() => {
      showToast.error('Could not open email client', 'Error');
    });
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-background-dark" : "bg-slate-50"}`}
      edges={['top']}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 1000);
            }}
            tintColor={isDark ? '#D4AF37' : '#2B5F9E'}
            colors={['#D4AF37', '#2B5F9E']}
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8 px-6 pt-4">
          <Pressable
            onPress={() => router.back()}
            className={`w-10 h-10 items-center justify-center rounded-full ${isDark ? "bg-slate-800" : "bg-white"
              } shadow-sm`}
          >
            <MaterialIcons
              name="arrow-back-ios"
              size={20}
              color={isDark ? "#E5E7EB" : "#1F2937"}
            />
          </Pressable>
          <Text className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
            Settings
          </Text>
          <View className="w-10" />
        </View>

        {/* Settings Sections */}
        <View className="px-6" style={{ gap: 24 }}>
          {/* Account */}
          <View>
            <Text className={`text-sm font-semibold mb-3 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"
              }`}>
              Account
            </Text>
            <View style={{ gap: 12 }}>
              <SettingItem
                title="Change Password"
                subtitle="Update your password"
                icon="lock"
                iconColor="#2563EB"
                iconBgColor="bg-blue-50"
                onPress={() => router.push('/(tabs)/profile/change-password')}
              />
              <SettingItem
                title="Delete Account"
                subtitle="Permanently delete your account"
                icon="delete-forever"
                iconColor="#DC2626"
                iconBgColor="bg-red-50"
                onPress={() => router.push('/(tabs)/profile/delete-account')}
              />
            </View>
          </View>

          {/* Notifications */}
          <View>
            <Text className={`text-sm font-semibold mb-3 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"
              }`}>
              Notifications
            </Text>
            <View style={{ gap: 12 }}>
              <View className={`w-full flex-row items-center p-4 rounded-2xl shadow-sm ${isDark ? "bg-slate-800" : "bg-white"
                }`}>
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-4">
                  <MaterialIcons name="notifications" size={20} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <Text className={`font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
                    Push Notifications
                  </Text>
                  <Text className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                    Receive app notifications
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View className={`w-full flex-row items-center p-4 rounded-2xl shadow-sm ${isDark ? "bg-slate-800" : "bg-white"
                }`}>
                <View className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center mr-4">
                  <MaterialIcons name="email" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className={`font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
                    Email Notifications
                  </Text>
                  <Text className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                    Receive email updates
                  </Text>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                  trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* Appearance */}
          <View>
            <Text className={`text-sm font-semibold mb-3 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"
              }`}>
              Appearance
            </Text>
            <View style={{ gap: 12 }}>
              <View className={`w-full flex-row items-center p-4 rounded-2xl shadow-sm ${isDark ? "bg-slate-800" : "bg-white"
                }`}>
                <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${isDark ? "bg-slate-700" : "bg-slate-100"
                  }`}>
                  <MaterialIcons
                    name={isDark ? "light-mode" : "dark-mode"}
                    size={20}
                    color={isDark ? "#D1D5DB" : "#64748B"}
                  />
                </View>
                <View className="flex-1">
                  <Text className={`font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
                    {isDark ? "Light Mode" : "Dark Mode"}
                  </Text>
                  <Text className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                    {isDark ? "Switch to light theme" : "Switch to dark theme"}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* General */}
          <View>
            <Text className={`text-sm font-semibold mb-3 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"
              }`}>
              General
            </Text>
            <View style={{ gap: 12 }}>
              <SettingItem
                title="Share App"
                subtitle="Invite friends and colleagues"
                icon="share"
                iconColor="#10B981"
                iconBgColor="bg-green-50"
                onPress={handleShareApp}
              />
              <SettingItem
                title="Language"
                subtitle="English (UK)"
                icon="language"
                iconColor="#64748B"
                iconBgColor="bg-slate-100"
              />
              <SettingItem
                title="Data & Privacy"
                subtitle="Manage your data"
                icon="privacy-tip"
                iconColor="#64748B"
                iconBgColor="bg-slate-100"
                onPress={() => router.push('/(tabs)/profile/privacy' as any)}
              />
            </View>
          </View>

          {/* Support */}
          <View>
            <Text className={`text-sm font-semibold mb-3 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"
              }`}>
              Support
            </Text>
            <View style={{ gap: 12 }}>
              <SettingItem
                title="Help Center"
                subtitle="FAQs and guides"
                icon="help"
                iconColor="#2563EB"
                iconBgColor="bg-blue-50"
                onPress={() => router.push('/(tabs)/profile/faq' as any)}
              />
              <SettingItem
                title="Contact Support"
                subtitle="Get in touch with us"
                icon="support-agent"
                iconColor="#2563EB"
                iconBgColor="bg-blue-50"
                onPress={handleContactSupport}
              />
              <SettingItem
                title="About"
                subtitle="Revalidate v1.0.0"
                icon="info"
                iconColor="#64748B"
                iconBgColor="bg-slate-100"
                onPress={() => router.push('/(tabs)/profile/about' as any)}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

