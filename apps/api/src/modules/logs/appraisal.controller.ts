import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import {
  createAppraisalRecord,
  getAppraisalRecordById,
  getUserAppraisalRecords,
  updateAppraisalRecord,
  deleteAppraisalRecord,
  CreateAppraisalRecord,
  UpdateAppraisalRecord,
} from './appraisal.model';
import { z } from 'zod';

const createAppraisalSchema = z.object({
  appraisal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  document_ids: z.array(z.number()).optional(),
  hospital_id: z.number().nullable().optional(),
  appraisal_type: z.string().optional(),
  discussion_with: z.string().optional(),
});

const updateAppraisalSchema = z.object({
  appraisal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
  document_ids: z.array(z.number()).optional(),
  hospital_id: z.number().nullable().optional(),
  appraisal_type: z.string().optional(),
  discussion_with: z.string().optional(),
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');

  try {
    const validated = createAppraisalSchema.parse(req.body) as CreateAppraisalRecord;
    const appraisal = await createAppraisalRecord(req.user.userId, validated);

    res.status(201).json({
      success: true,
      data: {
        id: appraisal.id,
        appraisal_date: appraisal.appraisal_date,
        notes: appraisal.notes,
        documentIds: appraisal.document_ids ? JSON.parse(appraisal.document_ids) : [],
        hospital_id: appraisal.hospital_id,
        appraisal_type: appraisal.appraisal_type,
        discussion_with: appraisal.discussion_with,
        createdAt: appraisal.created_at,
        updatedAt: appraisal.updated_at,
      },
    });
  } catch (error: any) {
    throw error;
  }
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const { appraisalRecords, total } = await getUserAppraisalRecords(req.user.userId, {
    limit, offset, startDate, endDate,
  });

  res.json({
    success: true,
    data: appraisalRecords.map(a => ({
      id: a.id,
      appraisal_date: a.appraisal_date,
      notes: a.notes,
      documentIds: a.document_ids ? JSON.parse(a.document_ids) : [],
      hospital_id: a.hospital_id,
      hospital_name: a.hospital_name,
      appraisal_type: a.appraisal_type,
      discussion_with: a.discussion_with,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    })),
    pagination: { total, limit: limit || total, offset: offset || 0 },
  });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const appraisal = await getAppraisalRecordById(req.params.id, req.user.userId);
  if (!appraisal) throw new ApiError(404, 'Appraisal record entry not found');

  res.json({
    success: true,
    data: {
      id: appraisal.id,
      appraisal_date: appraisal.appraisal_date,
      appraisalDate: appraisal.appraisal_date, // Keeping for backward compatibility
      notes: appraisal.notes,
      documentIds: appraisal.document_ids ? JSON.parse(appraisal.document_ids) : [],
      hospital_id: appraisal.hospital_id,
      hospital_name: appraisal.hospital_name,
      appraisal_type: appraisal.appraisal_type,
      discussion_with: appraisal.discussion_with,
      createdAt: appraisal.created_at,
      updatedAt: appraisal.updated_at,
    },
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const validated = updateAppraisalSchema.parse(req.body) as UpdateAppraisalRecord;
  const updated = await updateAppraisalRecord(req.params.id, req.user.userId, validated);

  res.json({
    success: true,
    data: {
      id: updated.id,
      appraisal_date: updated.appraisal_date,
      notes: updated.notes,
      documentIds: updated.document_ids ? JSON.parse(updated.document_ids) : [],
      hospital_id: updated.hospital_id,
      appraisal_type: updated.appraisal_type,
      discussion_with: updated.discussion_with,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    },
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  await deleteAppraisalRecord(req.params.id, req.user.userId);
  res.json({ success: true, message: 'Appraisal record entry deleted successfully' });
});
