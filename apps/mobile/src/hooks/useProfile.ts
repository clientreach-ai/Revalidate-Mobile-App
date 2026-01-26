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
