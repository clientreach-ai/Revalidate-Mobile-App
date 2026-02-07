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
  shiftDurationMinutes: number | null;
  shiftStartTime: string | null;
  shiftEndNotificationId: string | null;

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
  setShiftDurationMinutes: (minutes: number | null) => void;
  setShiftStartTime: (time: string | null) => void;
  setShiftEndNotificationId: (id: string | null) => void;

  pause: (pausedAt?: string) => void;
  resume: (resumedAt?: string) => void;
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
      shiftDurationMinutes: null,
      shiftStartTime: null,
      shiftEndNotificationId: null,

      setUserId: (userId) => set({ userId }),
      setActiveSessionId: (activeSessionId) => set({ activeSessionId }),

      setSessionData: (data) =>
        set({
          startTime: data.startTime,
          accumulatedMs: data.accumulatedMs,
          pausedAt: data.pausedAt || null,
          status: data.status,
          activeSessionId: data.id,
          userId: data.userId || get().userId,
          activeSession: data.activeSession || get().activeSession,
        }),

      setStatus: (status) => set({ status }),
      setStartTime: (startTime) => set({ startTime }),
      setAccumulatedMs: (accumulatedMs) => set({ accumulatedMs }),
      setElapsedMs: (elapsedMs) => set({ elapsedMs }),
      setActiveSession: (activeSession) => set({ activeSession }),
      setShiftDurationMinutes: (shiftDurationMinutes) =>
        set({ shiftDurationMinutes }),
      setShiftStartTime: (shiftStartTime) => set({ shiftStartTime }),
      setShiftEndNotificationId: (shiftEndNotificationId) =>
        set({ shiftEndNotificationId }),

      pause: (pausedAt) => {
        const { status, startTime, activeSessionId } = get();
        if (status === 'paused') return;
        if (!startTime && !activeSessionId) return;

        set({
          status: 'paused',
          pausedAt: pausedAt ?? new Date().toISOString(),
        });
      },

      resume: (resumedAt) => {
        const { status, pausedAt, accumulatedMs } = get();
        if (status !== 'paused') return;

        const resumeTs = resumedAt ? new Date(resumedAt).getTime() : Date.now();
        const pauseStart = pausedAt ? new Date(pausedAt).getTime() : NaN;
        const pauseDuration = Number.isFinite(pauseStart)
          ? Math.max(0, resumeTs - pauseStart)
          : 0;
        const safeAccum = Number.isFinite(accumulatedMs) ? accumulatedMs : 0;

        set({
          status: 'running',
          pausedAt: null,
          accumulatedMs: safeAccum + pauseDuration,
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
          shiftDurationMinutes: null,
          shiftStartTime: null,
          shiftEndNotificationId: null,
        });
      },
    }),
    {
      name: 'timer-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
