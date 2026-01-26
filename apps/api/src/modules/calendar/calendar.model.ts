import { prisma } from '../../lib/prisma';
import { ApiError } from '../../common/middleware/error-handler';

export interface CalendarEvent {
  id: string;
  userId: string;
  type: 'official' | 'personal';
  title: string;
  description: string | null;
  date: Date;
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  invite: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCalendarEvent {
  type: 'official' | 'personal';
  title: string;
  description?: string;
  date: string; // ISO date string
  endDate?: string; // ISO date string
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  location?: string;
  invite?: string;
}

export interface UpdateCalendarEvent {
  type?: 'official' | 'personal';
  title?: string;
  description?: string;
  date?: string; // ISO date string
  endDate?: string; // ISO date string
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  location?: string;
  invite?: string;
}

export interface GetCalendarEventsOptions {
  startDate?: string;
  endDate?: string;
  type?: 'official' | 'personal';
  limit?: number;
  offset?: number;
}

/**
 * Map database type values to API format
 * Database stores: "1" = official, "2" = personal
 */
function mapEventType(dbType: string): 'official' | 'personal' {
  if (dbType === '1' || dbType === 'official') return 'official';
  if (dbType === '2' || dbType === 'personal') return 'personal';
  return 'personal'; // default fallback
}

/**
 * Map API type to database format
 * Database stores: "1" = official, "2" = personal
 */
function mapTypeToDb(apiType: 'official' | 'personal'): string {
  return apiType === 'official' ? '1' : '2';
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  userId: string,
  data: CreateCalendarEvent
): Promise<CalendarEvent> {
  const eventDate = new Date(data.date);
  const endDate = data.endDate ? new Date(data.endDate) : null;

  const event = await prisma.user_calendars.create({
    data: {
      user_id: BigInt(userId),
      type: mapTypeToDb(data.type),
      title: data.title,
      date: eventDate,
      end_date: endDate,
      start_time: data.startTime || null,
      end_time: data.endTime || null,
      venue: data.location || null,
      invite: data.invite || null,
      status: '1', // Active
    },
  });

  return {
    id: event.id.toString(),
    userId: event.user_id.toString(),
    type: mapEventType(event.type),
    title: event.title,
    description: null, // Not in schema, but keeping for compatibility
    date: event.date,
    endDate: event.end_date,
    startTime: event.start_time,
    endTime: event.end_time,
    location: event.venue,
    invite: event.invite,
    status: event.status,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

/**
 * Get calendar event by ID
 */
export async function getCalendarEventById(
  eventId: string,
  userId: string
): Promise<CalendarEvent | null> {
  const event = await prisma.user_calendars.findFirst({
    where: {
      id: BigInt(eventId),
      user_id: BigInt(userId),
    },
  });

  if (!event) {
    return null;
  }

  return {
    id: event.id.toString(),
    userId: event.user_id.toString(),
    type: mapEventType(event.type),
    title: event.title,
    description: null,
    date: event.date,
    endDate: event.end_date,
    startTime: event.start_time,
    endTime: event.end_time,
    location: event.venue,
    invite: event.invite,
    status: event.status,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

/**
 * Get user's calendar events
 */
export async function getUserCalendarEvents(
  userId: string,
  options: GetCalendarEventsOptions = {}
): Promise<{ events: CalendarEvent[]; total: number }> {
  const where: any = {
    user_id: BigInt(userId),
  };

  if (options.startDate) {
    where.date = { gte: new Date(options.startDate) };
  }

  if (options.endDate) {
    where.date = { ...where.date, lte: new Date(options.endDate) };
  }

  if (options.type) {
    where.type = mapTypeToDb(options.type);
  }

  const [events, total] = await Promise.all([
    prisma.user_calendars.findMany({
      where,
      orderBy: { date: 'asc' },
      take: options.limit,
      skip: options.offset,
    }),
    prisma.user_calendars.count({ where }),
  ]);

  return {
    events: events.map(event => ({
      id: event.id.toString(),
      userId: event.user_id.toString(),
      type: mapEventType(event.type),
      title: event.title,
      description: null,
      date: event.date,
      endDate: event.end_date,
      startTime: event.start_time,
      endTime: event.end_time,
      location: event.venue,
      invite: event.invite,
      status: event.status,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    })),
    total,
  };
}

/**
 * Update calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  userId: string,
  data: UpdateCalendarEvent
): Promise<CalendarEvent> {
  // Check if event exists and belongs to user
  const existing = await prisma.user_calendars.findFirst({
    where: {
      id: BigInt(eventId),
      user_id: BigInt(userId),
    },
  });

  if (!existing) {
    throw new ApiError(404, 'Calendar event not found');
  }

  const updateData: any = {};

  if (data.type !== undefined) {
    updateData.type = mapTypeToDb(data.type);
  }
  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.date !== undefined) {
    updateData.date = new Date(data.date);
  }
  if (data.endDate !== undefined) {
    updateData.end_date = data.endDate ? new Date(data.endDate) : null;
  }
  if (data.startTime !== undefined) {
    updateData.start_time = data.startTime || null;
  }
  if (data.endTime !== undefined) {
    updateData.end_time = data.endTime || null;
  }
  if (data.location !== undefined) {
    updateData.venue = data.location || null;
  }
  if (data.invite !== undefined) {
    updateData.invite = data.invite || null;
  }

  updateData.updated_at = new Date();

  const updated = await prisma.user_calendars.update({
    where: { id: BigInt(eventId) },
    data: updateData,
  });

  return {
    id: updated.id.toString(),
    userId: updated.user_id.toString(),
    type: updated.type as 'official' | 'personal',
    title: updated.title,
    description: null,
    date: updated.date,
    endDate: updated.end_date,
    startTime: updated.start_time,
    endTime: updated.end_time,
    location: updated.venue,
    invite: updated.invite,
    status: updated.status,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

/**
 * Delete calendar event
 */
export async function deleteCalendarEvent(
  eventId: string,
  userId: string
): Promise<void> {
  const event = await prisma.user_calendars.findFirst({
    where: {
      id: BigInt(eventId),
      user_id: BigInt(userId),
    },
  });

  if (!event) {
    throw new ApiError(404, 'Calendar event not found');
  }

  await prisma.user_calendars.delete({
    where: { id: BigInt(eventId) },
  });
}
