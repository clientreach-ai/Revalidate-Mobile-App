import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import {
  createFeedbackLog,
  getFeedbackLogById,
  getUserFeedbackLogs,
  updateFeedbackLog,
  deleteFeedbackLog,
  CreateFeedbackLog,
  UpdateFeedbackLog,
} from './feedback.model';
import { z } from 'zod';

const createFeedbackSchema = z.object({
  feedback_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  feedback_type: z.enum(['patient', 'colleague']),
  feedback_text: z.string().optional(),
  document_ids: z.array(z.number()).optional(),
});

const updateFeedbackSchema = z.object({
  feedback_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  feedback_type: z.enum(['patient', 'colleague']).optional(),
  feedback_text: z.string().optional(),
  document_ids: z.array(z.number()).optional(),
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const validated = createFeedbackSchema.parse(req.body) as CreateFeedbackLog;
  const feedback = await createFeedbackLog(req.user.userId, validated);
  res.status(201).json({
    success: true,
    data: {
      id: feedback.id,
      feedbackDate: feedback.feedback_date,
      feedbackType: feedback.feedback_type,
      feedbackText: feedback.feedback_text,
      documentIds: feedback.document_ids ? JSON.parse(feedback.document_ids) : [],
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
    },
  });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const feedbackType = req.query.feedbackType as 'patient' | 'colleague' | undefined;
  const { feedbackLogs, total } = await getUserFeedbackLogs(req.user.userId, {
    limit, offset, startDate, endDate, feedbackType,
  });
  res.json({
    success: true,
    data: feedbackLogs.map(f => ({
      id: f.id,
      feedbackDate: f.feedback_date,
      feedbackType: f.feedback_type,
      feedbackText: f.feedback_text,
      documentIds: f.document_ids ? JSON.parse(f.document_ids) : [],
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    })),
    pagination: { total, limit: limit || total, offset: offset || 0 },
  });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const feedback = await getFeedbackLogById(req.params.id, req.user.userId);
  if (!feedback) throw new ApiError(404, 'Feedback log entry not found');
  res.json({
    success: true,
    data: {
      id: feedback.id,
      feedbackDate: feedback.feedback_date,
      feedbackType: feedback.feedback_type,
      feedbackText: feedback.feedback_text,
      documentIds: feedback.document_ids ? JSON.parse(feedback.document_ids) : [],
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
    },
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const validated = updateFeedbackSchema.parse(req.body) as UpdateFeedbackLog;
  const updated = await updateFeedbackLog(req.params.id, req.user.userId, validated);
  res.json({
    success: true,
    data: {
      id: updated.id,
      feedbackDate: updated.feedback_date,
      feedbackType: updated.feedback_type,
      feedbackText: updated.feedback_text,
      documentIds: updated.document_ids ? JSON.parse(updated.document_ids) : [],
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    },
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  await deleteFeedbackLog(req.params.id, req.user.userId);
  res.json({ success: true, message: 'Feedback log entry deleted successfully' });
});
