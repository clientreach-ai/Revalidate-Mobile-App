import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import '../../global.css';

interface UserData {
  name: string | null;
  email: string;
  professionalRole: string | null;
  registrationNumber: string | null;
  revalidationDate: string | null;
}

interface ActiveSession {
  id: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  workDescription: string | null;
  isActive: boolean;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [timer, setTimer] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [userData, setUserData] = useState<UserData | null>(null);
  const [revalidationDays, setRevalidationDays] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isPausingSession, setIsPausingSession] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadUserData();
    loadActiveSession();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadActiveSession();
    }, [])
  );

  useEffect(() => {
    if (activeSession && activeSession.isActive && !isPaused) {
      updateTimerFromSession();
      
      timerIntervalRef.current = setInterval(() => {
        updateTimerFromSession();
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (!activeSession || !activeSession.isActive) {
        setTimer({ hours: 0, minutes: 0, seconds: 0 });
        setIsPaused(false);
        setPausedAt(null);
        setTotalPausedTime(0);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeSession, isPaused]);

  const updateTimerFromSession = () => {
    if (!activeSession || !activeSession.isActive || isPaused) return;

    const startTime = new Date(activeSession.startTime);
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime() - totalPausedTime;
    
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    setTimer({ hours, minutes, seconds });
  };

  const loadActiveSession = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await apiService.get<{
        success: boolean;
        data: ActiveSession | null;
      }>(API_ENDPOINTS.WORK_HOURS.ACTIVE, token);

      if (response?.data && response.data.isActive) {
        setActiveSession(response.data);
        setIsPaused(false);
        setPausedAt(null);
        setTotalPausedTime(0);
      } else {
        setActiveSession(null);
        setIsPaused(false);
        setPausedAt(null);
        setTotalPausedTime(0);
      }
    } catch (error) {
      console.error('Error loading active session:', error);
      setActiveSession(null);
    }
  };

  const handleStartSession = async () => {
    try {
      setIsStartingSession(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showToast.error('Please log in again', 'Error');
        router.replace('/(auth)/login');
        return;
      }

      const startTime = new Date().toISOString();
      const response = await apiService.post<{
        success: boolean;
        data: ActiveSession;
      }>(
        API_ENDPOINTS.WORK_HOURS.CREATE,
        {
          start_time: startTime,
          work_description: '',
        },
        token
      );

      if (response?.data) {
        setActiveSession(response.data);
        setIsPaused(false);
        setPausedAt(null);
        setTotalPausedTime(0);
        showToast.success('Clinical session started', 'Success');
      }
    } catch (error: any) {
      console.error('Error starting session:', error);
      showToast.error(
        error?.message || 'Failed to start session. Please try again.',
        'Error'
      );
    } finally {
      setIsStartingSession(false);
    }
  };

  const handlePauseSession = () => {
    if (!activeSession || isPaused) return;
    
    setIsPaused(true);
    setPausedAt(new Date());
    showToast.info('Session paused', 'Paused');
  };

  const handleResumeSession = () => {
    if (!activeSession || !isPaused || !pausedAt) return;
    
    const pauseDuration = new Date().getTime() - pausedAt.getTime();
    setTotalPausedTime(prev => prev + pauseDuration);
    setIsPaused(false);
    setPausedAt(null);
    showToast.info('Session resumed', 'Resumed');
  };

  const handleRestartSession = async () => {
    Alert.alert(
      'Restart Session',
      'This will stop the current session and start a new one. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Restart',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              if (!token) {
                showToast.error('Please log in again', 'Error');
                router.replace('/(auth)/login');
                return;
              }

              if (activeSession) {
                const endTime = new Date().toISOString();
                await apiService.put(
                  `${API_ENDPOINTS.WORK_HOURS.UPDATE}/${activeSession.id}`,
                  {
                    end_time: endTime,
                    work_description: '',
                  },
                  token
                );
              }

              const startTime = new Date().toISOString();
              const response = await apiService.post<{
                success: boolean;
                data: ActiveSession;
              }>(
                API_ENDPOINTS.WORK_HOURS.CREATE,
                {
                  start_time: startTime,
                  work_description: '',
                },
                token
              );

              if (response?.data) {
                setActiveSession(response.data);
                setIsPaused(false);
                setPausedAt(null);
                setTotalPausedTime(0);
                showToast.success('Session restarted', 'Success');
              }
            } catch (error: any) {
              console.error('Error restarting session:', error);
              showToast.error(
                error?.message || 'Failed to restart session. Please try again.',
                'Error'
              );
            }
          },
        },
      ]
    );
  };

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await apiService.get<{
        success: boolean;
        data: {
          name: string | null;
          email: string;
          registrationNumber: string | null;
          revalidationDate: string | null;
          professionalRole: string | null;
        };
      }>(API_ENDPOINTS.USERS.ME, token);

      if (response?.data) {
        const userName = response.data.name || response.data.email.split('@')[0];

        setUserData({
          name: userName,
          email: response.data.email,
          professionalRole: response.data.professionalRole,
          registrationNumber: response.data.registrationNumber,
          revalidationDate: response.data.revalidationDate,
        });

        if (response.data.revalidationDate) {
          try {
            let revalidationDate: Date;
            const dateStr = response.data.revalidationDate;
            
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
              const [year, month, day] = dateStr.split('-').map(Number);
              revalidationDate = new Date(year, month - 1, day);
            } else {
              revalidationDate = new Date(dateStr);
            }
            
            if (isNaN(revalidationDate.getTime())) {
              console.warn('Invalid revalidation date:', dateStr);
              setRevalidationDays(null);
            } else {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              revalidationDate.setHours(0, 0, 0, 0);
              const diffTime = revalidationDate.getTime() - today.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              setRevalidationDays(diffDays);
            }
          } catch (error) {
            console.error('Error parsing revalidation date:', error);
            setRevalidationDays(null);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRolePrefix = (role: string | null): string => {
    if (!role) return '';
    
    const roleMap: Record<string, string> = {
      'doctor': 'Dr.',
      'nurse': 'Nurse',
      'pharmacist': 'Pharmacist',
      'dentist': 'Dr.',
      'other_healthcare': '',
      'other': '',
    };
    
    return roleMap[role] || '';
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatUserName = (): string => {
    if (!userData) return 'User';
    
    const prefix = getRolePrefix(userData.professionalRole);
    const name = userData.name || userData.email.split('@')[0];
    
    if (prefix) {
      return `${prefix} ${name}`;
    }
    return name;
  };

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  const PulsingDot = ({ isDark }: { isDark: boolean }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }, []);

    return (
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#EF4444',
          opacity: pulseAnim,
        }}
      />
    );
  };

  const stats = [
    {
      icon: 'schedule' as const,
      value: '450',
      label: 'Hours Completed',
      bgColor: 'bg-blue-50',
      iconColor: '#2B5F9E',
      route: '/(tabs)/workinghours',
    },
    {
      icon: 'payments' as const,
      value: '£3,420',
      label: 'Total Earnings',
      bgColor: 'bg-green-50',
      iconColor: '#10B981',
      route: '/(tabs)/earings',
    },
    {
      icon: 'school' as const,
      value: '35',
      label: 'CPD Hours',
      bgColor: 'bg-purple-50',
      iconColor: '#9333EA',
      route: '/(tabs)/cpdhourstracking',
    },
    {
      icon: 'description' as const,
      value: '5',
      label: 'Reflections',
      bgColor: 'bg-amber-50',
      iconColor: '#F59E0B',
      route: '/(tabs)/reflections',
    },
  ];

  const activities = [
    {
      icon: 'edit-note' as const,
      title: 'New Reflection Added',
      subtitle: "Case #4829 - Multi-disciplinary team",
      time: '2h ago',
      bgColor: 'bg-blue-50',
      iconColor: '#2B5F9E',
    },
    {
      icon: 'verified' as const,
      title: 'Shift Approved',
      subtitle: "Royal Victoria Hospital - 12h Shift",
      time: 'Yesterday',
      bgColor: 'bg-green-50',
      iconColor: '#10B981',
    },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pt-6 pb-20 rounded-b-[40px]" style={{ backgroundColor: '#2B5F9E' }}>
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-3">
              <View className="relative">
                <View className="w-12 h-12 rounded-full bg-white/30 border-2 border-white/30 items-center justify-center">
                  <MaterialIcons name="person" size={24} color="#FFFFFF" />
                </View>
                <View className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-[#2B5F9E]" />
              </View>
              <View>
                <Text className="text-white/80 text-xs font-medium uppercase tracking-wider">
                  {getGreeting()}
                </Text>
                <Text className="text-white text-xl font-bold" numberOfLines={1}>
                  {isLoading ? 'Loading...' : formatUserName()}
                </Text>
              </View>
            </View>

            <Pressable 
              onPress={() => router.push('/(tabs)/notifications')}
              className="relative"
            >
              <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center border border-white/30">
                <MaterialIcons name="notifications-active" size={22} color="#FFFFFF" />
              </View>
              <View className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-[#2B5F9E] items-center justify-center">
                <Text className="text-white text-[10px] font-bold" style={{ lineHeight: 12 }}>2</Text>
              </View>
            </Pressable>
          </View>

          {revalidationDays !== null && (
            <View className="flex-row justify-between items-center">
              <View className="bg-white/10 px-3 py-2 rounded-2xl items-center border border-white/20">
                <Text className="text-[10px] text-white/80 font-semibold uppercase">
                  Revalidation
                </Text>
                <Text className="text-white font-bold">
                  {revalidationDays > 0 
                    ? `${revalidationDays} ${revalidationDays === 1 ? 'Day' : 'Days'}`
                    : revalidationDays === 0
                    ? 'Due Today'
                    : 'Overdue'
                  }
                </Text>
              </View>
            </View>
          )}
        </View>

        <View className="flex-1 -mt-12 px-6 relative z-10" style={{ gap: 24 }}>
          {activeSession && activeSession.isActive ? (
            <View className={`p-5 rounded-3xl shadow-lg border ${
              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
            }`}>
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center gap-2">
                  {!isPaused && <PulsingDot isDark={isDark} />}
                  {isPaused && (
                    <View className="w-2 h-2 rounded-full bg-yellow-500" />
                  )}
                  <Text className={`text-sm font-semibold uppercase tracking-tight ${
                    isDark ? "text-gray-400" : "text-slate-500"
                  }`}>
                    {isPaused ? 'Paused Clinical Session' : 'Active Clinical Session'}
                  </Text>
                </View>
                <View className={`px-2 py-1 rounded-lg ${
                  isDark ? "bg-slate-700" : "bg-slate-100"
                }`}>
                  <Text className={`text-xs ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                    Started {new Date(activeSession.startTime).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-col">
                  <Text className={`text-4xl font-mono font-bold tracking-tighter ${
                    isDark ? "text-white" : "text-slate-800"
                  }`}>
                    {formatTime(timer.hours)}:{formatTime(timer.minutes)}:{formatTime(timer.seconds)}
                  </Text>
                  <Text className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                    {activeSession.workDescription || 'Clinical session'}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={handleRestartSession}
                    disabled={isPausingSession}
                    className={`px-4 py-3 rounded-2xl flex-row items-center gap-2 ${
                      isDark ? "bg-slate-700" : "bg-slate-200"
                    }`}
                  >
                    <MaterialIcons 
                      name="refresh" 
                      size={18} 
                      color={isDark ? "#FFFFFF" : "#1F2937"} 
                    />
                    <Text className={`font-semibold text-xs ${isDark ? "text-white" : "text-slate-800"}`}>
                      Restart
                    </Text>
                  </Pressable>
                  {isPaused ? (
                    <Pressable
                      onPress={handleResumeSession}
                      className="bg-[#10B981] px-6 py-3 rounded-2xl flex-row items-center gap-2 shadow-lg"
                    >
                      <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
                      <Text className="text-white font-bold">Resume</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={handlePauseSession}
                      disabled={isPausingSession}
                      className={`bg-[#F59E0B] px-6 py-3 rounded-2xl flex-row items-center gap-2 shadow-lg ${
                        isPausingSession ? "opacity-50" : ""
                      }`}
                    >
                      <MaterialIcons name="pause" size={20} color="#FFFFFF" />
                      <Text className="text-white font-bold">Pause</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <View className={`p-5 rounded-3xl shadow-lg border ${
              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
            }`}>
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center gap-2">
                  <View className={`w-2 h-2 rounded-full ${
                    isDark ? "bg-gray-600" : "bg-gray-300"
                  }`} />
                  <Text className={`text-sm font-semibold uppercase tracking-tight ${
                    isDark ? "text-gray-400" : "text-slate-500"
                  }`}>
                    Clinical Session
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-col">
                  <Text className={`text-lg font-semibold ${
                    isDark ? "text-gray-300" : "text-slate-600"
                  }`}>
                    No active session
                  </Text>
                  <Text className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                    Start a new clinical session to track your work hours
                  </Text>
                </View>
                <Pressable
                  onPress={handleStartSession}
                  disabled={isStartingSession}
                  className={`bg-[#10B981] px-6 py-3 rounded-2xl flex-row items-center gap-2 shadow-lg ${
                    isStartingSession ? "opacity-50" : ""
                  }`}
                >
                  <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
                  <Text className="text-white font-bold">
                    {isStartingSession ? 'Starting...' : 'Start'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          <View className="flex-row flex-wrap" style={{ gap: 16 }}>
            {stats.map((stat, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  if (stat.route) {
                    router.push(stat.route as any);
                  }
                }}
                className={`p-4 rounded-3xl border ${
                  isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                }`}
                style={{ width: '47%' }}
              >
                <View className={`w-10 h-10 ${stat.bgColor} rounded-2xl items-center justify-center mb-3`}>
                  <MaterialIcons name={stat.icon} size={24} color={stat.iconColor} />
                </View>
                <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  {stat.value}
                </Text>
                <Text className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  {stat.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                Recent Activity
              </Text>
              <Pressable>
                <Text className="text-[#2B5F9E] text-sm font-semibold">View All</Text>
              </Pressable>
            </View>
            <View style={{ gap: 12 }}>
              {activities.map((activity, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    if (activity.title === 'New Reflection Added') {
                      router.push('/(tabs)/reflections');
                    }
                  }}
                  className={`flex-row items-center gap-4 p-4 rounded-2xl border ${
                    isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-50"
                  }`}
                >
                  <View className={`${activity.bgColor} p-2.5 rounded-xl`}>
                    <MaterialIcons 
                      name={activity.icon} 
                      size={20} 
                      color={activity.iconColor} 
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-800"}`}>
                      {activity.title}
                    </Text>
                    <Text className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      {activity.subtitle}
                    </Text>
                  </View>
                  <Text className={`text-xs ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                    {activity.time}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
