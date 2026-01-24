import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import {
  createReflectiveAccount,
  getReflectiveAccountById,
  getUserReflectiveAccounts,
  updateReflectiveAccount,
  deleteReflectiveAccount,
  CreateReflectiveAccount,
  UpdateReflectiveAccount,
} from './reflections.model';
import { z } from 'zod';

const createReflectionSchema = z.object({
  reflection_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reflection_text: z.string().optional(),
  document_ids: z.array(z.number()).optional(),
});

const updateReflectionSchema = z.object({
  reflection_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reflection_text: z.string().optional(),
  document_ids: z.array(z.number()).optional(),
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const validated = createReflectionSchema.parse(req.body) as CreateReflectiveAccount;
  const reflection = await createReflectiveAccount(req.user.userId, validated);
  res.status(201).json({
    success: true,
    data: {
      id: reflection.id,
      reflectionDate: reflection.reflection_date,
      reflectionText: reflection.reflection_text,
      documentIds: reflection.document_ids ? JSON.parse(reflection.document_ids) : [],
      createdAt: reflection.created_at,
      updatedAt: reflection.updated_at,
    },
  });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const { reflectiveAccounts, total } = await getUserReflectiveAccounts(req.user.userId, {
    limit, offset, startDate, endDate,
  });
  res.json({
    success: true,
    data: reflectiveAccounts.map(r => ({
      id: r.id,
      reflectionDate: r.reflection_date,
      reflectionText: r.reflection_text,
      documentIds: r.document_ids ? JSON.parse(r.document_ids) : [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    pagination: { total, limit: limit || total, offset: offset || 0 },
  });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const reflection = await getReflectiveAccountById(req.params.id, req.user.userId);
  if (!reflection) throw new ApiError(404, 'Reflective account entry not found');
  res.json({
    success: true,
    data: {
      id: reflection.id,
      reflectionDate: reflection.reflection_date,
      reflectionText: reflection.reflection_text,
      documentIds: reflection.document_ids ? JSON.parse(reflection.document_ids) : [],
      createdAt: reflection.created_at,
      updatedAt: reflection.updated_at,
    },
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const validated = updateReflectionSchema.parse(req.body) as UpdateReflectiveAccount;
  const updated = await updateReflectiveAccount(req.params.id, req.user.userId, validated);
  res.json({
    success: true,
    data: {
      id: updated.id,
      reflectionDate: updated.reflection_date,
      reflectionText: updated.reflection_text,
      documentIds: updated.document_ids ? JSON.parse(updated.document_ids) : [],
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    },
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  await deleteReflectiveAccount(req.params.id, req.user.userId);
  res.json({ success: true, message: 'Reflective account entry deleted successfully' });
});
