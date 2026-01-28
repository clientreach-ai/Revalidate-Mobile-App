import { apiService, API_ENDPOINTS } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function searchUsers(query: string, limit = 20, offset = 0) {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) throw new Error('No authentication token found');

  const params = new URLSearchParams();
  params.append('q', query);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  return apiService.get<{ success: boolean; data: Array<any>; pagination?: any }>(`${API_ENDPOINTS.USERS.SEARCH}?${params.toString()}`, token);
}
