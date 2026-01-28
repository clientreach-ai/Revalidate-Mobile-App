import { getMySQLPool } from '../../config/database';

interface PortfolioData {
    user: any;
    workHours: any[];
    cpd: any[];
    reflections: any[];
    feedback: any[];
    appraisals: any[];
}

// Fetch all portfolio data for a user
async function fetchPortfolioData(userId: number, sections: string[]): Promise<PortfolioData> {
    const pool = getMySQLPool();

    // Get user info
    const [userRows] = await pool.execute(
        'SELECT name, email, reg_type as professional_role, registration as registration_number, due_date as revalidation_date FROM users WHERE id = ?',
        [userId]
    );
    const user = (userRows as any[])[0] || {};

    const data: PortfolioData = {
        user,
        workHours: [],
        cpd: [],
        reflections: [],
        feedback: [],
        appraisals: []
    };

    // Fetch each section if requested
    if (sections.includes('workHours')) {
        const [rows] = await pool.execute(
            `SELECT start_time, end_time, duration_minutes, work_description, created_at 
       FROM work_hours WHERE user_id = ? ORDER BY start_time DESC`,
            [userId]
        );
        data.workHours = rows as any[];
    }

    if (sections.includes('cpd')) {
        const [rows] = await pool.execute(
            `SELECT topic as title, date as cpd_date, duration_minutes, method as cpd_type, learning as description, created_at 
       FROM cpd_hours WHERE user_id = ? ORDER BY date DESC`,
            [userId]
        );
        data.cpd = rows as any[];
    }

    if (sections.includes('reflections')) {
        const [rows] = await pool.execute(
            `SELECT reflection_date, reflection_text, created_at 
       FROM reflective_accounts WHERE user_id = ? ORDER BY reflection_date DESC`,
            [userId]
        );
        data.reflections = rows as any[];
    }

    if (sections.includes('feedback')) {
        const [rows] = await pool.execute(
            `SELECT feedback_date, feedback_type, feedback_text, created_at 
       FROM feedback_log WHERE user_id = ? ORDER BY feedback_date DESC`,
            [userId]
        );
        data.feedback = rows as any[];
    }

    if (sections.includes('appraisals')) {
        const [rows] = await pool.execute(
            `SELECT appraisal_date, notes, created_at 
       FROM appraisal_records WHERE user_id = ? ORDER BY appraisal_date DESC`,
            [userId]
        );
        data.appraisals = rows as any[];
    }

    return data;
}

// Format date for display
function formatDate(date: Date | string | null): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Generate PDF buffer as plain text (simple format that can be converted)
export async function generatePortfolioPDF(userId: number, sections: string[]): Promise<Buffer> {
    const data = await fetchPortfolioData(userId, sections);

    // Build content sections
    const lines: string[] = [];

    // Header
    lines.push('REVALIDATION PORTFOLIO');
    lines.push('='.repeat(50));
    lines.push('');
    lines.push(`Name: ${data.user.name || 'N/A'}`);
    lines.push(`Email: ${data.user.email || 'N/A'}`);
    lines.push(`Professional Role: ${data.user.professional_role || 'N/A'}`);
    lines.push(`Registration Number: ${data.user.registration_number || 'N/A'}`);
    lines.push(`Revalidation Date: ${formatDate(data.user.revalidation_date)}`);
    lines.push(`Generated: ${formatDate(new Date())}`);
    lines.push('');
    lines.push('');

    // Work Hours
    if (sections.includes('workHours') && data.workHours.length > 0) {
        lines.push('PRACTICE HOURS');
        lines.push('-'.repeat(50));
        const totalMinutes = data.workHours.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
        lines.push(`Total Hours: ${(totalMinutes / 60).toFixed(1)} hours`);
        lines.push(`Sessions: ${data.workHours.length}`);
        lines.push('');
        data.workHours.slice(0, 20).forEach((session, i) => {
            lines.push(`${i + 1}. ${formatDate(session.start_time)} - ${(session.duration_minutes / 60).toFixed(1)} hours`);
            if (session.work_description) {
                lines.push(`   ${session.work_description.substring(0, 80)}`);
            }
        });
        if (data.workHours.length > 20) {
            lines.push(`... and ${data.workHours.length - 20} more sessions`);
        }
        lines.push('');
        lines.push('');
    }

    // CPD Activities
    if (sections.includes('cpd') && data.cpd.length > 0) {
        lines.push('CPD ACTIVITIES');
        lines.push('-'.repeat(50));
        const totalMinutes = data.cpd.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
        lines.push(`Total CPD Hours: ${(totalMinutes / 60).toFixed(1)}`);
        lines.push(`Activities: ${data.cpd.length}`);
        lines.push('');
        data.cpd.forEach((activity, i) => {
            lines.push(`${i + 1}. ${activity.title || 'Untitled'}`);
            const hours = (activity.duration_minutes / 60).toFixed(1);
            lines.push(`   Date: ${formatDate(activity.cpd_date)} | Hours: ${hours} | Type: ${activity.cpd_type || 'N/A'}`);
            if (activity.description) {
                lines.push(`   ${activity.description.substring(0, 80)}`);
            }
        });
        lines.push('');
        lines.push('');
    }

    // Reflections
    if (sections.includes('reflections') && data.reflections.length > 0) {
        lines.push('REFLECTIVE ACCOUNTS');
        lines.push('-'.repeat(50));
        lines.push(`Total Reflections: ${data.reflections.length}`);
        lines.push('');
        data.reflections.forEach((reflection, i) => {
            lines.push(`${i + 1}. ${formatDate(reflection.reflection_date)}`);
            if (reflection.reflection_text) {
                const text = reflection.reflection_text.substring(0, 200);
                lines.push(`   ${text}${reflection.reflection_text.length > 200 ? '...' : ''}`);
            }
            lines.push('');
        });
        lines.push('');
    }

    // Feedback
    if (sections.includes('feedback') && data.feedback.length > 0) {
        lines.push('FEEDBACK');
        lines.push('-'.repeat(50));
        lines.push(`Total Feedback Entries: ${data.feedback.length}`);
        lines.push('');
        data.feedback.forEach((fb, i) => {
            lines.push(`${i + 1}. ${formatDate(fb.feedback_date)} - Type: ${fb.feedback_type || 'N/A'}`);
            if (fb.feedback_text) {
                const text = fb.feedback_text.substring(0, 150);
                lines.push(`   ${text}${fb.feedback_text.length > 150 ? '...' : ''}`);
            }
        });
        lines.push('');
        lines.push('');
    }

    // Appraisals
    if (sections.includes('appraisals') && data.appraisals.length > 0) {
        lines.push('PROFESSIONAL DISCUSSIONS / APPRAISALS');
        lines.push('-'.repeat(50));
        lines.push(`Total Entries: ${data.appraisals.length}`);
        lines.push('');
        data.appraisals.forEach((appraisal, i) => {
            lines.push(`${i + 1}. ${formatDate(appraisal.appraisal_date)}`);
            if (appraisal.notes) {
                const text = appraisal.notes.substring(0, 200);
                lines.push(`   ${text}${appraisal.notes.length > 200 ? '...' : ''}`);
            }
        });
        lines.push('');
    }

    // Footer
    lines.push('');
    lines.push('='.repeat(50));
    lines.push('Generated by Revalidate App');
    lines.push('https://revalidate.app');

    // Convert to a simple text-based PDF
    const content = lines.join('\n');
    return createSimplePDF(content);
}

// Create a minimal valid PDF document
function createSimplePDF(content: string): Buffer {
    // Escape special PDF characters
    const escapedLines = content
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .split('\n');

    const fontSize = 10;
    const lineHeight = 12;
    const margin = 50;
    const pageHeight = 792;
    let yPos = pageHeight - margin;

    // Build text stream content
    let textContent = `BT\n/F1 ${fontSize} Tf\n`;
    textContent += `1 0 0 1 ${margin} ${yPos} Tm\n`;

    for (const line of escapedLines) {
        if (yPos < margin) break;
        textContent += `(${line}) Tj\n0 -${lineHeight} Td\n`;
        yPos -= lineHeight;
    }
    textContent += 'ET';

    const streamLength = textContent.length;

    // Build PDF structure
    const parts = [
        '%PDF-1.4\n',
        '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
        '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
        `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${textContent}\nendstream\nendobj\n`,
        '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n',
    ];

    // Calculate byte offsets for xref
    const offsets: number[] = [];
    let pos = parts[0].length;
    for (let i = 1; i < parts.length; i++) {
        offsets.push(pos);
        pos += parts[i].length;
    }

    // Build xref table
    let xref = 'xref\n0 6\n0000000000 65535 f \n';
    offsets.forEach(offset => {
        xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    });

    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF`;

    const pdfContent = parts.join('') + xref + trailer;
    return Buffer.from(pdfContent, 'utf8');
}
