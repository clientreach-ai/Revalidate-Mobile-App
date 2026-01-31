import { create } from 'zustand';
import { TimerState, TimerStatus } from './timer.types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TimerStore extends TimerState {
    setStatus: (status: TimerStatus) => void;
    setStartTime: (time: string | null) => void;
    setAccumulatedMs: (ms: number) => void;
    setLastPausedAt: (time: string | null) => void;
    setElapsedMs: (ms: number) => void;
    reset: () => void;
    persist: () => Promise<void>;
    load: () => Promise<void>;
}

const STORAGE_KEY = 'v1_timer_state';

export const useTimerStore = create<TimerStore>((set, get) => ({
    status: 'idle',
    startTime: null,
    accumulatedMs: 0,
    lastPausedAt: null,
    elapsedMs: 0,

    setStatus: (status) => set({ status }),
    setStartTime: (startTime) => set({ startTime }),
    setAccumulatedMs: (accumulatedMs) => set({ accumulatedMs }),
    setLastPausedAt: (lastPausedAt) => set({ lastPausedAt }),
    setElapsedMs: (elapsedMs) => set({ elapsedMs }),

    reset: () => {
        set({
            status: 'idle',
            startTime: null,
            accumulatedMs: 0,
            lastPausedAt: null,
            elapsedMs: 0,
        });
        AsyncStorage.removeItem(STORAGE_KEY);
    },

    persist: async () => {
        const state = get();
        const data = {
            status: state.status,
            startTime: state.startTime,
            accumulatedMs: state.accumulatedMs,
            lastPausedAt: state.lastPausedAt,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    load: async () => {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                set({ ...parsed });

                // Calculate initial elapsedMs if running
                if (parsed.status === 'running' && parsed.startTime) {
                    const start = new Date(parsed.startTime).getTime();
                    const now = Date.now();
                    set({ elapsedMs: now - start + (parsed.accumulatedMs || 0) });
                } else if (parsed.status === 'paused') {
                    set({ elapsedMs: parsed.accumulatedMs || 0 });
                }
            }
        } catch (e) {
            console.error('Failed to load timer state', e);
        }
    },
}));
