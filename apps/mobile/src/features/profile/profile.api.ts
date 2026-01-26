import { apiService, API_ENDPOINTS } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileResponse } from './profile.types';

export async function getProfile(): Promise<ProfileResponse> {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiService.get<ProfileResponse>(API_ENDPOINTS.USERS.PROFILE, token);
}

export async function updateProfile(data: {
  registration_number?: string;
  revalidation_date?: string;
  professional_role?: 'doctor' | 'nurse' | 'pharmacist' | 'other' | 'other_healthcare';
  work_setting?: string;
  scope_of_practice?: string;
}): Promise<ProfileResponse> {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiService.put<ProfileResponse>(API_ENDPOINTS.USERS.UPDATE_PROFILE, data, token);
}
