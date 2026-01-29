import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Animated, RefreshControl, Image, NativeSyntheticEvent, NativeScrollEvent, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
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
  const isMounted = useRef(true); // Track mount status to prevent state updates on unmounted component
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [timer, setTimer] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [userData, setUserData] = useState<UserData | null>(null);
  const [revalidationDays, setRevalidationDays] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
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
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [slides, setSlides] = useState<Array<{ id: string; image: string; image_url?: string; name?: string; sort_order?: number }>>([]);
  const [slideImageMap, setSlideImageMap] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const [itemWidth, setItemWidth] = useState<number>(0);
  const [viewportWidth, setViewportWidth] = useState<number>(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animatedX = useRef(new Animated.Value(0)).current;
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
      setCurrentSlideIndex(prev => {
        const next = (prev + 1) % slides.length;
        // scroll to next using width
        if (scrollRef.current) {
          try {
            (scrollRef.current as any).scrollTo({ x: next * width, animated: true });
          } catch (e) {
            // ignore
          }
        }
        return next;
      });
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

  // entrance animation for slider
  useEffect(() => {
    Animated.timing(sliderEntrance, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [sliderEntrance]);

  // sync currentSlideIndex when scroll changes handled via onMomentumScrollEnd

  // start auto-scroll when we have slides and a measured viewport width
  useEffect(() => {
    if ((viewportWidth || 0) > 0 && slides.length > 1) {
      // clear existing interval
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
      startAutoScroll();
    }
  }, [viewportWidth, slides.length]);

  useEffect(() => {
    const loadAllData = async () => {
      // Load user data first as it might be needed for other calls (though mostly independent)
      await loadUserData(); // Keep this first to set early user state if needed, or bundle it if completely independent.

      // Parallelize independent data fetches
      await Promise.all([
        loadActiveSession(),
        loadDashboardStats(),
        loadNotificationsCount(),
        loadRecentActivities(),
        loadSlides()
      ]);



      if (isMounted.current) setIsLoading(false);
    };

    loadAllData();
  }, []);

  // Removed useFocusEffect to prevent auto-starting timer when switching tabs
  // Session will only load on initial mount and when explicitly refreshed

  useEffect(() => {
    if (activeSession && activeSession.isActive) {
      // If paused, don't update timer - just show the last paused time
      if (isPaused) {
        if (lastPausedTimer) {
          setTimer(lastPausedTimer);
        }
        // Clear interval when paused - timer should not update
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      } else {
        // Not paused - update timer immediately and start interval
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
        // Clear stored pause state when session ends
        AsyncStorage.removeItem('workSessionPauseState').catch(console.error);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeSession, isPaused, totalPausedTime, pausedAt, lastPausedTimer]);

  // Save pause state whenever it changes
  useEffect(() => {
    if (activeSession) {
      savePauseState();
    }
  }, [isPaused, pausedAt, totalPausedTime, activeSession?.id]);

  const updateTimerFromSession = () => {
    if (!activeSession || !activeSession.isActive || isPaused) return;

    const startTime = new Date(activeSession.startTime);
    const now = new Date();

    // Calculate elapsed time minus total paused time
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

        // Load persisted pause state from AsyncStorage
        try {
          const storedPauseState = await AsyncStorage.getItem('workSessionPauseState');
          if (storedPauseState) {
            const pauseState = JSON.parse(storedPauseState);
            // Only restore if it's for the same session
            if (pauseState.sessionId === response.data.id) {
              setIsPaused(pauseState.isPaused || false);
              setTotalPausedTime(pauseState.totalPausedTime || 0);
              if (pauseState.isPaused && pauseState.pausedAt) {
                setPausedAt(new Date(pauseState.pausedAt));
                // Restore the timer value when paused
                if (pauseState.lastPausedTimer) {
                  setLastPausedTimer(pauseState.lastPausedTimer);
                  setTimer(pauseState.lastPausedTimer);
                }
              } else {
                setPausedAt(null);
                setLastPausedTimer(null);
                // Calculate current timer if not paused
                updateTimerFromSession();
              }
            } else {
              // Different session, reset pause state
              setIsPaused(false);
              setPausedAt(null);
              setTotalPausedTime(0);
              setLastPausedTimer(null);
              await AsyncStorage.removeItem('workSessionPauseState');
              // Calculate current timer for new session
              updateTimerFromSession();
            }
          } else {
            setIsPaused(false);
            setPausedAt(null);
            setTotalPausedTime(0);
            setLastPausedTimer(null);
            // Calculate current timer
            updateTimerFromSession();
          }
        } catch (error) {
          console.warn('Error loading pause state:', error);
          setIsPaused(false);
          setPausedAt(null);
          setTotalPausedTime(0);
          setLastPausedTimer(null);
          // Calculate current timer on error
          updateTimerFromSession();
        }
      } else {
        setActiveSession(null);
        setIsPaused(false);
        setPausedAt(null);
        setTotalPausedTime(0);
        // Clear stored pause state if no active session
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
        lastPausedTimer: isPaused ? timer : null, // Save current timer when paused
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
        setLastPausedTimer(null);
        // Clear any old pause state when starting new session
        await AsyncStorage.removeItem('workSessionPauseState');
        // Start timer immediately
        updateTimerFromSession();
        showToast.success('Clinical session started', 'Success');
      }
    } catch (error: any) {
      console.error('Error starting session:', error);
      if (error?.message?.includes('OFFLINE_MODE')) {
        showToast.info('Session queued for sync when connection is restored', 'Offline Mode');
        setActiveSession({
          id: Date.now(),
          startTime: new Date().toISOString(),
          endTime: null,
          durationMinutes: null,
          workDescription: '',
          isActive: true,
        });
      } else if (error?.message?.includes('INTERNET_REQUIRED')) {
        showToast.error(
          'This feature requires an internet connection. Please connect to the internet and try again.',
          'Internet Required'
        );
      } else {
        showToast.error(
          error?.message || 'Failed to start session. Please try again.',
          'Error'
        );
      }
    } finally {
      setIsStartingSession(false);
    }
  };

  const handlePauseSession = async () => {
    if (!activeSession || isPaused) return;

    // Save current timer value before pausing
    setLastPausedTimer(timer);
    const now = new Date();
    setIsPaused(true);
    setPausedAt(now);

    // Stop the timer interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    showToast.info('Session paused', 'Paused');

    // Save pause state to AsyncStorage
    await savePauseState();
  };

  const handleResumeSession = async () => {
    if (!activeSession || !isPaused) return;

    const now = new Date();
    const pauseStartTime = pausedAt || now;
    const pauseDuration = now.getTime() - pauseStartTime.getTime();

    // Add the pause duration to total paused time
    setTotalPausedTime(prev => prev + pauseDuration);
    setIsPaused(false);
    setPausedAt(null);
    setLastPausedTimer(null);

    // Restart the timer interval
    updateTimerFromSession();
    timerIntervalRef.current = setInterval(() => {
      updateTimerFromSession();
    }, 1000) as any;

    showToast.info('Session resumed', 'Resumed');

    // Save resume state to AsyncStorage
    await savePauseState();
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
                setLastPausedTimer(null);
                // Clear pause state from storage
                await AsyncStorage.removeItem('workSessionPauseState');
                // Start timer immediately
                updateTimerFromSession();
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
        data: any;
      }>(API_ENDPOINTS.USERS.ME, token);

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
        }

        if (data.subscriptionTier) {
          await setSubscriptionInfo({
            subscriptionTier: (data.subscriptionTier || 'free') as 'free' | 'premium',
            subscriptionStatus: (data.subscriptionStatus || 'active') as 'active' | 'trial' | 'expired' | 'cancelled',
            isPremium: data.subscriptionTier === 'premium',
            canUseOffline: data.subscriptionTier === 'premium',
          });
        }

        if (data.revalidationDate) {
          try {
            let revalidationDate: Date;
            const dateStr = data.revalidationDate;

            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
              const parts = dateStr.split('-');
              const year = Number(parts[0]) || 0;
              const month = Number(parts[1]) || 1;
              const day = Number(parts[2]) || 1;
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
              if (isMounted.current) setRevalidationDays(diffDays);
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
      // Loading state is now managed by the parent Promise.all
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
    const name = userData.name || (userData.email.split('@')[0] ?? '');

    if (prefix) {
      return `${prefix} ${name}`;
    }
    return name;
  };

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  const loadDashboardStats = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Load work hours stats
      const workHoursResponse = await apiService.get<{
        success: boolean;
        data: { totalHours: number };
      }>(API_ENDPOINTS.WORK_HOURS.STATS_TOTAL, token);

      const totalHours = workHoursResponse?.data?.totalHours || 0;
      const hourlyRate = 35; // Default hourly rate - should come from user settings
      const totalEarnings = totalHours * hourlyRate;

      // Load CPD hours (if endpoint exists)
      let cpdHours = 0;
      try {
        const cpdResponse = await apiService.get<{
          success: boolean;
          data: { totalHours: number };
        }>('/api/v1/cpd-hours/stats/total', token);
        cpdHours = cpdResponse?.data?.totalHours || 0;
      } catch (error) {
        console.warn('CPD hours endpoint not available:', error);
      }

      // Load reflections count
      let reflectionsCount = 0;
      try {
        const reflectionsResponse = await apiService.get<{
          success: boolean;
          data: any[];
          pagination: { total: number };
        }>('/api/v1/reflections?limit=1', token);
        reflectionsCount = reflectionsResponse?.pagination?.total || 0;
      } catch (error) {
        console.warn('Reflections endpoint not available:', error);
      }

      if (isMounted.current) {
        setStats({
          totalHours: Math.round(totalHours),
          totalEarnings: Math.round(totalEarnings),
          cpdHours: Math.round(cpdHours),
          reflectionsCount,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      // Set default values on error
      if (isMounted.current) {
        setStats({
          totalHours: 0,
          totalEarnings: 0,
          cpdHours: 0,
          reflectionsCount: 0,
        });
      }
    }
  };

  const loadNotificationsCount = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await apiService.get<{
        success: boolean;
        data: Array<{ status?: string; isRead?: boolean }>;
      }>('/api/v1/notifications', token);

      if (response?.data) {
        const unread = response.data.filter(n =>
          n.status === '0' || n.isRead === false
        ).length;
        if (isMounted.current) setUnreadNotifications(unread);
      }
    } catch (error) {
      console.warn('Error loading notifications count:', error);
      if (isMounted.current) setUnreadNotifications(0);
    }
  };

  const formatTimeAgo = (iso?: string) => {
    if (!iso) return '';
    try {
      const date = new Date(iso);
      const diff = Date.now() - date.getTime();
      const seconds = Math.floor(diff / 1000);
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h`;
      const days = Math.floor(hours / 24);
      return `${days}d`;
    } catch (e) {
      return '';
    }
  };

  const loadRecentActivities = async () => {
    setIsLoadingActivities(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Fetch latest notifications and map them to activity items
      const response = await apiService.get<{ success?: boolean; data: any[] }>(`/api/v1/notifications?limit=6`, token);
      const items = Array.isArray(response?.data) ? response.data : [];

      const mapped = items.map((it: any) => ({
        title: it.title || it.type || 'Notification',
        subtitle: it.message || it.body || it.summary || '',
        time: formatTimeAgo(it.createdAt || it.created_at || it.time),
        icon: it.icon || 'notifications',
        iconColor: '#2B5F9E',
        bgColor: 'bg-slate-100',
        raw: it,
      }));

      if (isMounted.current) setRecentActivities(mapped);
    } catch (error) {
      console.warn('Error loading recent activities:', error);
      if (isMounted.current) setRecentActivities([]);
    } finally {
      if (isMounted.current) setIsLoadingActivities(false);
    }
  };

  const loadSlides = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      // call public sliders endpoint; token optional
      const resp = await apiService.get<any>('/api/v1/sliders', token ?? undefined);
      const items = Array.isArray(resp) ? resp : resp?.data ?? [];
      const slides = (Array.isArray(items) ? items : [])
        .filter((s: any) => {
          const st = s.status ?? s.active ?? s.enabled ?? 'one';
          const hasName = s.name && String(s.name).trim().length > 0;
          return hasName && (String(st) === 'one' || String(st) === '1' || st === 1);
        })
        .map((s: any) => ({
          id: String(s.id),
          image: String(s.image || ''),
          image_url: s.image_url || undefined,
          name: s.name || undefined,
          sort_order: typeof s.sort_order === 'number' ? s.sort_order : (s.sort_order ? Number(s.sort_order) : 0),
        }))
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

      if (isMounted.current) setSlides(slides);

      // Load persisted cache and then ensure images are cached locally.
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(SLIDE_CACHE_KEY);
          const cached = raw ? JSON.parse(raw) : {};

          // Seed slideImageMap from cache so UI can show local images immediately
          Object.keys(cached).forEach((k) => {
            if (cached[k]?.localUri) {
              setSlideImageMap(prev => ({ ...prev, [k]: cached[k].localUri }));
            }
          });

          for (const s of slides) {
            const preferred = s.image_url ? normalizeAbsoluteUrl(s.image_url) : null;
            const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
            const candidates = [preferred, `${base}/uploads/sliders/${s.image}`, `${base}/uploads/${s.image}`].filter(Boolean) as string[];

            let selectedRemote: string | null = null;
            for (const c of candidates) {
              if (c) {
                selectedRemote = c;
                break;
              }
            }

            if (!selectedRemote) continue;

            const existing = cached[s.id];

            // If cached and URL matches and file exists, keep it.
            if (existing && existing.url === selectedRemote && existing.localUri) {
              try {
                const info = await FileSystem.getInfoAsync(existing.localUri);
                if (info.exists) {
                  setSlideImageMap(prev => ({ ...prev, [s.id]: existing.localUri }));
                  continue; // next slide
                }
              } catch (e) {
                // fall through to re-download
              }
            }

            // Try to download to cache
            try {
              const ext = getFileExtFromUrl(selectedRemote);
              const fileName = `slide_${s.id}.${ext}`;
              const cacheDir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory ?? '';
              const localPath = `${cacheDir}${fileName}`;

              // downloadAsync will overwrite existing file
              const download = await FileSystem.downloadAsync(selectedRemote, localPath);
              if (download && download.uri) {
                const localUri = download.uri;
                setSlideImageMap(prev => ({ ...prev, [s.id]: localUri }));
                cached[s.id] = { url: selectedRemote, localUri, fetchedAt: Date.now() };
                await AsyncStorage.setItem(SLIDE_CACHE_KEY, JSON.stringify(cached));
                continue;
              }
            } catch (e) {
              // If download failed, fallback to prefetch and use remote URL if possible
            }

            // Fallback: try prefetch remote and use remote URL
            try {
              const ok = await Image.prefetch(selectedRemote);
              if (ok) {
                setSlideImageMap(prev => ({ ...prev, [s.id]: selectedRemote }));
                cached[s.id] = { url: selectedRemote, localUri: selectedRemote, fetchedAt: Date.now() };
                await AsyncStorage.setItem(SLIDE_CACHE_KEY, JSON.stringify(cached));
              }
            } catch (e) {
              // ignore completely if fallback fails
            }
          }
        } catch (e) {
          // ignore other cache errors
        }
      })();

      // start auto-scroll will be handled once viewportWidth is measured
    } catch (error) {
      console.warn('Failed to load slides', error);
      setSlides([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadUserData(),
        loadActiveSession(),
        loadDashboardStats(),
        loadNotificationsCount(),
        loadRecentActivities(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const PulsingDot = () => {
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

  const getStats = () => {
    const baseStats = [
      {
        icon: 'schedule' as const,
        value: stats.totalHours.toString(),
        label: 'Hours Completed',
        bgColor: 'bg-blue-50',
        iconColor: '#2B5F9E',
        route: '/(tabs)/workinghours',
      },
      {
        icon: 'payments' as const,
        value: `£${stats.totalEarnings.toLocaleString()}`,
        label: 'Total Earnings',
        bgColor: 'bg-green-50',
        iconColor: '#10B981',
        route: '/(tabs)/earings',
        isPremiumOnly: true,
      },
      {
        icon: 'school' as const,
        value: stats.cpdHours.toString(),
        label: 'CPD Hours',
        bgColor: 'bg-purple-50',
        iconColor: '#9333EA',
        route: '/(tabs)/cpdhourstracking',
      },
      {
        icon: 'description' as const,
        value: stats.reflectionsCount.toString(),
        label: 'Reflections',
        bgColor: 'bg-amber-50',
        iconColor: '#F59E0B',
        route: '/(tabs)/reflections',
      },
    ];

    const visibleStats = isPremium ? baseStats : baseStats.filter(s => !s.isPremiumOnly);

    if (isPremium) {
      return visibleStats.map(stat => ({
        ...stat,
        bgColor: 'bg-[#FFD700]/20',
        iconColor: '#D4AF37',
      }));
    }

    return visibleStats;
  };

  const statsList = getStats();

  // Use recent activities loaded from API
  const activities = recentActivities;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isPremium ? '#D4AF37' : '#2B5F9E'}
            colors={[isPremium ? '#D4AF37' : '#2B5F9E']}
          />
        }
      >
        <View
          className="px-6 pt-6 pb-20 rounded-b-[40px]"
          style={{
            backgroundColor: isPremium ? '#D4AF37' : '#2B5F9E',
            ...(isPremium && {
              shadowColor: '#D4AF37',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }),
          }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-3">
              <View className="relative">
                <View
                  className={`w-12 h-12 rounded-full border-2 items-center justify-center ${isPremium
                    ? 'bg-white/40 border-[#FFD700]'
                    : 'bg-white/30 border-white/30'
                    }`}
                  style={isPremium ? {
                    shadowColor: '#FFD700',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.5,
                    shadowRadius: 4,
                    elevation: 4,
                  } : {}}
                >
                  {userData?.image ? (
                    <Image source={{ uri: userData.image }} className="w-full h-full rounded-full" />
                  ) : (
                    <MaterialIcons name="person" size={24} color="#FFFFFF" />
                  )}
                </View>
                {isPremium ? (
                  <View
                    className="absolute -bottom-1 -right-1 bg-[#FFD700] w-5 h-5 rounded-full border-2 border-[#D4AF37] items-center justify-center"
                    style={{
                      shadowColor: '#FFD700',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.6,
                      shadowRadius: 3,
                      elevation: 3,
                    }}
                  >
                    <MaterialIcons name="workspace-premium" size={10} color="#1F2937" />
                  </View>
                ) : (
                  <View className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-[#2B5F9E]" />
                )}
              </View>
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-white/90 text-xs font-medium uppercase tracking-wider">
                    {getGreeting()}
                  </Text>
                  {isPremium && (
                    <View
                      className="px-2 py-0.5 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/50"
                      style={{
                        shadowColor: '#FFD700',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.3,
                        shadowRadius: 2,
                        elevation: 2,
                      }}
                    >
                      <Text className="text-[#FFD700] text-[9px] font-bold uppercase tracking-tight">
                        Premium
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  className="text-white text-xl font-bold"
                  numberOfLines={1}
                  style={isPremium ? {
                    textShadowColor: 'rgba(0, 0, 0, 0.3)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  } : {}}
                >
                  {isLoading ? 'Loading...' : formatUserName()}
                </Text>
              </View>
            </View>

            {isPremium && (
              <Pressable
                onPress={() => router.push('/(tabs)/notifications')}
                className="relative"
              >
                <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center border border-white/30">
                  <MaterialIcons name="notifications-active" size={22} color="#FFFFFF" />
                </View>
                {unreadNotifications > 0 && (
                  <View className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-[#2B5F9E] items-center justify-center">
                    <Text className="text-white text-[10px] font-bold" style={{ lineHeight: 12 }}>
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>

          {revalidationDays !== null && (
            <View className="flex-row justify-between items-center">
              <View
                className={`px-3 py-2 rounded-2xl items-center border ${isPremium
                  ? 'bg-white/20 border-[#FFD700]/40'
                  : 'bg-white/10 border-white/20'
                  }`}
                style={isPremium ? {
                  shadowColor: '#FFD700',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                } : {}}
              >
                <Text className={`text-[10px] font-semibold uppercase ${isPremium ? 'text-white/90' : 'text-white/80'
                  }`}>
                  Revalidation
                </Text>
                <Text
                  className={`font-bold ${isPremium ? 'text-white' : 'text-white'
                    }`}
                  style={isPremium ? {
                    textShadowColor: 'rgba(0, 0, 0, 0.3)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  } : {}}
                >
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
            <View className={`p-5 rounded-3xl shadow-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
              }`}>
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center gap-2">
                  {!isPaused && <PulsingDot />}
                  {isPaused && (
                    <View className="w-2 h-2 rounded-full bg-yellow-500" />
                  )}
                  <Text className={`text-sm font-semibold uppercase tracking-tight ${isDark ? "text-gray-400" : "text-slate-500"
                    }`}>
                    {isPaused ? 'Paused Clinical Session' : 'Active Clinical Session'}
                  </Text>
                </View>
                <View className={`px-2 py-1 rounded-lg ${isDark ? "bg-slate-700" : "bg-slate-100"
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
                  <Text className={`text-4xl font-mono font-bold tracking-tighter ${isDark ? "text-white" : "text-slate-800"
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
                    className={`px-4 py-3 rounded-2xl flex-row items-center gap-2 ${isDark ? "bg-slate-700" : "bg-slate-200"
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
                      className="bg-[#10B981] px-6 py-3 rounded-2xl flex-row items-center gap-2 shadow-lg active:opacity-80"
                    >
                      <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
                      <Text className="text-white font-bold">Resume</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={handlePauseSession}
                      className="bg-[#F59E0B] px-6 py-3 rounded-2xl flex-row items-center gap-2 shadow-lg active:opacity-80"
                    >
                      <MaterialIcons name="pause" size={20} color="#FFFFFF" />
                      <Text className="text-white font-bold">Pause</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <View className={`p-5 rounded-3xl shadow-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
              }`}>
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center gap-2">
                  <View className={`w-2 h-2 rounded-full ${isDark ? "bg-gray-600" : "bg-gray-300"
                    }`} />
                  <Text className={`text-sm font-semibold uppercase tracking-tight ${isDark ? "text-gray-400" : "text-slate-500"
                    }`}>
                    Clinical Session
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-col">
                  <Text className={`text-lg font-semibold ${isDark ? "text-gray-300" : "text-slate-600"
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
                  className={`bg-[#10B981] px-6 py-3 rounded-2xl flex-row items-center gap-2 shadow-lg ${isStartingSession ? "opacity-50" : ""
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

          <View>
            <Animated.View
              style={{
                opacity: sliderEntrance,
                transform: [
                  {
                    translateY: sliderEntrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
                  },
                ],
              }}
            >
              <View
                className={`p-2 rounded-2xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (w && w !== viewportWidth) setViewportWidth(w);
                }}
              >
                {slides.length === 0 ? (
                  <View className="p-6 items-center">
                    <Text className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      No announcements
                    </Text>
                  </View>
                ) : (
                  <>
                    <Animated.ScrollView
                      ref={r => { scrollRef.current = r as any; }}
                      horizontal
                      pagingEnabled
                      scrollEventThrottle={16}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ padding: 8 }}
                      onScrollBeginDrag={() => {
                        // Pause auto-scroll when user interacts
                        if (autoScrollIntervalRef.current) {
                          clearInterval(autoScrollIntervalRef.current);
                          autoScrollIntervalRef.current = null;
                        }
                        if (resumeTimeoutRef.current) {
                          clearTimeout(resumeTimeoutRef.current);
                          resumeTimeoutRef.current = null;
                        }
                      }}
                      onTouchStart={() => {
                        if (autoScrollIntervalRef.current) {
                          clearInterval(autoScrollIntervalRef.current);
                          autoScrollIntervalRef.current = null;
                        }
                        if (resumeTimeoutRef.current) {
                          clearTimeout(resumeTimeoutRef.current);
                          resumeTimeoutRef.current = null;
                        }
                      }}
                      onScrollEndDrag={() => {
                        // resume after 4 seconds of idle
                        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
                        resumeTimeoutRef.current = setTimeout(() => {
                          startAutoScroll();
                        }, 4000) as any;
                      }}
                      onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                        const x = e.nativeEvent.contentOffset.x || 0;
                        if (viewportWidth) {
                          const idx = Math.round(x / viewportWidth);
                          setCurrentSlideIndex(idx);
                        }
                        // resume auto-scroll after interaction
                        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
                        resumeTimeoutRef.current = setTimeout(() => startAutoScroll(), 4000) as any;
                      }}
                      onScroll={Animated.event(
                        [
                          {
                            nativeEvent: {
                              contentOffset: { x: animatedX },
                            },
                          },
                        ],
                        { useNativeDriver: false }
                      )}
                    >
                      {slides.map((s, idx) => {
                        const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
                        // Normalize server-provided image_url: if it's relative (starts with '/'), prefix with API base
                        const normalizedImageUrl = s.image_url
                          ? (/^https?:\/\//i.test(s.image_url)
                            ? s.image_url
                            : `${base}${s.image_url.startsWith('/') ? '' : '/'}${s.image_url}`)
                          : null;

                        const candidates = [
                          normalizedImageUrl ?? `${base}/uploads/${s.image}`,
                          `${base}/uploads/sliders/${s.image}`,
                        ];

                        const currentUri = slideImageMap[s.id] ?? candidates[0];

                        const containerStyle: any = { width: viewportWidth || 320, marginRight: 0, alignItems: 'center' };
                        const imgStyle: any = { width: (viewportWidth ? viewportWidth - 16 : 320), height: 160, borderRadius: 16 };

                        return (
                          <Pressable key={s.id} style={containerStyle} onPress={() => { /* future: handle slide tap */ }}>
                            {currentUri ? (
                              (() => {
                                const w = viewportWidth || Dimensions.get('window').width;
                                const inputRange = [Math.max(0, idx - 1) * w, idx * w, (idx + 1) * w];
                                const scale = animatedX.interpolate({
                                  inputRange,
                                  outputRange: [0.95, 1, 0.95],
                                  extrapolate: 'clamp',
                                });
                                const opacity = animatedX.interpolate({
                                  inputRange,
                                  outputRange: [0.7, 1, 0.7],
                                  extrapolate: 'clamp',
                                });

                                return (
                                  <Animated.Image
                                    source={{ uri: currentUri }}
                                    style={[imgStyle, { transform: [{ scale }], opacity }]}
                                    resizeMode="cover"
                                    onError={() => {
                                      // try the alternative candidate if available
                                      setSlideImageMap(prev => {
                                        const next = prev[s.id] === candidates[0] ? candidates[1] : null as any;
                                        if (next) return { ...prev, [s.id]: next };
                                        return { ...prev, [s.id]: '' };
                                      });
                                    }}
                                  />
                                );
                              })()
                            ) : (
                              <View style={{ width: imgStyle.width, height: imgStyle.height, borderRadius: 16, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
                                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Image unavailable</Text>
                              </View>
                            )}
                            {/* caption removed - only image shown */}
                          </Pressable>
                        );
                      })}
                    </Animated.ScrollView>

                    <View className="flex-row items-center justify-center mt-2">
                      {(slides || []).map((_, i) => {
                        const w = viewportWidth || Dimensions.get('window').width;
                        const inputRange = [Math.max(0, i - 1) * w, i * w, (i + 1) * w];
                        const scale = animatedX.interpolate({ inputRange, outputRange: [0.8, 1.2, 0.8], extrapolate: 'clamp' });
                        const opacity = animatedX.interpolate({ inputRange, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });
                        return (
                          <Animated.View
                            key={String(i)}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              marginHorizontal: 4,
                              backgroundColor: isPremium ? '#D4AF37' : '#2B5F9E',
                              transform: [{ scale }],
                              opacity,
                            }}
                          />
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            </Animated.View>
          </View>

          <View className="flex-row flex-wrap" style={{ gap: 16 }}>
            {statsList.map((stat, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  if (stat.route) {
                    router.push(stat.route as any);
                  }
                }}
                className={`p-4 rounded-3xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
