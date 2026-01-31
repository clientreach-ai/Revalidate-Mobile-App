import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimerStatus } from './timer.types';
import { ActiveSession } from '../dashboard/dashboard.types';

interface TimerStore {
  userId: string | null;
  activeSessionId: string | null;
  activeSession: ActiveSession | null;

  status: TimerStatus; // 'idle' | 'running' | 'paused'
  startTime: string | null; // T0 (Session Start)
  pausedAt: string | null; // Timestamp of last pause
  accumulatedMs: number; // Total duration of all *completed* pauses
  // Note: elapsedMs is calculated UI state, but we store it for background task continuity if needed
  elapsedMs: number;

  setUserId: (userId: string | null) => void;
  setActiveSessionId: (id: string | null) => void;
  setSessionData: (data: {
    startTime: string | null;
    accumulatedMs: number;
    pausedAt?: string | null;
    status: TimerStatus;
    id: string;
    userId?: string | null;
    activeSession?: ActiveSession | null;
  }) => void;

  setStatus: (status: TimerStatus) => void;
  setStartTime: (time: string | null) => void;
  setAccumulatedMs: (ms: number) => void;
  setElapsedMs: (ms: number) => void;
  setActiveSession: (session: ActiveSession | null) => void;

  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      userId: null,
      activeSessionId: null,
      activeSession: null,

      status: 'idle',
      startTime: null,
      pausedAt: null,
      accumulatedMs: 0,
      elapsedMs: 0,

      setUserId: (userId) => set({ userId }),
      setActiveSessionId: (activeSessionId) => set({ activeSessionId }),

      setSessionData: (data) => set({
        startTime: data.startTime,
        accumulatedMs: data.accumulatedMs,
        pausedAt: data.pausedAt || null,
        status: data.status,
        activeSessionId: data.id,
        userId: data.userId || get().userId,
        activeSession: data.activeSession || get().activeSession
      }),

      setStatus: (status) => set({ status }),
      setStartTime: (startTime) => set({ startTime }),
      setAccumulatedMs: (accumulatedMs) => set({ accumulatedMs }),
      setElapsedMs: (elapsedMs) => set({ elapsedMs }),
      setActiveSession: (activeSession) => set({ activeSession }),

      pause: () => {
        const { status } = get();
        if (status !== 'running') return;

        set({
          status: 'paused',
          pausedAt: new Date().toISOString(),
        });
      },

      resume: () => {
        const { status, pausedAt, accumulatedMs } = get();
        if (status !== 'paused' || !pausedAt) return;

        const now = Date.now();
        const pauseStart = new Date(pausedAt).getTime();
        const pauseDuration = Math.max(0, now - pauseStart);

        set({
          status: 'running',
          pausedAt: null,
          accumulatedMs: accumulatedMs + pauseDuration,
        });
      },

      reset: () => {
        set({
          status: 'idle',
          activeSessionId: null,
          activeSession: null,
          startTime: null,
          pausedAt: null,
          accumulatedMs: 0,
          elapsedMs: 0,
        });
      },
    }),
    {
      name: 'timer-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
