import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/features/theme/theme.store';
import '../../global.css';

export default function DashboardScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const [timer, setTimer] = useState({ hours: 1, minutes: 45, seconds: 22 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds += 1;
        
        if (seconds >= 60) {
          seconds = 0;
          minutes += 1;
        }
        if (minutes >= 60) {
          minutes = 0;
          hours += 1;
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  const stats = [
    {
      icon: 'schedule' as const,
      value: '450',
      label: 'Hours Completed',
      bgColor: 'bg-blue-50',
      iconColor: '#2B5F9E',
      route: '/(tabs)/workinghours',
    },
    {
      icon: 'payments' as const,
      value: '£3,420',
      label: 'Total Earnings',
      bgColor: 'bg-green-50',
      iconColor: '#10B981',
      route: '/(tabs)/earings',
    },
    {
      icon: 'school' as const,
      value: '35',
      label: 'CPD Hours',
      bgColor: 'bg-purple-50',
      iconColor: '#9333EA',
      route: '/(tabs)/cpdhourstracking',
    },
    {
      icon: 'description' as const,
      value: '5',
      label: 'Reflections',
      bgColor: 'bg-amber-50',
      iconColor: '#F59E0B',
      route: '/(tabs)/reflections',
    },
  ];

  const activities = [
    {
      icon: 'edit-note' as const,
      title: 'New Reflection Added',
      subtitle: "Case #4829 - Multi-disciplinary team",
      time: '2h ago',
      bgColor: 'bg-blue-50',
      iconColor: '#2B5F9E',
    },
    {
      icon: 'verified' as const,
      title: 'Shift Approved',
      subtitle: "Royal Victoria Hospital - 12h Shift",
      time: 'Yesterday',
      bgColor: 'bg-green-50',
      iconColor: '#10B981',
    },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section with Gradient */}
        <View className="px-6 pt-6 pb-20 rounded-b-[40px]" style={{ backgroundColor: '#2B5F9E' }}>
          <View className="flex-row justify-between items-center mb-4">
            {/* Profile Section */}
            <View className="flex-row items-center gap-3">
              <View className="relative">
                <View className="w-12 h-12 rounded-full bg-white/30 border-2 border-white/30 items-center justify-center">
                  <MaterialIcons name="person" size={24} color="#FFFFFF" />
                </View>
                <View className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-[#2B5F9E]" />
              </View>
              <View>
                <Text className="text-white/80 text-xs font-medium uppercase tracking-wider">
                  Good Morning
                </Text>
                <Text className="text-white text-xl font-bold">
                  Dr. Shahin Alam
                </Text>
              </View>
            </View>

            {/* Notification Button */}
            <Pressable 
              onPress={() => router.push('/(tabs)/notifications')}
              className="relative"
            >
              <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center border border-white/30">
                <MaterialIcons name="notifications-active" size={22} color="#FFFFFF" />
              </View>
              {/* Notification Badge */}
              <View className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-[#2B5F9E] items-center justify-center">
                <Text className="text-white text-[10px] font-bold" style={{ lineHeight: 12 }}>2</Text>
              </View>
            </Pressable>
          </View>

          {/* Revalidation Status */}
          <View className="flex-row justify-between items-center">
            <View className="bg-white/10 px-3 py-2 rounded-2xl items-center border border-white/20">
              <Text className="text-[10px] text-white/80 font-semibold uppercase">
                Revalidation
              </Text>
              <Text className="text-white font-bold">142 Days</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View className="flex-1 -mt-12 px-6 relative z-10" style={{ gap: 24 }}>
          {/* Active Clinical Session Card */}
          <View className={`p-5 rounded-3xl shadow-lg border ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
          }`}>
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <Text className={`text-sm font-semibold uppercase tracking-tight ${
                  isDark ? "text-gray-400" : "text-slate-500"
                }`}>
                  Active Clinical Session
                </Text>
              </View>
              <View className={`px-2 py-1 rounded-lg ${
                isDark ? "bg-slate-700" : "bg-slate-100"
              }`}>
                <Text className={`text-xs ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                  Started 08:30 AM
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-col">
                <Text className={`text-4xl font-mono font-bold tracking-tighter ${
                  isDark ? "text-white" : "text-slate-800"
                }`}>
                  {formatTime(timer.hours)}:{formatTime(timer.minutes)}:{formatTime(timer.seconds)}
                </Text>
                <Text className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                  St. Mary's General Ward
                </Text>
              </View>
              <Pressable className="bg-[#EF4444] px-6 py-3 rounded-2xl flex-row items-center gap-2 shadow-lg">
                <MaterialIcons name="stop" size={20} color="#FFFFFF" />
                <Text className="text-white font-bold">Stop</Text>
              </Pressable>
            </View>
          </View>

          {/* Stats Grid */}
          <View className="flex-row flex-wrap" style={{ gap: 16 }}>
            {stats.map((stat, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  if (stat.route) {
                    router.push(stat.route as any);
                  }
                }}
                className={`p-4 rounded-3xl border ${
                  isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                }`}
                style={{ width: '47%' }}
              >
                <View className={`w-10 h-10 ${stat.bgColor} rounded-2xl items-center justify-center mb-3`}>
                  <MaterialIcons name={stat.icon} size={24} color={stat.iconColor} />
                </View>
                <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  {stat.value}
                </Text>
                <Text className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  {stat.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Recent Activity Section */}
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                Recent Activity
              </Text>
              <Pressable>
                <Text className="text-[#2B5F9E] text-sm font-semibold">View All</Text>
              </Pressable>
            </View>
            <View style={{ gap: 12 }}>
              {activities.map((activity, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    if (activity.title === 'New Reflection Added') {
                      router.push('/(tabs)/reflections');
                    }
                  }}
                  className={`flex-row items-center gap-4 p-4 rounded-2xl border ${
                    isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-50"
                  }`}
                >
                  <View className={`${activity.bgColor} p-2.5 rounded-xl`}>
                    <MaterialIcons 
                      name={activity.icon} 
                      size={20} 
                      color={activity.iconColor} 
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-800"}`}>
                      {activity.title}
                    </Text>
                    <Text className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      {activity.subtitle}
                    </Text>
                  </View>
                  <Text className={`text-xs ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                    {activity.time}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
