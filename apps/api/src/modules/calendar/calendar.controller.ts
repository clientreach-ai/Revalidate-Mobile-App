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
} from './calendar.model';
import { z } from 'zod';

const createEventSchema = z.object({
  type: z.enum(['official', 'personal']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format').optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format').optional(),
  location: z.string().optional(),
  invite: z.string().optional(),
});

const updateEventSchema = z.object({
  type: z.enum(['official', 'personal']).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  location: z.string().optional(),
  invite: z.string().optional(),
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

  const validated = createEventSchema.parse(req.body) as CreateCalendarEvent;
  const event = await createCalendarEvent(req.user.userId, validated);

  res.status(201).json({
    success: true,
    data: formatEventResponse(event),
  });
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

  const validated = updateEventSchema.parse(req.body) as UpdateCalendarEvent;
  const event = await updateCalendarEvent(req.params.id, req.user.userId, validated);

  res.json({
    success: true,
    data: formatEventResponse(event),
  });
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
