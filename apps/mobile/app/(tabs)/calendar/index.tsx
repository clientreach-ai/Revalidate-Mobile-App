import { View, Text, ScrollView, Pressable, Modal, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useThemeStore } from '@/features/theme/theme.store';
import { useCalendar } from '@/hooks/useCalendar';
import { CreateCalendarEvent, UpdateCalendarEvent } from '@/features/calendar/calendar.types';
import '../../global.css';
import { useRouter } from 'expo-router';

type EventType = 'all' | 'official' | 'personal';

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { events, isLoading, isRefreshing, refresh, createEvent, updateEvent } = useCalendar();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<EventType>('all');
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    date: selectedDate,
    startTime: '',
    endTime: '',
    type: 'official' as 'official' | 'personal',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Adjust to start from Monday (0 = Monday)
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days = [];

    // Previous month's days
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = adjustedStartingDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month's days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const formatDateLabel = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = date.getDay();
    const monthIndex = date.getMonth();
    const dayName = days[dayIndex] ?? 'Monday';
    const day = date.getDate();
    const monthName = monthNames[monthIndex] ?? 'January';
    return `${dayName.toUpperCase()}, ${day} ${monthName.toUpperCase()}`;
  };

  // Convert API events to local format and filter
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
      if (!isSameDay(event.date, selectedDate)) return false;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'official') return event.type === 'official';
      if (activeFilter === 'personal') return event.type === 'personal';
      return true;
    });

  // Load all events once on mount, then filter locally by month
  // This allows users to navigate to past/future months and see events
  useEffect(() => {
    // Only fetch all events on initial load (no date filters)
    if (events.length === 0 && !isLoading) {
      refresh(); // Load all events without date filters
    }
  }, []); // Only run once on mount

  const calendarDays = getDaysInMonth(currentDate);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!eventForm.title.trim()) {
      errors.title = 'Event title is required';
    }

    if (!eventForm.startTime.trim()) {
      errors.startTime = 'Start time is required';
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(eventForm.startTime)) {
      errors.startTime = 'Please enter time in HH:MM format';
    }

    if (!eventForm.endTime.trim()) {
      errors.endTime = 'End time is required';
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(eventForm.endTime)) {
      errors.endTime = 'Please enter time in HH:MM format';
    }

    if (eventForm.startTime && eventForm.endTime) {
      const startParts = eventForm.startTime.split(':');
      const endParts = eventForm.endTime.split(':');
      if (startParts.length === 2 && endParts.length === 2) {
        const startHourStr = startParts[0];
        const startMinStr = startParts[1];
        const endHourStr = endParts[0];
        const endMinStr = endParts[1];
        if (startHourStr && startMinStr && endHourStr && endMinStr) {
          const startHour = parseInt(startHourStr);
          const startMin = parseInt(startMinStr);
          const endHour = parseInt(endHourStr);
          const endMin = parseInt(endMinStr);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;

          if (endMinutes <= startMinutes) {
            errors.endTime = 'End time must be after start time';
          }
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEvent = async () => {
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        const dateStr = eventForm.date.toISOString().split('T')[0] as string;

        if (editingEventId) {
          const updateData: UpdateCalendarEvent = {
            type: eventForm.type,
            title: eventForm.title,
            description: eventForm.description || undefined,
            date: dateStr,
            startTime: eventForm.startTime || undefined,
            endTime: eventForm.endTime || undefined,
            location: eventForm.location || undefined,
          };
          await updateEvent(editingEventId, updateData);
        } else {
          const createData: CreateCalendarEvent = {
            type: eventForm.type,
            title: eventForm.title,
            description: eventForm.description || undefined,
            date: dateStr,
            startTime: eventForm.startTime || undefined,
            endTime: eventForm.endTime || undefined,
            location: eventForm.location || undefined,
          };
          await createEvent(createData);
        }

        setIsSubmitting(false);
        setShowAddEventModal(false);
        setEditingEventId(null);
        setFormErrors({});
        setEventForm({
          title: '',
          description: '',
          location: '',
          date: selectedDate,
          startTime: '',
          endTime: '',
          type: 'official',
        });
      } catch (error) {
        setIsSubmitting(false);
      }
    }
  };

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const onRefresh = async () => {
    // Refresh all events, not just current month
    await refresh(); // Load all events without date filters
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
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
        {/* Header */}
        <View className="px-6 py-4 flex-row justify-between items-center">
          <View>
            <Text className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
              Professional Calendar
            </Text>
            <Text className={`text-xs font-medium uppercase tracking-wider mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              UK Revalidation Tracker
            </Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <Pressable
              onPress={() => {
                setEditingEventId(null);
                setEventForm({
                  title: '',
                  description: '',
                  location: '',
                  date: selectedDate,
                  startTime: '',
                  endTime: '',
                  type: 'official',
                });
                setCurrentDate(selectedDate);
                setFormErrors({});
                setShowAddEventModal(true);
              }}
              className={`w-10 h-10 rounded-full shadow-sm items-center justify-center border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                }`}
            >
              <MaterialIcons name="add" size={24} color={isDark ? "#D4AF37" : "#2B5F9E"} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/notifications')}
              className={`relative w-10 h-10 rounded-full shadow-sm items-center justify-center border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                }`}
            >
              <MaterialIcons name="notifications" size={20} color="#2B5F9E" />
              {/* Notification Badge */}
              <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white items-center justify-center">
                <Text className="text-white text-[8px] font-bold" style={{ lineHeight: 10 }}>2</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Calendar Widget */}
        <View className="px-4 mb-4">
          <View className={`rounded-3xl p-5 shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
            }`}>
            {/* Month Navigation */}
            <View className="flex-row justify-between items-center mb-6 px-2">
              <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
              <View className="flex-row gap-1">
                <Pressable
                  onPress={() => navigateMonth('prev')}
                  className="p-1 rounded-lg"
                >
                  <MaterialIcons name="chevron-left" size={24} color="#64748B" />
                </Pressable>
                <Pressable
                  onPress={() => navigateMonth('next')}
                  className="p-1 rounded-lg"
                >
                  <MaterialIcons name="chevron-right" size={24} color="#64748B" />
                </Pressable>
              </View>
            </View>

            {/* Day Headers */}
            <View className="flex-row justify-between mb-4">
              {dayNames.map((day) => (
                <View key={day} className="flex-1 items-center">
                  <Text className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-gray-400" : "text-slate-400"
                    }`}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View className="flex-row flex-wrap">
              {calendarDays.map((day, index) => {
                const isSelected = isSameDay(day.date, selectedDate);
                const isCurrentMonth = day.isCurrentMonth;

                return (
                  <Pressable
                    key={index}
                    onPress={() => setSelectedDate(day.date)}
                    className="w-[14.28%] py-2 items-center justify-center"
                  >
                    <View className="relative items-center justify-center">
                      {isSelected ? (
                        <>
                          <View className="w-8 h-8 rounded-full border-2 border-[#2B5F9E] items-center justify-center">
                            <Text className="text-[#2B5F9E] font-bold text-sm">
                              {day.date.getDate()}
                            </Text>
                          </View>
                          <View className="absolute -bottom-1 w-1 h-1 bg-[#2B5F9E] rounded-full" />
                        </>
                      ) : (
                        <Text
                          className={`text-sm font-medium ${isCurrentMonth
                            ? (isDark ? 'text-white' : 'text-slate-800')
                            : (isDark ? 'text-gray-500' : 'text-slate-300')
                            }`}
                        >
                          {day.date.getDate()}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="px-6 mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            <Pressable
              onPress={() => setActiveFilter('all')}
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
              onPress={() => setActiveFilter('official')}
              className={`px-5 py-2.5 rounded-full ${activeFilter === 'official'
                ? 'bg-[#2B5F9E]'
                : isDark
                  ? 'bg-slate-800 border border-slate-700'
                  : 'bg-white border border-slate-100'
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
              onPress={() => setActiveFilter('personal')}
              className={`px-5 py-2.5 rounded-full ${activeFilter === 'personal'
                ? 'bg-[#2B5F9E]'
                : isDark
                  ? 'bg-slate-800 border border-slate-700'
                  : 'bg-white border border-slate-100'
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
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <View
                key={event.id}
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
              </View>
            ))
          ) : (
            <View className={`p-8 rounded-2xl border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
              }`}>
              <MaterialIcons name="event-busy" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
              <Text className={`mt-4 text-center ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                No events scheduled for this date
              </Text>
              <Pressable
                onPress={() => {
                  setEditingEventId(null);
                  setEventForm({
                    title: '',
                    description: '',
                    location: '',
                    date: selectedDate,
                    startTime: '',
                    endTime: '',
                    type: 'official',
                  });
                  setCurrentDate(selectedDate);
                  setFormErrors({});
                  setShowAddEventModal(true);
                }}
                className="mt-6 bg-[#2B5F9E] px-6 py-3 rounded-xl shadow-sm active:opacity-90"
              >
                <Text className="text-white font-bold">Add New Event</Text>
              </Pressable>
            </View>
          )}

          {/* All Events Card */}
          {!isLoading && events.length > 0 && (
            <View className="mt-4">
              <Pressable
                className={`p-5 rounded-2xl border shadow-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                  }`}
                onPress={() => {
                  router.push('/(tabs)/calendar/all-events');
                }}
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
                      {events.length} {events.length === 1 ? 'event' : 'events'} total
                    </Text>
                    <View className="flex-row items-center mt-3" style={{ gap: 12 }}>
                      <View className="flex-row items-center">
                        <View className="w-3 h-3 rounded-full bg-blue-500" />
                        <Text className={`text-xs ml-1.5 ${isDark ? "text-gray-400" : "text-slate-500"
                          }`}>
                          {events.filter(e => e.type === 'official').length} Official
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="w-3 h-3 rounded-full bg-amber-500" />
                        <Text className={`text-xs ml-1.5 ${isDark ? "text-gray-400" : "text-slate-500"
                          }`}>
                          {events.filter(e => e.type === 'personal').length} Personal
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
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        onPress={() => {
          setEditingEventId(null);
          setEventForm({
            title: '',
            description: '',
            location: '',
            date: selectedDate,
            startTime: '',
            endTime: '',
            type: 'official',
          });
          setCurrentDate(selectedDate);
          setFormErrors({});
          setShowAddEventModal(true);
        }}
        className="absolute right-6 w-14 h-14 bg-[#2B5F9E] rounded-full shadow-lg items-center justify-center active:opacity-80"
        style={{ bottom: 80 + insets.bottom }}
      >
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </Pressable>

      {/* Add Event Modal */}
      <Modal
        visible={showAddEventModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddEventModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`rounded-t-3xl max-h-[90%] flex-1 ${isDark ? "bg-slate-800" : "bg-white"
            }`}>
            <SafeAreaView edges={['bottom']} className="flex-1">
              {/* Header */}
              <View className={`flex-row items-center justify-between px-6 pt-4 pb-4 border-b ${isDark ? "border-slate-700" : "border-slate-100"
                }`}>
                <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  Add New Event
                </Text>
                <Pressable onPress={() => setShowAddEventModal(false)}>
                  <MaterialIcons name="close" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                </Pressable>
              </View>

              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="px-6 pt-6" style={{ gap: 20 }}>
                  {/* Event Title */}
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                      }`}>
                      Event Title *
                    </Text>
                    <TextInput
                      value={eventForm.title}
                      onChangeText={(text) => {
                        setEventForm({ ...eventForm, title: text });
                        if (formErrors.title) {
                          setFormErrors({ ...formErrors, title: '' });
                        }
                      }}
                      placeholder="Enter event title"
                      placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
                      className={`border rounded-2xl px-4 py-4 text-base ${isDark
                        ? "bg-slate-700 text-white border-slate-600"
                        : "bg-white text-slate-800 border-slate-200"
                        } ${formErrors.title ? 'border-red-500' : ''}`}
                    />
                    {formErrors.title && (
                      <Text className="text-red-500 text-xs mt-1">{formErrors.title}</Text>
                    )}
                  </View>

                  {/* Description */}
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                      }`}>
                      Description
                    </Text>
                    <TextInput
                      value={eventForm.description}
                      onChangeText={(text) => setEventForm({ ...eventForm, description: text })}
                      placeholder="Enter event description"
                      placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      className={`border rounded-2xl px-4 py-4 text-base min-h-[100px] ${isDark
                        ? "bg-slate-700 text-white border-slate-600"
                        : "bg-white text-slate-800 border-slate-200"
                        }`}
                    />
                  </View>

                  {/* Location */}
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                      }`}>
                      Location
                    </Text>
                    <View className="relative">
                      <View className="absolute inset-y-0 left-0 pl-4 items-center justify-center z-10">
                        <MaterialIcons name="location-on" size={20} color={isDark ? "#6B7280" : "#94A3B8"} />
                      </View>
                      <TextInput
                        value={eventForm.location}
                        onChangeText={(text) => setEventForm({ ...eventForm, location: text })}
                        placeholder="Enter location"
                        placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
                        className={`border rounded-2xl pl-12 pr-4 py-4 text-base ${isDark
                          ? "bg-slate-700 text-white border-slate-600"
                          : "bg-white text-slate-800 border-slate-200"
                          }`}
                      />
                    </View>
                  </View>

                  {/* Date Selection */}
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                      }`}>
                      Date
                    </Text>
                    <Pressable
                        onPress={() => {
                          setCurrentDate(eventForm.date);
                          setShowDatePicker(true);
                        }}
                      className={`border rounded-2xl px-4 py-4 flex-row items-center justify-between ${isDark
                        ? "bg-slate-700 border-slate-600 active:bg-slate-600"
                        : "bg-white border-slate-200 active:bg-slate-50"
                        }`}
                    >
                      <Text className={`text-base ${isDark ? "text-white" : "text-slate-800"}`}>
                        {eventForm.date.toLocaleDateString('en-GB', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </Text>
                      <MaterialIcons name="calendar-today" size={20} color={isDark ? "#6B7280" : "#94A3B8"} />
                    </Pressable>
                  </View>

                  {/* Time Selection */}
                  <View className="flex-row" style={{ gap: 12 }}>
                    <View className="flex-1">
                      <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                        }`}>
                        Start Time *
                      </Text>
                      <Pressable
                        onPress={() => setShowStartTimePicker(true)}
                        className={`border rounded-2xl pl-12 pr-4 py-4 flex-row items-center ${isDark
                          ? "bg-slate-700 border-slate-600"
                          : "bg-white border-slate-200"
                          } ${formErrors.startTime ? 'border-red-500' : ''}`}
                      >
                        <View className="absolute inset-y-0 left-0 pl-4 items-center justify-center z-10">
                          <MaterialIcons name="access-time" size={20} color={isDark ? "#6B7280" : "#94A3B8"} />
                        </View>
                        <Text className={`text-base ${eventForm.startTime
                          ? (isDark ? 'text-white' : 'text-slate-800')
                          : (isDark ? 'text-gray-500' : 'text-slate-400')
                          }`}>
                          {eventForm.startTime || '09:00'}
                        </Text>
                      </Pressable>
                      {formErrors.startTime && (
                        <Text className="text-red-500 text-xs mt-1">{formErrors.startTime}</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                        }`}>
                        End Time *
                      </Text>
                      <Pressable
                        onPress={() => setShowEndTimePicker(true)}
                        className={`border rounded-2xl pl-12 pr-4 py-4 flex-row items-center ${isDark
                          ? "bg-slate-700 border-slate-600"
                          : "bg-white border-slate-200"
                          } ${formErrors.endTime ? 'border-red-500' : ''}`}
                      >
                        <View className="absolute inset-y-0 left-0 pl-4 items-center justify-center z-10">
                          <MaterialIcons name="access-time" size={20} color={isDark ? "#6B7280" : "#94A3B8"} />
                        </View>
                        <Text className={`text-base ${eventForm.endTime
                          ? (isDark ? 'text-white' : 'text-slate-800')
                          : (isDark ? 'text-gray-500' : 'text-slate-400')
                          }`}>
                          {eventForm.endTime || '10:30'}
                        </Text>
                      </Pressable>
                      {formErrors.endTime && (
                        <Text className="text-red-500 text-xs mt-1">{formErrors.endTime}</Text>
                      )}
                    </View>
                  </View>

                  {/* Event Type */}
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                      }`}>
                      Event Type *
                    </Text>
                    <View className="flex-row" style={{ gap: 12 }}>
                      <Pressable
                        onPress={() => setEventForm({ ...eventForm, type: 'official' })}
                        className={`flex-1 py-4 rounded-2xl border-2 items-center ${eventForm.type === 'official'
                          ? 'bg-blue-50 border-[#2B5F9E]'
                          : isDark
                            ? 'bg-slate-700 border-slate-600'
                            : 'bg-white border-slate-200'
                          }`}
                      >
                        <MaterialIcons
                          name="business"
                          size={24}
                          color={eventForm.type === 'official' ? '#2B5F9E' : (isDark ? '#6B7280' : '#94A3B8')}
                        />
                        <Text className={`text-sm font-semibold mt-2 ${eventForm.type === 'official'
                          ? 'text-[#2B5F9E]'
                          : (isDark ? 'text-gray-300' : 'text-slate-600')
                          }`}>
                          Official CPD
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setEventForm({ ...eventForm, type: 'personal' })}
                        className={`flex-1 py-4 rounded-2xl border-2 items-center ${eventForm.type === 'personal'
                          ? 'bg-amber-50 border-amber-400'
                          : isDark
                            ? 'bg-slate-700 border-slate-600'
                            : 'bg-white border-slate-200'
                          }`}
                      >
                        <MaterialIcons
                          name="person"
                          size={24}
                          color={eventForm.type === 'personal' ? '#F59E0B' : (isDark ? '#6B7280' : '#94A3B8')}
                        />
                        <Text className={`text-sm font-semibold mt-2 ${eventForm.type === 'personal'
                          ? 'text-amber-600'
                          : (isDark ? 'text-gray-300' : 'text-slate-600')
                          }`}>
                          Personal
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Footer Actions */}
              <View className={`px-6 pt-4 pb-6 border-t flex-row ${isDark ? "border-slate-700" : "border-slate-100"
                }`} style={{ gap: 12 }}>
                <Pressable
                  onPress={() => setShowAddEventModal(false)}
                  className={`flex-1 py-4 rounded-2xl items-center ${isDark ? "bg-slate-700" : "bg-slate-100"
                    }`}
                >
                  <Text className={`font-semibold text-base ${isDark ? "text-gray-300" : "text-slate-700"
                    }`}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveEvent}
                  disabled={isSubmitting}
                  className={`flex-1 py-4 rounded-2xl items-center ${isSubmitting ? 'bg-[#2B5F9E]/50' : 'bg-[#2B5F9E]'
                    }`}
                >
                  {isSubmitting ? (
                    <Text className="text-white font-semibold text-base">Saving...</Text>
                  ) : (
                    <Text className="text-white font-semibold text-base">Save Event</Text>
                  )}
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowDatePicker(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className={`rounded-3xl p-6 w-[90%] max-w-sm ${isDark ? "bg-slate-800" : "bg-white"
              }`}
          >
            <Text className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-800"}`}>
              Select Date
            </Text>
            <View>
              <View className="flex-row justify-between items-center mb-4 px-2">
                <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </Text>
                <View className="flex-row gap-1">
                  <Pressable onPress={() => navigateMonth('prev')} className="p-1 rounded-lg">
                    <MaterialIcons name="chevron-left" size={20} color="#64748B" />
                  </Pressable>
                  <Pressable onPress={() => navigateMonth('next')} className="p-1 rounded-lg">
                    <MaterialIcons name="chevron-right" size={20} color="#64748B" />
                  </Pressable>
                </View>
              </View>

              <View className="flex-row justify-between mb-2">
                {dayNames.map((day) => (
                  <View key={day} className="flex-1 items-center">
                    <Text className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              <ScrollView className="max-h-64">
                <View className="flex-row flex-wrap">
                  {calendarDays.map((day, index) => {
                    const isSelected = isSameDay(day.date, eventForm.date);
                    const isCurrentMonth = day.isCurrentMonth;
                    return (
                      <Pressable
                        key={index}
                        onPress={() => {
                          setEventForm({ ...eventForm, date: day.date });
                          setSelectedDate(day.date);
                          setShowDatePicker(false);
                        }}
                        className="w-[14.28%] py-2 items-center justify-center"
                      >
                        <View className="relative items-center justify-center">
                          {isSelected ? (
                            <>
                              <View className="w-8 h-8 rounded-full border-2 border-[#2B5F9E] items-center justify-center">
                                <Text className="text-[#2B5F9E] font-bold text-sm">{day.date.getDate()}</Text>
                              </View>
                              <View className="absolute -bottom-1 w-1 h-1 bg-[#2B5F9E] rounded-full" />
                            </>
                          ) : (
                            <Text className={`text-sm font-medium ${isCurrentMonth
                              ? (isDark ? 'text-white' : 'text-slate-800')
                              : (isDark ? 'text-gray-500' : 'text-slate-300')
                              }`}>
                              {day.date.getDate()}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
            <Pressable
              onPress={() => setShowDatePicker(false)}
              className={`mt-4 py-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"
                }`}
            >
              <Text className={`text-center font-semibold ${isDark ? "text-gray-300" : "text-slate-700"
                }`}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Start Time Picker Modal */}
      <Modal
        visible={showStartTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStartTimePicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowStartTimePicker(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className={`rounded-3xl p-6 w-[90%] max-w-sm ${isDark ? "bg-slate-800" : "bg-white"
              }`}
          >
            <Text className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-800"}`}>
              Select Start Time
            </Text>
            <View className="flex-row justify-center mb-4" style={{ gap: 8 }}>
              <View className="flex-1">
                <Text className={`text-xs text-center mb-2 ${isDark ? "text-gray-400" : "text-slate-500"
                  }`}>
                  Hour
                </Text>
                <ScrollView className="max-h-32">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <Pressable
                      key={hour}
                      onPress={() => {
                        const currentMin = eventForm.startTime ? parseInt(eventForm.startTime.split(':')[1] || '0') : 0;
                        setEventForm({ ...eventForm, startTime: formatTime(hour, currentMin) });
                        if (formErrors.startTime) {
                          setFormErrors({ ...formErrors, startTime: '' });
                        }
                      }}
                      className={`py-2 rounded-lg mb-1 ${eventForm.startTime && parseInt(eventForm.startTime.split(':')[0] || '0') === hour
                        ? 'bg-[#2B5F9E]'
                        : (isDark ? 'bg-slate-700' : 'bg-slate-50')
                        }`}
                    >
                      <Text className={`text-center text-sm ${eventForm.startTime && parseInt(eventForm.startTime.split(':')[0] || '0') === hour
                        ? 'text-white font-bold'
                        : (isDark ? 'text-gray-300' : 'text-slate-700')
                        }`}>
                        {hour.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View className="flex-1">
                <Text className={`text-xs text-center mb-2 ${isDark ? "text-gray-400" : "text-slate-500"
                  }`}>
                  Minute
                </Text>
                <ScrollView className="max-h-32">
                  {[0, 15, 30, 45].map((minute) => (
                    <Pressable
                      key={minute}
                      onPress={() => {
                        const currentHour = eventForm.startTime ? parseInt(eventForm.startTime.split(':')[0] || '9') : 9;
                        setEventForm({ ...eventForm, startTime: formatTime(currentHour, minute) });
                        if (formErrors.startTime) {
                          setFormErrors({ ...formErrors, startTime: '' });
                        }
                      }}
                      className={`py-2 rounded-lg mb-1 ${eventForm.startTime && parseInt(eventForm.startTime.split(':')[1] || '0') === minute
                        ? 'bg-[#2B5F9E]'
                        : (isDark ? 'bg-slate-700' : 'bg-slate-50')
                        }`}
                    >
                      <Text className={`text-center text-sm ${eventForm.startTime && parseInt(eventForm.startTime.split(':')[1] || '0') === minute
                        ? 'text-white font-bold'
                        : (isDark ? 'text-gray-300' : 'text-slate-700')
                        }`}>
                        {minute.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View className="flex-row" style={{ gap: 12 }}>
              <Pressable
                onPress={() => setShowStartTimePicker(false)}
                className={`flex-1 py-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"
                  }`}
              >
                <Text className={`text-center font-semibold ${isDark ? "text-gray-300" : "text-slate-700"
                  }`}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowStartTimePicker(false)}
                className="flex-1 py-3 rounded-xl bg-[#2B5F9E]"
              >
                <Text className="text-center font-semibold text-white">Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* End Time Picker Modal */}
      <Modal
        visible={showEndTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEndTimePicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowEndTimePicker(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className={`rounded-3xl p-6 w-[90%] max-w-sm ${isDark ? "bg-slate-800" : "bg-white"
              }`}
          >
            <Text className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-800"}`}>
              Select End Time
            </Text>
            <View className="flex-row justify-center mb-4" style={{ gap: 8 }}>
              <View className="flex-1">
                <Text className={`text-xs text-center mb-2 ${isDark ? "text-gray-400" : "text-slate-500"
                  }`}>
                  Hour
                </Text>
                <ScrollView className="max-h-32">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const isSelected = (() => {
                      if (!eventForm.endTime) return false;
                      const parts = eventForm.endTime.split(':');
                      return parts[0] ? parseInt(parts[0]) === hour : false;
                    })();
                    return (
                      <Pressable
                        key={hour}
                        onPress={() => {
                          const currentMin = eventForm.endTime ? (() => {
                            const parts = eventForm.endTime.split(':');
                            return parts[1] ? parseInt(parts[1]) : 30;
                          })() : 30;
                          setEventForm({ ...eventForm, endTime: formatTime(hour, currentMin) });
                          if (formErrors.endTime) {
                            setFormErrors({ ...formErrors, endTime: '' });
                          }
                        }}
                        className={`py-2 rounded-lg mb-1 ${isSelected
                          ? 'bg-[#2B5F9E]'
                          : (isDark ? 'bg-slate-700' : 'bg-slate-50')
                          }`}
                      >
                        <Text className={`text-center text-sm ${isSelected
                          ? 'text-white font-bold'
                          : (isDark ? 'text-gray-300' : 'text-slate-700')
                          }`}>
                          {hour.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              <View className="flex-1">
                <Text className={`text-xs text-center mb-2 ${isDark ? "text-gray-400" : "text-slate-500"
                  }`}>
                  Minute
                </Text>
                <ScrollView className="max-h-32">
                  {[0, 15, 30, 45].map((minute) => {
                    const isSelected = (() => {
                      if (!eventForm.endTime) return false;
                      const parts = eventForm.endTime.split(':');
                      return parts[1] ? parseInt(parts[1]) === minute : false;
                    })();
                    return (
                      <Pressable
                        key={minute}
                        onPress={() => {
                          const currentHour = eventForm.endTime ? (() => {
                            const parts = eventForm.endTime.split(':');
                            return parts[0] ? parseInt(parts[0]) : 10;
                          })() : 10;
                          setEventForm({ ...eventForm, endTime: formatTime(currentHour, minute) });
                          if (formErrors.endTime) {
                            setFormErrors({ ...formErrors, endTime: '' });
                          }
                        }}
                        className={`py-2 rounded-lg mb-1 ${isSelected
                          ? 'bg-[#2B5F9E]'
                          : (isDark ? 'bg-slate-700' : 'bg-slate-50')
                          }`}
                      >
                        <Text className={`text-center text-sm ${isSelected
                          ? 'text-white font-bold'
                          : (isDark ? 'text-gray-300' : 'text-slate-700')
                          }`}>
                          {minute.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
            <View className="flex-row" style={{ gap: 12 }}>
              <Pressable
                onPress={() => setShowEndTimePicker(false)}
                className={`flex-1 py-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"
                  }`}
              >
                <Text className={`text-center font-semibold ${isDark ? "text-gray-300" : "text-slate-700"
                  }`}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowEndTimePicker(false)}
                className="flex-1 py-3 rounded-xl bg-[#2B5F9E]"
              >
                <Text className="text-center font-semibold text-white">Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView >
  );
}
