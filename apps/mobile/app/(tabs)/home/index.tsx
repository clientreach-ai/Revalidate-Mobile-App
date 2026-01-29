import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Animated, RefreshControl, Image, Dimensions, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { API_CONFIG } from '@revalidation-tracker/constants';
import { showToast } from '@/utils/toast';
import { setSubscriptionInfo } from '@/utils/subscription';
import { usePremium } from '@/hooks/usePremium';
import '../../global.css';

interface UserData {
  name: string | null;
  email: string;
  professionalRole: string | null;
  registrationNumber: string | null;
  revalidationDate: string | null;
  image: string | null;
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
  const { isPremium } = usePremium();
  const isMounted = useRef(true);
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
  const [lastPausedTimer, setLastPausedTimer] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [stats, setStats] = useState({
    totalHours: 0,
    totalEarnings: 0,
    cpdHours: 0,
    reflectionsCount: 0,
    appraisalsCount: 0,
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Work Session Form State
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [isSavingWork, setIsSavingWork] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [workSettingsOptions, setWorkSettingsOptions] = useState<any[]>([]);
  const [scopeOptions, setScopeOptions] = useState<any[]>([]);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [showWorkSettingModal, setShowWorkSettingModal] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form Fields
  const [workingMode, setWorkingMode] = useState<'Full time' | 'Part time'>('Full time');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');
  const [workSetting, setWorkSetting] = useState('');
  const [scope, setScope] = useState('');
  const [description, setDescription] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [slides, setSlides] = useState<Array<{ id: string; image: string; image_url?: string; name?: string; sort_order?: number }>>([]);
  const [slideImageMap, setSlideImageMap] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sliderEntrance = useRef(new Animated.Value(0)).current;

  const normalizeAbsoluteUrl = (maybeUrl?: string) => {
    if (!maybeUrl) return null;
    if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
    const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
    return `${base}${maybeUrl.startsWith('/') ? '' : '/'}${maybeUrl}`;
  };

  const SLIDE_CACHE_KEY = 'slideImageCacheV1';

  const getFileExtFromUrl = (url?: string) => {
    if (!url) return 'jpg';
    const m = url.match(/\.([a-zA-Z0-9]{2,5})(?:[?#]|$)/);
    return (m && m[1]) ? m[1] : 'jpg';
  };

  const startAutoScroll = () => {
    if (autoScrollIntervalRef.current) return;
    if (!slides || slides.length <= 1) return;

    const width = viewportWidth || Dimensions.get('window').width;

    autoScrollIntervalRef.current = setInterval(() => {
      if (scrollRef.current && slides.length > 1) {
        setCurrentSlideIndex(prev => {
          const next = (prev + 1) % slides.length;
          try {
            (scrollRef.current as any).scrollTo({ x: next * width, animated: true });
          } catch (e) { }
          return next;
        });
      }
    }, 3500) as any;
  };

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (autoScrollIntervalRef.current) clearInterval(autoScrollIntervalRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    Animated.timing(sliderEntrance, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [sliderEntrance]);

  useEffect(() => {
    if ((viewportWidth || 0) > 0 && slides.length > 1) {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
      startAutoScroll();
    }
  }, [viewportWidth, slides.length]);

  useEffect(() => {
    const loadAllData = async () => {
      await loadUserData();
      await Promise.all([
        loadActiveSession(),
        loadDashboardStats(),
        loadNotificationsCount(),
        loadRecentActivities(),
        loadSlides(),
        loadFormOptions()
      ]);
      if (isMounted.current) setIsLoading(false);
    };
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeSession && activeSession.isActive) {
      if (isPaused) {
        if (lastPausedTimer) setTimer(lastPausedTimer);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      } else {
        updateTimerFromSession();
        timerIntervalRef.current = setInterval(() => {
          updateTimerFromSession();
        }, 1000) as any;
      }
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
        setLastPausedTimer(null);
        AsyncStorage.removeItem('workSessionPauseState').catch(console.error);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeSession, isPaused, totalPausedTime, pausedAt, lastPausedTimer]);

  useEffect(() => {
    if (activeSession) savePauseState();
  }, [isPaused, pausedAt, totalPausedTime, activeSession?.id]);

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
        if (!isMounted.current) return;
        setActiveSession(response.data);
        try {
          const storedPauseState = await AsyncStorage.getItem('workSessionPauseState');
          if (storedPauseState) {
            const pauseState = JSON.parse(storedPauseState);
            if (pauseState.sessionId === response.data.id) {
              setIsPaused(pauseState.isPaused || false);
              setTotalPausedTime(pauseState.totalPausedTime || 0);
              if (pauseState.isPaused && pauseState.pausedAt) {
                setPausedAt(new Date(pauseState.pausedAt));
                if (pauseState.lastPausedTimer) {
                  setLastPausedTimer(pauseState.lastPausedTimer);
                  setTimer(pauseState.lastPausedTimer);
                }
              } else {
                setPausedAt(null);
                setLastPausedTimer(null);
                updateTimerFromSession();
              }
            } else {
              setIsPaused(false);
              setPausedAt(null);
              setTotalPausedTime(0);
              setLastPausedTimer(null);
              await AsyncStorage.removeItem('workSessionPauseState');
              updateTimerFromSession();
            }
          } else {
            setIsPaused(false);
            setPausedAt(null);
            setTotalPausedTime(0);
            setLastPausedTimer(null);
            updateTimerFromSession();
          }
        } catch (error) {
          setIsPaused(false);
          setPausedAt(null);
          setTotalPausedTime(0);
          setLastPausedTimer(null);
          updateTimerFromSession();
        }
      } else {
        setActiveSession(null);
        setIsPaused(false);
        setPausedAt(null);
        setTotalPausedTime(0);
        await AsyncStorage.removeItem('workSessionPauseState');
      }
    } catch (error) {
      console.error('Error loading active session:', error);
      if (isMounted.current) {
        setActiveSession(null);
        setIsPaused(false);
        setPausedAt(null);
        setTotalPausedTime(0);
      }
    }
  };

  const savePauseState = async () => {
    if (!activeSession) return;
    try {
      const pauseState = {
        sessionId: activeSession.id,
        isPaused,
        pausedAt: pausedAt?.toISOString() || null,
        totalPausedTime,
        lastPausedTimer: isPaused ? timer : null,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem('workSessionPauseState', JSON.stringify(pauseState));
    } catch (error) {
      console.error('Error saving pause state:', error);
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
        { start_time: startTime, work_description: '' },
        token
      );
      if (response?.data) {
        setActiveSession(response.data);
        setIsPaused(false);
        setPausedAt(null);
        setTotalPausedTime(0);
        setLastPausedTimer(null);
        await AsyncStorage.removeItem('workSessionPauseState');
        updateTimerFromSession();
        showToast.success('Clinical session started', 'Success');
      }
    } catch (error: any) {
      console.error('Error starting session:', error);
      showToast.error(error?.message || 'Failed to start session. Please try again.', 'Error');
    } finally {
      setIsStartingSession(false);
    }
  };

  const handlePauseSession = async () => {
    if (!activeSession || isPaused) return;
    setLastPausedTimer(timer);
    const now = new Date();
    setIsPaused(true);
    setPausedAt(now);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    showToast.info('Session paused', 'Paused');
    await savePauseState();
  };

  const handleResumeSession = async () => {
    if (!activeSession || !isPaused) return;
    const now = new Date();
    const pauseStartTime = pausedAt || now;
    const pauseDuration = now.getTime() - pauseStartTime.getTime();
    setTotalPausedTime(prev => prev + pauseDuration);
    setIsPaused(false);
    setPausedAt(null);
    setLastPausedTimer(null);
    updateTimerFromSession();
    timerIntervalRef.current = setInterval(() => {
      updateTimerFromSession();
    }, 1000) as any;
    showToast.info('Session resumed', 'Resumed');
    await savePauseState();
  };

  const handleRestartSession = async () => {
    Alert.alert('Restart Session', 'This will stop the current session and start a new one. Continue?', [
      { text: 'Cancel', style: 'cancel' },
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
              await apiService.put(`${API_ENDPOINTS.WORK_HOURS.UPDATE}/${activeSession.id}`, { end_time: endTime, work_description: '' }, token);
            }
            const startTime = new Date().toISOString();
            const response = await apiService.post<{ success: boolean; data: ActiveSession }>(API_ENDPOINTS.WORK_HOURS.CREATE, { start_time: startTime, work_description: '' }, token);
            if (response?.data) {
              setActiveSession(response.data);
              setIsPaused(false);
              setPausedAt(null);
              setTotalPausedTime(0);
              setLastPausedTimer(null);
              await AsyncStorage.removeItem('workSessionPauseState');
              updateTimerFromSession();
              showToast.success('Session restarted', 'Success');
            }
          } catch (error: any) {
            showToast.error(error?.message || 'Failed to restart session.', 'Error');
          }
        },
      },
    ]);
  };

  const loadFormOptions = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Check cache first for hospitals
      const cachedHospitals = await AsyncStorage.getItem('cached_hospitals');
      if (cachedHospitals) {
        setHospitals(JSON.parse(cachedHospitals));
      }

      const [hospResp, workResp, scopeResp] = await Promise.all([
        apiService.get<any>(API_ENDPOINTS.HOSPITALS.LIST, token).catch(() => null),
        apiService.get<any>('/api/v1/profile/work', token).catch(() => null),
        apiService.get<any>('/api/v1/profile/scope', token).catch(() => null),
      ]);

      if (hospResp?.data) {
        setHospitals(hospResp.data);
        await AsyncStorage.setItem('cached_hospitals', JSON.stringify(hospResp.data));
      }
      if (workResp?.data || Array.isArray(workResp)) {
        const items = Array.isArray(workResp) ? workResp : workResp.data;
        setWorkSettingsOptions(items.filter((i: any) => i.status === 'one' || i.status === 1));
      }
      if (scopeResp?.data || Array.isArray(scopeResp)) {
        const items = Array.isArray(scopeResp) ? scopeResp : scopeResp.data;
        setScopeOptions(items.filter((i: any) => i.status === 'one' || i.status === 1));
      }
    } catch (error) {
      console.error('Error loading form options:', error);
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;

    Alert.alert(
      'Stop Session',
      'Would you like to save this session to your working hours?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'No',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              if (!token) return;
              const endTime = new Date().toISOString();
              await apiService.put(`${API_ENDPOINTS.WORK_HOURS.UPDATE}/${activeSession.id}`, { end_time: endTime }, token);
              setActiveSession(null);
              showToast.success('Session ended');
              loadDashboardStats();
            } catch (error: any) {
              showToast.error(error?.message || 'Failed to stop session');
            }
          }
        },
        {
          text: 'Yes',
          onPress: () => {
            // Pre-fill form
            const totalHours = timer.hours + (timer.minutes / 60) + (timer.seconds / 3600);
            setHours(totalHours.toFixed(2));
            setWorkingMode('Full time');
            setSelectedDate(new Date());

            // Try to find default rate from profile if needed (though already fetched in loadUserData)
            // But rate state hasn't been set yet, let's look at userData
            if (userData) {
              // We might need to fetch hourly rate explicitly if it's not in UserData interface
            }

            setShowWorkForm(true);
          }
        }
      ]
    );
  };

  const handleCopySchedule = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const res = await apiService.get<any>(API_ENDPOINTS.WORK_HOURS.LIST + '?limit=1', token);
      if (res?.data?.[0]) {
        const last = res.data[0];
        setWorkSetting(last.workSetting || '');
        setScope(last.scopeOfPractice || '');
        setRate(String(last.hourlyRate || rate));
        if (last.location) {
          const hosp = hospitals.find(h => h.name === last.location);
          if (hosp) setSelectedHospital(hosp);
          else setSelectedHospital({ name: last.location });
        }
        showToast.success('Details copied from last session');
      } else {
        showToast.info('No previous session found');
      }
    } catch (e) {
      showToast.error('Failed to copy schedule');
    }
  };

  const handleSaveWorkSession = async () => {
    if (!selectedHospital || !hours || !workSetting || !scope || !rate) {
      showToast.error('Please fill all required fields');
      return;
    }

    try {
      setIsSavingWork(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const endTime = new Date().toISOString();
      const startTimeDate = new Date(activeSession!.startTime);
      // Ensure date matches what user selected
      startTimeDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

      const payload = {
        end_time: endTime,
        start_time: startTimeDate.toISOString(),
        location: selectedHospital.name,
        shift_type: workingMode,
        duration_minutes: Math.round(parseFloat(hours) * 60),
        hourly_rate: parseFloat(rate),
        work_description: description,
        work_setting: workSetting,
        scope_of_practice: scope,
        document_ids: documents.map(d => d.id),
      };

      await apiService.put(`${API_ENDPOINTS.WORK_HOURS.UPDATE}/${activeSession!.id}`, payload, token);

      setActiveSession(null);
      setShowWorkForm(false);
      showToast.success('Work session saved successfully');
      loadDashboardStats();
      loadRecentActivities();
    } catch (error: any) {
      showToast.error(error?.message || 'Failed to save session');
    } finally {
      setIsSavingWork(false);
    }
  };

  const handleDocumentPick = async (source: 'gallery' | 'camera') => {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showToast.error(`${source} permission required`);
        return;
      }

      const result = await (source === 'camera'
        ? ImagePicker.launchCameraAsync({ quality: 0.5 })
        : ImagePicker.launchImageLibraryAsync({ quality: 0.5 }));

      if (!result.canceled && result.assets[0]) {
        setIsUploading(true);
        const token = await AsyncStorage.getItem('authToken');
        if (!token) return;

        const uploadResp = await apiService.uploadFile(
          API_ENDPOINTS.DOCUMENTS.UPLOAD,
          {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: `evidence_${Date.now()}.jpg`,
          },
          token,
          { category: 'work_hours' }
        );

        if (uploadResp?.data) {
          setDocuments(prev => [...prev, uploadResp.data]);
          showToast.success('Document uploaded');
        }
      }
    } catch (error) {
      showToast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      const response = await apiService.get<{ success: boolean; data: any }>(API_ENDPOINTS.USERS.ME, token);
      if (response?.data) {
        const data = response.data;
        const userName = data.name || data.email?.split('@')[0] || 'User';
        if (isMounted.current) {
          setUserData({ name: userName, email: data.email, professionalRole: data.professionalRole, registrationNumber: data.registrationNumber, revalidationDate: data.revalidationDate, image: data.image || null });
          if (data.hourlyRate) setRate(String(data.hourlyRate));
        }
        if (data.subscriptionTier) {
          await setSubscriptionInfo({ subscriptionTier: data.subscriptionTier as any, subscriptionStatus: data.subscriptionStatus as any, isPremium: data.subscriptionTier === 'premium', canUseOffline: data.subscriptionTier === 'premium' });
        }
        if (data.revalidationDate) {
          try {
            const date = new Date(data.revalidationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            date.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (isMounted.current) setRevalidationDays(diffDays);
          } catch (e) {
            setRevalidationDays(null);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const getRolePrefix = (role: string | null): string => {
    if (!role) return '';
    const map: any = { doctor: 'Dr.', nurse: 'Nurse', pharmacist: 'Pharmacist', dentist: 'Dr.' };
    return map[role] || '';
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDateShort = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay();

  const handleCalDateSelect = (day: number) => {
    setSelectedDate(new Date(calYear, calMonth, day));
    setShowDatePicker(false);
  };

  const navigateCalMonth = (dir: 'prev' | 'next') => {
    if (dir === 'prev') {
      if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
      else setCalMonth(calMonth - 1);
    } else {
      if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
      else setCalMonth(calMonth + 1);
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(calMonth, calYear);
    const firstDay = getFirstDayOfMonth(calMonth, calYear);
    const nodes: any[] = [];
    for (let i = 0; i < firstDay; i++) nodes.push(<View key={`empty-${i}`} className="w-10 h-10" />);
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === calMonth && selectedDate.getFullYear() === calYear;
      nodes.push(
        <Pressable
          key={day}
          onPress={() => handleCalDateSelect(day)}
          className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-600' : ''}`}
        >
          <Text className={`text-sm font-medium ${isSelected ? 'text-white' : (isDark ? 'text-white' : 'text-slate-800')}`}>{day}</Text>
        </Pressable>
      );
    }
    return nodes;
  };

  const formatUserName = () => {
    if (!userData) return 'User';
    const prefix = getRolePrefix(userData.professionalRole);
    const name = userData.name || (userData.email.split('@')[0] ?? '');
    return prefix ? `${prefix} ${name}` : name;
  };

  const formatTime = (v: number) => v.toString().padStart(2, '0');

  const loadDashboardStats = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const whr = await apiService.get<{ success: boolean; data: { totalHours: number } }>(API_ENDPOINTS.WORK_HOURS.STATS_TOTAL, token);
      const totalHours = whr?.data?.totalHours || 0;
      let cpdHours = 0;
      try {
        const cpd = await apiService.get<{ success: boolean; data: { totalHours: number } }>('/api/v1/cpd-hours/stats/total', token);
        cpdHours = cpd?.data?.totalHours || 0;
      } catch (e) { }
      let reflectionsCount = 0;
      try {
        const ref = await apiService.get<{ pagination: { total: number } }>('/api/v1/reflections?limit=1', token);
        reflectionsCount = ref?.pagination?.total || 0;
      } catch (e) { }
      let appraisalsCount = 0;
      try {
        const appr = await apiService.get<{ pagination: { total: number } }>(API_ENDPOINTS.APPRAISALS.LIST + '?limit=1', token);
        appraisalsCount = appr?.pagination?.total || 0;
      } catch (e) { }

      if (isMounted.current) {
        setStats({ totalHours: Math.round(totalHours), totalEarnings: Math.round(totalHours * 35), cpdHours: Math.round(cpdHours), reflectionsCount, appraisalsCount });
      }
    } catch (error) {
      console.error('Error stats:', error);
    }
  };

  const loadNotificationsCount = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const res = await apiService.get<{ data: any[] }>('/api/v1/notifications', token);
      if (res?.data) {
        const unread = res.data.filter(n => n.status === '0' || n.isRead === false).length;
        if (isMounted.current) setUnreadNotifications(unread);
      }
    } catch (e) { }
  };

  const formatTimeAgo = (iso?: string) => {
    if (!iso) return '';
    const diffS = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diffS < 60) return `${diffS}s`;
    if (diffS < 3600) return `${Math.floor(diffS / 60)}m`;
    if (diffS < 86400) return `${Math.floor(diffS / 3600)}h`;
    return `${Math.floor(diffS / 86400)}d`;
  };

  const loadRecentActivities = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const res = await apiService.get<{ data: any[] }>(`/api/v1/notifications?limit=6`, token);
      if (res?.data) {
        const mapped = res.data.map((it: any) => ({ title: it.title || 'Notification', subtitle: it.message || '', time: formatTimeAgo(it.createdAt), icon: it.icon || 'notifications', iconColor: '#2B5F9E', bgColor: 'bg-slate-100' }));
        if (isMounted.current) setRecentActivities(mapped);
      }
    } catch (e) { }
  };

  const loadSlides = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const resp: any = await apiService.get('/api/v1/sliders', token ?? undefined);
      const items = Array.isArray(resp) ? resp : resp?.data ?? [];
      const valid = items.filter((s: any) => s.name && (s.status == 1 || s.status == 'one')).map((s: any) => ({ id: String(s.id), image: String(s.image || ''), image_url: s.image_url, name: s.name, sort_order: Number(s.sort_order || 0) })).sort((a: any, b: any) => a.sort_order - b.sort_order);
      if (isMounted.current) setSlides(valid);
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(SLIDE_CACHE_KEY);
          const cached = raw ? JSON.parse(raw) : {};
          for (const s of valid) {
            const url = s.image_url ? normalizeAbsoluteUrl(s.image_url) : `${API_CONFIG.BASE_URL}/uploads/${s.image}`;
            if (!url) continue;
            if (cached[s.id]?.url === url) {
              setSlideImageMap(p => ({ ...p, [s.id]: cached[s.id].localUri }));
              continue;
            }
            try {
              const fileName = `slide_${s.id}.jpg`;
              const localPath = `${FileSystem.cacheDirectory}${fileName}`;
              const dl = await FileSystem.downloadAsync(url, localPath);
              if (dl.uri) {
                setSlideImageMap(p => ({ ...p, [s.id]: dl.uri }));
                cached[s.id] = { url, localUri: dl.uri };
                await AsyncStorage.setItem(SLIDE_CACHE_KEY, JSON.stringify(cached));
              }
            } catch (e) { }
          }
        } catch (e) { }
      })();
    } catch (e) { }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUserData(), loadActiveSession(), loadDashboardStats(), loadNotificationsCount(), loadRecentActivities()]);
    setRefreshing(false);
  };

  const PulsingDot = () => {
    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 0.3, duration: 1000, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true })])).start();
    }, []);
    return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', opacity: pulse }} />;
  };

  const getStatsList = () => {
    const base = [
      { icon: 'schedule', value: stats.totalHours, label: 'Hours', route: '/(tabs)/workinghours' },
      { icon: 'payments', value: `£${stats.totalEarnings}`, label: 'Earnings', route: '/(tabs)/earings', premium: true },
      { icon: 'school', value: stats.cpdHours, label: 'CPD Hours', route: '/(tabs)/cpdhourstracking' },
      { icon: 'description', value: stats.reflectionsCount, label: 'Reflections', route: '/(tabs)/reflections' },
      { icon: 'verified', value: stats.appraisalsCount, label: 'Appraisals', route: '/(tabs)/appraisal', color: '#E11D48' }
    ];
    return base.filter(s => !s.premium || isPremium).map(s => ({ ...s, icon: s.icon as any }));
  };
  const statsList = getStatsList();

  const activities = recentActivities;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isPremium ? '#D4AF37' : '#2B5F9E'} />}>
        <View className="px-6 pt-6 pb-20 rounded-b-[40px]" style={{ backgroundColor: isPremium ? '#D4AF37' : '#2B5F9E' }}>
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-full border-2 border-white/30 items-center justify-center bg-white/20">
                {userData?.image ? <Image source={{ uri: userData.image }} className="w-full h-full rounded-full" /> : <MaterialIcons name="person" size={24} color="#FFFFFF" />}
              </View>
              <View>
                <Text className="text-white/90 text-xs font-medium uppercase">{getGreeting()}</Text>
                <Text className="text-white text-xl font-bold">{isLoading ? 'Loading...' : formatUserName()}</Text>
              </View>
            </View>
            {isPremium && <Pressable onPress={() => router.push('/(tabs)/notifications')} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center border border-white/30"><MaterialIcons name="notifications-active" size={22} color="#FFFFFF" /></Pressable>}
          </View>
          {revalidationDays !== null && (
            <View className="px-3 py-2 rounded-2xl items-center border bg-white/10 border-white/20 w-32">
              <Text className="text-[10px] font-semibold text-white/80 uppercase">Revalidation</Text>
              <Text className="font-bold text-white">{revalidationDays > 0 ? `${revalidationDays} Days` : revalidationDays === 0 ? 'Due Today' : 'Overdue'}</Text>
            </View>
          )}
        </View>

        <View className="flex-1 -mt-12 px-6" style={{ gap: 24 }}>
          {activeSession?.isActive ? (
            <View className={`p-5 rounded-3xl shadow-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center gap-2">{!isPaused && <PulsingDot />}{isPaused && <View className="w-2 h-2 rounded-full bg-yellow-500" />}<Text className="text-sm font-semibold uppercase text-slate-500">{isPaused ? 'Paused Session' : 'Active Session'}</Text></View>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className={`text-4xl font-mono font-bold ${isDark ? "text-white" : "text-slate-800"}`}>{formatTime(timer.hours)}:{formatTime(timer.minutes)}:{formatTime(timer.seconds)}</Text>
                <View className="flex-row gap-2">
                  <Pressable onPress={handleRestartSession} className="p-3 rounded-2xl bg-slate-200"><MaterialIcons name="refresh" size={20} /></Pressable>
                  <Pressable onPress={isPaused ? handleResumeSession : handlePauseSession} className={`px-5 py-3 rounded-2xl flex-row items-center gap-2 ${isPaused ? "bg-green-500" : "bg-amber-500"}`}><MaterialIcons name={isPaused ? "play-arrow" : "pause"} color="white" size={20} /></Pressable>
                  <Pressable onPress={handleStopSession} className="px-5 py-3 rounded-2xl bg-red-500 flex-row items-center gap-2">
                    <MaterialIcons name="stop" color="white" size={20} />

                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View className={`p-5 rounded-3xl shadow-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
              <View className="flex-row items-center justify-between">
                <View><Text className="text-lg font-semibold text-slate-600">No active session</Text><Text className="text-xs text-slate-400">Track your clinical hours</Text></View>
                <Pressable onPress={handleStartSession} className="bg-green-500 px-6 py-3 rounded-2xl flex-row items-center gap-2"><MaterialIcons name="play-arrow" color="white" size={20} /></Pressable>
              </View>
            </View>
          )}

          <View className={`p-2 rounded-2xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`} onLayout={e => setViewportWidth(e.nativeEvent.layout.width)}>
            {slides.length === 0 ? <View className="p-6 items-center"><Text className="text-slate-400">No announcements</Text></View> : (
              <ScrollView ref={scrollRef as any} horizontal pagingEnabled onMomentumScrollEnd={e => setCurrentSlideIndex(Math.round(e.nativeEvent.contentOffset.x / viewportWidth))}>
                {slides.map(s => (
                  <View key={s.id} style={{ width: viewportWidth - 16, height: 160, borderRadius: 16, overflow: 'hidden', marginHorizontal: 8 }}>
                    <Image source={{ uri: slideImageMap[s.id] || normalizeAbsoluteUrl(s.image_url) || '' }} className="w-full h-full" resizeMode="cover" />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View className="flex-row flex-wrap" style={{ gap: 16 }}>
            {statsList.map((s, i) => (
              <Pressable key={i} onPress={() => router.push(s.route as any)} className={`p-4 rounded-3xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`} style={{ width: '47%' }}>
                <View className="w-10 h-10 bg-slate-50 rounded-2xl items-center justify-center mb-3"><MaterialIcons name={s.icon} size={24} color={s.color || "#2B5F9E"} /></View>
                <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>{s.value}</Text>
                <Text className="text-sm text-slate-500">{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Work Session Form Modal */}
      <Modal visible={showWorkForm} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`h-[90%] rounded-t-[40px] ${isDark ? "bg-slate-900" : "bg-white"} p-6`}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Save Work Session</Text>
              <Pressable onPress={() => setShowWorkForm(false)} className="p-2"><MaterialIcons name="close" size={24} color={isDark ? "white" : "black"} /></Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Copy Schedule */}
              <Pressable
                onPress={handleCopySchedule}
                className={`mb-6 p-4 rounded-2xl border flex-row items-center justify-center gap-2 ${isDark ? "bg-slate-800 border-slate-700" : "bg-blue-50 border-blue-100"}`}
              >
                <MaterialIcons name="content-copy" size={20} color="#2B5F9E" />
                <Text className="text-[#2B5F9E] font-bold">Copy Details From Previous Session</Text>
              </Pressable>

              {/* Working Mode */}
              <View className="mb-6">
                <Text className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>WORKING MODE (REQUIRED)</Text>
                <View className="flex-row gap-4">
                  {['Full time', 'Part time'].map((mode) => (
                    <Pressable
                      key={mode}
                      onPress={() => setWorkingMode(mode as any)}
                      className={`flex-1 py-3 items-center rounded-2xl border ${workingMode === mode ? "bg-blue-500 border-blue-500" : (isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}`}
                    >
                      <Text className={`font-bold ${workingMode === mode ? "text-white" : (isDark ? "text-slate-400" : "text-slate-600")}`}>{mode}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Date */}
              <View className="mb-6">
                <Text className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>DATE (REQUIRED)</Text>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  className={`p-4 rounded-2xl border flex-row justify-between items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                >
                  <Text className={isDark ? "text-white" : "text-slate-800"}>{formatDateShort(selectedDate)}</Text>
                  <MaterialIcons name="calendar-today" size={20} color={isDark ? "white" : "gray"} />
                </Pressable>
              </View>

              {/* Hospital */}
              <View className="mb-6">
                <Text className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>HOSPITAL (REQUIRED)</Text>
                <Pressable
                  onPress={() => setShowHospitalModal(true)}
                  className={`p-4 rounded-2xl border flex-row justify-between items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                >
                  <Text className={isDark ? "text-white" : "text-slate-800"}>{selectedHospital?.name || 'Select Hospital'}</Text>
                  <MaterialIcons name="search" size={20} color={isDark ? "white" : "gray"} />
                </Pressable>
              </View>

              {/* Hours and Rate */}
              <View className="flex-row gap-4 mb-6">
                <View className="flex-1">
                  <Text className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>HOURS (REQUIRED)</Text>
                  <TextInput
                    value={hours}
                    onChangeText={setHours}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="gray"
                    className={`p-4 rounded-2xl border ${isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                  />
                </View>
                <View className="flex-1">
                  <Text className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>RATE (£/HR) (REQUIRED)</Text>
                  <TextInput
                    value={rate}
                    onChangeText={setRate}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="gray"
                    className={`p-4 rounded-2xl border ${isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                  />
                </View>
              </View>

              {/* Work Setting */}
              <View className="mb-6">
                <Text className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>WORK SETTING (REQUIRED)</Text>
                <Pressable
                  onPress={() => setShowWorkSettingModal(true)}
                  className={`p-4 rounded-2xl border flex-row justify-between items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                >
                  <Text className={isDark ? "text-white" : "text-slate-800"}>{workSetting || 'Select Setting'}</Text>
                  <MaterialIcons name="expand-more" size={20} color={isDark ? "white" : "gray"} />
                </Pressable>
              </View>

              {/* Scope of Practice */}
              <View className="mb-6">
                <Text className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>SCOPE OF PRACTICE (REQUIRED)</Text>
                <Pressable
                  onPress={() => setShowScopeModal(true)}
                  className={`p-4 rounded-2xl border flex-row justify-between items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                >
                  <Text className={isDark ? "text-white" : "text-slate-800"}>{scope || 'Select Scope'}</Text>
                  <MaterialIcons name="expand-more" size={20} color={isDark ? "white" : "gray"} />
                </Pressable>
              </View>

              {/* Description */}
              <View className="mb-6">
                <Text className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>BRIEF DESCRIPTION</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  placeholder="Describe your work..."
                  placeholderTextColor="gray"
                  style={{ minHeight: 100, textAlignVertical: 'top' }}
                  className={`p-4 rounded-2xl border ${isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                />
              </View>

              {/* Evidence */}
              <View className="mb-8">
                <Text className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>EVIDENCE (DOCUMENTS)</Text>
                <View className="flex-row flex-wrap gap-3">
                  {documents.map((doc, idx) => (
                    <View key={idx} className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      <Image source={{ uri: doc.url }} className="w-full h-full" />
                      <Pressable
                        onPress={() => setDocuments(docs => docs.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                      >
                        <MaterialIcons name="close" size={12} color="white" />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable
                    onPress={() => {
                      Alert.alert('Upload Evidence', 'Choose source', [
                        { text: 'Gallery', onPress: () => handleDocumentPick('gallery') },
                        { text: 'Camera', onPress: () => handleDocumentPick('camera') },
                        { text: 'Cancel', style: 'cancel' }
                      ]);
                    }}
                    className={`w-20 h-20 rounded-xl border-2 border-dashed items-center justify-center ${isDark ? "border-slate-700 bg-slate-800" : "border-slate-300 bg-slate-50"}`}
                  >
                    {isUploading ? <ActivityIndicator size="small" color="#2B5F9E" /> : <MaterialIcons name="add-a-photo" size={24} color="gray" />}
                  </Pressable>
                </View>
              </View>

              {/* Save Button */}
              <Pressable
                onPress={handleSaveWorkSession}
                disabled={isSavingWork}
                className={`py-4 rounded-2xl items-center bg-[#2B5F9E] ${isSavingWork ? 'opacity-70' : ''}`}
              >
                {isSavingWork ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Save Session</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>

        {/* Hospital Selection Modal */}
        <Modal visible={showHospitalModal} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center px-6">
            <View className={`h-[80%] rounded-3xl ${isDark ? "bg-slate-900" : "bg-white"} p-6`}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Select Hospital</Text>
                <Pressable onPress={() => setShowHospitalModal(false)}><MaterialIcons name="close" size={24} color={isDark ? "white" : "black"} /></Pressable>
              </View>
              <View className={`flex-row items-center px-4 rounded-xl mb-4 border ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
                <MaterialIcons name="search" size={20} color="gray" />
                <TextInput
                  value={hospitalSearch}
                  onChangeText={setHospitalSearch}
                  placeholder="Search hospital..."
                  placeholderTextColor="gray"
                  className={`flex-1 p-3 ${isDark ? "text-white" : "text-slate-800"}`}
                />
              </View>
              <ScrollView>
                {hospitals
                  .filter(h => h.name.toLowerCase().includes(hospitalSearch.toLowerCase()))
                  .map((h) => (
                    <Pressable
                      key={h.id}
                      onPress={() => {
                        setSelectedHospital(h);
                        setShowHospitalModal(false);
                      }}
                      className={`py-4 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}
                    >
                      <Text className={`text-base ${isDark ? "text-white" : "text-slate-800"}`}>{h.name}</Text>
                      <Text className="text-xs text-slate-400">{h.town}, {h.postcode}</Text>
                    </Pressable>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Selector Modal (Work Setting / Scope) */}
        <Modal visible={showWorkSettingModal || showScopeModal} transparent animationType="fade">
          <Pressable className="flex-1 bg-black/50 justify-center px-6" onPress={() => { setShowWorkSettingModal(false); setShowScopeModal(false); }}>
            <View className={`rounded-3xl ${isDark ? "bg-slate-900" : "bg-white"} p-6 max-h-[70%]`}>
              <Text className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-800"}`}>
                {showWorkSettingModal ? 'Select Work Setting' : 'Select Scope of Practice'}
              </Text>
              <ScrollView>
                {(showWorkSettingModal ? workSettingsOptions : scopeOptions).map((opt: any) => (
                  <Pressable
                    key={opt.id || opt.value}
                    onPress={() => {
                      if (showWorkSettingModal) setWorkSetting(opt.name || opt.label);
                      else setScope(opt.name || opt.label);
                      setShowWorkSettingModal(false);
                      setShowScopeModal(false);
                    }}
                    className={`py-4 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}
                  >
                    <Text className={`text-base ${isDark ? "text-white" : "text-slate-800"}`}>{opt.name || opt.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowDatePicker(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-t-3xl p-6`}>
            <View className="flex-row items-center justify-between mb-4">
              <Pressable onPress={() => navigateCalMonth('prev')} className="p-2">
                <MaterialIcons name="chevron-left" size={24} color={isDark ? 'white' : 'black'} />
              </Pressable>
              <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{monthNames[calMonth]} {calYear}</Text>
              <Pressable onPress={() => navigateCalMonth('next')} className="p-2">
                <MaterialIcons name="chevron-right" size={24} color={isDark ? 'white' : 'black'} />
              </Pressable>
            </View>
            <View className="flex-row justify-between mb-3">
              {dayNames.map(d => <View key={d} className="w-10 items-center"><Text className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{d}</Text></View>)}
            </View>
            <View className="flex-row flex-wrap justify-between mb-6">{renderCalendarDays()}</View>
            <Pressable onPress={() => setShowDatePicker(false)} className={`py-4 rounded-2xl items-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Text className={`font-semibold ${isDark ? 'text-white' : 'text-slate-700'}`}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
