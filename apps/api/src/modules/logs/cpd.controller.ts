import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import {
  createCpdHours,
  getCpdHoursById,
  getUserCpdHours,
  updateCpdHours,
  deleteCpdHours,
  getTotalCpdHours,
  CreateCpdHours,
  UpdateCpdHours,
} from './cpd.model';
import { z } from 'zod';

const createCpdHoursSchema = z.object({
  activity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: z.number().int().positive(),
  training_name: z.string().min(1),
  activity_type: z.enum(['participatory', 'non-participatory']),
  document_ids: z.array(z.number()).optional(),
});

const updateCpdHoursSchema = z.object({
  activity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  duration_minutes: z.number().int().positive().optional(),
  training_name: z.string().min(1).optional(),
  activity_type: z.enum(['participatory', 'non-participatory']).optional(),
  document_ids: z.array(z.number()).optional(),
});

/**
 * Create CPD hours entry
 * POST /api/v1/cpd-hours
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = createCpdHoursSchema.parse(req.body) as CreateCpdHours;
  const cpdHours = await createCpdHours(req.user.userId, validated);

  res.status(201).json({
    success: true,
    data: {
      id: cpdHours.id,
      activityDate: cpdHours.activity_date,
      durationMinutes: cpdHours.duration_minutes,
      trainingName: cpdHours.training_name,
      activityType: cpdHours.activity_type,
      documentIds: cpdHours.document_ids ? JSON.parse(cpdHours.document_ids) : [],
      createdAt: cpdHours.created_at,
      updatedAt: cpdHours.updated_at,
    },
  });
});

/**
 * Get all CPD hours for current user
 * GET /api/v1/cpd-hours
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const activityType = req.query.activityType as 'participatory' | 'non-participatory' | undefined;

  const { cpdHours, total } = await getUserCpdHours(req.user.userId, {
    limit,
    offset,
    startDate,
    endDate,
    activityType,
  });

  res.json({
    success: true,
    data: cpdHours.map(ch => ({
      id: ch.id,
      activityDate: ch.activity_date,
      durationMinutes: ch.duration_minutes,
      trainingName: ch.training_name,
      activityType: ch.activity_type,
      documentIds: ch.document_ids ? JSON.parse(ch.document_ids) : [],
      createdAt: ch.created_at,
      updatedAt: ch.updated_at,
    })),
    pagination: {
      total,
      limit: limit || total,
      offset: offset || 0,
    },
  });
});

/**
 * Get CPD hours by ID
 * GET /api/v1/cpd-hours/:id
 */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const cpdHours = await getCpdHoursById(req.params.id, req.user.userId);

  if (!cpdHours) {
    throw new ApiError(404, 'CPD hours entry not found');
  }

  res.json({
    success: true,
    data: {
      id: cpdHours.id,
      activityDate: cpdHours.activity_date,
      durationMinutes: cpdHours.duration_minutes,
      trainingName: cpdHours.training_name,
      activityType: cpdHours.activity_type,
      documentIds: cpdHours.document_ids ? JSON.parse(cpdHours.document_ids) : [],
      createdAt: cpdHours.created_at,
      updatedAt: cpdHours.updated_at,
    },
  });
});

/**
 * Update CPD hours entry
 * PUT /api/v1/cpd-hours/:id
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = updateCpdHoursSchema.parse(req.body) as UpdateCpdHours;
  const updated = await updateCpdHours(req.params.id, req.user.userId, validated);

  res.json({
    success: true,
    data: {
      id: updated.id,
      activityDate: updated.activity_date,
      durationMinutes: updated.duration_minutes,
      trainingName: updated.training_name,
      activityType: updated.activity_type,
      documentIds: updated.document_ids ? JSON.parse(updated.document_ids) : [],
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    },
  });
});

/**
 * Delete CPD hours entry
 * DELETE /api/v1/cpd-hours/:id
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  await deleteCpdHours(req.params.id, req.user.userId);

  res.json({
    success: true,
    message: 'CPD hours entry deleted successfully',
  });
});

/**
 * Get total CPD hours
 * GET /api/v1/cpd-hours/stats/total
 */
export const getTotal = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const activityType = req.query.activityType as 'participatory' | 'non-participatory' | undefined;

  const totalHours = await getTotalCpdHours(req.user.userId, startDate, endDate, activityType);

  res.json({
    success: true,
    data: {
      totalHours,
      startDate,
      endDate,
      activityType,
    },
  });
});
