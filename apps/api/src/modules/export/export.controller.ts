import { Request, Response } from 'express';
import { generatePortfolioPDF } from './pdf.generator';
import { getMySQLPool } from '../../config/database';

// Helper function to get user ID from the authenticated request
function getUserId(req: Request): number | null {
    return (req as any).user?.userId || (req as any).user?.id || null;
}

// Check if user has premium subscription
async function isPremiumUser(userId: number): Promise<boolean> {
    try {
        const pool = getMySQLPool();
        const [rows] = await pool.execute(
            'SELECT subscription_tier FROM users WHERE id = ?',
            [userId]
        );
        const users = rows as any[];
        return users.length > 0 && users[0].subscription_tier === 'premium';
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}

// Export entire portfolio as PDF
export async function exportPortfolio(req: Request, res: Response) {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check premium status
        const isPremium = await isPremiumUser(userId);
        if (!isPremium) {
            return res.status(403).json({
                error: 'Premium subscription required',
                message: 'Export to PDF is a premium feature. Please upgrade your subscription.'
            });
        }

        // Get requested sections (default to all)
        const sections = req.body.sections || ['workHours', 'cpd', 'reflections', 'feedback', 'appraisals'];

        // Generate PDF
        const pdfBuffer = await generatePortfolioPDF(userId, sections);

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=revalidation-portfolio.pdf');
        res.setHeader('Content-Length', pdfBuffer.length);

        return res.send(pdfBuffer);
    } catch (error: any) {
        console.error('Error exporting portfolio:', error);
        return res.status(500).json({
            error: 'Export failed',
            message: error.message || 'An error occurred while generating the PDF'
        });
    }
}

// Get export preview (summary of what will be included)
export async function getExportPreview(req: Request, res: Response) {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const pool = getMySQLPool();

        // Get counts for each section
        const [workHours] = await pool.execute(
            'SELECT COUNT(*) as count, SUM(duration_minutes) as totalMinutes FROM work_hours WHERE user_id = ?',
            [userId]
        );

        const [cpd] = await pool.execute(
            'SELECT COUNT(*) as count, SUM(duration_minutes) as totalMinutes FROM cpd_hours WHERE user_id = ?',
            [userId]
        );

        const [reflections] = await pool.execute(
            'SELECT COUNT(*) as count FROM reflective_accounts WHERE user_id = ?',
            [userId]
        );

        const [feedback] = await pool.execute(
            'SELECT COUNT(*) as count FROM feedback_log WHERE user_id = ?',
            [userId]
        );

        const [appraisals] = await pool.execute(
            'SELECT COUNT(*) as count FROM appraisal_records WHERE user_id = ?',
            [userId]
        );

        const workHoursData = (workHours as any[])[0];
        const cpdData = (cpd as any[])[0];
        const reflectionsData = (reflections as any[])[0];
        const feedbackData = (feedback as any[])[0];
        const appraisalsData = (appraisals as any[])[0];

        return res.json({
            success: true,
            data: {
                workHours: {
                    count: workHoursData?.count || 0,
                    totalHours: Math.round((workHoursData?.totalMinutes || 0) / 60 * 10) / 10
                },
                cpd: {
                    count: cpdData?.count || 0,
                    totalHours: Math.round((cpdData?.totalMinutes || 0) / 60 * 10) / 10
                },
                reflections: {
                    count: reflectionsData?.count || 0
                },
                feedback: {
                    count: feedbackData?.count || 0
                },
                appraisals: {
                    count: appraisalsData?.count || 0
                }
            }
        });
    } catch (error: any) {
        console.error('Error getting export preview:', error);
        return res.status(500).json({ error: 'Failed to get export preview' });
    }
}
