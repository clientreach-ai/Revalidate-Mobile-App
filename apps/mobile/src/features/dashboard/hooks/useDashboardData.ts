import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { setSubscriptionInfo } from '@/utils/subscription';
import { UserData, DashboardStats, RecentActivity } from '../dashboard.types';
import { formatTimeAgo } from '../dashboard.utils';
import { useNotificationStore } from '@/features/notifications/notification.store';

export const useDashboardData = () => {
    const router = useRouter();
    const isMounted = useRef(true);

    const [userData, setUserData] = useState<UserData | null>(null);
    const [stats, setStats] = useState<DashboardStats>({
        totalHours: 0,
        totalEarnings: 0,
        workSessionsCount: 0,
        cpdHours: 0,
        reflectionsCount: 0,
        appraisalsCount: 0,
    });
    const { unreadCount: unreadNotifications, refreshUnreadCount: loadNotificationsCount } = useNotificationStore();
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [revalidationDays, setRevalidationDays] = useState<number | null>(null);
    const [localProfileImage, setLocalProfileImage] = useState<string | null>(null);

    const [isUserLoading, setIsUserLoading] = useState(false);
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [isActivitiesLoading, setIsActivitiesLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const loadUserData = useCallback(async (force = false) => {
        try {
            if (isMounted.current) setIsUserLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }
            const response = await apiService.get<{ success: boolean; data: any }>(
                API_ENDPOINTS.USERS.ME,
                token,
                force
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
        } catch (error: any) {
            if (error && error.name === 'AbortError') {
                // Fetch aborted (likely background timeout) — ignore to avoid noisy error output
            } else {
                console.error('Error loading user data:', error);
            }
        } finally {
            if (isMounted.current) setIsUserLoading(false);
        }
    }, [router]);

    const loadDashboardStats = useCallback(async (force = false) => {
        try {
            if (isMounted.current) setIsStatsLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            const whr = await apiService.get<{
                success: boolean;
                data: { totalHours: number; totalEarnings?: number };
            }>(API_ENDPOINTS.WORK_HOURS.STATS_TOTAL, token, force);

            let totalHours = whr?.data?.totalHours || 0;
            let totalEarnings = whr?.data?.totalEarnings || 0;

            let workSessionsCount = 0;
            try {
                const sessions = await apiService.get<{ pagination?: { total?: number } }>(
                    `${API_ENDPOINTS.WORK_HOURS.LIST}?limit=1`,
                    token,
                    force
                );
                workSessionsCount = sessions?.pagination?.total || 0;
            } catch (e) { }

            if (totalHours === 0 || totalEarnings === 0) {
                try {
                    const onboarding = await apiService.get<{ data: any }>(
                        API_ENDPOINTS.USERS.ONBOARDING.DATA,
                        token,
                        force
                    );
                    if (onboarding?.data) {
                        if (totalHours === 0)
                            totalHours = onboarding.data.work_hours_completed_already || 0;
                        if (totalEarnings === 0)
                            totalEarnings = onboarding.data.earned_current_financial_year || 0;
                    }
                } catch (e) { }
            }

            let cpdHours = 0;
            try {
                const cpd = await apiService.get<{
                    success: boolean;
                    data: { totalHours: number };
                }>('/api/v1/cpd-hours/stats/total', token, force);
                cpdHours = cpd?.data?.totalHours || 0;
            } catch (e) { }

            let reflectionsCount = 0;
            try {
                const ref = await apiService.get<{ pagination: { total: number } }>(
                    '/api/v1/reflections?limit=1',
                    token,
                    force
                );
                reflectionsCount = ref?.pagination?.total || 0;
            } catch (e) { }

            let appraisalsCount = 0;
            try {
                const appr = await apiService.get<{ pagination: { total: number } }>(
                    API_ENDPOINTS.APPRAISALS.LIST + '?limit=1',
                    token,
                    force
                );
                appraisalsCount = appr?.pagination?.total || 0;
            } catch (e) { }

            if (isMounted.current) {
                setStats({
                    totalHours: Math.ceil(Number(totalHours)),
                    totalEarnings: Math.round(totalEarnings),
                    workSessionsCount,
                    cpdHours: Math.round(cpdHours),
                    reflectionsCount,
                    appraisalsCount,
                });
            }
        } catch (error) {
            console.error('Error stats:', error);
        } finally {
            if (isMounted.current) setIsStatsLoading(false);
        }
    }, []);

    // Handled by store

    const loadRecentActivities = useCallback(async (force = false) => {
        try {
            if (isMounted.current) setIsActivitiesLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;
            const res = await apiService.get<{ data: any[] }>(
                `/api/v1/notifications?limit=6`,
                token,
                force
            );
            if (res?.data) {
                const mapped: RecentActivity[] = res.data.map((it: any) => ({
                    id: String(it.id ?? ''),
                    type: it.type || '',
                    title: it.title || 'Notification',
                    subtitle: it.body || it.message || '',
                    time: formatTimeAgo(it.createdAt || it.created_at),
                    icon: it.icon || 'notifications',
                    iconColor: '#2B5F9E',
                    bgColor: '#E9F2FF',
                }));
                if (isMounted.current) setRecentActivities(mapped);
            }
        } catch (e) {
        } finally {
            if (isMounted.current) setIsActivitiesLoading(false);
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            loadUserData(true),
            loadDashboardStats(true),
            loadNotificationsCount(true),
            loadRecentActivities(true),
        ]);
        if (isMounted.current) setRefreshing(false);
    }, [loadUserData, loadDashboardStats, loadNotificationsCount, loadRecentActivities]);

    return {
        userData,
        stats,
        unreadNotifications,
        recentActivities,
        revalidationDays,
        localProfileImage,
        isUserLoading,
        isStatsLoading,
        isActivitiesLoading,
        refreshing,
        loadUserData,
        loadDashboardStats,
        loadNotificationsCount,
        loadRecentActivities,
        onRefresh,
        setRefreshing,
    };
};
