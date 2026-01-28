import { apiService, API_ENDPOINTS } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CalendarEvent,
  CreateCalendarEvent,
  UpdateCalendarEvent,
  CalendarEventsResponse,
  CalendarEventResponse,
} from './calendar.types';

export async function getCalendarEvents(params?: {
  startDate?: string;
  endDate?: string;
  type?: 'official' | 'personal';
  limit?: number;
  offset?: number;
}): Promise<CalendarEventsResponse> {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const endpoint = `${API_ENDPOINTS.CALENDAR.EVENTS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiService.get<CalendarEventsResponse>(endpoint, token);
}

export async function getCalendarEventById(eventId: string): Promise<CalendarEventResponse> {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiService.get<CalendarEventResponse>(`${API_ENDPOINTS.CALENDAR.GET_BY_ID}/${eventId}`, token);
}

export async function createCalendarEvent(data: CreateCalendarEvent): Promise<CalendarEventResponse> {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiService.post<CalendarEventResponse>(API_ENDPOINTS.CALENDAR.CREATE_EVENT, data, token);
}

export async function updateCalendarEvent(
  eventId: string,
  data: UpdateCalendarEvent
): Promise<CalendarEventResponse> {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiService.put<CalendarEventResponse>(`${API_ENDPOINTS.CALENDAR.UPDATE_EVENT}/${eventId}`, data, token);
}

export async function deleteCalendarEvent(eventId: string): Promise<{ success: boolean; message: string }> {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiService.delete<{ success: boolean; message: string }>(`${API_ENDPOINTS.CALENDAR.DELETE_EVENT}/${eventId}`, token);
}

export async function inviteCalendarEvent(eventId: string, attendees: Array<{ userId?: string; email?: string }>) {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) throw new Error('No authentication token found');

  return apiService.post<{ success: boolean; data: any }>(`${API_ENDPOINTS.CALENDAR.EVENTS}/${eventId}/invite`, { attendees }, token);
}

export async function respondToInvite(eventId: string, attendeeId: string, status: 'accepted' | 'declined') {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) throw new Error('No authentication token found');

  return apiService.post<{ success: boolean; data: any }>(`${API_ENDPOINTS.CALENDAR.EVENTS}/${eventId}/respond`, { attendeeId, status }, token);
}

export async function copyCalendarEvent(eventId: string, date: string) {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) throw new Error('No authentication token found');

  return apiService.post<{ success: boolean; data: any }>(`${API_ENDPOINTS.CALENDAR.EVENTS}/${eventId}/copy`, { date }, token);
}
