import { useState, useEffect, useCallback } from 'react';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
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
  }, showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const response = await getCalendarEvents(params);
      setEvents(response.data);
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
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

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    isRefreshing,
    refresh: (params?: { startDate?: string; endDate?: string; type?: 'official' | 'personal' }) => fetchEvents(params, false),
    createEvent,
    updateEvent,
    deleteEvent: removeEvent,
  };
}
