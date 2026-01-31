import { useState, useEffect, useCallback } from 'react';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  inviteCalendarEvent,
  copyCalendarEvent,
} from '@/features/calendar/calendar.api';
import { CalendarEvent, CreateCalendarEvent, UpdateCalendarEvent } from '@/features/calendar/calendar.types';
import { showToast } from '@/utils/toast';

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEvents = useCallback(async (params?: {
    startDate?: string;
    endDate?: string;
    type?: 'official' | 'personal';
  }, showLoading = true, forceRefresh = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const response = await getCalendarEvents(params, forceRefresh);
      setEvents(response.data);
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);

      // Suppress network error toasts for offline mode
      if (error.message?.includes('INTERNET_REQUIRED') || error.message?.includes('Network request failed')) {
        console.log('Skipping error toast for calendar fetch - offline mode');
        return;
      }

      showToast.error(
        error.message || 'Failed to load calendar events',
        'Error'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const createEvent = useCallback(async (data: CreateCalendarEvent) => {
    try {
      const response = await createCalendarEvent(data);
      setEvents(prev => [...prev, response.data]);
      showToast.success('Event created successfully', 'Success');
      return response.data;
    } catch (error: any) {
      console.error('Error creating event:', error);
      showToast.error(
        error.message || 'Failed to create event',
        'Error'
      );
      throw error;
    }
  }, []);

  const updateEvent = useCallback(async (eventId: string, data: UpdateCalendarEvent) => {
    try {
      const response = await updateCalendarEvent(eventId, data);
      setEvents(prev => prev.map(e => e.id === eventId ? response.data : e));
      showToast.success('Event updated successfully', 'Success');
      return response.data;
    } catch (error: any) {
      console.error('Error updating event:', error);
      showToast.error(
        error.message || 'Failed to update event',
        'Error'
      );
      throw error;
    }
  }, []);

  const removeEvent = useCallback(async (eventId: string) => {
    try {
      await deleteCalendarEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      showToast.success('Event deleted successfully', 'Success');
    } catch (error: any) {
      console.error('Error deleting event:', error);
      showToast.error(
        error.message || 'Failed to delete event',
        'Error'
      );
      throw error;
    }
  }, []);

  const inviteAttendees = useCallback(async (eventId: string, attendees: Array<{ userId?: string; email?: string }>) => {
    try {
      const res = await inviteCalendarEvent(eventId, attendees);
      console.log('Invite response:', res);
      // Optimistically update or use response if it contains the updated event
      // Assuming res.data is the updated event or we need to refetch
      // safetly try to update if it looks like an event
      if (res.data && res.data.id === eventId) {
        setEvents(prev => prev.map(e => e.id === eventId ? res.data : e));
      }
      showToast.success('Invites sent', 'Success');
      return res.data;
    } catch (error: any) {
      console.error('Error inviting attendees:', error);
      showToast.error(error.message || 'Failed to invite attendees', 'Error');
      throw error;
    }
  }, []);

  const copyEvent = useCallback(async (eventId: string, date: string) => {
    try {
      const res = await copyCalendarEvent(eventId, date);
      setEvents(prev => [...prev, res.data]);
      showToast.success('Event copied', 'Success');
      return res.data;
    } catch (error: any) {
      console.error('Error copying event:', error);
      showToast.error(error.message || 'Failed to copy event', 'Error');
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    isRefreshing,
    refresh: (params?: { startDate?: string; endDate?: string; type?: 'official' | 'personal' }) => fetchEvents(params, false, true),
    createEvent,
    updateEvent,
    deleteEvent: removeEvent,
    inviteAttendees,
    copyEvent,
  };
}
