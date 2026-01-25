import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/features/theme/theme.store';
import '../global.css';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2B5F9E',
        tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' 
            ? (isDark ? 'rgba(11, 18, 32, 0.8)' : 'rgba(255, 255, 255, 0.8)')
            : (isDark ? '#0B1220' : '#FFFFFF'),
          borderTopWidth: 1,
          borderTopColor: isDark ? '#1F2937' : '#E5E7EB',
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen 
        name="home/index" 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons 
              name="home" 
              size={24} 
              color={focused ? '#2B5F9E' : '#9CA3AF'} 
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text 
              style={{ 
                fontSize: 10, 
                fontWeight: focused ? '700' : '500',
                color: focused ? '#2B5F9E' : '#9CA3AF',
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
              size={24} 
              color={focused ? '#2B5F9E' : '#9CA3AF'} 
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text 
              style={{ 
                fontSize: 10, 
                fontWeight: focused ? '700' : '500',
                color: focused ? '#2B5F9E' : '#9CA3AF',
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
              size={24} 
              color={focused ? '#2B5F9E' : '#9CA3AF'} 
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text 
              style={{ 
                fontSize: 10, 
                fontWeight: focused ? '700' : '500',
                color: focused ? '#2B5F9E' : '#9CA3AF',
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
              size={24} 
              color={focused ? '#2B5F9E' : '#9CA3AF'} 
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text 
              style={{ 
                fontSize: 10, 
                fontWeight: focused ? '700' : '500',
                color: focused ? '#2B5F9E' : '#9CA3AF',
                marginTop: 4,
              }}
            >
              Profile
            </Text>
          ),
        }}
      />
      <Tabs.Screen  name="workinghours/index" options={{href: null}} />
      <Tabs.Screen  name="cpdhourstracking/index" options={{href: null}} />
      <Tabs.Screen  name="feedback/index" options={{href: null}} />
      <Tabs.Screen  name="earings/index" options={{href: null}} />
      <Tabs.Screen  name="reflections/index" options={{href: null}} />
      <Tabs.Screen  name="profile/account-settings" options={{href: null}} />
      <Tabs.Screen  name="profile/all-stats" options={{href: null}} />
      <Tabs.Screen  name="profile/subscription" options={{href: null}} />
      <Tabs.Screen  name="profile/settings" options={{href: null}} />
      <Tabs.Screen  name="notifications/index" options={{href: null}} />
    </Tabs>
  );
}
