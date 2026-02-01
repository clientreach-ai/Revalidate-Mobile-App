import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCalendarEventById } from '@/features/calendar/calendar.api';
import { searchUsers } from '@/features/users/users.api';
import { useCalendar } from '@/hooks/useCalendar';
import { showToast } from '@/utils/toast';
import '../../global.css';

export default function EventDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();
  const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; name?: string; email?: string }>>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [currentAttendee, setCurrentAttendee] = useState<any>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [addToCpd, setAddToCpd] = useState(true);

  const { inviteAttendees } = useCalendar();

  const id = (params.id ?? params['[id]']) as string | undefined;

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getCalendarEventById(String(id), true);
        if (mounted) {
          setEvent(res.data);

          const userDataStr = await AsyncStorage.getItem('userData');
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            // Find attendee by userId or email
            const attendee = res.data.attendees?.find((a: any) =>
              (a.userId && userData.id && String(a.userId) === String(userData.id)) ||
              (a.email && userData.email && String(a.email).toLowerCase() === String(userData.email).toLowerCase())
            );
            setCurrentAttendee(attendee);

            // Auto open modal if user is pending/invited and coming from notification
            const shouldShowModal = params.showAcceptModal === 'true' || String(params.showAcceptModal) === 'true';
            if (shouldShowModal && (!attendee || attendee.status === 'pending' || attendee.status === 'invited')) {
              setShowAcceptModal(true);
            }
          }
        }
      } catch (e: any) {
        console.error('Failed to load event', e);
        if (mounted) setError(e.message || 'Failed to load event');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, params.showAcceptModal]);

  // Debounced user search
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
        if (!cancelled) setSearchResults(res.data || []);
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

  const handleResponse = async (status: 'accepted' | 'declined') => {
    if (!currentAttendee || !id) return;
    setIsResponding(true);
    try {
      const { respondToInvite: respondApi } = await import('@/features/calendar/calendar.api');
      const token = await AsyncStorage.getItem('authToken');

      await respondApi(String(id), String(currentAttendee.id), status);

      // Handle CPD Recording
      if (status === 'accepted' && addToCpd && event && token) {
        try {
          const { apiService: api } = await import('@/services/api');
          // Estimate duration from start/end time if possible, else default to 60m
          // Simple duration calculation if format is "HH:MM"
          let duration = 60;
          if (event.startTime && event.endTime) {
            const [sh, sm] = event.startTime.split(':').map(Number);
            const [eh, em] = event.endTime.split(':').map(Number);
            if (!isNaN(sh) && !isNaN(eh)) {
              duration = (eh * 60 + em) - (sh * 60 + sm);
              if (duration <= 0) duration = 60;
            }
          }

          await api.post('/api/v1/cpd-hours', {
            training_name: event.title,
            activity_date: event.date,
            duration_minutes: duration,
            activity_type: 'participatory',
            learning_method: 'course attendance',
            cpd_learning_type: 'formal and educational',
          }, token);
          console.log('Automatically recorded CPD for event');
        } catch (cpdErr) {
          console.warn('Failed to auto-record CPD:', cpdErr);
        }
      }

      // Refresh event
      const res = await getCalendarEventById(String(id), true);
      setEvent(res.data);

      // Update current attendee status
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        const attendee = res.data.attendees?.find((a: any) =>
          String(a.userId) === String(userData.id) || a.email === userData.email
        );
        setCurrentAttendee(attendee);
      }

      const msg = status === 'accepted'
        ? (addToCpd ? 'Accepted and added to CPD portfolio.' : 'Invitation accepted.')
        : 'You have declined this invitation.';

      showToast.success(msg, 'Response Sent');
      setShowAcceptModal(false);
    } catch (e: any) {
      console.error('Failed to respond to invite', e);
      showToast.error(e.message || 'Failed to update response', 'Error');
    } finally {
      setIsResponding(false);
    }
  };

  if (!id) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background-light'}`}>
        <View className="p-6">
          <Text className={isDark ? 'text-white' : 'text-slate-800'}>No event id provided</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background-light'}`}>
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color={isDark ? accentColor : '#2B5F9E'} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background-light'}`}>
        <View className="p-6">
          <Text className={isDark ? 'text-white' : 'text-slate-800'}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const normalizeText = (value?: string | null) => {
    if (!value) return '';
    const trimmed = String(value).trim();
    if (!trimmed || trimmed === '—' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
      return '';
    }
    return trimmed;
  };

  const descriptionText =
    normalizeText(event?.description) ||
    normalizeText(event?.invite) ||
    normalizeText(event?.notes) ||
    normalizeText(event?.details) ||
    normalizeText(event?.summary) ||
    '';

  if (!descriptionText) {
    console.log('[EventDetail] Description empty', {
      id: event?.id,
      description: event?.description,
      invite: event?.invite,
      notes: event?.notes,
      details: event?.details,
      summary: event?.summary,
      rawEvent: event,
    });
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background-light'}`}>
      <Modal
        visible={showAcceptModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAcceptModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View className={`w-full max-w-sm rounded-[32px] p-8 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <View className="w-16 h-16 rounded-full items-center justify-center mb-6 mx-auto" style={{ backgroundColor: isPremium ? 'rgba(212, 175, 55, 0.15)' : '#DBEAFE' }}>
              <Text style={{ fontSize: 32 }}>📅</Text>
            </View>
            <Text className={`text-xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Event Invitation</Text>
            <Text className={`text-center mb-8 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              You have been invited to "{event.title}". Would you like to attend?
            </Text>
            <View className="mb-8 p-4 rounded-2xl bg-slate-50 flex-row items-center" style={{ gap: 12 }}>
              <Pressable
                onPress={() => setAddToCpd(!addToCpd)}
                className={`w-6 h-6 rounded border items-center justify-center ${addToCpd ? '' : 'border-slate-300 bg-white'}`}
                style={addToCpd ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
              >
                {addToCpd && <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
              </Pressable>
              <View className="flex-1">
                <Text className="text-slate-700 font-bold text-sm">Add to CPD Portfolio</Text>
                <Text className="text-slate-500 text-[10px]">Track hours automatically for revalidation</Text>
              </View>
            </View>

            <View className="gap-3">
              <Pressable
                onPress={() => handleResponse('accepted')}
                disabled={isResponding}
                className="w-full py-4 rounded-2xl items-center justify-center active:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                {isResponding ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold text-base">Accept Invitation</Text>}
              </Pressable>

              <Pressable
                onPress={() => handleResponse('declined')}
                disabled={isResponding}
                className={`w-full py-4 rounded-2xl items-center justify-center active:bg-slate-100 ${isDark ? 'border border-slate-700' : 'bg-slate-50'}`}
              >
                <Text className={`font-semibold ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Decline</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowAcceptModal(false)}
                className="mt-2 items-center"
              >
                <Text className="text-slate-400 text-sm">Decide Later</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="mb-4">
          <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{event.title}</Text>
          <Text className={`mt-1 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{event.date} {event.startTime ? `• ${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}` : ''}</Text>
        </View>

        {currentAttendee && (currentAttendee.status === 'pending' || currentAttendee.status === 'invited') && !showAcceptModal && (
          <Pressable
            onPress={() => setShowAcceptModal(true)}
            className="mb-6 p-4 rounded-3xl border flex-row items-center justify-between"
            style={isDark ? { backgroundColor: isPremium ? 'rgba(212, 175, 55, 0.12)' : 'rgba(30, 58, 138, 0.2)', borderColor: isPremium ? '#D4AF37' : '#1E40AF' } : { backgroundColor: isPremium ? 'rgba(212, 175, 55, 0.12)' : '#DBEAFE', borderColor: isPremium ? 'rgba(212, 175, 55, 0.4)' : '#BFDBFE' }}
          >
            <View className="flex-1">
              <Text className={`font-bold ${isDark ? (isPremium ? 'text-[#F4DFA6]' : 'text-blue-300') : (isPremium ? 'text-[#B8860B]' : 'text-blue-800')}`}>Invitation Pending</Text>
              <Text className={`text-xs ${isDark ? (isPremium ? 'text-[#EAD48A]' : 'text-blue-200/80') : (isPremium ? 'text-[#B8860B]' : 'text-blue-600')}`}>Tap to respond to this invite</Text>
            </View>
            <View className="px-4 py-2 rounded-xl" style={{ backgroundColor: accentColor }}>
              <Text className="text-white text-xs font-bold">Review</Text>
            </View>
          </Pressable>
        )}

        {currentAttendee && currentAttendee.status === 'accepted' && (
          <View className="mb-6 flex-row items-center p-3 rounded-2xl bg-green-50 border border-green-100" style={{ gap: 10 }}>
            <View className="w-6 h-6 rounded-full bg-green-500 items-center justify-center">
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
            </View>
            <Text className="text-green-700 font-medium">You are attending this event</Text>
            <Pressable onPress={() => handleResponse('declined')} className="ml-auto">
              <Text className="text-slate-400 text-xs">Leave</Text>
            </Pressable>
          </View>
        )}

        <View className="mb-4">
          <Text className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Location</Text>
          <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>{event.location || '—'}</Text>
        </View>

        <View className="mb-4">
          <Text className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Description</Text>
          <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>{descriptionText || '—'}</Text>
        </View>

        {/* <View className="mb-4">
          <Text className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Invite / Notes</Text>
          <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>{event.invite || '—'}</Text>
        </View> */}

        <View className="mb-6">
          <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Invite Users</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search users by name or email"
            placeholderTextColor={isDark ? '#6B7280' : '#94A3B8'}
            className={`border rounded-2xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-200'}`}
          />

          {selectedUsers.length > 0 && (
            <View className="flex-row flex-wrap mt-3" style={{ gap: 8 }}>
              {selectedUsers.map((u) => (
                <Pressable key={u.id} onPress={() => setSelectedUsers(prev => prev.filter(x => x.id !== u.id))} className="px-3 py-1 rounded-full bg-slate-200">
                  <Text className="text-sm">{u.name || u.email}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {searchQuery.length >= 2 && (
            <ScrollView
              className={`mt-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-md border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
              style={{ maxHeight: 180 }}
              nestedScrollEnabled
            >
              {isSearching ? (
                <View className="p-3">
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Searching...</Text>
                </View>
              ) : (
                searchResults.slice(0, 6).map((u, idx) => (
                  <Pressable
                    key={u.id}
                    onPress={() => {
                      const exists = selectedUsers.some(s => s.id === String(u.id));
                      if (exists) setSelectedUsers(prev => prev.filter(s => s.id !== String(u.id)));
                      else setSelectedUsers(prev => [...prev, { id: String(u.id), name: u.name, email: u.email }]);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className={`p-3 ${idx < searchResults.slice(0, 6).length - 1 ? 'border-b' : ''} ${isDark ? 'border-slate-700' : 'border-slate-100'}`}
                  >
                    <Text className={isDark ? 'text-white' : 'text-slate-800'}>{u.name} {u.email ? `· ${u.email}` : ''}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}

          <Pressable
            onPress={async () => {
              if (!event || !selectedUsers.length) return;
              setIsInviting(true);
              try {
                const attendees = selectedUsers.map(u => ({ userId: u.id }));
                await inviteAttendees(event.id, attendees);
                const res = await getCalendarEventById(String(event.id), true);
                setEvent(res.data);
                setSelectedUsers([]);
              } catch (e) {
                console.error('Invite failed', e);
              } finally {
                setIsInviting(false);
              }
            }}
            disabled={isInviting || selectedUsers.length === 0}
            className="mt-3 rounded-2xl p-3 items-center"
            style={{ backgroundColor: isInviting || selectedUsers.length === 0 ? `${accentColor}80` : accentColor }}
          >
            {isInviting ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Send Invites</Text>}
          </Pressable>
        </View>

        <View className="mb-6">
          <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Attendees</Text>
          {event.attendees && event.attendees.length > 0 ? (
            event.attendees.map((a: any) => (
              <View key={a.id} className={`p-3 rounded-lg mb-2 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>{a.name || a.email}</Text>
                {a.status && (
                  <Text className={`text-xs ${a.status === 'accepted' ? 'text-green-500' :
                    a.status === 'declined' ? 'text-red-400' :
                      isDark ? 'text-gray-400' : 'text-slate-500'
                    }`}>
                    {a.status}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text className={`${isDark ? 'text-gray-400' : 'text-slate-500'}`}>No attendees</Text>
          )}
        </View>

        <Pressable onPress={() => router.back()} className="py-3 px-4 rounded-xl items-center" style={{ backgroundColor: accentColor }}>
          <Text className="text-white font-semibold">Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
