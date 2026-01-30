import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import '../global.css';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();

  const activeColor = isPremium ? '#D4AF37' : '#2B5F9E';
  const inactiveColor = isDark ? '#6B7280' : '#94A3B8';

  // Premium height adjustments
  const tabBarHeight = Platform.OS === 'ios' ? 70 + insets.bottom : 72;

  const TabIcon = ({
    name,
    focused,
    color,
  }: {
    name: keyof typeof MaterialIcons.glyphMap;
    focused: boolean;
    color: string;
  }) => (
    <View className="items-center justify-center pt-1">
      <View
        className="items-center justify-center w-10 h-10 rounded-2xl"
        style={
          focused
            ? {
              transform: [{ translateY: -0.5 }],
              backgroundColor: isPremium ? '#D4AF3714' : '#2B5F9E14',
            }
            : {}
        }
      >
        <MaterialIcons name={name} size={focused ? 28 : 26} color={color} />
      </View>
      {focused && (
        <View
          className="w-6 h-0.5 rounded-full absolute -bottom-3"
          style={{ backgroundColor: color, opacity: 0.8 }}
        />
      )}
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: isDark ? '#0B1220' : '#FFFFFF',
          borderTopWidth: 0,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 8,
          paddingTop: 6,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 8 : 0,
          left: Platform.OS === 'ios' ? 16 : 0,
          right: Platform.OS === 'ios' ? 16 : 0,
          elevation: Platform.OS === 'ios' ? 0 : 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.6 : 0.12,
          shadowRadius: 18,
        },
        tabBarLabelStyle: {
          display: 'none', // We'll handle labels inside custom components if needed, or hide for cleaner look
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="home" focused={focused} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="calendar/index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="calendar-month" focused={focused} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="photo-library" focused={focused} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="person" focused={focused} color={color} />
          ),
        }}
      />

      {/* Hide these screens from tab bar */}
      <Tabs.Screen name="workinghours/index" options={{ href: null }} />
      <Tabs.Screen name="workinghours/[id]" options={{ href: null }} />
      <Tabs.Screen name="cpdhourstracking/index" options={{ href: null }} />
      <Tabs.Screen name="cpdhourstracking/all-logs" options={{ href: null }} />
      <Tabs.Screen name="cpdhourstracking/[id]" options={{ href: null }} />
      <Tabs.Screen name="feedback/index" options={{ href: null }} />
      <Tabs.Screen name="feedback/[id]" options={{ href: null }} />
      <Tabs.Screen name="earings/index" options={{ href: null }} />
      <Tabs.Screen name="reflections/index" options={{ href: null }} />
      <Tabs.Screen name="reflections/[id]" options={{ href: null }} />
      <Tabs.Screen name="profile/account-settings" options={{ href: null }} />
      <Tabs.Screen name="profile/all-stats" options={{ href: null }} />
      <Tabs.Screen name="profile/subscription" options={{ href: null }} />
      <Tabs.Screen name="profile/settings" options={{ href: null }} />
      <Tabs.Screen name="profile/change-password" options={{ href: null }} />
      <Tabs.Screen name="profile/delete-account" options={{ href: null }} />
      <Tabs.Screen name="profile/about" options={{ href: null }} />
      <Tabs.Screen name="profile/terms" options={{ href: null }} />
      <Tabs.Screen name="profile/privacy" options={{ href: null }} />
      <Tabs.Screen name="profile/faq" options={{ href: null }} />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
      <Tabs.Screen name="calendar/all-events" options={{ href: null }} />
      <Tabs.Screen name="calendar/[id]" options={{ href: null }} />
      <Tabs.Screen name="appraisal/index" options={{ href: null }} />
      <Tabs.Screen name="appraisal/[id]" options={{ href: null }} />
    </Tabs>
  );
}
