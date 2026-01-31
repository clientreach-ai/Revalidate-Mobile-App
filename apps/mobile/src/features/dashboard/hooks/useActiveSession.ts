import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { useTimerStore } from '@/features/timer/timer.store';
import { TimerService } from '@/features/timer/timer.service';
import { ActiveSession } from '../dashboard.types';

export const useActiveSession = (onSessionEnded?: () => void) => {
    const router = useRouter();

    // Stable selectors for actions to avoid unnecessary re-renders
    const storeActiveSessionId = useTimerStore(s => s.activeSessionId);
    const setSessionData = useTimerStore(s => s.setSessionData);
    const setStatus = useTimerStore(s => s.setStatus);
    const setStartTime = useTimerStore(s => s.setStartTime);
    const setAccumulatedMs = useTimerStore(s => s.setAccumulatedMs);
    const setElapsedMs = useTimerStore(s => s.setElapsedMs);
    const storePause = useTimerStore(s => s.pause);
    const storeResume = useTimerStore(s => s.resume);
    const resetStore = useTimerStore(s => s.reset);

    const isMounted = useRef(true);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
    const [activeSessionLoaded, setActiveSessionLoaded] = useState(false);
    const [timer, setTimer] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [isPaused, setIsPaused] = useState(false);
    const [pausedAt, setPausedAt] = useState<Date | null>(null);
    const [totalPausedTime, setTotalPausedTime] = useState(0);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, []);

    const updateTimerFromSession = useCallback((
        session: ActiveSession | null = activeSession,
        pausedMs: number = totalPausedTime
    ) => {
        if (!session || !session.isActive || session.isPaused) return;
        const elapsedMs = TimerService.calculateElapsed(session.startTime, pausedMs);
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        // Use functional update to avoid unnecessary re-renders if values are the same
        setTimer(prev => {
            if (prev.hours === hours && prev.minutes === minutes && prev.seconds === seconds) return prev;
            return { hours, minutes, seconds };
        });
    }, [activeSession, totalPausedTime]);

    const loadActiveSession = useCallback(async () => {
        try {
            if (isMounted.current) setActiveSessionLoaded(false);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                if (isMounted.current) setActiveSessionLoaded(true);
                return;
            }
            const response = await apiService.get<{
                success: boolean;
                data: ActiveSession | null;
            }>(API_ENDPOINTS.WORK_HOURS.ACTIVE, token, true);

            if (response?.data && response.data.isActive) {
                if (!isMounted.current) return;
                const session = response.data;
                const sessionId = session.id.toString();

                if (storeActiveSessionId === sessionId) {
                    console.log('[useActiveSession] Local store is authoritative. Ignoring server time data.');
                    // Only sync metadata if needed, but for now we trust local completely for timer.
                    setActiveSession(session);
                    // Do NOT overwrite local timer state (isPaused, pausedAt etc) from server.
                    // Instead, we might want to sync local state FROM store if they drifted?
                    // Actually, if store is authoritative, we should just let the store drive.
                } else {
                    console.log('[useActiveSession] Hydrating from server data (New Session/Restart)');
                    setActiveSession(session);
                    setIsPaused(session.isPaused || false);
                    setTotalPausedTime(session.totalPausedMs || 0);
                    setPausedAt(session.pausedAt ? new Date(TimerService.parseSafeDate(session.pausedAt)) : null);

                    setSessionData({
                        id: sessionId,
                        startTime: session.startTime,
                        accumulatedMs: session.totalPausedMs || 0,
                        pausedAt: session.pausedAt,
                        status: session.isPaused ? 'paused' : 'running'
                    });
                }
            } else {
                if (isMounted.current) {
                    setActiveSession(null);
                    setIsPaused(false);
                    setPausedAt(null);
                    setTotalPausedTime(0);
                    resetStore();
                }
            }
            if (isMounted.current) setActiveSessionLoaded(true);
        } catch (error) {
            console.error('Error loading active session:', error);
            if (isMounted.current) setActiveSessionLoaded(true);
        }
    }, [storeActiveSessionId, setSessionData, resetStore]);

    // Effect for handling the timer tick and synchronization
    useEffect(() => {
        if (!activeSession || !activeSession.isActive) {
            if (activeSessionLoaded) {
                if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                    timerIntervalRef.current = null;
                }
                if (isMounted.current) {
                    setTimer({ hours: 0, minutes: 0, seconds: 0 });
                    setIsPaused(false);
                    setPausedAt(null);
                    setTotalPausedTime(0);
                    resetStore();
                }
            }
            return;
        }

        const sessionIsPaused = isPaused || activeSession.isPaused;

        if (sessionIsPaused) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }

            const elapsedMs = TimerService.calculateElapsedBetween(
                activeSession.startTime,
                pausedAt ? pausedAt.toISOString() : (activeSession.pausedAt || Date.now()),
                totalPausedTime // Use local referenced total time
            );

            const totalSeconds = Math.floor(elapsedMs / 1000);
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;

            setTimer(prev => {
                if (prev.hours === h && prev.minutes === m && prev.seconds === s) return prev;
                return { hours: h, minutes: m, seconds: s };
            });

            // Critical: Only update store if elapsedMs changed significantly (e.g. > 100ms) 
            // to avoid minor fluctuations triggering re-renders
            setElapsedMs(elapsedMs);
            setStatus('paused');
        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

            const updateTick = () => {
                const elapsedMs = TimerService.calculateElapsed(
                    activeSession.startTime,
                    totalPausedTime || 0
                );
                const totalSeconds = Math.floor(elapsedMs / 1000);
                const h = Math.floor(totalSeconds / 3600);
                const m = Math.floor((totalSeconds % 3600) / 60);
                const s = totalSeconds % 60;

                if (isMounted.current) {
                    setTimer(prev => {
                        if (prev.hours === h && prev.minutes === m && prev.seconds === s) return prev;
                        return { hours: h, minutes: m, seconds: s };
                    });
                    setElapsedMs(elapsedMs);
                }
            };

            setStatus('running');
            setStartTime(activeSession.startTime);
            updateTick();
            timerIntervalRef.current = setInterval(updateTick, 1000) as any;
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [activeSession, activeSessionLoaded, isPaused, totalPausedTime, setStatus, setStartTime, setElapsedMs, resetStore]);

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
                if (isMounted.current) {
                    setActiveSession(response.data);
                    setIsPaused(false);
                    setPausedAt(null);
                    setTotalPausedTime(0);

                    setStatus('running');
                    setStartTime(response.data.startTime);
                    setAccumulatedMs(0);
                }
                updateTimerFromSession(response.data, 0);
                showToast.success('Clinical session started', 'Success');
            }
        } catch (error: any) {
            console.error('Error starting session:', error);
            showToast.error(error?.message || 'Failed to start session. Please try again.', 'Error');
        }
    };

    const handlePauseSession = async () => {
        if (!activeSession || isPaused) return;

        // Optimistic Update
        const pauseTime = new Date();
        const prevIsPaused = isPaused;
        const prevAccumulatedMs = totalPausedTime;

        // Immediately update local state & Store
        setIsPaused(true);
        setPausedAt(pauseTime);
        setActiveSession(prev => prev ? { ...prev, isPaused: true, pausedAt: pauseTime.toISOString() } : null);
        storePause(); // Update Global Store
        showToast.info('Session paused', 'Paused');

        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) throw new Error('No auth token');

            const response = await apiService.post<{
                success: boolean;
                data: ActiveSession;
            }>(API_ENDPOINTS.WORK_HOURS.PAUSE, { paused_at: pauseTime.toISOString() }, token);

            // STRICT CLIENT AUTHORITY:
            // Server response is ignored for UI state. We trust our optimistic update.
        } catch (error: any) {
            // Revert optimistic update on failure
            if (isMounted.current) {
                setIsPaused(prevIsPaused);
                setPausedAt(null);
                setTotalPausedTime(prevAccumulatedMs);
                setStatus('running');
            }
            showToast.error(error?.message || 'Failed to pause session');
        }
    };

    const handleResumeSession = async () => {
        if (!activeSession || !isPaused || !pausedAt) return;

        // Optimistic Update
        const resumeTime = new Date();
        // Calculate pending pause duration to add to total
        const currentPauseDuration = Math.max(0, resumeTime.getTime() - pausedAt.getTime());
        const prevTotalPaused = totalPausedTime;
        const prevPausedAt = pausedAt;

        // Immediately update local state & Store
        setIsPaused(false);
        setPausedAt(null); // Clear pausedAt
        setTotalPausedTime(prev => prev + currentPauseDuration);
        setActiveSession(prev => prev ? {
            ...prev,
            isPaused: false,
            pausedAt: null,
            totalPausedMs: (prev.totalPausedMs || 0) + currentPauseDuration
        } : null);

        storeResume(); // Update Global Store
        showToast.info('Session resumed', 'Resumed');

        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) throw new Error('No auth token');

            const response = await apiService.post<{
                success: boolean;
                data: ActiveSession;
            }>(API_ENDPOINTS.WORK_HOURS.RESUME, { resumed_at: resumeTime.toISOString() }, token);

            // STRICT CLIENT AUTHORITY:
            // Server response is ignored for UI state. We trust our optimistic update.
        } catch (error: any) {
            // Revert optimistic update
            if (isMounted.current) {
                setIsPaused(true);
                setPausedAt(prevPausedAt);
                setTotalPausedTime(prevTotalPaused);
                setStatus('paused');
                setAccumulatedMs(prevTotalPaused);
            }
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
                                if (isMounted.current) {
                                    setTimer({ hours: 0, minutes: 0, seconds: 0 });
                                    setActiveSession(response.data);
                                    setIsPaused(false);
                                    setPausedAt(null);
                                    setTotalPausedTime(0);

                                    resetStore();
                                    setStatus('running');
                                    setStartTime(response.data.startTime);
                                }
                                showToast.success('Session restarted', 'Success');
                            }
                        } catch (error: any) {
                            showToast.error(error?.message || 'Failed to restart session.', 'Error');
                        }
                    },
                },
            ]
        );
    };

    const handleStopSession = useCallback(async (onStopConfirm: () => void) => {
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
                            if (isMounted.current) {
                                setActiveSession(null);
                                resetStore();
                            }
                            showToast.success('Session ended');
                            if (onSessionEnded) onSessionEnded();
                        } catch (error: any) {
                            showToast.error(error?.message || 'Failed to stop session');
                        }
                    },
                },
                {
                    text: 'Yes',
                    onPress: onStopConfirm,
                },
            ]
        );
    }, [activeSession, onSessionEnded, resetStore]);

    return {
        activeSession,
        activeSessionLoaded,
        timer,
        isPaused,
        pausedAt,
        totalPausedTime,
        loadActiveSession,
        handleStartSession,
        handlePauseSession,
        handleResumeSession,
        handleRestartSession,
        handleStopSession,
        setActiveSession,
    };
};
