import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import Svg, { Circle } from 'react-native-svg';
import '../../global.css';

interface CPDActivity {
  id: string;
  title: string;
  date: string;
  hours: number;
  type: 'participatory' | 'non-participatory';
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  hasCertificate?: boolean;
}

export default function CPDHoursTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<'all' | 'participatory' | 'non-participatory'>('all');

  // CPD Data
  const totalHours = 35;
  const targetHours = 35;
  const participatoryHours = 20.5;
  const nonParticipatoryHours = 14.5;
  const progress = (totalHours / targetHours) * 100;

  // Calculate circle progress
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Activities data
  const allActivities: CPDActivity[] = [
    {
      id: '1',
      title: 'Advanced Clinical Assessment',
      date: 'Oct 24, 2023',
      hours: 7.5,
      type: 'participatory',
      icon: 'school',
      iconBgColor: 'bg-blue-100',
      iconColor: '#2563EB',
      hasCertificate: true,
    },
    {
      id: '2',
      title: 'BMJ Journal Reflection',
      date: 'Oct 12, 2023',
      hours: 2,
      type: 'non-participatory',
      icon: 'menu-book',
      iconBgColor: 'bg-amber-100',
      iconColor: '#F59E0B',
    },
    {
      id: '3',
      title: 'Regional Multidisciplinary Meeting',
      date: 'Sep 28, 2023',
      hours: 4.5,
      type: 'participatory',
      icon: 'groups',
      iconBgColor: 'bg-purple-100',
      iconColor: '#9333EA',
      hasCertificate: true,
    },
  ];

  // Filter activities based on active filter
  const getFilteredActivities = () => {
    if (activeFilter === 'all') {
      return allActivities;
    }
    return allActivities.filter((activity) => activity.type === activeFilter);
  };

  const filteredActivities = getFilteredActivities();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-2xl font-bold tracking-tight text-slate-800">
              CPD Portfolio
            </Text>
            <Pressable 
              onPress={() => router.push('/(tabs)/gallery')}
              className="w-10 h-10 rounded-full bg-white shadow-sm items-center justify-center border border-slate-200"
            >
              <MaterialIcons name="photo-library" size={20} color="#64748B" />
            </Pressable>
          </View>
          <Text className="text-slate-500 text-sm">
            Professional Revalidation 2024
          </Text>
        </View>

        {/* CPD Summary Card */}
        <View className="px-6 mb-6">
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 items-center">
            {/* Circular Progress */}
            <View className="relative items-center justify-center mb-6">
              <Svg width={192} height={192} viewBox="0 0 192 192">
                {/* Background Circle */}
                <Circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Progress Circle */}
                <Circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke="#2563EB"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 96 96)`}
                />
              </Svg>
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-4xl font-bold text-slate-800">
                  {totalHours} / {targetHours}
                </Text>
                <Text className="text-sm font-medium text-slate-500 mt-1">
                  Total Hours
                </Text>
                {progress >= 100 && (
                  <View className="mt-2 px-3 py-1 bg-green-100 rounded-full">
                    <Text className="text-green-600 text-[10px] font-bold uppercase tracking-wider">
                      Target Met
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Breakdown Cards */}
            <View className="w-full flex-row" style={{ gap: 16 }}>
              {/* Participatory Hours */}
              <View className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <View className="flex-row items-center mb-1" style={{ gap: 8 }}>
                  <View className="w-2 h-2 rounded-full bg-[#2563EB]" />
                  <Text className="text-xs font-semibold text-slate-500 uppercase">
                    Participatory
                  </Text>
                </View>
                <Text className="text-lg font-bold text-slate-800">
                  {participatoryHours} hrs
                </Text>
                <Text className="text-[10px] text-slate-400 mt-1">
                  Min 20 required
                </Text>
              </View>

              {/* Non-Participatory Hours */}
              <View className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <View className="flex-row items-center mb-1" style={{ gap: 8 }}>
                  <View className="w-2 h-2 rounded-full bg-slate-300" />
                  <Text className="text-xs font-semibold text-slate-500 uppercase">
                    Non-Part.
                  </Text>
                </View>
                <Text className="text-lg font-bold text-slate-800">
                  {nonParticipatoryHours} hrs
                </Text>
                <Text className="text-[10px] text-slate-400 mt-1">
                  Flexible allocation
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="px-6 mb-6">
          <View className="flex-row p-1 bg-slate-200/50 rounded-xl" style={{ gap: 4 }}>
            <Pressable
              onPress={() => setActiveFilter('all')}
              className={`flex-1 py-2 rounded-lg ${
                activeFilter === 'all' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text className={`text-sm text-center ${
                activeFilter === 'all' ? 'font-semibold text-[#2563EB]' : 'font-medium text-slate-500'
              }`}>
                All
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('participatory')}
              className={`flex-1 py-2 rounded-lg ${
                activeFilter === 'participatory' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text className={`text-sm text-center ${
                activeFilter === 'participatory' ? 'font-semibold text-[#2563EB]' : 'font-medium text-slate-500'
              }`}>
                Participatory
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('non-participatory')}
              className={`flex-1 py-2 rounded-lg ${
                activeFilter === 'non-participatory' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text className={`text-sm text-center ${
                activeFilter === 'non-participatory' ? 'font-semibold text-[#2563EB]' : 'font-medium text-slate-500'
              }`}>
                Non-Part.
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Activities Section */}
        <View className="px-6" style={{ gap: 16 }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-800">Activities</Text>
            {filteredActivities.length > 0 && (
              <Pressable onPress={() => setActiveFilter('all')}>
                <Text className="text-[#2563EB] text-sm font-semibold">View All</Text>
              </Pressable>
            )}
          </View>

          <View style={{ gap: 12 }}>
            {filteredActivities.length > 0 ? (
              filteredActivities.map((activity) => (
                <Pressable
                  key={activity.id}
                  onPress={() => {
                    // Navigate to activity details or edit screen
                    // For now, we'll keep it as a placeholder
                    console.log('View activity:', activity.id);
                  }}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-row items-center active:bg-slate-50"
                  style={{ gap: 16 }}
                >
                  <View className={`w-12 h-12 rounded-xl ${activity.iconBgColor} items-center justify-center flex-shrink-0`}>
                    <MaterialIcons 
                      name={activity.icon} 
                      size={24} 
                      color={activity.iconColor} 
                    />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-bold text-sm text-slate-800" numberOfLines={1}>
                      {activity.title}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      {activity.date} • {activity.hours} Hours
                    </Text>
                    <View className="flex-row mt-2" style={{ gap: 8 }}>
                      <View className="px-2 py-0.5 rounded-md bg-slate-100">
                        <Text className="text-[10px] font-semibold text-slate-600">
                          {activity.type === 'participatory' ? 'Participatory' : 'Non-Participatory'}
                        </Text>
                      </View>
                      {activity.hasCertificate && (
                        <View className="flex-row items-center px-2 py-0.5 rounded-md bg-blue-50" style={{ gap: 4 }}>
                          <MaterialIcons name="description" size={14} color="#2563EB" />
                          <Text className="text-[10px] font-semibold text-[#2563EB]">
                            Certificate
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View className="bg-white p-8 rounded-2xl border border-slate-100 items-center">
                <MaterialIcons name="inbox" size={48} color="#CBD5E1" />
                <Text className="text-slate-400 mt-4 text-center">
                  No {activeFilter === 'all' ? '' : activeFilter === 'participatory' ? 'participatory' : 'non-participatory'} activities found
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View 
        className="absolute right-6 items-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <Pressable
          onPress={() => {
            // Add new CPD activity
            // This could open a modal or navigate to an add activity screen
            console.log('Addi new CPD activity');
          }}
          className="w-14 h-14 bg-[#2563EB] rounded-full shadow-lg items-center justify-center active:opacity-80"
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
