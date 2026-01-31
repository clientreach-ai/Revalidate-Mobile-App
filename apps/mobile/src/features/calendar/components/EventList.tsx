import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { CalendarEvent } from '../calendar.types';
import { useRouter } from 'expo-router';

interface EventListProps {
    events: Array<any>;
    isLoading: boolean;
    selectedDate: Date;
    activeFilter: 'all' | 'official' | 'personal';
    isDark: boolean;
    onFilterChange: (filter: 'all' | 'official' | 'personal') => void;
    onAddEvent: () => void;
    onSeeAllPress: () => void;
    totalEventsCount: number;
    officialCount: number;
    personalCount: number;
}

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const formatDateLabel = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = date.getDay();
    const monthIndex = date.getMonth();
    const dayName = days[dayIndex] ?? 'Monday';
    const day = date.getDate();
    const monthName = monthNames[monthIndex] ?? 'January';
    return `${dayName.toUpperCase()}, ${day} ${monthName.toUpperCase()}`;
};

export const EventList: React.FC<EventListProps> = ({
    events,
    isLoading,
    selectedDate,
    activeFilter,
    isDark,
    onFilterChange,
    onAddEvent,
    onSeeAllPress,
    totalEventsCount,
    officialCount,
    personalCount,
}) => {
    const router = useRouter();

    return (
        <>
            {/* Filter Tabs */}
            <View className="px-6 mb-4">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12 }}
                >
                    <Pressable
                        onPress={() => onFilterChange('all')}
                        className={`px-5 py-2.5 rounded-full ${activeFilter === 'all'
                            ? 'bg-[#2B5F9E]'
                            : isDark
                                ? 'bg-slate-800 border border-slate-700'
                                : 'bg-white border border-slate-100'
                            }`}
                    >
                        <Text
                            className={`text-sm font-semibold ${activeFilter === 'all' ? 'text-white' : (isDark ? 'text-gray-300' : 'text-slate-600')
                                }`}
                        >
                            All Events
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => onFilterChange('official')}
                        className={`px-5 py-2.5 rounded-full ${activeFilter === 'official'
                            ? 'bg-[#2B5F9E]'
                            : isDark
                                ? 'bg-slate-800 border border-slate-700'
                                : 'bg-white border-slate-100'
                            }`}
                    >
                        <Text
                            className={`text-sm font-semibold ${activeFilter === 'official' ? 'text-white' : (isDark ? 'text-gray-300' : 'text-slate-600')
                                }`}
                        >
                            Official CPD
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => onFilterChange('personal')}
                        className={`px-5 py-2.5 rounded-full ${activeFilter === 'personal'
                            ? 'bg-[#2B5F9E]'
                            : isDark
                                ? 'bg-slate-800 border border-slate-700'
                                : 'bg-white border-slate-100'
                            }`}
                    >
                        <Text
                            className={`text-sm font-semibold ${activeFilter === 'personal' ? 'text-white' : (isDark ? 'text-gray-300' : 'text-slate-600')
                                }`}
                        >
                            Personal Development
                        </Text>
                    </Pressable>
                </ScrollView>
            </View>

            {/* Events List */}
            <View className="flex-1 px-6" style={{ gap: 16 }}>
                <Text className={`text-xs font-bold uppercase tracking-widest mt-2 ${isDark ? "text-gray-400" : "text-slate-400"
                    }`}>
                    {formatDateLabel(selectedDate)}
                </Text>

                {isLoading ? (
                    <View className="items-center justify-center py-8">
                        <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
                    </View>
                ) : events.length > 0 ? (
                    events.map((event) => (
                        <Pressable
                            key={event.id}
                            onPress={() => router.push({ pathname: '/calendar/[id]', params: { id: String(event.id), from: '/calendar' } })}
                            className={`p-4 rounded-2xl border shadow-sm flex-row items-start ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                                }`}
                            style={{ gap: 16 }}
                        >
                            {/* Time Line */}
                            <View className="items-center">
                                <Text className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                                    {event.startTime}
                                </Text>
                                <View className={`w-px h-12 my-1 ${isDark ? "bg-slate-600" : "bg-slate-200"}`} />
                                <Text className={`text-xs ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                                    {event.endTime}
                                </Text>
                            </View>

                            {/* Event Details */}
                            <View className="flex-1">
                                <View className="flex-row justify-between items-start mb-1">
                                    <Text className={`font-bold flex-1 ${isDark ? "text-white" : "text-slate-800"}`}>
                                        {event.title}
                                    </Text>
                                    <View
                                        className={`px-2 py-0.5 rounded-full ${event.type === 'official'
                                            ? 'bg-blue-100'
                                            : 'bg-amber-100'
                                            }`}
                                    >
                                        <Text
                                            className={`text-[10px] font-bold uppercase tracking-tighter ${event.type === 'official'
                                                ? 'text-blue-600'
                                                : 'text-amber-600'
                                                }`}
                                        >
                                            {event.type === 'official' ? 'Official' : 'Personal'}
                                        </Text>
                                    </View>
                                </View>
                                <Text className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                    {event.description}
                                </Text>
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
                            </View>
                        </Pressable>
                    ))
                ) : (
                    <View className={`p-8 rounded-2xl border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                        }`}>
                        <MaterialIcons name="event-busy" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
                        <Text className={`mt-4 text-center ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                            No events scheduled for this date
                        </Text>
                        <Pressable
                            onPress={onAddEvent}
                            className="mt-6 bg-[#2B5F9E] px-6 py-3 rounded-xl shadow-sm active:opacity-90"
                        >
                            <Text className="text-white font-bold">Add New Event</Text>
                        </Pressable>
                    </View>
                )}

                {/* All Events Card */}
                {!isLoading && totalEventsCount > 0 && (
                    <View className="mt-4">
                        <Pressable
                            className={`p-5 rounded-2xl border shadow-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                                }`}
                            onPress={onSeeAllPress}
                        >
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <View className="flex-row items-center mb-2">
                                        <MaterialIcons
                                            name="event-note"
                                            size={24}
                                            color={isDark ? "#D4AF37" : "#2B5F9E"}
                                        />
                                        <Text className={`ml-2 text-lg font-bold ${isDark ? "text-white" : "text-slate-800"
                                            }`}>
                                            All Events
                                        </Text>
                                    </View>
                                    <Text className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"
                                        }`}>
                                        {totalEventsCount} {totalEventsCount === 1 ? 'event' : 'events'} total
                                    </Text>
                                    <View className="flex-row items-center mt-3" style={{ gap: 12 }}>
                                        <View className="flex-row items-center">
                                            <View className="w-3 h-3 rounded-full bg-blue-500" />
                                            <Text className={`text-xs ml-1.5 ${isDark ? "text-gray-400" : "text-slate-500"
                                                }`}>
                                                {officialCount} Official
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            <View className="w-3 h-3 rounded-full bg-amber-500" />
                                            <Text className={`text-xs ml-1.5 ${isDark ? "text-gray-400" : "text-slate-500"
                                                }`}>
                                                {personalCount} Personal
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View className="items-center">
                                    <MaterialIcons
                                        name="chevron-right"
                                        size={24}
                                        color={isDark ? "#9CA3AF" : "#64748B"}
                                    />
                                    <Text className={`text-xs mt-1 font-medium ${isDark ? "text-gray-400" : "text-slate-500"
                                        }`}>
                                        See all
                                    </Text>
                                </View>
                            </View>
                        </Pressable>
                    </View>
                )}
            </View>
        </>
    );
};
