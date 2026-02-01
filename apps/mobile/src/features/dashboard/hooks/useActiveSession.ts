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
    const storeResume = useTimerStore(s => s.resume);
    const resetStore = useTimerStore(s => s.reset);

    const isMounted = useRef(true);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // State from persistent store
    const activeSession = useTimerStore(s => s.activeSession);
    const storeStatus = useTimerStore(s => s.status);
    const storeStartTime = useTimerStore(s => s.startTime);
    const storeAccumulatedMs = useTimerStore(s => s.accumulatedMs);
    const storePausedAt = useTimerStore(s => s.pausedAt);

    // Mapped helpers
    const isPaused = storeStatus === 'paused';
    const totalPausedTime = storeAccumulatedMs;
    const pausedAt = storePausedAt ? new Date(storePausedAt) : null;

    const [activeSessionLoaded, setActiveSessionLoaded] = useState(false);
    const [timer, setTimer] = useState({ hours: 0, minutes: 0, seconds: 0 });

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
        if (!session || !session.isActive) return;

        const elapsedMs = session.isPaused
            ? TimerService.calculateElapsedBetween(session.startTime, session.pausedAt || new Date().toISOString(), pausedMs)
            : TimerService.calculateElapsed(session.startTime, pausedMs);

        const totalSeconds = Math.floor(elapsedMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

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
                if (isMounted.current) {
                    resetStore();
                    setActiveSessionLoaded(true);
                }
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
                    console.log('[useActiveSession] Local store is authoritative. Updating metadata only.');
                    // Update metadata but keep the timer state (store is authoritative)
                    useTimerStore.getState().setActiveSession(session);
                } else {
                    console.log('[useActiveSession] Hydrating from server data (New Session/Different Session)');
                    setSessionData({
                        id: sessionId,
                        startTime: session.startTime,
                        accumulatedMs: session.totalPausedMs || 0,
                        pausedAt: session.pausedAt,
                        status: session.isPaused ? 'paused' : 'running',
                        activeSession: session
                    });
                }
            } else {
                if (isMounted.current) {
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

            const effectivePausedAt = storePausedAt || activeSession.pausedAt || new Date().toISOString();
            const elapsedMs = TimerService.calculateElapsedBetween(
                activeSession.startTime,
                effectivePausedAt,
                totalPausedTime
            );

            const totalSeconds = Math.floor(elapsedMs / 1000);
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;

            setTimer(prev => {
                if (prev.hours === h && prev.minutes === m && prev.seconds === s) return prev;
                return { hours: h, minutes: m, seconds: s };
            });

            setElapsedMs(elapsedMs);
            if (storeStatus !== 'paused') setStatus('paused');
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

            if (storeStatus !== 'running') setStatus('running');
            if (storeStartTime !== activeSession.startTime) setStartTime(activeSession.startTime);

            updateTick();
            timerIntervalRef.current = setInterval(updateTick, 1000) as any;
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [activeSession, activeSessionLoaded, isPaused, storePausedAt, totalPausedTime, storeStatus, storeStartTime, setStatus, setStartTime, setElapsedMs]);

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
                const session = response.data;
                if (isMounted.current) {
                    setSessionData({
                        id: session.id.toString(),
                        startTime: session.startTime,
                        accumulatedMs: 0,
                        status: 'running',
                        activeSession: session
                    });
                }
                updateTimerFromSession(session, 0);
                showToast.success('Clinical session started', 'Success');
            }
        } catch (error: any) {
            console.error('Error starting session:', error);
            showToast.error(error?.message || 'Failed to start session. Please try again.', 'Error');
        }
    };

    const handlePauseSession = async () => {
        if (!activeSession || isPaused) return;

        const pauseTime = new Date().toISOString();
        const prevStatus = storeStatus;
        const prevAccumulatedMs = totalPausedTime;

        // Optimistic update to store
        useTimerStore.getState().pause(pauseTime); // This sets status to 'paused' and pausedAt to now
        useTimerStore.getState().setActiveSession({ ...activeSession, isPaused: true, pausedAt: pauseTime });

        showToast.info('Session paused', 'Paused');

        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) throw new Error('No auth token');

            await apiService.post<{
                success: boolean;
                data: ActiveSession;
            }>(API_ENDPOINTS.WORK_HOURS.PAUSE, { paused_at: pauseTime }, token);
        } catch (error: any) {
            // Revert on failure
            if (isMounted.current) {
                setStatus(prevStatus);
                setAccumulatedMs(prevAccumulatedMs);
                useTimerStore.getState().setStartTime(activeSession.startTime);
                useTimerStore.getState().setActiveSession(activeSession);
            }
            showToast.error(error?.message || 'Failed to pause session');
        }
    };

    const handleResumeSession = async () => {
        if (!activeSession || !isPaused) return;

        const pausedAtIso = useTimerStore.getState().pausedAt || activeSession.pausedAt;
        if (!pausedAtIso) return;

        const resumeTime = new Date();
        const currentPauseDuration = Math.max(0, resumeTime.getTime() - new Date(pausedAtIso).getTime());
        const prevTotalPaused = totalPausedTime;
        const prevStatus = storeStatus;

        // Optimistic update to store
        useTimerStore.getState().resume(resumeTime.toISOString());
        useTimerStore.getState().setActiveSession({
            ...activeSession,
            isPaused: false,
            pausedAt: null,
            totalPausedMs: (activeSession.totalPausedMs || 0) + currentPauseDuration
        });

        showToast.info('Session resumed', 'Resumed');

        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) throw new Error('No auth token');

            await apiService.post<{
                success: boolean;
                data: ActiveSession;
            }>(API_ENDPOINTS.WORK_HOURS.RESUME, { resumed_at: resumeTime.toISOString() }, token);
        } catch (error: any) {
            // Revert
            if (isMounted.current) {
                setStatus(prevStatus);
                setAccumulatedMs(prevTotalPaused);
                useTimerStore.getState().setStartTime(activeSession.startTime);
                useTimerStore.getState().setActiveSession(activeSession);
            }
            showToast.error(error?.message || 'Failed to resume session');
        }
    };

    const handleRestartSession = async () => {
        Alert.alert(
            'Restart Session',
            'Are you sure you want to start from 0?',
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

                            const startTime = new Date().toISOString();
                            const response = await apiService.post<{
                                success: boolean;
                                data: ActiveSession;
                            }>(API_ENDPOINTS.WORK_HOURS.RESTART, { start_time: startTime }, token);

                            if (response?.data) {
                                if (isMounted.current) {
                                    setTimer({ hours: 0, minutes: 0, seconds: 0 });
                                    setSessionData({
                                        id: response.data.id.toString(),
                                        startTime: response.data.startTime,
                                        accumulatedMs: 0,
                                        pausedAt: null,
                                        status: 'running',
                                        activeSession: response.data
                                    });
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
        setActiveSession: (s: ActiveSession | null) => useTimerStore.getState().setActiveSession(s),
    };
};
