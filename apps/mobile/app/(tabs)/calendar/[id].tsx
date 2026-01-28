import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeStore } from '@/features/theme/theme.store';
import { getCalendarEventById } from '@/features/calendar/calendar.api';
import { searchUsers } from '@/features/users/users.api';
import { useCalendar } from '@/hooks/useCalendar';
import '../../global.css';

export default function EventDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { isDark } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; name?: string; email?: string }>>([]);
  const [isInviting, setIsInviting] = useState(false);

  const { inviteAttendees } = useCalendar();

  const id = (params.id ?? params['[id]']) as string | undefined;

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getCalendarEventById(String(id));
        if (mounted) setEvent(res.data);
      } catch (e: any) {
        console.error('Failed to load event', e);
        if (mounted) setError(e.message || 'Failed to load event');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

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
          <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
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

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background-light'}`}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="mb-4">
          <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{event.title}</Text>
          <Text className={`mt-1 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{event.date} {event.startTime ? `• ${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}` : ''}</Text>
        </View>

        <View className="mb-4">
          <Text className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Location</Text>
          <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>{event.location || '—'}</Text>
        </View>

        <View className="mb-4">
          <Text className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Description</Text>
          <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>{event.description || '—'}</Text>
        </View>

        <View className="mb-4">
          <Text className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Invite / Notes</Text>
          <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>{event.invite || '—'}</Text>
        </View>

        {/* Invite Users */}
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
                    className={`p-3 ${idx < searchResults.slice(0,6).length - 1 ? 'border-b' : ''} ${isDark ? 'border-slate-700' : 'border-slate-100'}`}
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
                // Refresh event
                const res = await getCalendarEventById(String(event.id));
                setEvent(res.data);
                setSelectedUsers([]);
              } catch (e) {
                console.error('Invite failed', e);
              } finally {
                setIsInviting(false);
              }
            }}
            disabled={isInviting || selectedUsers.length === 0}
            className={`mt-3 rounded-2xl p-3 items-center ${isInviting || selectedUsers.length === 0 ? 'bg-[#2B5F9E]/50' : 'bg-[#2B5F9E]'}`}
          >
            {isInviting ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Send Invites</Text>}
          </Pressable>
        </View>

        <View className="mb-6">
          <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Attendees</Text>
          {event.attendees && event.attendees.length > 0 ? (
            event.attendees.map((a: any) => (
              <View key={a.id} className="p-3 rounded-lg mb-2 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}">
                <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>{a.name || a.email}</Text>
                {a.status && <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{a.status}</Text>}
              </View>
            ))
          ) : (
            <Text className={`${isDark ? 'text-gray-400' : 'text-slate-500'}`}>No attendees</Text>
          )}
        </View>

        <Pressable onPress={() => router.back()} className="py-3 px-4 rounded-xl bg-[#2B5F9E] items-center">
          <Text className="text-white font-semibold">Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
