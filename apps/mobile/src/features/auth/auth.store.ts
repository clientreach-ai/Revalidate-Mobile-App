import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearAllOfflineData } from '@/services/offline-storage';
import { apiService } from '@/services/api';
import { API_ENDPOINTS } from '@revalidation-tracker/constants';
import { useTimerStore } from '@/features/timer/timer.store';

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  // Hydration tracking for persistent state
  _hasHydrated: boolean;
}

interface AuthActions {
  setAuth: (token: string, user: AuthUser) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  logout: () => Promise<void>;
  setHasHydrated: (state: boolean) => void;
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  onboardingCompleted: false,
  _hasHydrated: false,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      setAuth: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),
      setOnboardingCompleted: (completed) =>
        set({
          onboardingCompleted: completed,
        }),
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
      logout: async () => {
        const { token, user } = get();

        // Auto-pause any active work session before logout
        if (token) {
          try {
            await apiService.post(API_ENDPOINTS.WORK_HOURS.PAUSE, {}, token);
          } catch (err) {
            // Session may not be active, ignore error
            console.log('No active session to pause on logout');
          }
        }

        // Reset memory-only timer store
        useTimerStore.getState().reset();

        // Clear SQLite cache
        clearAllOfflineData().catch((err) => {
          console.error('Failed to clear offline data on logout:', err);
        });

        try {
          await AsyncStorage.clear();
        } catch (err) {
          console.error('Failed to clear AsyncStorage on logout:', err);
        }

        set({
          ...initialState,
          _hasHydrated: true, // Keep hydration state on logout
        });
      },
      setHasHydrated: (state) =>
        set({
          _hasHydrated: state,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // Only persist these specific fields
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        onboardingCompleted: state.onboardingCompleted,
      }),
    }
  )
);

// Utility hook to wait for auth hydration
export const useAuthHydrated = () =>
  useAuthStore((state) => state._hasHydrated);

