import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import '../../global.css';

interface WorkSession {
    id: number;
    startTime: string;
    endTime: string | null;
    durationMinutes: number | null;
    workDescription: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function WorkingHoursScreen() {
    const { isDark } = useThemeStore();
    const { isPremium } = usePremium();
    const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';
    const isMountedRef = useRef(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<WorkSession[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSession, setNewSession] = useState({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        description: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const loadSessions = async (forceRefresh: boolean = false) => {
        try {
            if (isMountedRef.current) {
                setLoading(true);
            }
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                try {
                    router.replace('/(auth)/login');
                } catch (e) {
                    console.warn('Navigation not ready for login redirect:', e);
                }
                return;
            }

            const response = await apiService.get<{
                success: boolean;
                data: WorkSession[];
                pagination: { total: number };
            }>(API_ENDPOINTS.WORK_HOURS.LIST, token, forceRefresh);

            if (response.success && response.data) {
                // Sort by created date (newest first), fallback to start time
                const sorted = response.data.sort((a, b) => {
                    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    if (aCreated !== bCreated) return bCreated - aCreated;
                    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
                });
                if (isMountedRef.current) {
                    setSessions(sorted);
                }
            }
        } catch (error: any) {
            console.error('Error loading work sessions:', error);
            showToast.error(error.message || 'Failed to load sessions', 'Error');
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadSessions(true);
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadSessions(true);
    };

    const handleAddSession = async () => {
        if (!newSession.date || !newSession.startTime || !newSession.endTime) {
            showToast.error('Please fill in all required fields', 'Validation Error');
            return;
        }

        try {
            setIsSubmitting(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            const startDateTime = new Date(`${newSession.date}T${newSession.startTime}:00`).toISOString();
            const endDateTime = new Date(`${newSession.date}T${newSession.endTime}:00`).toISOString();

            await apiService.post(API_ENDPOINTS.WORK_HOURS.CREATE, {
                start_time: startDateTime,
                end_time: endDateTime,
                work_description: newSession.description,
                is_manual_entry: true,
            }, token);

            showToast.success('Work session added', 'Success');
            setShowAddModal(false);
            loadSessions(true);
            setNewSession({
                date: new Date().toISOString().split('T')[0],
                startTime: '09:00',
                endTime: '17:00',
                description: '',
            });
        } catch (error: any) {
            console.error('Error creating session:', error);
            showToast.error(error.message || 'Failed to create session', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDuration = (minutes: number | null, startTime: string, endTime?: string | null) => {
        let totalSeconds = 0;
        if (endTime) {
            const start = new Date(startTime).getTime();
            const end = new Date(endTime).getTime();
            if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
                totalSeconds = Math.floor((end - start) / 1000);
            }
        }

        if (!totalSeconds && minutes) {
            totalSeconds = Math.round(minutes * 60);
        }

        if (!totalSeconds) return '0h 0m 0s';

        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hours}h ${mins}m ${secs}s`;
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
            {/* Header */}
            <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-gray-100"}`}>
                <View className="flex-row items-center px-4 py-2 justify-between">
                    
                    <Text className={`text-lg font-bold flex-1 text-center ${isDark ? "text-white" : "text-[#121417]"}`}>
                        Working Hours
                    </Text>
                    <View className="w-12" />
                </View>
            </View>

            {/* Content */}
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={isDark ? accentColor : '#2B5F9E'}
                        colors={[accentColor, '#2B5F9E']}
                    />
                }
            >
                {loading && !refreshing ? (
                    <View className="py-20 items-center">
                        <ActivityIndicator size="large" color={isDark ? accentColor : '#2B5F9E'} />
                    </View>
                ) : sessions.length === 0 ? (
                    <View className={`p-8 rounded-2xl border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                        }`}>
                        <MaterialIcons name="schedule" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
                        <Text className={`mt-4 text-center font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
                            No work sessions found
                        </Text>
                        <Text className={`mt-2 text-center text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                            Use the + button to manually add a session
                        </Text>
                    </View>
                ) : (
                    <View style={{ gap: 16 }}>
                        {sessions.map((session) => (
                            <Pressable
                                key={session.id}
                                onPress={() => router.push(`/(tabs)/workinghours/${session.id}` as any)}
                                className={`p-4 rounded-xl border shadow-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                                    }`}
                            >
                                <View className="flex-row justify-between items-start mb-2">
                                    <View className="flex-row items-center gap-2">
                                        <MaterialIcons name="event" size={16} color={isDark ? "#9CA3AF" : "#64748B"} />
                                        <Text className={`font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
                                            {formatDate(session.startTime)}
                                        </Text>
                                    </View>
                                    <View className={`px-2 py-1 rounded text-xs ${session.isActive
                                        ? "bg-green-100 text-green-700"
                                        : (isDark ? "bg-slate-700/50 text-gray-300" : "bg-slate-100 text-slate-600")
                                        }`}>
                                        <Text className={`text-xs font-bold ${session.isActive ? "text-green-700" : (isDark ? "text-gray-300" : "text-slate-600")
                                            }`}>
                                            {session.isActive ? 'ACTIVE' : 'LOGGED'}
                                        </Text>
                                    </View>
                                </View>

                                <View className="flex-row justify-between items-end">
                                    <View>
                                        <Text className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                            {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'Now'}
                                        </Text>
                                        {session.workDescription && (
                                            <Text className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-slate-700"}`} numberOfLines={1}>
                                                {session.workDescription}
                                            </Text>
                                        )}
                                    </View>
                                    <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                                        {formatDuration(session.durationMinutes, session.startTime, session.endTime)}
                                    </Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Floating Action Button */}
            <View
                className="absolute right-6 items-center"
                style={{ bottom: 20 }}
            >
                <Pressable
                    onPress={() => setShowAddModal(true)}
                    className="w-14 h-14 bg-[#2B5E9C] rounded-full shadow-lg items-center justify-center"
                >
                    <MaterialIcons name="add" size={32} color="#FFFFFF" />
                </Pressable>
            </View>

            {/* Add Session Modal */}
            <Modal
                visible={showAddModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className={`rounded-t-3xl ${isDark ? "bg-slate-800" : "bg-white"}`}>
                        <View className="p-6 border-b border-gray-200 flex-row justify-between items-center">
                            <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Log Work Session</Text>
                            <Pressable onPress={() => setShowAddModal(false)}>
                                <MaterialIcons name="close" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                            </Pressable>
                        </View>
                        <View className="p-6 gap-4">
                            <View>
                                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date (YYYY-MM-DD)</Text>
                                <TextInput
                                    value={newSession.date}
                                    onChangeText={(t) => setNewSession({ ...newSession, date: t })}
                                    className={`p-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-slate-800"}`}
                                    placeholder="2024-03-20"
                                />
                            </View>
                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Start Time (HH:MM)</Text>
                                    <TextInput
                                        value={newSession.startTime}
                                        onChangeText={(t) => setNewSession({ ...newSession, startTime: t })}
                                        className={`p-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-slate-800"}`}
                                        placeholder="09:00"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>End Time (HH:MM)</Text>
                                    <TextInput
                                        value={newSession.endTime}
                                        onChangeText={(t) => setNewSession({ ...newSession, endTime: t })}
                                        className={`p-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-slate-800"}`}
                                        placeholder="17:00"
                                    />
                                </View>
                            </View>
                            <View>
                                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Description</Text>
                                <TextInput
                                    value={newSession.description}
                                    onChangeText={(t) => setNewSession({ ...newSession, description: t })}
                                    className={`p-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-slate-800"}`}
                                    placeholder="Location, shift type, notes..."
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                            <Pressable
                                onPress={handleAddSession}
                                disabled={isSubmitting}
                                className={`mt-4 p-4 rounded-xl items-center justify-center ${isSubmitting ? "bg-gray-400" : "bg-[#2B5E9C]"
                                    }`}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-base">Save Session</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
