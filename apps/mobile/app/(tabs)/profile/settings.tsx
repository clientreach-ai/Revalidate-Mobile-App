import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
  return (
    <Pressable
      onPress={onPress}
      className="w-full flex-row items-center p-4 bg-white rounded-2xl shadow-sm"
    >
      <View className={`w-10 h-10 rounded-xl ${iconBgColor} items-center justify-center mr-4`}>
        <MaterialIcons name={icon} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="font-medium text-slate-800">{title}</Text>
        {subtitle && (
          <Text className="text-xs text-slate-400 mt-0.5">{subtitle}</Text>
        )}
      </View>
      {rightElement || (
        <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8 px-6 pt-4">
          <Pressable 
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <MaterialIcons name="arrow-back-ios" size={20} color="#1F2937" />
          </Pressable>
          <Text className="text-lg font-semibold text-slate-800">Settings</Text>
          <View className="w-10" />
        </View>

        {/* Settings Sections */}
        <View className="px-6" style={{ gap: 24 }}>
          {/* Notifications */}
          <View>
            <Text className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
              Notifications
            </Text>
            <View style={{ gap: 12 }}>
              <View className="w-full flex-row items-center p-4 bg-white rounded-2xl shadow-sm">
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-4">
                  <MaterialIcons name="notifications" size={20} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-slate-800">Push Notifications</Text>
                  <Text className="text-xs text-slate-400 mt-0.5">Receive app notifications</Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View className="w-full flex-row items-center p-4 bg-white rounded-2xl shadow-sm">
                <View className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center mr-4">
                  <MaterialIcons name="email" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-slate-800">Email Notifications</Text>
                  <Text className="text-xs text-slate-400 mt-0.5">Receive email updates</Text>
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
            <Text className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
              Appearance
            </Text>
            <View style={{ gap: 12 }}>
              <View className="w-full flex-row items-center p-4 bg-white rounded-2xl shadow-sm">
                <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mr-4">
                  <MaterialIcons name="dark-mode" size={20} color="#64748B" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-slate-800">Dark Mode</Text>
                  <Text className="text-xs text-slate-400 mt-0.5">Switch to dark theme</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* General */}
          <View>
            <Text className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
              General
            </Text>
            <View style={{ gap: 12 }}>
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
              />
              <SettingItem
                title="Backup & Sync"
                subtitle="Cloud backup settings"
                icon="cloud-sync"
                iconColor="#64748B"
                iconBgColor="bg-slate-100"
              />
            </View>
          </View>

          {/* Support */}
          <View>
            <Text className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
              Support
            </Text>
            <View style={{ gap: 12 }}>
              <SettingItem
                title="Help Center"
                subtitle="FAQs and guides"
                icon="help"
                iconColor="#2563EB"
                iconBgColor="bg-blue-50"
              />
              <SettingItem
                title="Contact Support"
                subtitle="Get in touch with us"
                icon="support-agent"
                iconColor="#2563EB"
                iconBgColor="bg-blue-50"
              />
              <SettingItem
                title="About"
                subtitle="App version 1.0.0"
                icon="info"
                iconColor="#64748B"
                iconBgColor="bg-slate-100"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
