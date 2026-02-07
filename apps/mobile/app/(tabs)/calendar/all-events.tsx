import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import { useCalendar } from '@/hooks/useCalendar';
import { searchUsers } from '@/features/users/users.api';
import { CreateCalendarEvent } from '@/features/calendar/calendar.types';
import '../../global.css';

type EventType = 'all' | 'official' | 'personal';

export default function AllEventsScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();
  const {
    events,
    isLoading,
    isRefreshing,
    refresh,
    createEvent,
    updateEvent,
    inviteAttendees,
  } = useCalendar();
  const [activeFilter, setActiveFilter] = useState<EventType>('all');

  // Refresh when screen comes into focus
  const hasRefreshedOnFocus = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasRefreshedOnFocus.current) {
        refresh();
      } else {
        hasRefreshedOnFocus.current = true;
      }
    }, [refresh])
  );

  // Modal State
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    date: new Date(),
    startTime: '',
    endTime: '',
    type: 'official' as 'official' | 'personal',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<
    Array<{ id: string; name?: string; email?: string }>
  >([]);

  // Debounced live search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchUsers(searchQuery, 10, 0);
        if (!cancelled) {
          setSearchResults(res.data || []);
        }
      } catch (e) {
        console.error('User search failed', e);
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Helper for date picker
  const getDaysInMonthForPicker = () => {
    const today = new Date();
    const days = [];
    const year = today.getFullYear();
    const month = today.getMonth();
    // Show 3 months of days for simple selection
    for (let m = -1; m <= 1; m++) {
      const lastDay = new Date(year, month + m + 1, 0).getDate();
      for (let i = 1; i <= lastDay; i++) {
        days.push({
          date: new Date(year, month + m, i),
          isCurrentMonth: true,
        });
      }
    }
    return days;
  };

  const calendarDays = getDaysInMonthForPicker();

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const filteredEvents = events
    .map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      type: event.type,
      date: new Date(event.date),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }))
    .filter((event) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'official') return event.type === 'official';
      if (activeFilter === 'personal') return event.type === 'personal';
      return true;
    })
    .sort((a, b) => {
      // Sort by created date descending (newest created first)
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (createdA !== createdB) return createdB - createdA;

      // Fallback to event date descending
      const dateDiff = b.date.getTime() - a.date.getTime();
      if (dateDiff !== 0) return dateDiff;

      // If dates are same, sort by startTime descending
      const timeA = a.startTime || '';
      const timeB = b.startTime || '';
      return timeB.localeCompare(timeA);
    }); // recent first

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const onRefresh = async () => {
    await refresh();
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!eventForm.title.trim()) errors.title = 'Title is required';
    if (!eventForm.startTime.trim()) errors.startTime = 'Start time required';
    if (!eventForm.endTime.trim()) errors.endTime = 'End time required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEvent = async () => {
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        const dateStr = eventForm.date.toISOString().split('T')[0] as string;
        const data: CreateCalendarEvent = {
          type: eventForm.type,
          title: eventForm.title,
          description: eventForm.description || undefined,
          date: dateStr,
          startTime: eventForm.startTime || '09:00',
          endTime: eventForm.endTime || '10:00',
          location: eventForm.location || undefined,
        };

        if (editingEventId) {
          await updateEvent(editingEventId, data);
        } else {
          const created = await createEvent(data);
          // If users selected, invite them after event creation
          if (selectedUsers && selectedUsers.length > 0) {
            try {
              const attendees = selectedUsers.map((u) => ({ userId: u.id }));
              await inviteAttendees(created.id, attendees);
            } catch (e) {
              console.error('Failed to send invites:', e);
            }
          }
        }

        setShowAddEventModal(false);
        setEditingEventId(null);
        setEventForm({
          title: '',
          description: '',
          location: '',
          date: new Date(),
          startTime: '',
          endTime: '',
          type: 'official',
        });
      } catch (error) {
        console.error('Save event failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const headerBgColor = isDark ? 'bg-background-dark' : 'bg-background-light';
  const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';

  return (
    <SafeAreaView className={`flex-1 ${headerBgColor}`} edges={['top']}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-slate-700' : 'border-slate-200'
        }`}
      >
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-4">
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={isDark ? '#FFFFFF' : '#1E293B'}
            />
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            setEditingEventId(null);
            setEventForm({
              title: '',
              description: '',
              location: '',
              date: new Date(),
              startTime: '',
              endTime: '',
              type: 'official',
            });
            setFormErrors({});
            setShowAddEventModal(true);
          }}
          className={`w-10 h-10 rounded-full shadow-sm items-center justify-center border ${
            isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-slate-100'
          }`}
        >
          <MaterialIcons
            name="add"
            size={24}
            color={isDark ? accentColor : '#2B5F9E'}
          />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View
        className={`flex-row mx-6 mt-2 mb-3 p-2 rounded-2xl shadow-sm ${
          isDark
            ? 'bg-slate-800/80 border border-slate-700/60'
            : 'bg-white border border-slate-100'
        }`}
        style={{ gap: 8 }}
      >
        {(['all', 'official', 'personal'] as EventType[]).map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full border ${
                isActive
                  ? isPremium
                    ? 'border-transparent'
                    : 'bg-[#2B5F9E] border-transparent'
                  : isDark
                    ? 'bg-slate-700/60 border-slate-600/50'
                    : 'bg-slate-100 border-slate-200'
              }`}
              style={
                isPremium
                  ? isActive
                    ? { backgroundColor: accentColor, borderColor: accentColor }
                    : {
                        backgroundColor: isDark
                          ? 'rgba(212, 175, 55, 0.12)'
                          : 'rgba(212, 175, 55, 0.08)',
                        borderWidth: 1,
                        borderColor: 'rgba(212, 175, 55, 0.45)',
                      }
                  : undefined
              }
            >
              <Text
                className={`text-sm font-semibold capitalize ${
                  isActive
                    ? 'text-white'
                    : isDark
                      ? 'text-gray-400'
                      : 'text-slate-600'
                }`}
                style={
                  isPremium && !isActive ? { color: '#D4AF37' } : undefined
                }
              >
                {filter === 'all' ? 'All' : filter}
              </Text>
            </Pressable>
          );
        })}
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
            tintColor={isDark ? accentColor : '#2B5F9E'}
            colors={[accentColor, '#2B5F9E']}
          />
        }
      >
        {isLoading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color={accentColor} />
            <Text
              className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
            >
              Loading events...
            </Text>
          </View>
        ) : filteredEvents.length > 0 ? (
          <View style={{ gap: 16 }}>
            {filteredEvents.map((event) => (
              <Pressable
                key={event.id}
                onPress={() =>
                  router.push({
                    pathname: '/calendar/[id]',
                    params: { id: String(event.id) },
                  })
                }
                className={`p-4 rounded-2xl border shadow-sm ${
                  isDark
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-white border-slate-100'
                }`}
                style={{ gap: 16 }}
              >
                {/* Date Header */}
                <View className="flex-row items-center mb-2">
                  <MaterialIcons
                    name="calendar-today"
                    size={16}
                    color={isDark ? '#9CA3AF' : '#64748B'}
                  />
                  <Text
                    className={`text-xs font-semibold ml-2 ${
                      isDark ? 'text-gray-400' : 'text-slate-500'
                    }`}
                  >
                    {formatDate(event.date)}
                  </Text>
                </View>

                <View className="flex-row items-start" style={{ gap: 16 }}>
                  {/* Time Line */}
                  <View className="items-center">
                    <Text
                      className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}
                    >
                      {event.startTime || 'N/A'}
                    </Text>
                    <View
                      className={`w-px h-12 my-1 ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}
                    />
                    <Text
                      className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-400'}`}
                    >
                      {event.endTime || 'N/A'}
                    </Text>
                  </View>

                  {/* Event Details */}
                  <View className="flex-1">
                    <View className="flex-row justify-between items-start mb-1">
                      <Text
                        className={`font-bold flex-1 ${isDark ? 'text-white' : 'text-slate-800'}`}
                      >
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
                      <Text
                        className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                      >
                        {event.description}
                      </Text>
                    )}
                    {event.location && (
                      <View className="flex-row items-center mt-3">
                        <MaterialIcons
                          name={
                            event.type === 'official'
                              ? 'location-on'
                              : 'history-edu'
                          }
                          size={16}
                          color={isDark ? '#6B7280' : '#94A3B8'}
                        />
                        <Text
                          className={`text-xs ml-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}
                        >
                          {event.location}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View
            className={`p-8 rounded-2xl border items-center ${
              isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-white border-slate-100'
            }`}
          >
            <MaterialIcons
              name="event-busy"
              size={48}
              color={isDark ? '#4B5563' : '#CBD5E1'}
            />
            <Text
              className={`mt-4 text-center ${isDark ? 'text-gray-400' : 'text-slate-400'}`}
            >
              No events found
            </Text>
            <Pressable
              onPress={() => {
                setEditingEventId(null);
                setEventForm({
                  title: '',
                  description: '',
                  location: '',
                  date: new Date(),
                  startTime: '',
                  endTime: '',
                  type: 'official',
                });
                setFormErrors({});
                setShowAddEventModal(true);
              }}
              className="mt-6 px-6 py-3 rounded-xl shadow-sm active:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              <Text className="text-white font-bold">Add New Event</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Add Event Modal */}
      <Modal
        visible={showAddEventModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddEventModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className={`rounded-t-3xl max-h-[90%] flex-1 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          >
            <SafeAreaView edges={['bottom']} className="flex-1">
              <View
                className={`flex-row items-center justify-between px-6 pt-4 pb-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}
              >
                <Text
                  className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}
                >
                  Add New Event
                </Text>
                <Pressable onPress={() => setShowAddEventModal(false)}>
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={isDark ? '#9CA3AF' : '#64748B'}
                  />
                </Pressable>
              </View>

              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <View className="px-6 pt-6" style={{ gap: 20 }}>
                  <View>
                    <Text
                      className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}
                    >
                      Event Title *
                    </Text>
                    <TextInput
                      value={eventForm.title}
                      onChangeText={(t) =>
                        setEventForm({ ...eventForm, title: t })
                      }
                      placeholder="Title"
                      placeholderTextColor={isDark ? '#6B7280' : '#94A3B8'}
                      className={`border rounded-2xl px-4 py-4 text-base ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-200'} ${formErrors.title ? 'border-red-500' : ''}`}
                    />
                  </View>

                  <View>
                    <Text
                      className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}
                    >
                      Date
                    </Text>
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      className={`border rounded-2xl px-4 py-4 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}
                    >
                      <Text
                        className={isDark ? 'text-white' : 'text-slate-800'}
                      >
                        {eventForm.date.toLocaleDateString()}
                      </Text>
                    </Pressable>
                  </View>

                  <View className="flex-row" style={{ gap: 12 }}>
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}
                      >
                        Start Time *
                      </Text>
                      <Pressable
                        onPress={() => setShowStartTimePicker(true)}
                        className={`border rounded-2xl px-4 py-4 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'} ${formErrors.startTime ? 'border-red-500' : ''}`}
                      >
                        <Text
                          className={isDark ? 'text-white' : 'text-slate-800'}
                        >
                          {eventForm.startTime || '09:00'}
                        </Text>
                      </Pressable>
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}
                      >
                        End Time *
                      </Text>
                      <Pressable
                        onPress={() => setShowEndTimePicker(true)}
                        className={`border rounded-2xl px-4 py-4 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'} ${formErrors.endTime ? 'border-red-500' : ''}`}
                      >
                        <Text
                          className={isDark ? 'text-white' : 'text-slate-800'}
                        >
                          {eventForm.endTime || '10:00'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View>
                    <Text
                      className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}
                    >
                      Description
                    </Text>
                    <TextInput
                      value={eventForm.description}
                      onChangeText={(t) =>
                        setEventForm({ ...eventForm, description: t })
                      }
                      placeholder="Description"
                      multiline
                      className={`border rounded-2xl px-4 py-4 text-base min-h-[100px] ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-200'}`}
                    />
                  </View>

                  {/* Invite users (optional) - live search */}
                  <View>
                    <Text
                      className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}
                    >
                      Invite Users (optional)
                    </Text>
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search users by name or email"
                      placeholderTextColor={isDark ? '#6B7280' : '#94A3B8'}
                      className={`border rounded-2xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-200'}`}
                    />

                    {/* Selected chips */}
                    {selectedUsers.length > 0 && (
                      <View
                        className="flex-row flex-wrap mt-3"
                        style={{ gap: 8 }}
                      >
                        {selectedUsers.map((u) => (
                          <Pressable
                            key={u.id}
                            onPress={() =>
                              setSelectedUsers((prev) =>
                                prev.filter((x) => x.id !== u.id)
                              )
                            }
                            className="px-3 py-1 rounded-full bg-slate-200"
                          >
                            <Text className="text-sm">{u.name || u.email}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    {/* Search results */}
                    {searchQuery.length >= 2 && (
                      <View className="mt-2 max-h-40">
                        {isSearching ? (
                          <Text
                            className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}
                          >
                            Searching...
                          </Text>
                        ) : (
                          searchResults.slice(0, 6).map((u) => (
                            <Pressable
                              key={u.id}
                              onPress={() => {
                                const exists = selectedUsers.some(
                                  (s) => s.id === String(u.id)
                                );
                                if (exists)
                                  setSelectedUsers((prev) =>
                                    prev.filter((s) => s.id !== String(u.id))
                                  );
                                else
                                  setSelectedUsers((prev) => [
                                    ...prev,
                                    {
                                      id: String(u.id),
                                      name: u.name,
                                      email: u.email,
                                    },
                                  ]);
                                setSearchQuery('');
                                setSearchResults([]);
                              }}
                              className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-white'} mb-1 border`}
                            >
                              <Text
                                className={
                                  isDark ? 'text-white' : 'text-slate-800'
                                }
                              >
                                {u.name} {u.email ? `· ${u.email}` : ''}
                              </Text>
                            </Pressable>
                          ))
                        )}
                      </View>
                    )}
                  </View>

                  <Pressable
                    onPress={handleSaveEvent}
                    disabled={isSubmitting}
                    className={`rounded-2xl p-4 items-center shadow-sm mt-4 ${isSubmitting ? 'opacity-50' : ''}`}
                    style={
                      !isSubmitting
                        ? { backgroundColor: accentColor }
                        : undefined
                    }
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-semibold text-base">
                        Save Event
                      </Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* Simplified Pickers for all-events */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowDatePicker(false)}
        >
          <View
            className={`w-[80%] rounded-3xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          >
            <Text
              className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}
            >
              Select Date
            </Text>
            <ScrollView className="max-h-64">
              {calendarDays.map((d, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    setEventForm({ ...eventForm, date: d.date });
                    setShowDatePicker(false);
                  }}
                  className="p-3 rounded-lg mb-2"
                  style={
                    isSameDay(d.date, eventForm.date)
                      ? { backgroundColor: accentColor }
                      : undefined
                  }
                >
                  <Text
                    className={
                      isSameDay(d.date, eventForm.date)
                        ? 'text-white'
                        : isDark
                          ? 'text-white'
                          : 'text-slate-800'
                    }
                  >
                    {d.date.toLocaleDateString()}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showStartTimePicker} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowStartTimePicker(false)}
        >
          <View
            className={`w-[80%] rounded-3xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          >
            <Text
              className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}
            >
              Start Time
            </Text>
            <ScrollView className="max-h-64">
              {Array.from({ length: 24 }).map((_, h) =>
                [0, 30].map((m) => {
                  const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  return (
                    <Pressable
                      key={time}
                      onPress={() => {
                        setEventForm({ ...eventForm, startTime: time });
                        setShowStartTimePicker(false);
                      }}
                      className="p-3"
                    >
                      <Text
                        className={isDark ? 'text-white' : 'text-slate-800'}
                      >
                        {time}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showEndTimePicker} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowEndTimePicker(false)}
        >
          <View
            className={`w-[80%] rounded-3xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          >
            <Text
              className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}
            >
              End Time
            </Text>
            <ScrollView className="max-h-64">
              {Array.from({ length: 24 }).map((_, h) =>
                [0, 30].map((m) => {
                  const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  return (
                    <Pressable
                      key={time}
                      onPress={() => {
                        setEventForm({ ...eventForm, endTime: time });
                        setShowEndTimePicker(false);
                      }}
                      className="p-3"
                    >
                      <Text
                        className={isDark ? 'text-white' : 'text-slate-800'}
                      >
                        {time}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
