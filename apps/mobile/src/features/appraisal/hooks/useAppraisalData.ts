import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { Appraisal, Hospital, ApiAppraisal } from '../appraisal.types';

export const useAppraisalData = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);

    const loadAppraisals = useCallback(async (forceRefresh: boolean = false) => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await apiService.get<{
                success: boolean;
                data: ApiAppraisal[];
            }>(`${API_ENDPOINTS.APPRAISALS.LIST}?limit=100`, token, forceRefresh);

            if (response.success && response.data) {
                const mapped = response.data.map(api => ({
                    id: String(api.id),
                    appraisal_date: api.appraisal_date,
                    notes: api.notes,
                    documentIds: api.documentIds,
                    hospital_id: api.hospital_id,
                    hospital_name: api.hospital_name || 'Annual Appraisal',
                    appraisal_type: api.appraisal_type || 'Annual Appraisal',
                    discussion_with: api.discussion_with,
                    createdAt: api.createdAt,
                    updatedAt: api.updatedAt,
                }));
                setAppraisals(mapped);
            }
        } catch (error: any) {
            console.error('Error loading appraisals:', error);
            if (!error.message?.includes('500')) {
                showToast.error(error.message || 'Failed to load appraisals');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    const loadHospitals = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await apiService.get<{
                success: boolean;
                data: Hospital[];
            }>(`${API_ENDPOINTS.HOSPITALS.LIST}?limit=20`, token || '');

            if (response.success && response.data) {
                setHospitals(response.data);
            }
        } catch (error) {
            console.error('Error loading hospitals:', error);
        }
    }, []);

    const searchHospitals = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            // Revert to list if cleared
            if (query.length === 0) {
                loadHospitals();
            }
            return;
        }
        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await apiService.get<{
                success: boolean;
                data: Hospital[];
            }>(`${API_ENDPOINTS.HOSPITALS.SEARCH}?search=${query}`, token || '');

            if (response.success && response.data) {
                setHospitals(response.data);
            }
        } catch (error) {
            console.error('Hospital search error:', error);
        }
    }, [loadHospitals]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadAppraisals(true);
    }, [loadAppraisals]);

    return {
        loading,
        refreshing,
        appraisals,
        loadAppraisals,
        onRefresh,
        hospitals,
        loadHospitals,
        searchHospitals,
        setHospitals,
    };
};
