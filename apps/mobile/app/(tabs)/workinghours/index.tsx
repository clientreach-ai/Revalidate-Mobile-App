import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import '../../global.css';

interface WorkSession {
  id: string;
  date: Date;
  location: string;
  shiftType: string;
  hours: number;
  earnings: string;
  description?: string;
}

interface MonthGroup {
  month: string;
  year: number;
  sessions: WorkSession[];
}

export default function WorkingHoursScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<'all' | '3months' | 'revalidation'>('all');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const sessions: WorkSession[] = [
    {
      id: '1',
      date: new Date(2023, 7, 24), // August 24, 2023
      location: "St Mary's Hospital",
      shiftType: 'A&E Night Shift',
      hours: 12.0,
      earnings: '£420.00',
      description: 'Busy shift, managed 4 trauma admissions...',
    },
    {
      id: '2',
      date: new Date(2023, 7, 22), // August 22, 2023
      location: 'GP Surgery Locum',
      shiftType: 'Clinic Day',
      hours: 8.5,
      earnings: '£350.00',
      description: 'Routine follow-ups and 2 urgent same-day...',
    },
    {
      id: '3',
      date: new Date(2023, 6, 28), // July 28, 2023
      location: 'West End Medical',
      shiftType: 'Full Shift',
      hours: 10.0,
      earnings: '£560.00',
    },
  ];

  // Group sessions by month
  const groupedSessions: MonthGroup[] = sessions.reduce((acc: MonthGroup[], session) => {
    const monthIndex = session.date.getMonth();
    const month = monthNames[monthIndex] || 'Unknown';
    const year = session.date.getFullYear();
    
    const existingGroup = acc.find(g => g.month === month && g.year === year);
    if (existingGroup) {
      existingGroup.sessions.push(session);
    } else {
      acc.push({ month, year, sessions: [session] });
    }
    
    return acc;
  }, []);

  // Sort groups by date (newest first)
  groupedSessions.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    const aIndex = monthNames.indexOf(a.month);
    const bIndex = monthNames.indexOf(b.month);
    if (aIndex === -1 || bIndex === -1) return 0;
    return bIndex - aIndex;
  });

  // Sort sessions within each group (newest first)
  groupedSessions.forEach(group => {
    group.sessions.sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  const formatDateBadge = (date: Date) => {
    const monthIndex = date.getMonth();
    const month = monthNames[monthIndex] || 'Unknown';
    const monthShort = month.substring(0, 3).toUpperCase();
    const day = date.getDate();
    return { month: monthShort, day };
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-4 py-4 mb-2">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold tracking-tight text-slate-800">
                Work History
              </Text>
              <Text className="text-slate-500 text-sm mt-0.5">
                Track your clinical hours
              </Text>
            </View>
            <Pressable 
              onPress={() => router.push('/(tabs)/gallery')}
              className="w-10 h-10 items-center justify-center rounded-full bg-slate-100"
            >
              <MaterialIcons name="photo-library" size={20} color="#64748B" />
            </Pressable>
          </View>
        </View>

        {/* This Month Summary Card */}
        <View className="px-4 mb-6">
          <View className="bg-[#1E61EB] p-6 rounded-3xl shadow-lg relative overflow-hidden">
            <View className="relative z-10">
              <View className="flex-row justify-between items-start mb-4">
                <Text className="text-white/80 text-sm font-medium uppercase tracking-wider">
                  This Month Summary
                </Text>
                <View className="bg-white/20 px-3 py-1 rounded-full">
                  <Text className="text-white text-xs">Aug 2023</Text>
                </View>
              </View>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-2xl font-bold text-white">142</Text>
                  <Text className="text-white/70 text-[10px] font-semibold uppercase mt-1">
                    Total Hours
                  </Text>
                </View>
                <View>
                  <Text className="text-2xl font-bold text-white">£4,850</Text>
                  <Text className="text-white/70 text-[10px] font-semibold uppercase mt-1">
                    Earnings
                  </Text>
                </View>
                <View>
                  <Text className="text-2xl font-bold text-white">18</Text>
                  <Text className="text-white/70 text-[10px] font-semibold uppercase mt-1">
                    Sessions
                  </Text>
                </View>
              </View>
            </View>
            <View className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
          </View>
        </View>

        {/* Filter Buttons */}
        <View className="px-4 mb-6">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <Pressable
              onPress={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-full ${
                activeFilter === 'all' ? 'bg-[#1E61EB]' : 'bg-white border border-slate-200'
              }`}
            >
              <Text className={`text-sm font-medium ${
                activeFilter === 'all' ? 'text-white' : 'text-slate-600'
              }`}>
                All Sessions
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('3months')}
              className={`px-4 py-2 rounded-full ${
                activeFilter === '3months' ? 'bg-[#1E61EB]' : 'bg-white border border-slate-200'
              }`}
            >
              <Text className={`text-sm font-medium ${
                activeFilter === '3months' ? 'text-white' : 'text-slate-600'
              }`}>
                Last 3 Months
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('revalidation')}
              className={`px-4 py-2 rounded-full ${
                activeFilter === 'revalidation' ? 'bg-[#1E61EB]' : 'bg-white border border-slate-200'
              }`}
            >
              <Text className={`text-sm font-medium ${
                activeFilter === 'revalidation' ? 'text-white' : 'text-slate-600'
              }`}>
                Revalidation Cycle
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Work Sessions List */}
        <View className="px-4" style={{ gap: 24 }}>
          {groupedSessions.map((group) => (
            <View key={`${group.month}-${group.year}`}>
              <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                {group.month.toUpperCase()} {group.year}
              </Text>
              <View style={{ gap: 12 }}>
                {group.sessions.map((session) => {
                  const dateBadge = formatDateBadge(session.date);
                  const isCurrentMonth = group.month === 'August' && group.year === 2023;
                  
                  return (
                    <Pressable
                      key={session.id}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-row items-center"
                    >
                      {/* Date Badge */}
                      <View className={`w-12 h-12 rounded-xl flex-col items-center justify-center mr-4 ${
                        isCurrentMonth ? 'bg-blue-50' : 'bg-slate-50'
                      }`}>
                        <Text className={`text-[10px] font-bold uppercase ${
                          isCurrentMonth ? 'text-[#1E61EB]' : 'text-slate-400'
                        }`}>
                          {dateBadge.month}
                        </Text>
                        <Text className={`text-lg font-bold leading-none ${
                          isCurrentMonth ? 'text-[#1E61EB]' : 'text-slate-400'
                        }`}>
                          {dateBadge.day}
                        </Text>
                      </View>

                      {/* Session Details */}
                      <View className="flex-1">
                        <View className="flex-row justify-between items-start mb-1">
                          <Text className="font-semibold text-slate-800 flex-1">
                            {session.location}
                          </Text>
                          <Text className={`text-sm font-bold ${
                            isCurrentMonth ? 'text-[#1E61EB]' : 'text-slate-500'
                          }`}>
                            {session.earnings}
                          </Text>
                        </View>
                        <Text className="text-xs text-slate-500 mb-1">
                          {session.shiftType} • {session.hours} hours
                        </Text>
                        {session.description && (
                          <Text className="text-xs text-slate-400 italic" numberOfLines={1}>
                            "{session.description}"
                          </Text>
                        )}
                      </View>

                      {/* Chevron */}
                      <View className="ml-2">
                        <MaterialIcons name="chevron-right" size={20} color="#CBD5E1" />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View 
        className="absolute right-6 items-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <Pressable 
          onPress={() => router.push('/(tabs)/gallery')}
          className="w-14 h-14 bg-[#1E61EB] rounded-full shadow-2xl items-center justify-center"
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
