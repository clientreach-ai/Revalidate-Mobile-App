import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useThemeStore } from '@/features/theme/theme.store';
import { useCalendar } from '@/hooks/useCalendar';
import '../../global.css';

type EventType = 'all' | 'official' | 'personal';

export default function AllEventsScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const { events, isLoading, isRefreshing, refresh } = useCalendar();
  const [activeFilter, setActiveFilter] = useState<EventType>('all');

  const filteredEvents = events
    .map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      type: event.type,
      date: new Date(event.date),
    }))
    .filter((event) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'official') return event.type === 'official';
      if (activeFilter === 'personal') return event.type === 'personal';
      return true;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort by date

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const onRefresh = async () => {
    await refresh();
  };

  const headerBgColor = isDark ? "bg-background-dark" : "bg-background-light";
  const headerTextColor = isDark ? "text-white" : "text-slate-800";

  return (
    <SafeAreaView className={`flex-1 ${headerBgColor}`} edges={['top']}>
      {/* Header */}
      <View className={`flex-row items-center justify-between px-6 py-4 border-b ${
        isDark ? "border-slate-700" : "border-slate-200"
      }`}>
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-4"
          >
            <MaterialIcons 
              name="arrow-back" 
              size={24} 
              color={isDark ? "#FFFFFF" : "#1E293B"} 
            />
          </Pressable>
          <Text className={`text-xl font-bold ${headerTextColor}`}>
            All Events
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className={`flex-row px-6 py-3 border-b ${
        isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
      }`} style={{ gap: 8 }}>
        {(['all', 'official', 'personal'] as EventType[]).map((filter) => (
          <Pressable
            key={filter}
            onPress={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full ${
              activeFilter === filter
                ? isDark
                  ? 'bg-[#D4AF37]'
                  : 'bg-[#2B5F9E]'
                : isDark
                  ? 'bg-slate-700'
                  : 'bg-slate-100'
            }`}
          >
            <Text
              className={`text-sm font-semibold capitalize ${
                activeFilter === filter
                  ? 'text-white'
                  : isDark
                    ? 'text-gray-400'
                    : 'text-slate-600'
              }`}
            >
              {filter === 'all' ? 'All' : filter}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Events List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#D4AF37' : '#2B5F9E'}
            colors={['#D4AF37', '#2B5F9E']}
          />
        }
      >
        {isLoading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
            <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Loading events...
            </Text>
          </View>
        ) : filteredEvents.length > 0 ? (
          <View style={{ gap: 16 }}>
            {filteredEvents.map((event) => (
              <View
                key={event.id}
                className={`p-4 rounded-2xl border shadow-sm ${
                  isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                }`}
                style={{ gap: 16 }}
              >
                {/* Date Header */}
                <View className="flex-row items-center mb-2">
                  <MaterialIcons
                    name="calendar-today"
                    size={16}
                    color={isDark ? "#9CA3AF" : "#64748B"}
                  />
                  <Text className={`text-xs font-semibold ml-2 ${
                    isDark ? "text-gray-400" : "text-slate-500"
                  }`}>
                    {formatDate(event.date)}
                  </Text>
                </View>

                <View className="flex-row items-start" style={{ gap: 16 }}>
                  {/* Time Line */}
                  <View className="items-center">
                    <Text className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                      {event.startTime || 'N/A'}
                    </Text>
                    <View className={`w-px h-12 my-1 ${isDark ? "bg-slate-600" : "bg-slate-200"}`} />
                    <Text className={`text-xs ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                      {event.endTime || 'N/A'}
                    </Text>
                  </View>

                  {/* Event Details */}
                  <View className="flex-1">
                    <View className="flex-row justify-between items-start mb-1">
                      <Text className={`font-bold flex-1 ${isDark ? "text-white" : "text-slate-800"}`}>
                        {event.title}
                      </Text>
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          event.type === 'official'
                            ? 'bg-blue-100'
                            : 'bg-amber-100'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold uppercase tracking-tighter ${
                            event.type === 'official'
                              ? 'text-blue-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {event.type === 'official' ? 'Official' : 'Personal'}
                        </Text>
                      </View>
                    </View>
                    {event.description && (
                      <Text className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                        {event.description}
                      </Text>
                    )}
                    {event.location && (
                      <View className="flex-row items-center mt-3">
                        <MaterialIcons
                          name={event.type === 'official' ? 'location-on' : 'history-edu'}
                          size={16}
                          color={isDark ? "#6B7280" : "#94A3B8"}
                        />
                        <Text className={`text-xs ml-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                          {event.location}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className={`p-8 rounded-2xl border items-center ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
          }`}>
            <MaterialIcons name="event-busy" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
            <Text className={`mt-4 text-center ${isDark ? "text-gray-400" : "text-slate-400"}`}>
              No events found
            </Text>
            {activeFilter !== 'all' && (
              <Text className={`mt-2 text-center text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                Try changing the filter
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
