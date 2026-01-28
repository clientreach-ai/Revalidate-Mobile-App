import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import {
  createDocument,
  getDocumentById,
  getUserDocuments,
  updateDocument,
  deleteDocument,
  CreateDocument,
  UpdateDocument,
} from './document.model';
import { updateUserImage } from '../users/user.service';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
  destination: (_req, _file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow PDF, images, and common document types
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, `File type ${file.mimetype} not allowed`));
    }
  },
});

const createDocumentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
});

const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
});

/**
 * Upload and create a document
 * POST /api/v1/documents/upload
 */
export const uploadDocument = [
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (!req.file) {
      throw new ApiError(400, 'No file uploaded');
    }

    // Validate additional form data
    const validated = createDocumentSchema.parse({
      title: req.body.title || req.file.originalname,
      description: req.body.description,
      category: req.body.category,
    });

    // Create file URL/path (in production, this would be S3 URL)
    const filePath = `/uploads/documents/${req.file.filename}`;
    const fileUrl = process.env.API_BASE_URL
      ? `${process.env.API_BASE_URL}${filePath}`
      : filePath;

    const documentData: CreateDocument = {
      document_name: validated.title,
      document: fileUrl,
      type: validated.category || 'general',
      date: new Date().toISOString().split('T')[0],
    };

    const document = await createDocument(req.user.userId, documentData);

    // Sync profile picture if category matches
    if (validated.category === 'profile_picture') {
      try {
        await updateUserImage(req.user.userId, fileUrl);
      } catch (e) {
        console.error('Failed to sync profile picture', e);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: document.id,
        name: document.document_name,
        category: document.type,
        size: req.file.size ? `${(req.file.size / (1024 * 1024)).toFixed(2)} MB` : undefined,
        type: req.file.mimetype,
        created_at: document.created_at,
        updated_at: document.updated_at,
      },
    });
  }),
];

/**
 * List all documents for the current user
 * GET /api/v1/documents
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
  const category = req.query.category as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const { documents, total } = await getUserDocuments(req.user.userId, {
    limit,
    offset,
    category,
    startDate,
    endDate,
  });

  // Enhance document list with file size when file exists on local uploads
  const mapped = await Promise.all(documents.map(async (doc) => {
    let sizeStr: string | undefined = undefined;

    try {
      if (doc.document) {
        const docStr = String(doc.document);

        // Local uploads (stored on server filesystem)
        if (docStr.startsWith('/uploads/')) {
          const filePath = path.join(process.cwd(), docStr);
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            const bytes = stat.size || 0;
            sizeStr = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
          }
        }

        // Remote files (S3 or remote URL) - try HEAD to get Content-Length
        if (!sizeStr && /^https?:\/\//i.test(docStr)) {
          try {
            const head = await axios.head(docStr, { timeout: 3000 });
            const cl = head.headers['content-length'] || head.headers['Content-Length'];
            const bytes = cl ? parseInt(String(cl), 10) : NaN;
            if (!Number.isNaN(bytes)) {
              sizeStr = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
            }
          } catch (err) {
            // HEAD may fail (CORS, blocked, etc.) - ignore and leave size undefined
            // console.debug('HEAD request failed for', docStr, err?.message || err);
          }
        }
      }
    } catch (err) {
      console.error('Error getting file size for document', doc.id, err);
      sizeStr = undefined;
    }

    return {
      id: doc.id,
      name: doc.document_name,
      category: doc.type,
      size: sizeStr,
      type: doc.document?.split('.').pop()?.toLowerCase() || 'file',
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  }));

  res.json({
    success: true,
    data: mapped,
    pagination: {
      total,
      limit: limit || total,
      offset: offset || 0,
    },
  });
});

/**
 * Get document by ID
 * GET /api/v1/documents/:id
 */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const document = await getDocumentById(req.params.id, req.user.userId);

  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  res.json({
    success: true,
    data: {
      id: document.id,
      name: document.document_name,
      category: document.type,
      document: document.document,
      date: document.date,
      created_at: document.created_at,
      updated_at: document.updated_at,
    },
  });
});

/**
 * Update a document
 * PUT /api/v1/documents/:id
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = updateDocumentSchema.parse(req.body);
  const updateData: UpdateDocument = {};

  if (validated.title) {
    updateData.document_name = validated.title;
  }
  if (validated.category) {
    updateData.type = validated.category;
  }

  const document = await updateDocument(req.params.id, req.user.userId, updateData);

  res.json({
    success: true,
    data: {
      id: document.id,
      name: document.document_name,
      category: document.type,
      document: document.document,
      date: document.date,
      created_at: document.created_at,
      updated_at: document.updated_at,
    },
  });
});

/**
 * Delete a document
 * DELETE /api/v1/documents/:id
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  // Get document first to get file path for deletion
  const document = await getDocumentById(req.params.id, req.user.userId);

  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  // Delete the file from filesystem if it exists
  if (document.document && document.document.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), document.document);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue with database deletion even if file deletion fails
    }
  }

  await deleteDocument(req.params.id, req.user.userId);

  res.json({
    success: true,
    message: 'Document deleted successfully',
  });
});
