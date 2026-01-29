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
  learning_method: z.string().min(1),
  cpd_learning_type: z.string().min(1),
  link_to_standard: z.string().optional(),
  link_to_standard_proficiency: z.string().optional(),
  document_ids: z.array(z.number()).optional(),
});

const updateCpdHoursSchema = z.object({
  activity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  duration_minutes: z.number().int().positive().optional(),
  training_name: z.string().min(1).optional(),
  activity_type: z.enum(['participatory', 'non-participatory']).optional(),
  learning_method: z.string().optional(),
  cpd_learning_type: z.string().optional(),
  link_to_standard: z.string().optional(),
  link_to_standard_proficiency: z.string().optional(),
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

  // Normalize request body to accept both camelCase and snake_case fields
  const body = req.body || {};
  const normalized = {
    activity_date: body.activity_date || body.activityDate || body.activity || '',
    duration_minutes: body.duration_minutes || body.durationMinutes || body.duration || 0,
    training_name: body.training_name || body.trainingName || body.training || body.topic || '',
    activity_type: body.activity_type || body.activityType || 'participatory',
    learning_method: body.learning_method || body.learningMethod || '',
    cpd_learning_type: body.cpd_learning_type || body.cpdLearningType || '',
    link_to_standard: body.link_to_standard || body.linkToStandard || body.linkCode || body.link_code,
    link_to_standard_proficiency: body.link_to_standard_proficiency || body.linkToStandardProficiency || body.standardsProficiency || body.standards_proficiency,
    document_ids: body.document_ids || body.documentIds || undefined,
  } as CreateCpdHours;

  const validated = createCpdHoursSchema.parse(normalized) as CreateCpdHours;
  const cpdHours = await createCpdHours(req.user.userId, validated);

  res.status(201).json({
    success: true,
    data: {
      id: cpdHours.id,
      activityDate: cpdHours.activity_date,
      durationMinutes: cpdHours.duration_minutes,
      trainingName: cpdHours.training_name,
      activityType: cpdHours.activity_type,
      learningMethod: cpdHours.learning_method,
      cpdLearningType: cpdHours.cpd_learning_type,
      linkToStandard: cpdHours.link_to_standard,
      linkToStandardProficiency: cpdHours.link_to_standard_proficiency,
      documentIds: (() => {
        try {
          return cpdHours.document_ids ? JSON.parse(cpdHours.document_ids) : [];
        } catch (e) {
          console.error('Error parsing document_ids in create:', e);
          return [];
        }
      })(),
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
      learningMethod: ch.learning_method,
      cpdLearningType: ch.cpd_learning_type,
      linkToStandard: ch.link_to_standard,
      linkToStandardProficiency: ch.link_to_standard_proficiency,
      documentIds: (() => {
        try {
          return ch.document_ids ? JSON.parse(ch.document_ids) : [];
        } catch (e) {
          console.error(`Error parsing document_ids for CPD ID ${ch.id}:`, e);
          return [];
        }
      })(),
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
      learningMethod: cpdHours.learning_method,
      cpdLearningType: cpdHours.cpd_learning_type,
      linkToStandard: cpdHours.link_to_standard,
      linkToStandardProficiency: cpdHours.link_to_standard_proficiency,
      documentIds: (() => {
        try {
          return cpdHours.document_ids ? JSON.parse(cpdHours.document_ids) : [];
        } catch (e) {
          console.error(`Error parsing document_ids for CPD ID ${cpdHours.id}:`, e);
          return [];
        }
      })(),
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
      learningMethod: updated.learning_method,
      cpdLearningType: updated.cpd_learning_type,
      linkToStandard: updated.link_to_standard,
      linkToStandardProficiency: updated.link_to_standard_proficiency,
      documentIds: (() => {
        try {
          return updated.document_ids ? JSON.parse(updated.document_ids) : [];
        } catch (e) {
          console.error(`Error parsing document_ids for updated CPD ID ${updated.id}:`, e);
          return [];
        }
      })(),
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
