/**
 * Documents model types and database operations
 */

import { getMySQLPool } from '../../config/database';
import { ApiError } from '../../common/middleware/error-handler';

export interface Document {
  id: number;
  user_id: number;
  document: string | null; // File path/URL
  document_name: string;
  type: string;
  date: string | null;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDocument {
  document_name: string;
  document?: string; // File path/URL
  type?: string;
  date?: string;
  category?: string; // Stored in type field
}

export interface UpdateDocument {
  document_name?: string;
  document?: string;
  type?: string;
  date?: string;
}

/**
 * Create a document entry
 */
export async function createDocument(
  userId: string,
  data: CreateDocument
): Promise<Document> {
  const pool = getMySQLPool();

  const [result] = await pool.execute(
    `INSERT INTO personal_documents (
      user_id, document, document_name, type, date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      userId,
      data.document || null,
      data.document_name,
      data.category || data.type || 'general',
      data.date ? new Date(data.date).toISOString().split('T')[0] : null,
    ]
  ) as any;

  const [documents] = await pool.execute(
    'SELECT * FROM personal_documents WHERE id = ?',
    [result.insertId]
  ) as any[];

  return documents[0] as Document;
}

/**
 * Get document by ID
 */
export async function getDocumentById(
  documentId: string,
  userId: string
): Promise<Document | null> {
  const pool = getMySQLPool();
  const [results] = await pool.execute(
    'SELECT * FROM personal_documents WHERE id = ? AND user_id = ?',
    [documentId, userId]
  ) as any[];

  if (results.length === 0) {
    return null;
  }

  return results[0] as Document;
}

/**
 * Get all documents for a user
 */
export interface GetUserDocumentsOptions {
  limit?: number;
  offset?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetUserDocumentsResult {
  documents: Document[];
  total: number;
}

export async function getUserDocuments(
  userId: string,
  options: GetUserDocumentsOptions = {}
): Promise<GetUserDocumentsResult> {
  const pool = getMySQLPool();
  
  let query = 'SELECT * FROM personal_documents WHERE user_id = ?';
  const params: any[] = [userId];

  // Add category filter if provided
  if (options.category) {
    query += ' AND type = ?';
    params.push(options.category);
  }

  // Add date filters if provided
  if (options.startDate) {
    query += ' AND date >= ?';
    params.push(options.startDate);
  }
  if (options.endDate) {
    query += ' AND date <= ?';
    params.push(options.endDate);
  }

  // Get total count
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const [countResults] = await pool.execute(countQuery, params) as any[];
  const total = countResults[0]?.total || 0;

  // Add ordering and pagination
  query += ' ORDER BY created_at DESC';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const [documents] = await pool.execute(query, params) as any[];

  return {
    documents: documents as Document[],
    total: Number(total),
  };
}

/**
 * Update a document
 */
export async function updateDocument(
  documentId: string,
  userId: string,
  data: UpdateDocument
): Promise<Document> {
  const pool = getMySQLPool();

  const updates: string[] = [];
  const params: any[] = [];

  if (data.document_name !== undefined) {
    updates.push('document_name = ?');
    params.push(data.document_name);
  }
  if (data.document !== undefined) {
    updates.push('document = ?');
    params.push(data.document);
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    params.push(data.type);
  }
  if (data.date !== undefined) {
    updates.push('date = ?');
    params.push(data.date ? new Date(data.date).toISOString().split('T')[0] : null);
  }

  if (updates.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  updates.push('updated_at = NOW()');
  params.push(documentId, userId);

  await pool.execute(
    `UPDATE personal_documents 
     SET ${updates.join(', ')} 
     WHERE id = ? AND user_id = ?`,
    params
  );

  const document = await getDocumentById(documentId, userId);
  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  return document;
}

/**
 * Delete a document
 */
export async function deleteDocument(
  documentId: string,
  userId: string
): Promise<void> {
  const pool = getMySQLPool();
  const [result] = await pool.execute(
    'DELETE FROM personal_documents WHERE id = ? AND user_id = ?',
    [documentId, userId]
  ) as any;

  if (result.affectedRows === 0) {
    throw new ApiError(404, 'Document not found');
  }
}
