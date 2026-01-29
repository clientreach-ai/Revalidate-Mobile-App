import { useState, useEffect, useCallback } from 'react';
import { getProfile, updateProfile } from '@/features/profile/profile.api';
import { UserProfile } from '@/features/profile/profile.types';
import { showToast } from '@/utils/toast';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProfile = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const response = await getProfile();
      setProfile(response.data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);

      // Suppress network error toasts for premium users (they have cache fallback)
      if (error.message?.includes('INTERNET_REQUIRED') || error.message?.includes('Network request failed')) {
        console.log('Skipping error toast for profile fetch - offline mode');
        return;
      }

      showToast.error(
        error.message || 'Failed to load profile',
        'Error'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const updateUserProfile = useCallback(async (data: {
    registration_number?: string;
    revalidation_date?: string;
    professional_role?: 'doctor' | 'nurse' | 'pharmacist' | 'other' | 'other_healthcare';
    work_setting?: string;
    scope_of_practice?: string;
  }) => {
    try {
      const response = await updateProfile(data);
      setProfile(response.data);
      showToast.success('Profile updated successfully', 'Success');
      return response.data;
    } catch (error: any) {
      console.error('Error updating profile:', error);

      // Special handling for offline writes
      if (error.message?.includes('INTERNET_REQUIRED')) {
        // apiService usually handles this by queueing, but if it reaches here,
        // it might be an online-only endpoint or free user.
        return;
      }

      showToast.error(
        error.message || 'Failed to update profile',
        'Error'
      );
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    isRefreshing,
    refresh: () => fetchProfile(false),
    updateProfile: updateUserProfile,
  };
}
