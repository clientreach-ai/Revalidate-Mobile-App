export interface CalendarAttendee {
  id: string;
  userId?: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  type: 'official' | 'personal';
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  endDate: string | null;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string;
  invite: string;
  attendees?: CalendarAttendee[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEvent {
  type: 'official' | 'personal';
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  location?: string;
  invite?: string;
}

export interface UpdateCalendarEvent {
  type?: 'official' | 'personal';
  title?: string;
  description?: string;
  date?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  location?: string;
  invite?: string;
}

export interface CalendarEventsResponse {
  success: boolean;
  data: CalendarEvent[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface CalendarEventResponse {
  success: boolean;
  data: CalendarEvent;
}
