import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import {
  createCalendarEvent,
  getCalendarEventById,
  getUserCalendarEvents,
  updateCalendarEvent,
  deleteCalendarEvent,
  CreateCalendarEvent,
  UpdateCalendarEvent,
  inviteAttendees,
  respondToInvite,
  copyCalendarEvent,
} from './calendar.model';
import { z } from 'zod';

const createEventSchema = z.object({
  type: z.enum(['official', 'personal']),
  title: z.string().min(1, 'Title is required'),
  description: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.preprocess((val) => (val === '' ? undefined : val), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional()),
  startTime: z.preprocess((val) => (val === '' ? undefined : val), z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format').optional()),
  endTime: z.preprocess((val) => (val === '' ? undefined : val), z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format').optional()),
  location: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  invite: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
});

const updateEventSchema = z.object({
  type: z.enum(['official', 'personal']).optional(),
  title: z.preprocess((val) => (val === '' ? undefined : val), z.string().min(1).optional()),
  description: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  date: z.preprocess((val) => (val === '' ? undefined : val), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  endDate: z.preprocess((val) => (val === '' ? undefined : val), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  startTime: z.preprocess((val) => (val === '' ? undefined : val), z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()),
  endTime: z.preprocess((val) => (val === '' ? undefined : val), z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()),
  location: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  invite: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
});

const inviteSchema = z.object({
  attendees: z.array(z.object({
    userId: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
    email: z.preprocess((v) => (v === '' ? undefined : v), z.string().email().optional()),
  })).min(1, 'At least one attendee required')
    .refine(arr => arr.every(item => item.userId || item.email), { message: 'Each attendee must include userId or email' }),
});

const copySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

/**
 * Format calendar event response
 */
function formatEventResponse(event: any) {
  // Helper to safely format dates
  const formatDate = (date: any): string => {
    if (!date) return '';
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    if (typeof date === 'string') {
      // If it's already a string in YYYY-MM-DD format, return it
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      // Otherwise try to parse it
      try {
        return new Date(date).toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    }
    return '';
  };

  const formatDateTime = (date: any): string => {
    if (!date) return '';
    if (date instanceof Date) {
      return date.toISOString();
    }
    if (typeof date === 'string') {
      try {
        return new Date(date).toISOString();
      } catch (e) {
        return '';
      }
    }
    return '';
  };

  return {
    id: event.id,
    type: event.type,
    title: event.title,
    description: event.description || '',
    date: formatDate(event.date),
    endDate: event.endDate ? formatDate(event.endDate) : null,
    startTime: event.startTime || '',
    endTime: event.endTime || '',
    location: event.location || '',
    invite: event.invite || '',
    createdAt: formatDateTime(event.createdAt),
    updatedAt: formatDateTime(event.updatedAt),
    attendees: event.attendees ? event.attendees.map((a: any) => ({
      id: a.id,
      userId: a.userId || null,
      name: a.name || null,
      email: a.email || null,
      status: a.status || null,
    })) : [],
  };
}

/**
 * Create calendar event
 * POST /api/v1/calendar/events
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  try {
    const validated = createEventSchema.parse(req.body) as CreateCalendarEvent;
    const event = await createCalendarEvent(req.user.userId, validated);

    res.status(201).json({
      success: true,
      data: formatEventResponse(event),
    });
  } catch (error) {
    console.error('Error in calendar.create:', error);
    if (error instanceof z.ZodError) {
      throw error; // Let global error handler handle Zod errors nicely
    }
    throw error;
  }
});

/**
 * Get all calendar events for current user
 * GET /api/v1/calendar/events
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const type = req.query.type as 'official' | 'personal' | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

  const { events, total } = await getUserCalendarEvents(req.user.userId, {
    startDate,
    endDate,
    type,
    limit,
    offset,
  });

  res.json({
    success: true,
    data: events.map(formatEventResponse),
    pagination: {
      total,
      limit: limit || total,
      offset: offset || 0,
    },
  });
});

/**
 * Get calendar event by ID
 * GET /api/v1/calendar/events/:id
 */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const event = await getCalendarEventById(req.params.id, req.user.userId);

  if (!event) {
    throw new ApiError(404, 'Calendar event not found');
  }

  res.json({
    success: true,
    data: formatEventResponse(event),
  });
});

/**
 * Update calendar event
 * PUT /api/v1/calendar/events/:id
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  try {
    const validated = updateEventSchema.parse(req.body) as UpdateCalendarEvent;
    const event = await updateCalendarEvent(req.params.id, req.user.userId, validated);

    res.json({
      success: true,
      data: formatEventResponse(event),
    });
  } catch (error) {
    console.error('Error in calendar.update:', error);
    throw error;
  }
});

/**
 * Delete calendar event
 * DELETE /api/v1/calendar/events/:id
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  await deleteCalendarEvent(req.params.id, req.user.userId);

  res.json({
    success: true,
    message: 'Calendar event deleted successfully',
  });
});

/**
 * Invite attendees to an event
 * POST /api/v1/calendar/events/:id/invite
 */
export const invite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  try {
    const { attendees } = inviteSchema.parse(req.body) as { attendees: Array<{ userId?: string; email?: string }> };
    const created = await inviteAttendees(req.params.id, req.user.userId, attendees);

    res.json({ success: true, data: created });
  } catch (err) {
    console.error('Error in calendar.invite:', err);
    throw err;
  }
});

/**
 * Respond to an invite (accept/decline)
 * POST /api/v1/calendar/events/:id/respond
 */
export const respond = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const schema = z.object({
    attendeeId: z.string().min(1),
    status: z.enum(['accepted', 'declined']),
  });

  try {
    const { attendeeId, status } = schema.parse(req.body);
    const updated = await respondToInvite(req.params.id, req.user.userId, attendeeId, status as 'accepted' | 'declined');
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error in calendar.respond:', err);
    throw err;
  }
});

/**
 * Copy an event to a new date
 * POST /api/v1/calendar/events/:id/copy
 */
export const copy = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  try {
    const { date } = copySchema.parse(req.body);
    const event = await copyCalendarEvent(req.params.id, req.user.userId, date);

    res.status(201).json({ success: true, data: formatEventResponse(event) });
  } catch (err) {
    console.error('Error in calendar.copy:', err);
    throw err;
  }
});
