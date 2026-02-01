// Force Update: 2026-01-31 22:15
import { View, RefreshControl, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { getProfile } from '@/features/profile/profile.api';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import { useCalendar } from '@/hooks/useCalendar';
import { respondToInvite as apiRespondToInvite } from '@/features/calendar/calendar.api';
import { CalendarEvent, CreateCalendarEvent, UpdateCalendarEvent } from '@/features/calendar/calendar.types';
import { showToast } from '@/utils/toast';
import '../../global.css';
import { useRouter } from 'expo-router';

// Components
import { CalendarHeader } from '@/features/calendar/components/CalendarHeader';
import { MonthView } from '@/features/calendar/components/MonthView';
import { EventList } from '@/features/calendar/components/EventList';
import { AddEventModal } from '@/features/calendar/components/AddEventModal';
import { InvitesModal } from '@/features/calendar/components/InvitesModal';

type EventType = 'all' | 'official' | 'personal';

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();
  const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';
  const { events, isLoading, isRefreshing, refresh, createEvent, updateEvent, inviteAttendees } = useCalendar();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Modal states
  const [showInvitesModal, setShowInvitesModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  // Date and filter states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<EventType>('all');

  // Editing state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Helper for calendar grid
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

  // Refresh data when screen comes into focus
  const hasRefreshedOnFocus = React.useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      if (!hasRefreshedOnFocus.current) {
        hasRefreshedOnFocus.current = true;
        return;
      }
      refresh();
    }, [])
  );

  // Load current user's profile
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getProfile();
        if (!mounted) return;
        const email = res?.data?.email ?? null;
        if (email) setUserEmail(String(email));
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Filter events to find invites
  const inviteRows = events
    .map(event => {
      // Check if user is an attendee
      if (!event.attendees || !Array.isArray(event.attendees) || !userEmail) {
        // console.log('Skipping event', event.id, 'no attendees or no userEmail');
        return null;
      }

      const attendee = event.attendees.find(
        a => a.email && userEmail && a.email.toLowerCase() === userEmail.toLowerCase() && (a.status === 'pending' || a.status === 'invited')
      );

      if (attendee) {
        console.log('Found invite for user:', userEmail, 'in event:', event.title);
      } else {
        console.log('No matching pending invite for:', userEmail, 'in event:', event.id, 'Attendees:', event.attendees);
      }

      if (!attendee) return null;
      return { event, attendee };
    })
    .filter((row): row is { event: CalendarEvent; attendee: any } => row !== null);

  const eventDateKeys = React.useMemo(() => {
    const keys = new Set<string>();
    events.forEach((event) => {
      if (!event?.date) return;
      const key = String(event.date).split('T')[0];
      if (key) keys.add(key);
    });
    return keys;
  }, [events]);

  useEffect(() => {
    if (showInvitesModal && !isLoading) {
      refresh();
    }
  }, [showInvitesModal]);

  const calendarDays = getDaysInMonth(currentDate);

  const handleSaveEvent = async (eventForm: any, selectedUsers: any[]) => {
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
        const created = await createEvent(createData);
        if (selectedUsers && selectedUsers.length > 0) {
          const attendees = selectedUsers.map(u => ({
            userId: u.id,
            user_id: u.id, // Snake case for backend compatibility
            email: u.email
          }));
          try { // Added try-catch for inviteAttendees
            await inviteAttendees(created.id, attendees);
            await refresh(); // Force refresh to get updated attendees list from server
          } catch (e) {
            // Ignore invite errors to avoid noisy debug alerts in UI
          }
        }
      }
      setShowAddEventModal(false);
    } catch (e) {
      console.error('Save event failed', e);
      throw e;
    }
  };

  const handleRespondToInvite = async (eventId: string, attendeeId: string, status: 'accepted' | 'declined') => {
    try {
      await apiRespondToInvite(eventId, attendeeId, status);
      await refresh();
    } catch (e) {
      console.error('Respond to invite failed', e);
    }
  };

  const calendarDaysProps = getDaysInMonth(currentDate);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={isDark ? accentColor : '#2B5F9E'}
            colors={[accentColor, '#2B5F9E']}
          />
        }
      >
        <CalendarHeader
          currentDate={currentDate}
          isDark={isDark}
          onPrevMonth={() => navigateMonth('prev')}
          onNextMonth={() => navigateMonth('next')}
          onInvitesPress={() => setShowInvitesModal(true)}
          invitesCount={inviteRows.length}
        />

        <MonthView
          currentDate={currentDate}
          selectedDate={selectedDate}
          calendarDays={calendarDaysProps}
          eventDateKeys={eventDateKeys}
          isDark={isDark}
          isPremium={isPremium}
          onDateSelect={setSelectedDate}
          onPrevMonth={() => navigateMonth('prev')}
          onNextMonth={() => navigateMonth('next')}
        />

        <EventList
          events={filteredEvents}
          isLoading={isLoading}
          selectedDate={selectedDate}
          activeFilter={activeFilter}
          isDark={isDark}
          isPremium={isPremium}
          onFilterChange={setActiveFilter}
          onAddEvent={() => {
            setEditingEventId(null);
            setShowAddEventModal(true);
          }}
          onSeeAllPress={() => router.push('/calendar/all-events')}
          totalEventsCount={events.length}
          officialCount={events.filter(e => e.type === 'official').length}
          personalCount={events.filter(e => e.type === 'personal').length}
        />
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        onPress={() => {
          setEditingEventId(null);
          // Set date to selected date when opening from FAB
          setShowAddEventModal(true);
        }}
        className={`absolute right-6 w-14 h-14 rounded-full shadow-lg items-center justify-center active:opacity-80 ${isPremium ? 'bg-[#D4AF37]' : 'bg-[#2B5F9E]'}`}
        style={{ bottom: 80 + insets.bottom }}
      >
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </Pressable>

      <InvitesModal
        visible={showInvitesModal}
        isDark={isDark}
        onClose={() => setShowInvitesModal(false)}
        invites={inviteRows}
        onRespond={handleRespondToInvite}
      />

      <AddEventModal
        visible={showAddEventModal}
        isDark={isDark}
        onClose={() => {
          setShowAddEventModal(false);
          setEditingEventId(null);
        }}
        onSave={handleSaveEvent}
        initialDate={selectedDate}
        editingEventId={editingEventId}
      // If we were supporting edit from the list directly, we'd pass existing event data here.
      // For now, the "Edit" flow in the original code wasn't deeply integrated into the list click (which goes to details).
      // But the "No events" card had a button to add event which cleared state.
      // We will keep it simple as per original logic.
      />
    </SafeAreaView>
  );
}
