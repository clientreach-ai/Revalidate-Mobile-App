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
  appraisal_type: z.string().optional(),
  appraisal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  discussion_with: z.string().optional(),
  hospital_id: z.number().int().optional(),
  notes: z.string().optional(),
  document_ids: z.array(z.number()).optional(),
});

const updateAppraisalSchema = z.object({
  appraisal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  discussion_with: z.string().optional(),
  hospital_id: z.number().int().optional(),
  notes: z.string().optional(),
  document_ids: z.array(z.number()).optional(),
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');

  try {
    console.log('[Appraisal Create] Request body:', JSON.stringify(req.body));
    const validated = createAppraisalSchema.parse(req.body) as CreateAppraisalRecord;
    console.log('[Appraisal Create] Validated data:', JSON.stringify(validated));

    const appraisal = await createAppraisalRecord(req.user.userId, validated);
    console.log('[Appraisal Create] Success, ID:', appraisal.id);

    res.status(201).json({
      success: true,
      data: {
        id: appraisal.id,
        appraisalType: appraisal.appraisal_type,
        appraisalDate: appraisal.appraisal_date,
        discussionWith: appraisal.discussion_with,
        hospitalId: appraisal.hospital_id,
        notes: appraisal.notes,
        documentIds: appraisal.document_ids ? JSON.parse(appraisal.document_ids) : [],
        createdAt: appraisal.created_at,
        updatedAt: appraisal.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[Appraisal Create] Error:', error.message, error.code, error.sqlMessage);
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
      appraisalType: a.appraisal_type,
      appraisalDate: a.appraisal_date,
      discussionWith: a.discussion_with,
      hospitalId: a.hospital_id,
      notes: a.notes,
      documentIds: a.document_ids ? JSON.parse(a.document_ids) : [],
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
      appraisalType: appraisal.appraisal_type,
      appraisalDate: appraisal.appraisal_date,
      discussionWith: appraisal.discussion_with,
      hospitalId: appraisal.hospital_id,
      hospitalName: appraisal.hospital_name,
      notes: appraisal.notes,
      documentIds: appraisal.document_ids ? JSON.parse(appraisal.document_ids) : [],
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
      appraisalDate: updated.appraisal_date,
      discussionWith: updated.discussion_with,
      hospitalId: updated.hospital_id,
      notes: updated.notes,
      documentIds: updated.document_ids ? JSON.parse(updated.document_ids) : [],
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
