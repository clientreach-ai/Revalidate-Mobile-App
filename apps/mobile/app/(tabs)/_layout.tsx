import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import '../global.css';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();
  
  const activeColor = isPremium ? '#D4AF37' : '#2B5F9E';
  
  // Calculate consistent spacing for both platforms
  const bottomPadding = Platform.OS === 'ios' 
    ? Math.max(insets.bottom, 8) + 4  // iOS: safe area + 4px
    : 8;  // Android: fixed 8px
  
  const tabBarHeight = Platform.OS === 'ios'
    ? 70 + bottomPadding  // iOS: 70px content + bottom padding
    : 70 + bottomPadding;  // Android: same for consistency
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' 
            ? (isDark ? 'rgba(11, 18, 32, 0.8)' : 'rgba(255, 255, 255, 0.8)')
            : (isDark ? '#0B1220' : '#FFFFFF'),
          borderTopWidth: isPremium ? 2 : 1,
          borderTopColor: isPremium 
            ? (isDark ? '#D4AF37' : '#D4AF37')
            : (isDark ? '#1F2937' : '#E5E7EB'),
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 10,
          paddingHorizontal: 0,
          width: '100%',
          elevation: isPremium ? 8 : 0,
          shadowOpacity: isPremium ? 0.3 : 0,
          shadowColor: isPremium ? '#D4AF37' : undefined,
          shadowOffset: isPremium ? { width: 0, height: -2 } : undefined,
          shadowRadius: isPremium ? 4 : undefined,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
          marginBottom: 0,
          textAlign: 'center',
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          minWidth: 0,
          maxWidth: '100%',
        },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen 
        name="home/index" 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons 
              name="home" 
              size={28} 
              color={focused ? activeColor : '#9CA3AF'} 
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text 
              style={{ 
                fontSize: 11, 
                fontWeight: focused ? '700' : '500',
                color: focused ? activeColor : '#9CA3AF',
                marginTop: 4,
              }}
            >
              Home
            </Text>
          ),
        }}
      />

      <Tabs.Screen 
        name="calendar/index" 
        options={{ 
          title: 'Calendar',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons 
              name="calendar-month" 
              size={28} 
              color={focused ? activeColor : '#9CA3AF'} 
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text 
              style={{ 
                fontSize: 11, 
                fontWeight: focused ? '700' : '500',
                color: focused ? activeColor : '#9CA3AF',
                marginTop: 4,
              }}
            >
              Calendar
            </Text>
          ),
        }}
      />

      <Tabs.Screen 
        name="gallery/index" 
        options={{ 
          title: 'Gallery',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons 
              name="photo-library" 
              size={28} 
              color={focused ? activeColor : '#9CA3AF'} 
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text 
              style={{ 
                fontSize: 11, 
                fontWeight: focused ? '700' : '500',
                color: focused ? activeColor : '#9CA3AF',
                marginTop: 4,
              }}
            >
              Gallery
            </Text>
          ),
        }}
      />
      
      <Tabs.Screen 
        name="profile/index" 
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons 
              name="person" 
              size={28} 
              color={focused ? activeColor : '#9CA3AF'} 
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text 
              style={{ 
                fontSize: 11, 
                fontWeight: focused ? '700' : '500',
                color: focused ? activeColor : '#9CA3AF',
                marginTop: 4,
              }}
            >
              Profile
            </Text>
          ),
        }}
      />
      
      {/* Hide these screens from tab bar */}
      <Tabs.Screen name="workinghours/index" options={{ href: null }} />
      <Tabs.Screen name="workinghours/[id]" options={{ href: null }} />
      <Tabs.Screen name="cpdhourstracking/index" options={{ href: null }} />
      <Tabs.Screen name="feedback/index" options={{ href: null }} />
      <Tabs.Screen name="earings/index" options={{ href: null }} />
      <Tabs.Screen name="reflections/index" options={{ href: null }} />
      <Tabs.Screen name="profile/account-settings" options={{ href: null }} />
      <Tabs.Screen name="profile/all-stats" options={{ href: null }} />
      <Tabs.Screen name="profile/subscription" options={{ href: null }} />
      <Tabs.Screen name="profile/settings" options={{ href: null }} />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
      <Tabs.Screen name="calendar/all-events" options={{ href: null }} />
    </Tabs>
  );
}
