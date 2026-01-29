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
  const tabBarHeight = Platform.OS === 'ios'
    ? 75 + insets.bottom
    : 85;

  const TabIcon = ({ name, focused, color }: { name: keyof typeof MaterialIcons.glyphMap; focused: boolean; color: string }) => (
    <View className="items-center justify-center pt-2">
      <View
        className={`items-center justify-center w-12 h-12 rounded-2xl ${focused ? (isPremium ? 'bg-premium-100/50' : 'bg-primary-50/50') : ''}`}
        style={focused && Platform.OS === 'ios' ? { shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 } : {}}
      >
        <MaterialIcons
          name={name}
          size={focused ? 42 : 38}
          color={color}
        />
      </View>
      {focused && (
        <View
          className="w-1.5 h-1.5 rounded-full absolute -bottom-3"
          style={{ backgroundColor: color }}
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
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
          paddingTop: 0,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 20,
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
