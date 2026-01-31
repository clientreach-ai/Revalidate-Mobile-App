import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Animated,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { API_CONFIG } from '@revalidation-tracker/constants';
import { showToast } from '@/utils/toast';
import { setSubscriptionInfo } from '@/utils/subscription';
import { usePremium } from '@/hooks/usePremium';
import {
  DiscoveryModal,
  useDiscoveryModal,
} from '@/features/auth/DiscoveryModal';
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
  isPaused?: boolean;
  pausedAt?: string | null;
  totalPausedMs?: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();
  const { showModal, showDiscoveryModal, hideModal } = useDiscoveryModal();
  const isMounted = useRef(true);

  useEffect(() => {
    showDiscoveryModal();
  }, []);

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(
    null
  );
  const [timer, setTimer] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [userData, setUserData] = useState<UserData | null>(null);
  const [revalidationDays, setRevalidationDays] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [lastPausedTimer, setLastPausedTimer] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
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
  const [localProfileImage, setLocalProfileImage] = useState<string | null>(
    null
  );

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
  const [workingMode, setWorkingMode] = useState<'Full time' | 'Part time'>(
    'Full time'
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');
  const [workSetting, setWorkSetting] = useState('');
  const [scope, setScope] = useState('');
  const [description, setDescription] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [slides, setSlides] = useState<
    Array<{
      id: string;
      image: string;
      image_url?: string;
      name?: string;
      sort_order?: number;
    }>
  >([]);
  const [slideImageMap, setSlideImageMap] = useState<Record<string, string>>(
    {}
  );
  const scrollRef = useRef<ScrollView | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(0);
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

  const startAutoScroll = () => {
    if (autoScrollIntervalRef.current) return;
    if (!slides || slides.length <= 1) return;

    const width = viewportWidth || Dimensions.get('window').width;

    let currentIndex = 0;

    autoScrollIntervalRef.current = setInterval(() => {
      if (scrollRef.current && slides.length > 1) {
        const next = (currentIndex + 1) % slides.length;
        try {
          (scrollRef.current as any).scrollTo({
            x: next * width,
            animated: true,
          });
          currentIndex = next;
        } catch (e) {}
      }
    }, 3500) as any;
  };

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (autoScrollIntervalRef.current)
        clearInterval(autoScrollIntervalRef.current);
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
        loadFormOptions(),
      ]);
      if (isMounted.current) setIsLoading(false);
    };
    loadAllData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotificationsCount();
      loadRecentActivities();
    }, [])
  );

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
        const session = response.data;
        setActiveSession(session);
        setIsPaused(session.isPaused || false);
        setTotalPausedTime(session.totalPausedMs || 0);
        setPausedAt(session.pausedAt ? new Date(session.pausedAt) : null);

        // If it's paused, we might want to calculate the timer at the moment of pause
        if (session.isPaused && session.pausedAt) {
          const startTime = new Date(session.startTime);
          const pauseTime = new Date(session.pausedAt);
          const diffMs =
            pauseTime.getTime() -
            startTime.getTime() -
            (session.totalPausedMs || 0);
          const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          const s = totalSeconds % 60;
          setTimer({ hours: h, minutes: m, seconds: s });
          setLastPausedTimer({ hours: h, minutes: m, seconds: s });
        } else {
          setLastPausedTimer(null);
          // Initial timer update will happen in the useEffect
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

  const handleStartSession = async () => {
    try {
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
      showToast.error(
        error?.message || 'Failed to start session. Please try again.',
        'Error'
      );
    }
  };

  const handlePauseSession = async () => {
    if (!activeSession || isPaused) return;
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await apiService.post<{
        success: boolean;
        data: ActiveSession;
      }>(API_ENDPOINTS.WORK_HOURS.PAUSE, {}, token);

      if (response?.data) {
        setActiveSession(response.data);
        setIsPaused(true);
        setPausedAt(new Date(response.data.pausedAt!));
        setLastPausedTimer(timer);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        showToast.info('Session paused', 'Paused');
      }
    } catch (error: any) {
      showToast.error(error?.message || 'Failed to pause session');
    }
  };

  const handleResumeSession = async () => {
    if (!activeSession || !isPaused) return;
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await apiService.post<{
        success: boolean;
        data: ActiveSession;
      }>(API_ENDPOINTS.WORK_HOURS.RESUME, {}, token);

      if (response?.data) {
        setActiveSession(response.data);
        setIsPaused(false);
        setPausedAt(null);
        setTotalPausedTime(response.data.totalPausedMs || 0);
        setLastPausedTimer(null);
        updateTimerFromSession();
        timerIntervalRef.current = setInterval(() => {
          updateTimerFromSession();
        }, 1000) as any;
        showToast.info('Session resumed', 'Resumed');
      }
    } catch (error: any) {
      showToast.error(error?.message || 'Failed to resume session');
    }
  };

  const handleRestartSession = async () => {
    Alert.alert(
      'Restart Session',
      'This will stop the current session and start a new one. Continue?',
      [
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

              const response = await apiService.post<{
                success: boolean;
                data: ActiveSession;
              }>(API_ENDPOINTS.WORK_HOURS.RESTART, {}, token);

              if (response?.data) {
                // Immediately reset local timer state to avoid showing stale data
                setTimer({ hours: 0, minutes: 0, seconds: 0 });
                setActiveSession(response.data);
                setIsPaused(false);
                setPausedAt(null);
                setTotalPausedTime(0);
                setLastPausedTimer(null);
                await AsyncStorage.removeItem('workSessionPauseState');
                showToast.success('Session restarted', 'Success');
              }
            } catch (error: any) {
              showToast.error(
                error?.message || 'Failed to restart session.',
                'Error'
              );
            }
          },
        },
      ]
    );
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
        apiService
          .get<any>(API_ENDPOINTS.HOSPITALS.LIST, token)
          .catch(() => null),
        apiService.get<any>('/api/v1/profile/work', token).catch(() => null),
        apiService.get<any>('/api/v1/profile/scope', token).catch(() => null),
      ]);

      if (hospResp?.data) {
        setHospitals(hospResp.data);
        await AsyncStorage.setItem(
          'cached_hospitals',
          JSON.stringify(hospResp.data)
        );
      }
      if (workResp?.data || Array.isArray(workResp)) {
        const items = Array.isArray(workResp) ? workResp : workResp.data;
        setWorkSettingsOptions(
          items.filter((i: any) => i.status === 'one' || i.status === 1)
        );
      }
      if (scopeResp?.data || Array.isArray(scopeResp)) {
        const items = Array.isArray(scopeResp) ? scopeResp : scopeResp.data;
        setScopeOptions(
          items.filter((i: any) => i.status === 'one' || i.status === 1)
        );
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
              await apiService.put(
                `${API_ENDPOINTS.WORK_HOURS.UPDATE}/${activeSession.id}`,
                { end_time: endTime },
                token
              );
              setActiveSession(null);
              showToast.success('Session ended');
              loadDashboardStats();
            } catch (error: any) {
              showToast.error(error?.message || 'Failed to stop session');
            }
          },
        },
        {
          text: 'Yes',
          onPress: () => {
            // Pre-fill form
            const totalHours =
              timer.hours + timer.minutes / 60 + timer.seconds / 3600;
            setHours(totalHours.toFixed(2));
            setWorkingMode('Full time');
            setSelectedDate(new Date());

            // Try to find default rate from profile if needed (though already fetched in loadUserData)
            // But rate state hasn't been set yet, let's look at userData
            if (userData) {
              // We might need to fetch hourly rate explicitly if it's not in UserData interface
            }

            setShowWorkForm(true);
          },
        },
      ]
    );
  };

  const handleCopySchedule = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const res = await apiService.get<any>(
        API_ENDPOINTS.WORK_HOURS.LIST + '?limit=1',
        token
      );
      if (res?.data?.[0]) {
        const last = res.data[0];
        setWorkSetting(last.workSetting || '');
        setScope(last.scopeOfPractice || '');
        setRate(String(last.hourlyRate || rate));
        if (last.location) {
          const hosp = hospitals.find((h) => h.name === last.location);
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
      startTimeDate.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );

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
        document_ids: documents.map((d) => d.id),
      };

      await apiService.put(
        `${API_ENDPOINTS.WORK_HOURS.UPDATE}/${activeSession!.id}`,
        payload,
        token
      );

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
      const permission =
        source === 'camera'
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
          setDocuments((prev) => [...prev, uploadResp.data]);
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
      const response = await apiService.get<{ success: boolean; data: any }>(
        API_ENDPOINTS.USERS.ME,
        token
      );
      if (response?.data) {
        const data = response.data;
        const userName = data.name || data.email?.split('@')[0] || 'User';
        if (isMounted.current) {
          setUserData({
            name: userName,
            email: data.email,
            professionalRole: data.professionalRole,
            registrationNumber: data.registrationNumber,
            revalidationDate: data.revalidationDate,
            image: data.image || null,
          });
          if (data.hourlyRate) setRate(String(data.hourlyRate));
        }
        if (data.subscriptionTier) {
          await setSubscriptionInfo({
            subscriptionTier: data.subscriptionTier as any,
            subscriptionStatus: data.subscriptionStatus as any,
            isPremium: data.subscriptionTier === 'premium',
            canUseOffline: data.subscriptionTier === 'premium',
          });
        }
        if (data.revalidationDate) {
          try {
            const date = new Date(data.revalidationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            date.setHours(0, 0, 0, 0);
            const diffDays = Math.floor(
              (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (isMounted.current) setRevalidationDays(diffDays);
          } catch (e) {
            setRevalidationDays(null);
          }
        }
        // Load local profile image from AsyncStorage
        try {
          const key = data.id
            ? `profile_image_uri_${data.id}`
            : 'profile_image_uri';
          const localImg = await AsyncStorage.getItem(key);
          if (localImg && isMounted.current) {
            setLocalProfileImage(localImg);
          }
        } catch (e) {
          console.log('Error loading local profile image:', e);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const getRolePrefix = (role: string | null): string => {
    if (!role) return '';
    const map: any = {
      doctor: 'Dr.',
      nurse: 'Nurse',
      pharmacist: 'Pharmacist',
      dentist: 'Dr.',
    };
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

  const getDaysInMonth = (m: number, y: number) =>
    new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m: number, y: number) =>
    new Date(y, m, 1).getDay();

  const handleCalDateSelect = (day: number) => {
    setSelectedDate(new Date(calYear, calMonth, day));
    setShowDatePicker(false);
  };

  const navigateCalMonth = (dir: 'prev' | 'next') => {
    if (dir === 'prev') {
      if (calMonth === 0) {
        setCalMonth(11);
        setCalYear(calYear - 1);
      } else setCalMonth(calMonth - 1);
    } else {
      if (calMonth === 11) {
        setCalMonth(0);
        setCalYear(calYear + 1);
      } else setCalMonth(calMonth + 1);
    }
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(calMonth, calYear);
    const firstDay = getFirstDayOfMonth(calMonth, calYear);
    const nodes: any[] = [];
    for (let i = 0; i < firstDay; i++)
      nodes.push(<View key={`empty-${i}`} className="w-10 h-10" />);
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === calMonth &&
        selectedDate.getFullYear() === calYear;
      nodes.push(
        <Pressable
          key={day}
          onPress={() => handleCalDateSelect(day)}
          className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-600' : ''}`}
        >
          <Text
            className={`text-sm font-medium ${isSelected ? 'text-white' : isDark ? 'text-white' : 'text-slate-800'}`}
          >
            {day}
          </Text>
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

  const formatTimeLabel = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatCurrency = (value: number) => {
    try {
      return `£${new Intl.NumberFormat('en-GB').format(Math.round(value))}`;
    } catch {
      return `£${Math.round(value)}`;
    }
  };

  const loadDashboardStats = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const whr = await apiService.get<{
        success: boolean;
        data: { totalHours: number; totalEarnings?: number };
      }>(API_ENDPOINTS.WORK_HOURS.STATS_TOTAL, token);
      let totalHours = whr?.data?.totalHours || 0;
      let totalEarnings = whr?.data?.totalEarnings || 0;

      if (totalHours === 0 || totalEarnings === 0) {
        try {
          const onboarding = await apiService.get<{ data: any }>(
            API_ENDPOINTS.USERS.ONBOARDING.DATA,
            token
          );
          if (onboarding?.data) {
            if (totalHours === 0)
              totalHours = onboarding.data.work_hours_completed_already || 0;
            if (totalEarnings === 0)
              totalEarnings =
                onboarding.data.earned_current_financial_year || 0;
          }
        } catch (e) {}
      }
      let cpdHours = 0;
      try {
        const cpd = await apiService.get<{
          success: boolean;
          data: { totalHours: number };
        }>('/api/v1/cpd-hours/stats/total', token);
        cpdHours = cpd?.data?.totalHours || 0;
      } catch (e) {}
      let reflectionsCount = 0;
      try {
        const ref = await apiService.get<{ pagination: { total: number } }>(
          '/api/v1/reflections?limit=1',
          token
        );
        reflectionsCount = ref?.pagination?.total || 0;
      } catch (e) {}
      let appraisalsCount = 0;
      try {
        const appr = await apiService.get<{ pagination: { total: number } }>(
          API_ENDPOINTS.APPRAISALS.LIST + '?limit=1',
          token
        );
        appraisalsCount = appr?.pagination?.total || 0;
      } catch (e) {}

      if (isMounted.current) {
        setStats({
          totalHours: Math.round(totalHours),
          totalEarnings: Math.round(totalEarnings),
          cpdHours: Math.round(cpdHours),
          reflectionsCount,
          appraisalsCount,
        });
      }
    } catch (error) {
      console.error('Error stats:', error);
    }
  };

  const loadNotificationsCount = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const res = await apiService.get<{ data: any[] }>(
        '/api/v1/notifications',
        token
      );
      if (res?.data) {
        const unread = res.data.filter((n) => {
          const isRead =
            n.isRead === true ||
            n.isRead === 1 ||
            n.isRead === '1' ||
            n.status === 1 ||
            n.status === '1';
          const isExplicitUnread =
            n.isRead === false ||
            n.isRead === 0 ||
            n.isRead === '0' ||
            n.status === 0 ||
            n.status === '0';
          return isExplicitUnread || !isRead;
        }).length;
        if (isMounted.current) setUnreadNotifications(unread);
      }
    } catch (e) {}
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
      const res = await apiService.get<{ data: any[] }>(
        `/api/v1/notifications?limit=6`,
        token
      );
      if (res?.data) {
        const mapped = res.data.map((it: any) => ({
          id: String(it.id ?? ''),
          type: it.type,
          title: it.title || 'Notification',
          subtitle: it.body || it.message || '',
          time: formatTimeAgo(it.createdAt),
          icon: it.icon || 'notifications',
          iconColor: '#2B5F9E',
          bgColor: '#E9F2FF',
        }));
        if (isMounted.current) setRecentActivities(mapped);
      }
    } catch (e) {}
  };

  const loadSlides = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const resp: any = await apiService.get(
        '/api/v1/sliders',
        token ?? undefined
      );
      const items = Array.isArray(resp) ? resp : (resp?.data ?? []);
      const valid = items
        .filter((s: any) => s.name && (s.status == 1 || s.status == 'one'))
        .map((s: any) => ({
          id: String(s.id),
          image: String(s.image || ''),
          image_url: s.image_url,
          name: s.name,
          sort_order: Number(s.sort_order || 0),
        }))
        .sort((a: any, b: any) => a.sort_order - b.sort_order);
      if (isMounted.current) setSlides(valid);
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(SLIDE_CACHE_KEY);
          const cached = raw ? JSON.parse(raw) : {};
          for (const s of valid) {
            const url = s.image_url
              ? normalizeAbsoluteUrl(s.image_url)
              : `${API_CONFIG.BASE_URL}/uploads/${s.image}`;
            if (!url) continue;
            if (cached[s.id]?.url === url) {
              setSlideImageMap((p) => ({
                ...p,
                [s.id]: cached[s.id].localUri,
              }));
              continue;
            }
            try {
              const fileName = `slide_${s.id}.jpg`;
              const localPath = `${FileSystem.cacheDirectory}${fileName}`;
              const dl = await FileSystem.downloadAsync(url, localPath);
              if (dl.uri) {
                setSlideImageMap((p) => ({ ...p, [s.id]: dl.uri }));
                cached[s.id] = { url, localUri: dl.uri };
                await AsyncStorage.setItem(
                  SLIDE_CACHE_KEY,
                  JSON.stringify(cached)
                );
              }
            } catch (e) {}
          }
        } catch (e) {}
      })();
    } catch (e) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadUserData(),
      loadActiveSession(),
      loadDashboardStats(),
      loadNotificationsCount(),
      loadRecentActivities(),
    ]);
    setRefreshing(false);
  };

  const PulsingDot = () => {
    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, []);
    return (
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#EF4444',
          opacity: pulse,
        }}
      />
    );
  };

  const getStatsList = () => {
    const base = [
      {
        icon: 'schedule',
        value: stats.totalHours,
        label: 'Hours Completed',
        route: '/(tabs)/workinghours',
        iconColor: '#2563EB',
        iconBg: '#E8F1FF',
      },
      {
        icon: 'payments',
        value: formatCurrency(stats.totalEarnings),
        label: 'Total Earnings',
        route: '/(tabs)/earings',
        premium: true,
        iconColor: '#16A34A',
        iconBg: '#E8F8EF',
      },
      {
        icon: 'school',
        value: stats.cpdHours,
        label: 'CPD Hours',
        route: '/(tabs)/cpdhourstracking',
        iconColor: '#7C3AED',
        iconBg: '#F2ECFF',
      },
      {
        icon: 'description',
        value: stats.reflectionsCount,
        label: 'Reflections',
        route: '/(tabs)/reflections',
        iconColor: '#D97706',
        iconBg: '#FFF3E0',
      },
      {
        icon: 'verified',
        value: stats.appraisalsCount,
        label: 'Appraisals',
        route: '/(tabs)/appraisal',
        iconColor: '#2563EB',
        iconBg: '#E8F1FF',
      },
    ];
    return base
      .filter((s) => !s.premium || isPremium)
      .map((s) => ({ ...s, icon: s.icon as any }));
  };
  const statsList = getStatsList();

  const activities = recentActivities;

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background-light'}`}
      edges={['top']}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isPremium ? '#D4AF37' : '#2B5F9E'}
          />
        }
      >
        <View
          className="px-6 pt-6 pb-16 rounded-b-[36px]"
          style={{ backgroundColor: isPremium ? '#D4AF37' : '#2B5F9E' }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-full border-2 border-white/30 items-center justify-center bg-white/20 relative">
                {localProfileImage || userData?.image ? (
                  <Image
                    source={{ uri: localProfileImage || userData?.image || '' }}
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <MaterialIcons name="person" size={24} color="#FFFFFF" />
                )}
                <View className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
              </View>
              <View>
                <Text className="text-white/80 text-xs font-semibold uppercase tracking-wide">
                  {getGreeting()}
                </Text>
                <Text className="text-white text-xl font-bold">
                  {isLoading ? 'Loading...' : formatUserName()}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/notifications')}
              className="w-10 h-10 rounded-full bg-white/15 items-center justify-center border border-white/25"
            >
              <MaterialIcons name="notifications" size={22} color="#FFFFFF" />
              {unreadNotifications > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 w-5 h-5 rounded-full items-center justify-center border border-white">
                  <Text className="text-white text-[10px] font-bold">
                    {Math.min(unreadNotifications, 99)}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
          {revalidationDays !== null && (
            <View className="mt-5 w-full px-4 py-3 rounded-2xl border bg-white/15 border-white/25 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-semibold text-white/80 uppercase">
                  Revalidation
                </Text>
                <Text className="text-white/80 text-xs">Status</Text>
              </View>
              <View className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/25">
                <Text className="font-bold text-white">
                  {revalidationDays > 0
                    ? `${revalidationDays} Days`
                    : revalidationDays === 0
                      ? 'Due Today'
                      : 'Overdue'}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View className="flex-1 -mt-10 px-6" style={{ gap: 20 }}>
          {activeSession?.isActive ? (
            <View
              className={`p-5 rounded-3xl shadow-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
            >
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center gap-2">
                  {!isPaused && <PulsingDot />}
                  {isPaused && (
                    <View className="w-2 h-2 rounded-full bg-yellow-500" />
                  )}
                  <Text className="text-xs font-semibold uppercase text-slate-500">
                    {isPaused ? 'Paused Session' : 'Active Clinical Session'}
                  </Text>
                </View>
                {!!activeSession?.startTime && (
                  <View className="px-3 py-1 rounded-xl bg-slate-100">
                    <Text className="text-xs text-slate-500">
                      Started {formatTimeLabel(activeSession.startTime)}
                    </Text>
                  </View>
                )}
              </View>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text
                    className={`text-4xl font-mono font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}
                  >
                    {formatTime(timer.hours)}:{formatTime(timer.minutes)}:
                    {formatTime(timer.seconds)}
                  </Text>
                  <Text className="text-xs text-slate-400 mt-1">
                    {activeSession.workDescription ||
                      'Clinical session in progress'}
                  </Text>
                </View>
                <Pressable
                  onPress={handleStopSession}
                  className="px-6 py-3 rounded-2xl bg-red-500 flex-row items-center gap-2 shadow"
                >
                  <MaterialIcons name="stop" color="white" size={18} />
                  <Text className="text-white font-semibold">Stop</Text>
                </Pressable>
              </View>
              <View className="flex-row gap-3 mt-4">
                <Pressable
                  onPress={handleRestartSession}
                  className="px-4 py-2 rounded-xl bg-slate-100"
                >
                  <MaterialIcons name="refresh" size={18} color="#64748B" />
                </Pressable>
                <Pressable
                  onPress={isPaused ? handleResumeSession : handlePauseSession}
                  className={`px-4 py-2 rounded-xl ${isPaused ? 'bg-emerald-500' : 'bg-amber-500'}`}
                >
                  <MaterialIcons
                    name={isPaused ? 'play-arrow' : 'pause'}
                    color="white"
                    size={18}
                  />
                </Pressable>
              </View>
            </View>
          ) : (
            <View
              className={`p-5 rounded-3xl shadow-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-lg font-semibold text-slate-600">
                    No active session
                  </Text>
                  <Text className="text-xs text-slate-400">
                    Track your clinical hours
                  </Text>
                </View>
                <Pressable
                  onPress={handleStartSession}
                  className="bg-emerald-500 px-6 py-3 rounded-2xl flex-row items-center gap-2"
                >
                  <MaterialIcons name="play-arrow" color="white" size={20} />
                </Pressable>
              </View>
            </View>
          )}

          <View
            className={`rounded-2xl hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
            onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
          >
            {slides.length === 0 ? (
              <View className="p-6 items-center hidden">
                <Text className="text-slate-400">No announcements</Text>
              </View>
            ) : (
              <ScrollView
                ref={scrollRef as any}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 8,
                  paddingVertical: 8,
                  display: 'none',
                }}
              >
                {slides.map((s) => (
                  <View
                    key={s.id}
                    style={{
                      width: viewportWidth - 16,
                      height: 160,
                      borderRadius: 18,
                      overflow: 'hidden',
                      marginHorizontal: 0,
                    }}
                  >
                    <Image
                      source={{
                        uri:
                          slideImageMap[s.id] ||
                          normalizeAbsoluteUrl(s.image_url) ||
                          '',
                      }}
                      className="w-full h-full"
                      resizeMode="cover"
                      style={{ borderRadius: 18 }}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View className="flex-row flex-wrap" style={{ gap: 16 }}>
            {statsList.map((s, i) => (
              <Pressable
                key={i}
                onPress={() => router.push(s.route as any)}
                className={`p-4 rounded-3xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
                style={{
                  width:
                    isPremium && i === statsList.length - 1 ? '100%' : '47%',
                }}
              >
                <View
                  className="w-10 h-10 rounded-2xl items-center justify-center mb-3"
                  style={{ backgroundColor: s.iconBg || '#EEF2FF' }}
                >
                  <MaterialIcons
                    name={s.icon}
                    size={22}
                    color={s.iconColor || '#2B5F9E'}
                  />
                </View>
                <Text
                  className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}
                >
                  {s.value}
                </Text>
                <Text className="text-sm text-slate-500">{s.label}</Text>
              </Pressable>
            ))}
          </View>

          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-3">
              <Text
                className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}
              >
                Recent Activity
              </Text>
              <Pressable onPress={() => router.push('/(tabs)/notifications')}>
                <Text className="text-sm font-semibold text-blue-600">
                  View All
                </Text>
              </Pressable>
            </View>
            {activities.length === 0 ? (
              <View
                className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
              >
                <Text className="text-slate-400">No recent activity</Text>
              </View>
            ) : (
              activities.map((a, idx) => (
                <Pressable
                  key={idx}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/notifications',
                      params: a.id
                        ? {
                            notificationId: String(a.id),
                            notificationTitle: String(a.title ?? ''),
                            notificationBody: String(a.subtitle ?? ''),
                            notificationTime: String(a.time ?? ''),
                            notificationType: String(a.type ?? ''),
                          }
                        : {},
                    })
                  }
                  className={`p-4 rounded-2xl border mb-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
                      style={{ backgroundColor: a.bgColor || '#E9F2FF' }}
                    >
                      <MaterialIcons
                        name={a.icon}
                        size={20}
                        color={a.iconColor || '#2B5F9E'}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}
                      >
                        {a.title}
                      </Text>
                      <Text
                        className="text-xs text-slate-500"
                        numberOfLines={2}
                      >
                        {a.subtitle}
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-400 ml-2">
                      {a.time}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Work Session Form Modal */}
      <Modal visible={showWorkForm} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className={`h-[90%] rounded-t-[40px] ${isDark ? 'bg-slate-900' : 'bg-white'} p-6`}
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text
                className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}
              >
                Save Work Session
              </Text>
              <Pressable onPress={() => setShowWorkForm(false)} className="p-2">
                <MaterialIcons
                  name="close"
                  size={24}
                  color={isDark ? 'white' : 'black'}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Copy Schedule */}
              <Pressable
                onPress={handleCopySchedule}
                className={`mb-6 p-4 rounded-2xl border flex-row items-center justify-center gap-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'}`}
              >
                <MaterialIcons name="content-copy" size={20} color="#2B5F9E" />
                <Text className="text-[#2B5F9E] font-bold">
                  Copy Details From Previous Session
                </Text>
              </Pressable>

              {/* Working Mode */}
              <View className="mb-6">
                <Text
                  className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  WORKING MODE (REQUIRED)
                </Text>
                <View className="flex-row gap-4">
                  {['Full time', 'Part time'].map((mode) => (
                    <Pressable
                      key={mode}
                      onPress={() => setWorkingMode(mode as any)}
                      className={`flex-1 py-3 items-center rounded-2xl border ${workingMode === mode ? 'bg-blue-500 border-blue-500' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <Text
                        className={`font-bold ${workingMode === mode ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-600'}`}
                      >
                        {mode}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Date */}
              <View className="mb-6">
                <Text
                  className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  DATE (REQUIRED)
                </Text>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  className={`p-4 rounded-2xl border flex-row justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  <Text className={isDark ? 'text-white' : 'text-slate-800'}>
                    {formatDateShort(selectedDate)}
                  </Text>
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={isDark ? 'white' : 'gray'}
                  />
                </Pressable>
              </View>

              {/* Hospital */}
              <View className="mb-6">
                <Text
                  className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  HOSPITAL (REQUIRED)
                </Text>
                <Pressable
                  onPress={() => setShowHospitalModal(true)}
                  className={`p-4 rounded-2xl border flex-row justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  <Text className={isDark ? 'text-white' : 'text-slate-800'}>
                    {selectedHospital?.name || 'Select Hospital'}
                  </Text>
                  <MaterialIcons
                    name="search"
                    size={20}
                    color={isDark ? 'white' : 'gray'}
                  />
                </Pressable>
              </View>

              {/* Hours and Rate */}
              <View className="flex-row gap-4 mb-6">
                <View className="flex-1">
                  <Text
                    className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                  >
                    HOURS (REQUIRED)
                  </Text>
                  <TextInput
                    value={hours}
                    onChangeText={setHours}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="gray"
                    className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                  >
                    RATE (£/HR) (REQUIRED)
                  </Text>
                  <TextInput
                    value={rate}
                    onChangeText={setRate}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="gray"
                    className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </View>
              </View>

              {/* Work Setting */}
              <View className="mb-6">
                <Text
                  className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  WORK SETTING (REQUIRED)
                </Text>
                <Pressable
                  onPress={() => setShowWorkSettingModal(true)}
                  className={`p-4 rounded-2xl border flex-row justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  <Text className={isDark ? 'text-white' : 'text-slate-800'}>
                    {workSetting || 'Select Setting'}
                  </Text>
                  <MaterialIcons
                    name="expand-more"
                    size={20}
                    color={isDark ? 'white' : 'gray'}
                  />
                </Pressable>
              </View>

              {/* Scope of Practice */}
              <View className="mb-6">
                <Text
                  className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  SCOPE OF PRACTICE (REQUIRED)
                </Text>
                <Pressable
                  onPress={() => setShowScopeModal(true)}
                  className={`p-4 rounded-2xl border flex-row justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  <Text className={isDark ? 'text-white' : 'text-slate-800'}>
                    {scope || 'Select Scope'}
                  </Text>
                  <MaterialIcons
                    name="expand-more"
                    size={20}
                    color={isDark ? 'white' : 'gray'}
                  />
                </Pressable>
              </View>

              {/* Description */}
              <View className="mb-6">
                <Text
                  className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  BRIEF DESCRIPTION
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  placeholder="Describe your work..."
                  placeholderTextColor="gray"
                  style={{ minHeight: 100, textAlignVertical: 'top' }}
                  className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
              </View>

              {/* Evidence */}
              <View className="mb-8">
                <Text
                  className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  EVIDENCE (DOCUMENTS)
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {documents.map((doc, idx) => (
                    <View
                      key={idx}
                      className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
                    >
                      <Image
                        source={{ uri: doc.url }}
                        className="w-full h-full"
                      />
                      <Pressable
                        onPress={() =>
                          setDocuments((docs) =>
                            docs.filter((_, i) => i !== idx)
                          )
                        }
                        className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                      >
                        <MaterialIcons name="close" size={12} color="white" />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable
                    onPress={() => {
                      Alert.alert('Upload Evidence', 'Choose source', [
                        {
                          text: 'Gallery',
                          onPress: () => handleDocumentPick('gallery'),
                        },
                        {
                          text: 'Camera',
                          onPress: () => handleDocumentPick('camera'),
                        },
                        { text: 'Cancel', style: 'cancel' },
                      ]);
                    }}
                    className={`w-20 h-20 rounded-xl border-2 border-dashed items-center justify-center ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-slate-50'}`}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color="#2B5F9E" />
                    ) : (
                      <MaterialIcons
                        name="add-a-photo"
                        size={24}
                        color="gray"
                      />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Save Button */}
              <Pressable
                onPress={handleSaveWorkSession}
                disabled={isSavingWork}
                className={`py-4 rounded-2xl items-center bg-[#2B5F9E] ${isSavingWork ? 'opacity-70' : ''}`}
              >
                {isSavingWork ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Save Session
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>

        {/* Hospital Selection Modal */}
        <Modal visible={showHospitalModal} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center px-6">
            <View
              className={`h-[80%] rounded-3xl ${isDark ? 'bg-slate-900' : 'bg-white'} p-6`}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}
                >
                  Select Hospital
                </Text>
                <Pressable onPress={() => setShowHospitalModal(false)}>
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={isDark ? 'white' : 'black'}
                  />
                </Pressable>
              </View>
              <View
                className={`flex-row items-center px-4 rounded-xl mb-4 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}
              >
                <MaterialIcons name="search" size={20} color="gray" />
                <TextInput
                  value={hospitalSearch}
                  onChangeText={setHospitalSearch}
                  placeholder="Search hospital..."
                  placeholderTextColor="gray"
                  className={`flex-1 p-3 ${isDark ? 'text-white' : 'text-slate-800'}`}
                />
              </View>
              <ScrollView>
                {hospitals
                  .filter((h) =>
                    h.name.toLowerCase().includes(hospitalSearch.toLowerCase())
                  )
                  .map((h) => (
                    <Pressable
                      key={h.id}
                      onPress={() => {
                        setSelectedHospital(h);
                        setShowHospitalModal(false);
                      }}
                      className={`py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}
                    >
                      <Text
                        className={`text-base ${isDark ? 'text-white' : 'text-slate-800'}`}
                      >
                        {h.name}
                      </Text>
                      <Text className="text-xs text-slate-400">
                        {h.town}, {h.postcode}
                      </Text>
                    </Pressable>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Selector Modal (Work Setting / Scope) */}
        <Modal
          visible={showWorkSettingModal || showScopeModal}
          transparent
          animationType="fade"
        >
          <Pressable
            className="flex-1 bg-black/50 justify-center px-6"
            onPress={() => {
              setShowWorkSettingModal(false);
              setShowScopeModal(false);
            }}
          >
            <View
              className={`rounded-3xl ${isDark ? 'bg-slate-900' : 'bg-white'} p-6 max-h-[70%]`}
            >
              <Text
                className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}
              >
                {showWorkSettingModal
                  ? 'Select Work Setting'
                  : 'Select Scope of Practice'}
              </Text>
              <ScrollView>
                {(showWorkSettingModal
                  ? workSettingsOptions
                  : scopeOptions
                ).map((opt: any) => (
                  <Pressable
                    key={opt.id || opt.value}
                    onPress={() => {
                      if (showWorkSettingModal)
                        setWorkSetting(opt.name || opt.label);
                      else setScope(opt.name || opt.label);
                      setShowWorkSettingModal(false);
                      setShowScopeModal(false);
                    }}
                    className={`py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}
                  >
                    <Text
                      className={`text-base ${isDark ? 'text-white' : 'text-slate-800'}`}
                    >
                      {opt.name || opt.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowDatePicker(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-t-3xl p-6`}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Pressable
                onPress={() => navigateCalMonth('prev')}
                className="p-2"
              >
                <MaterialIcons
                  name="chevron-left"
                  size={24}
                  color={isDark ? 'white' : 'black'}
                />
              </Pressable>
              <Text
                className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                {monthNames[calMonth]} {calYear}
              </Text>
              <Pressable
                onPress={() => navigateCalMonth('next')}
                className="p-2"
              >
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={isDark ? 'white' : 'black'}
                />
              </Pressable>
            </View>
            <View className="flex-row justify-between mb-3">
              {dayNames.map((d) => (
                <View key={d} className="w-10 items-center">
                  <Text
                    className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                  >
                    {d}
                  </Text>
                </View>
              ))}
            </View>
            <View className="flex-row flex-wrap justify-between mb-6">
              {renderCalendarDays()}
            </View>
            <Pressable
              onPress={() => setShowDatePicker(false)}
              className={`py-4 rounded-2xl items-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
            >
              <Text
                className={`font-semibold ${isDark ? 'text-white' : 'text-slate-700'}`}
              >
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <DiscoveryModal visible={showModal} onClose={hideModal} />
    </SafeAreaView>
  );
}
