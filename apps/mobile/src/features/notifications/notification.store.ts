import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, API_ENDPOINTS } from '@/services/api';

interface NotificationState {
    unreadCount: number;
    isLoading: boolean;
    refreshUnreadCount: () => Promise<void>;
    setUnreadCount: (count: number) => void;
    decrementUnreadCount: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    unreadCount: 0,
    isLoading: false,

    refreshUnreadCount: async () => {
        try {
            set({ isLoading: true });
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                set({ unreadCount: 0, isLoading: false });
                return;
            }

            const response = await apiService.get<{ success: boolean; data: { count: number } }>(
                API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT,
                token,
                true // useCache: true (service will handle cache-first)
            );

            if (response?.data) {
                set({ unreadCount: response.data.count });
            }
        } catch (error) {
            console.warn('Failed to refresh unread count:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    setUnreadCount: (count: number) => set({ unreadCount: count }),

    decrementUnreadCount: () => {
        const current = get().unreadCount;
        if (current > 0) {
            set({ unreadCount: current - 1 });
        }
    },
}));
