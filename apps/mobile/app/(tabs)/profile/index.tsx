import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

  const menuItems: MenuItem[] = [
    {
      id: '1',
      title: 'Account Settings',
      icon: 'person',
      iconBgColor: 'bg-slate-100',
      iconColor: '#64748B',
    },
    {
      id: '2',
      title: 'All Stats',
      icon: 'analytics',
      iconBgColor: 'bg-slate-100',
      iconColor: '#64748B',
    },
    {
      id: '3',
      title: 'Subscription',
      subtitle: 'Upgrade to Pro',
      icon: 'workspace-premium',
      iconBgColor: 'bg-amber-50',
      iconColor: '#F59E0B',
    },
    {
      id: '4',
      title: 'Settings',
      icon: 'settings',
      iconBgColor: 'bg-slate-100',
      iconColor: '#64748B',
    },
    {
      id: '5',
      title: 'Log Out',
      icon: 'logout',
      iconBgColor: 'bg-red-100',
      iconColor: '#DC2626',
      isDestructive: true,
    },
  ];

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
          <Text className="text-lg font-semibold text-slate-800">Profile</Text>
          <View className="w-10" />
        </View>

        {/* Profile Section */}
        <View className="items-center mb-8">
          <View className="relative">
            <View className="w-32 h-32 rounded-full border-4 border-white overflow-hidden shadow-sm">
              <View className="w-full h-full bg-teal-200 items-center justify-center">
                <MaterialIcons name="person" size={64} color="#14B8A6" />
              </View>
            </View>
            <Pressable className="absolute bottom-1 right-1 bg-[#2563EB] p-2 rounded-full border-2 border-white shadow-lg">
              <MaterialIcons name="edit" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text className="mt-4 text-2xl font-bold text-slate-800">Sarah Jenkins</Text>
          <View className="mt-2 flex-row items-center px-3 py-1 rounded-full bg-blue-100">
            <Text className="text-[#2563EB] text-xs font-semibold uppercase tracking-wider">
              Nurse
            </Text>
          </View>
        </View>

        {/* NMC Revalidation Due Card */}
        <View className="px-6 mb-8">
          <View className="bg-[#2563EB] p-5 rounded-2xl text-white shadow-xl">
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="text-blue-100 text-sm opacity-80 mb-1">
                  NMC Revalidation Due
                </Text>
                <Text className="text-xl font-bold text-white">
                  14 October 2024
                </Text>
              </View>
              <View className="bg-white/20 p-2 rounded-lg">
                <MaterialIcons name="event-repeat" size={24} color="#FFFFFF" />
              </View>
            </View>
            
            {/* Progress Bar */}
            <View className="w-full bg-white/20 rounded-full h-2 mb-3">
              <View className="bg-white h-2 rounded-full" style={{ width: '65%' }} />
            </View>
            
            <View className="bg-white/20 self-start px-2 py-1 rounded">
              <Text className="text-xs text-white font-medium">182 Days Left</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View className="px-6" style={{ gap: 12 }}>
          {menuItems.map((item) => (
            <Pressable
              key={item.id}
              className={`w-full flex-row items-center p-4 rounded-2xl shadow-sm ${
                item.isDestructive ? 'bg-red-50' : 'bg-white'
              }`}
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
                  <Text className={`font-medium ${item.isDestructive ? 'text-red-600' : 'text-slate-800'}`}>
                    {item.title}
                  </Text>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    {item.subtitle}
                  </Text>
                </View>
              ) : (
                <Text className={`flex-1 font-medium ${item.isDestructive ? 'text-red-600' : 'text-slate-800'}`}>
                  {item.title}
                </Text>
              )}
              <MaterialIcons 
                name="chevron-right" 
                size={20} 
                color={item.isDestructive ? '#DC2626' : '#94A3B8'} 
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
