import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import {
  createWorkHours,
  getWorkHoursById,
  getUserWorkHours,
  getActiveWorkSession,
  updateWorkHours,
  deleteWorkHours,
  getTotalWorkHours,
  CreateWorkHours,
  UpdateWorkHours,
} from './work-hours.model';
import { z } from 'zod';

const createWorkHoursSchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  duration_minutes: z.number().int().positive().optional(),
  work_description: z.string().optional(),
  document_ids: z.array(z.number()).optional(),
});

const updateWorkHoursSchema = z.object({
  end_time: z.string().datetime().optional(),
  duration_minutes: z.number().int().positive().optional(),
  work_description: z.string().optional(),
  document_ids: z.array(z.number()).optional(),
});

/**
 * Create work hours entry
 * POST /api/v1/work-hours
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = createWorkHoursSchema.parse(req.body) as CreateWorkHours;
  const workHours = await createWorkHours(req.user.userId, validated);

  res.status(201).json({
    success: true,
    data: {
      id: workHours.id,
      startTime: workHours.start_time,
      endTime: workHours.end_time,
      durationMinutes: workHours.duration_minutes,
      workDescription: workHours.work_description,
      documentIds: workHours.document_ids ? JSON.parse(workHours.document_ids) : [],
      isActive: Boolean(workHours.is_active),
      createdAt: workHours.created_at,
      updatedAt: workHours.updated_at,
    },
  });
});

/**
 * Get all work hours for current user
 * GET /api/v1/work-hours
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const { workHours, total } = await getUserWorkHours(req.user.userId, {
    limit,
    offset,
    startDate,
    endDate,
  });

  res.json({
    success: true,
    data: workHours.map(wh => ({
      id: wh.id,
      startTime: wh.start_time,
      endTime: wh.end_time,
      durationMinutes: wh.duration_minutes,
      workDescription: wh.work_description,
      documentIds: wh.document_ids ? JSON.parse(wh.document_ids) : [],
      isActive: Boolean(wh.is_active),
      createdAt: wh.created_at,
      updatedAt: wh.updated_at,
    })),
    pagination: {
      total,
      limit: limit || total,
      offset: offset || 0,
    },
  });
});

/**
 * Get active work session
 * GET /api/v1/work-hours/active
 */
export const getActive = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const active = await getActiveWorkSession(req.user.userId);

  if (!active) {
    res.json({
      success: true,
      data: null,
    });
    return;
  }

  res.json({
    success: true,
    data: {
      id: active.id,
      startTime: active.start_time,
      endTime: active.end_time,
      durationMinutes: active.duration_minutes,
      workDescription: active.work_description,
      documentIds: active.document_ids ? JSON.parse(active.document_ids) : [],
      isActive: Boolean(active.is_active),
      createdAt: active.created_at,
      updatedAt: active.updated_at,
    },
  });
});

/**
 * Get work hours by ID
 * GET /api/v1/work-hours/:id
 */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const workHours = await getWorkHoursById(req.params.id, req.user.userId);

  if (!workHours) {
    throw new ApiError(404, 'Work hours entry not found');
  }

  res.json({
    success: true,
    data: {
      id: workHours.id,
      startTime: workHours.start_time,
      endTime: workHours.end_time,
      durationMinutes: workHours.duration_minutes,
      workDescription: workHours.work_description,
      documentIds: workHours.document_ids ? JSON.parse(workHours.document_ids) : [],
      isActive: Boolean(workHours.is_active),
      createdAt: workHours.created_at,
      updatedAt: workHours.updated_at,
    },
  });
});

/**
 * Update work hours entry
 * PUT /api/v1/work-hours/:id
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = updateWorkHoursSchema.parse(req.body) as UpdateWorkHours;
  const updated = await updateWorkHours(req.params.id, req.user.userId, validated);

  res.json({
    success: true,
    data: {
      id: updated.id,
      startTime: updated.start_time,
      endTime: updated.end_time,
      durationMinutes: updated.duration_minutes,
      workDescription: updated.work_description,
      documentIds: updated.document_ids ? JSON.parse(updated.document_ids) : [],
      isActive: Boolean(updated.is_active),
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    },
  });
});

/**
 * Delete work hours entry
 * DELETE /api/v1/work-hours/:id
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  await deleteWorkHours(req.params.id, req.user.userId);

  res.json({
    success: true,
    message: 'Work hours entry deleted successfully',
  });
});

/**
 * Get total work hours
 * GET /api/v1/work-hours/stats/total
 */
export const getTotal = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const totalHours = await getTotalWorkHours(req.user.userId, startDate, endDate);

  res.json({
    success: true,
    data: {
      totalHours,
      startDate,
      endDate,
    },
  });
});
