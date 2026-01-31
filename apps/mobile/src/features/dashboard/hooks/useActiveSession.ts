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
    const timerStore = useTimerStore();
    const setStatus = useTimerStore(state => state.setStatus);
    const setStartTime = useTimerStore(state => state.setStartTime);
    const setAccumulatedMs = useTimerStore(state => state.setAccumulatedMs);
    const setElapsedMs = useTimerStore(state => state.setElapsedMs);
    const persist = useTimerStore(state => state.persist);
    const reset = useTimerStore(state => state.reset);

    const isMounted = useRef(true);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
    const [activeSessionLoaded, setActiveSessionLoaded] = useState(false);
    const [timer, setTimer] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [isPaused, setIsPaused] = useState(false);
    const [pausedAt, setPausedAt] = useState<Date | null>(null);
    const [totalPausedTime, setTotalPausedTime] = useState(0);
    const [lastPausedTimer, setLastPausedTimer] = useState<{
        hours: number;
        minutes: number;
        seconds: number;
    } | null>(null);

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
        const startTime = new Date(session.startTime);
        const now = new Date();
        const diffMs = now.getTime() - startTime.getTime() - pausedMs;
        const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        setTimer({ hours, minutes, seconds });
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
            }>(API_ENDPOINTS.WORK_HOURS.ACTIVE, token);

            if (response?.data && response.data.isActive) {
                if (!isMounted.current) return;
                const session = response.data;
                setActiveSession(session);
                setIsPaused(session.isPaused || false);
                setTotalPausedTime(session.totalPausedMs || 0);
                setPausedAt(session.pausedAt ? new Date(session.pausedAt) : null);

                if (session.isPaused && session.pausedAt) {
                    const startTime = new Date(session.startTime);
                    const pauseTime = new Date(session.pausedAt);
                    const diffMs = pauseTime.getTime() - startTime.getTime() - (session.totalPausedMs || 0);
                    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
                    const h = Math.floor(totalSeconds / 3600);
                    const m = Math.floor((totalSeconds % 3600) / 60);
                    const s = totalSeconds % 60;
                    setTimer({ hours: h, minutes: m, seconds: s });
                    setLastPausedTimer({ hours: h, minutes: m, seconds: s });
                } else {
                    setLastPausedTimer(null);
                    updateTimerFromSession(session, session.totalPausedMs || 0);
                }
            } else {
                if (isMounted.current) {
                    setActiveSession(null);
                    setIsPaused(false);
                    setPausedAt(null);
                    setTotalPausedTime(0);
                }
                await AsyncStorage.removeItem('workSessionPauseState');
            }
            if (isMounted.current) setActiveSessionLoaded(true);
        } catch (error) {
            console.error('Error loading active session:', error);
            if (isMounted.current) setActiveSessionLoaded(true);
        }
    }, [updateTimerFromSession]);

    useEffect(() => {
        if (activeSession && activeSession.isActive) {
            if (isPaused) {
                if (timerStore.status !== 'paused') setStatus('paused');
                if (timerStore.accumulatedMs !== totalPausedTime) setAccumulatedMs(totalPausedTime);
                persist();

                if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                    timerIntervalRef.current = null;
                }
            } else {
                if (timerStore.status !== 'running') setStatus('running');
                if (timerStore.startTime !== activeSession.startTime) setStartTime(activeSession.startTime);
                if (timerStore.accumulatedMs !== totalPausedTime) setAccumulatedMs(totalPausedTime);
                persist();

                const updateTick = () => {
                    const elapsed = TimerService.calculateElapsed(
                        activeSession.startTime,
                        -totalPausedTime
                    );
                    const totalSeconds = Math.max(0, Math.floor(elapsed / 1000));
                    const h = Math.floor(totalSeconds / 3600);
                    const m = Math.floor((totalSeconds % 3600) / 60);
                    const s = totalSeconds % 60;
                    if (isMounted.current) {
                        setTimer({ hours: h, minutes: m, seconds: s });
                        setElapsedMs(elapsed);
                    }
                };

                updateTick();
                timerIntervalRef.current = setInterval(updateTick, 1000) as any;
            }
        } else if (activeSessionLoaded) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            if (!activeSession || !activeSession.isActive) {
                if (isMounted.current) {
                    setTimer({ hours: 0, minutes: 0, seconds: 0 });
                    setIsPaused(false);
                    setPausedAt(null);
                    setTotalPausedTime(0);
                    setLastPausedTimer(null);
                }
                if (timerStore.status !== 'idle') reset();
                AsyncStorage.removeItem('workSessionPauseState').catch(console.error);
            }
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [activeSession, activeSessionLoaded, isPaused, totalPausedTime, setStatus, setStartTime, setAccumulatedMs, setElapsedMs, persist, reset, timerStore.status, timerStore.startTime, timerStore.accumulatedMs]);

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
                    setLastPausedTimer(null);
                }
                await AsyncStorage.removeItem('workSessionPauseState');
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
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            const response = await apiService.post<{
                success: boolean;
                data: ActiveSession;
            }>(API_ENDPOINTS.WORK_HOURS.PAUSE, {}, token);

            if (response?.data) {
                if (isMounted.current) {
                    setActiveSession(response.data);
                    setIsPaused(true);
                    setPausedAt(new Date(response.data.pausedAt!));
                    setLastPausedTimer(timer);
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
                if (isMounted.current) {
                    setActiveSession(response.data);
                    setIsPaused(false);
                    setPausedAt(null);
                    setTotalPausedTime(response.data.totalPausedMs || 0);
                    setLastPausedTimer(null);
                }
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
                                if (isMounted.current) {
                                    setTimer({ hours: 0, minutes: 0, seconds: 0 });
                                    setActiveSession(response.data);
                                    setIsPaused(false);
                                    setPausedAt(null);
                                    setTotalPausedTime(0);
                                    setLastPausedTimer(null);
                                }
                                await AsyncStorage.removeItem('workSessionPauseState');
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
                            if (isMounted.current) setActiveSession(null);
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
    }, [activeSession, onSessionEnded]);

    return {
        activeSession,
        activeSessionLoaded,
        timer,
        isPaused,
        pausedAt,
        totalPausedTime,
        lastPausedTimer,
        loadActiveSession,
        handleStartSession,
        handlePauseSession,
        handleResumeSession,
        handleRestartSession,
        handleStopSession,
        setActiveSession,
    };
};
