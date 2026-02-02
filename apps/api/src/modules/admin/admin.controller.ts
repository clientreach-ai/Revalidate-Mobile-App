import { Request, Response } from 'express';
import { getMySQLPool } from '../../config/database';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
// auth middleware is available if needed in the future
import { mapUserRow } from '../../config/database-mapping';

/**
 * Check if user is admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  const pool = getMySQLPool();
  const [users] = await pool.execute(
    "SELECT user_type FROM users WHERE id = ? AND user_type = 'Admin'",
    [userId]
  ) as any[];

  return users.length > 0;
}

/**
 * Admin middleware - checks if user is admin
 */
export const requireAdmin = asyncHandler(async (
  req: Request,
  _res: Response,
  next: any
) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const admin = await isAdmin(req.user.userId);
  if (!admin) {
    throw new ApiError(403, 'Admin access required');
  }

  next();
});

/**
 * Get all users (admin only)
 * GET /api/v1/admin/users
 */
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const pool = getMySQLPool();
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  const [users] = await pool.execute(
    `SELECT u.id, u.email, u.name, u.registration, u.due_date, u.reg_type, u.description,
     u.work_settings, u.scope_practice, u.subscription_tier, u.subscription_status,
     u.status, u.user_type, u.created_at, u.updated_at, u.firebase_uid,
     p.name AS registration_name,
     c.name AS work_setting_name,
     b.name AS scope_practice_name,
    COALESCE(
      NULLIF(JSON_UNQUOTE(JSON_EXTRACT(u.description, '$.professionalRole')), ''),
      CASE
        WHEN u.registration IN (3,4,5,6,7,8,9) THEN 'Nurse'
        WHEN u.registration IN (10,12) THEN 'Doctor'
        WHEN u.registration IN (13,14) THEN 'Pharmacist'
        ELSE NULL
      END,
      NULLIF(u.reg_type, ''),
      CASE
        WHEN u.registration IN (3,4,5,6,7,8,9) THEN 'Nurse'
        WHEN u.registration IN (10,12) THEN 'Doctor'
        WHEN u.registration IN (13,14) THEN 'Pharmacist'
        ELSE NULL
      END
    ) AS professional_role
     FROM users u
     LEFT JOIN portfolios p ON CAST(u.registration AS CHAR) = CAST(p.id AS CHAR)
     LEFT JOIN categories c ON u.work_settings = c.id
     LEFT JOIN brands b ON u.scope_practice = b.id
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  ) as any[];

  const [countResult] = await pool.execute(
    'SELECT COUNT(*) as total FROM users'
  ) as any[];

  const total = countResult[0].total;

  res.json({
    success: true,
    data: users.map((user: any) => mapUserRow(user)),
    pagination: {
      total,
      limit,
      offset,
    },
  });
});

/**
 * Get user by ID with all data (admin only)
 * GET /api/v1/admin/users/:id
 */
export const getUserDetails = asyncHandler(async (req: Request, res: Response) => {
  const pool = getMySQLPool();
  const userId = req.params.id;

  // Get user with all fields
  const [users] = await pool.execute(
    `SELECT * FROM users WHERE id = ?`,
    [userId]
  ) as any[];

  if (users.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const user = mapUserRow(users[0]);
  const dbUser = users[0];

  // Get work hours with statistics
  const [workHours] = await pool.execute(
    'SELECT * FROM work_hours WHERE user_id = ? ORDER BY start_time DESC LIMIT 100',
    [userId]
  ) as any[];

  const [workHoursStats] = await pool.execute(
    `SELECT 
      COALESCE(COUNT(*), 0) as total_sessions,
      COALESCE(SUM(CASE WHEN is_active = 0 THEN duration_minutes ELSE 0 END) / 60, 0) as total_hours,
      COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) as active_sessions,
      MIN(start_time) as first_session,
      MAX(CASE WHEN is_active = 0 THEN start_time ELSE NULL END) as last_session
    FROM work_hours WHERE user_id = ?`,
    [userId]
  ) as any[];

  // Get CPD hours with statistics
  // Note: cpd_hours table uses 'date' column, not 'activity_date'
  const [cpdHours] = await pool.execute(
    'SELECT * FROM cpd_hours WHERE user_id = ? ORDER BY date DESC LIMIT 100',
    [userId]
  ) as any[];

  const [cpdHoursStats] = await pool.execute(
    `SELECT 
      COALESCE(COUNT(*), 0) as total_activities,
      COALESCE(SUM(CAST(CASE 
        WHEN number_hours IS NOT NULL AND number_hours != '' AND number_hours != '0' 
        THEN number_hours 
        ELSE '0' 
      END AS DECIMAL(10,2))), 0) as total_hours,
      MIN(date) as first_activity,
      MAX(date) as last_activity
    FROM cpd_hours WHERE user_id = ?`,
    [userId]
  ) as any[];

  // Get feedback logs
  const [feedbackLogs] = await pool.execute(
    'SELECT * FROM feedback_log WHERE user_id = ? ORDER BY feedback_date DESC LIMIT 100',
    [userId]
  ) as any[];

  const [feedbackStats] = await pool.execute(
    `SELECT 
      COALESCE(COUNT(*), 0) as total,
      COALESCE(COUNT(CASE WHEN feedback_type = 'patient' THEN 1 END), 0) as patient_count,
      COALESCE(COUNT(CASE WHEN feedback_type = 'colleague' THEN 1 END), 0) as colleague_count,
      MIN(feedback_date) as first_feedback,
      MAX(feedback_date) as last_feedback
    FROM feedback_log WHERE user_id = ?`,
    [userId]
  ) as any[];

  // Get reflective accounts
  const [reflections] = await pool.execute(
    'SELECT * FROM reflective_accounts WHERE user_id = ? ORDER BY reflection_date DESC LIMIT 100',
    [userId]
  ) as any[];

  const [reflectionStats] = await pool.execute(
    `SELECT 
      COALESCE(COUNT(*), 0) as total,
      MIN(reflection_date) as first_reflection,
      MAX(reflection_date) as last_reflection
    FROM reflective_accounts WHERE user_id = ?`,
    [userId]
  ) as any[];

  // Get appraisal records
  const [appraisals] = await pool.execute(
    'SELECT * FROM appraisal_records WHERE user_id = ? ORDER BY appraisal_date DESC LIMIT 100',
    [userId]
  ) as any[];

  const [appraisalStats] = await pool.execute(
    `SELECT 
      COALESCE(COUNT(*), 0) as total,
      MIN(appraisal_date) as first_appraisal,
      MAX(appraisal_date) as last_appraisal
    FROM appraisal_records WHERE user_id = ?`,
    [userId]
  ) as any[];

  res.json({
    success: true,
    data: {
      user: {
        ...user,
        // Include additional fields from database
        name: dbUser.name,
        phone: dbUser.mobile,
        phoneCode: dbUser.phone_code,
        salutation: dbUser.salutation,
        firstName: dbUser.first_name,
        surname: dbUser.surname,
        gender: dbUser.gender,
        designationId: dbUser.designation_id,
        organizationName: dbUser.organization_name,
        mode: dbUser.mode,
        hourlyRate: dbUser.hourly_rate,
        hoursCompletedAlready: dbUser.hours_completed_already,
        trainingHoursCompletedAlready: dbUser.training_hours_completed_already,
        earned: dbUser.earned,
        earningHome: dbUser.earning_home,
        image: dbUser.image,
        blockUser: dbUser.block_user,
        updateStatus: dbUser.update_status,
        deviceToken: dbUser.device_token,
        notepad: dbUser.notepad,
        premiumStatus: dbUser.premium_status,
        offlineData: dbUser.offline_data,
        lastLogin: dbUser.last_login,
        status: dbUser.status,
        userType: dbUser.user_type,
        regType: dbUser.reg_type,
      },
      statistics: {
        workHours: {
          totalSessions: workHoursStats && workHoursStats.length > 0 ? Number(workHoursStats[0].total_sessions) || 0 : 0,
          totalHours: workHoursStats && workHoursStats.length > 0 ? Number(workHoursStats[0].total_hours) || 0 : 0,
          activeSessions: workHoursStats && workHoursStats.length > 0 ? Number(workHoursStats[0].active_sessions) || 0 : 0,
          firstSession: workHoursStats && workHoursStats.length > 0 ? workHoursStats[0].first_session || null : null,
          lastSession: workHoursStats && workHoursStats.length > 0 ? workHoursStats[0].last_session || null : null,
        },
        cpdHours: {
          totalActivities: cpdHoursStats && cpdHoursStats.length > 0 ? Number(cpdHoursStats[0].total_activities) || 0 : 0,
          totalHours: cpdHoursStats && cpdHoursStats.length > 0 ? Number(cpdHoursStats[0].total_hours) || 0 : 0,
          firstActivity: cpdHoursStats && cpdHoursStats.length > 0 ? cpdHoursStats[0].first_activity || null : null,
          lastActivity: cpdHoursStats && cpdHoursStats.length > 0 ? cpdHoursStats[0].last_activity || null : null,
        },
        feedback: {
          total: feedbackStats && feedbackStats.length > 0 ? Number(feedbackStats[0].total) || 0 : 0,
          patientCount: feedbackStats && feedbackStats.length > 0 ? Number(feedbackStats[0].patient_count) || 0 : 0,
          colleagueCount: feedbackStats && feedbackStats.length > 0 ? Number(feedbackStats[0].colleague_count) || 0 : 0,
          firstFeedback: feedbackStats && feedbackStats.length > 0 ? feedbackStats[0].first_feedback || null : null,
          lastFeedback: feedbackStats && feedbackStats.length > 0 ? feedbackStats[0].last_feedback || null : null,
        },
        reflections: {
          total: reflectionStats && reflectionStats.length > 0 ? Number(reflectionStats[0].total) || 0 : 0,
          firstReflection: reflectionStats && reflectionStats.length > 0 ? reflectionStats[0].first_reflection || null : null,
          lastReflection: reflectionStats && reflectionStats.length > 0 ? reflectionStats[0].last_reflection || null : null,
        },
        appraisals: {
          total: appraisalStats && appraisalStats.length > 0 ? Number(appraisalStats[0].total) || 0 : 0,
          firstAppraisal: appraisalStats && appraisalStats.length > 0 ? appraisalStats[0].first_appraisal || null : null,
          lastAppraisal: appraisalStats && appraisalStats.length > 0 ? appraisalStats[0].last_appraisal || null : null,
        },
      },
      workHours: workHours.map((wh: any) => ({
        id: wh.id,
        startTime: wh.start_time,
        endTime: wh.end_time,
        durationMinutes: wh.duration_minutes,
        workDescription: wh.work_description,
        isActive: wh.is_active,
        createdAt: wh.created_at,
        updatedAt: wh.updated_at,
        documentIds: wh.document_ids ? (typeof wh.document_ids === 'string' ? JSON.parse(wh.document_ids) : wh.document_ids) : [],
      })),
      cpdHours: cpdHours.map((ch: any) => {
        // Calculate hours from number_hours field
        let hours = 0;
        if (ch.number_hours && ch.number_hours !== '' && ch.number_hours !== '0') {
          hours = parseFloat(ch.number_hours) || 0;
        } else if (ch.duration_minutes) {
          hours = ch.duration_minutes / 60;
        }

        return {
          id: ch.id,
          date: ch.date,
          activityDate: ch.date, // Alias for compatibility
          method: ch.method,
          topic: ch.topic,
          linkCode: ch.link_code,
          standardsProficiency: ch.standards_proficiency,
          numberHours: ch.number_hours,
          hours: hours, // Calculated hours
          participatoryHours: ch.participatory_hours,
          document: ch.document,
          learningType: ch.learning_type,
          standard: ch.standard,
          learning: ch.learning,
          durationMinutes: ch.duration_minutes,
          trainingName: ch.topic || ch.method || 'Unnamed Training',
          activityType: ch.method || ch.learning_type || 'N/A',
          createdAt: ch.created_at,
          documentIds: ch.document_ids ? (typeof ch.document_ids === 'string' ? JSON.parse(ch.document_ids) : ch.document_ids) : [],
        };
      }),
      feedbackLogs: feedbackLogs.map((fl: any) => ({
        id: fl.id,
        feedbackDate: fl.feedback_date,
        feedbackType: fl.feedback_type,
        feedbackText: fl.feedback_text,
        createdAt: fl.created_at,
        updatedAt: fl.updated_at,
        documentIds: fl.document_ids ? (typeof fl.document_ids === 'string' ? JSON.parse(fl.document_ids) : fl.document_ids) : [],
      })),
      reflections: reflections.map((r: any) => ({
        id: r.id,
        reflectionDate: r.reflection_date,
        reflectionText: r.reflection_text,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        documentIds: r.document_ids ? (typeof r.document_ids === 'string' ? JSON.parse(r.document_ids) : r.document_ids) : [],
      })),
      appraisals: appraisals.map((a: any) => ({
        id: a.id,
        appraisalDate: a.appraisal_date,
        notes: a.notes,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        documentIds: a.document_ids ? (typeof a.document_ids === 'string' ? JSON.parse(a.document_ids) : a.document_ids) : [],
      })),
    },
  });
});

/**
 * Get dashboard statistics (admin only)
 * GET /api/v1/admin/stats
 */
export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const pool = getMySQLPool();

  // Total users
  const [userCount] = await pool.execute(
    'SELECT COUNT(*) as total FROM users'
  ) as any[];

  // Active users (last 30 days) - users who logged in or created work hours
  const [activeUsers] = await pool.execute(
    `SELECT COUNT(DISTINCT u.id) as total 
     FROM users u 
     LEFT JOIN work_hours wh ON u.id = wh.user_id 
     WHERE (wh.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
            OR u.last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            OR u.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))`
  ) as any[];

  // Users with status active
  const [activeStatusUsers] = await pool.execute(
    "SELECT COUNT(*) as total FROM users WHERE status = '1'"
  ) as any[];

  // Inactive users
  const [inactiveUsers] = await pool.execute(
    "SELECT COUNT(*) as total FROM users WHERE status = '0'"
  ) as any[];

  // Total work hours
  const [totalWorkHours] = await pool.execute(
    'SELECT COALESCE(SUM(duration_minutes), 0) / 60 as total FROM work_hours WHERE is_active = 0'
  ) as any[];

  // Active work sessions
  const [activeWorkSessions] = await pool.execute(
    'SELECT COUNT(*) as total FROM work_hours WHERE is_active = 1'
  ) as any[];

  // Total CPD hours
  // Note: cpd_hours table uses number_hours (varchar) instead of duration_minutes
  // Calculate from number_hours field (stored as varchar, contains decimal hours)
  const [totalCpdHours] = await pool.execute(
    `SELECT COALESCE(
      SUM(CAST(CASE 
        WHEN number_hours IS NOT NULL AND number_hours != '' AND number_hours != '0' 
        THEN number_hours 
        ELSE '0' 
      END AS DECIMAL(10,2))),
      0
    ) as total FROM cpd_hours`
  ) as any[];

  // Premium users
  const [premiumUsers] = await pool.execute(
    "SELECT COUNT(*) as total FROM users WHERE subscription_tier = 'premium'"
  ) as any[];

  // Free users
  const [freeUsers] = await pool.execute(
    "SELECT COUNT(*) as total FROM users WHERE subscription_tier = 'free'"
  ) as any[];

  // Subscription status breakdown
  const [subscriptionStatus] = await pool.execute(
    `SELECT subscription_status, COUNT(*) as count 
     FROM users 
     GROUP BY subscription_status`
  ) as any[];

  // Users by role/reg_type
  const [usersByRole] = await pool.execute(
    `SELECT 
       COALESCE(
         NULLIF(reg_type, ''),
         NULLIF(JSON_UNQUOTE(JSON_EXTRACT(description, '$.professionalRole')), ''),
         'Unknown'
       ) as reg_type,
       COUNT(*) as count
     FROM users
     GROUP BY reg_type`
  ) as any[];

  // Users by user_type
  const [usersByType] = await pool.execute(
    `SELECT user_type, COUNT(*) as count 
     FROM users 
     GROUP BY user_type`
  ) as any[];

  // Recent registrations (last 7 days)
  const [recentRegistrations] = await pool.execute(
    `SELECT COUNT(*) as total 
     FROM users 
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
  ) as any[];

  // Recent registrations (last 30 days)
  const [recentRegistrations30] = await pool.execute(
    `SELECT COUNT(*) as total 
     FROM users 
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
  ) as any[];

  // Users with work hours
  const [usersWithWorkHours] = await pool.execute(
    'SELECT COUNT(DISTINCT user_id) as total FROM work_hours'
  ) as any[];

  // Users with CPD hours
  const [usersWithCpdHours] = await pool.execute(
    'SELECT COUNT(DISTINCT user_id) as total FROM cpd_hours'
  ) as any[];

  // Total feedback logs
  const [totalFeedback] = await pool.execute(
    'SELECT COUNT(*) as total FROM feedback_log'
  ) as any[];

  // Total reflections
  const [totalReflections] = await pool.execute(
    'SELECT COUNT(*) as total FROM reflective_accounts'
  ) as any[];

  // Total appraisals
  const [totalAppraisals] = await pool.execute(
    'SELECT COUNT(*) as total FROM appraisal_records'
  ) as any[];

  // Average work hours per user
  const [avgWorkHours] = await pool.execute(
    `SELECT COALESCE(AVG(total_hours), 0) as avg_hours
     FROM (
       SELECT user_id, SUM(duration_minutes) / 60 as total_hours
       FROM work_hours 
       WHERE is_active = 0
       GROUP BY user_id
     ) as user_totals`
  ) as any[];

  // Average CPD hours per user
  // Note: cpd_hours uses number_hours (varchar) instead of duration_minutes
  const [avgCpdHours] = await pool.execute(
    `SELECT COALESCE(AVG(total_hours), 0) as avg_hours
     FROM (
       SELECT user_id, 
         SUM(CAST(CASE 
           WHEN number_hours IS NOT NULL AND number_hours != '' AND number_hours != '0'
           THEN number_hours 
           ELSE '0' 
         END AS DECIMAL(10,2))) as total_hours
       FROM cpd_hours
       GROUP BY user_id
     ) as user_totals`
  ) as any[];

  // Recent activity (last 24 hours)
  const [recentActivity] = await pool.execute(
    `SELECT 
       (SELECT COUNT(*) FROM work_hours WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as work_hours_24h,
       (SELECT COUNT(*) FROM cpd_hours WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as cpd_hours_24h,
       (SELECT COUNT(*) FROM feedback_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as feedback_24h,
       (SELECT COUNT(*) FROM reflective_accounts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as reflections_24h,
       (SELECT COUNT(*) FROM appraisal_records WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as appraisals_24h,
       (SELECT MAX(created_at) FROM work_hours) as last_work_hours,
       (SELECT MAX(created_at) FROM cpd_hours) as last_cpd_hours,
       (SELECT MAX(created_at) FROM feedback_log) as last_feedback,
       (SELECT MAX(created_at) FROM reflective_accounts) as last_reflections,
       (SELECT MAX(created_at) FROM appraisal_records) as last_appraisals`
  ) as any[];

  res.json({
    success: true,
    data: {
      // User statistics
      totalUsers: Number(userCount[0]?.total || 0),
      activeUsers: Number(activeUsers[0]?.total || 0),
      activeStatusUsers: Number(activeStatusUsers[0]?.total || 0),
      inactiveUsers: Number(inactiveUsers[0]?.total || 0),
      freeUsers: Number(freeUsers[0]?.total || 0),
      premiumUsers: Number(premiumUsers[0]?.total || 0),
      
      // Registration statistics
      recentRegistrations7Days: Number(recentRegistrations[0]?.total || 0),
      recentRegistrations30Days: Number(recentRegistrations30[0]?.total || 0),
      
      // Work hours statistics
      totalWorkHours: Math.round(Number(totalWorkHours[0]?.total || 0) * 100) / 100,
      activeWorkSessions: Number(activeWorkSessions[0]?.total || 0),
      usersWithWorkHours: Number(usersWithWorkHours[0]?.total || 0),
      avgWorkHoursPerUser: Math.round(Number(avgWorkHours[0]?.avg_hours || 0) * 100) / 100,
      
      // CPD hours statistics
      totalCpdHours: Math.round(Number(totalCpdHours[0]?.total || 0) * 100) / 100,
      usersWithCpdHours: Number(usersWithCpdHours[0]?.total || 0),
      avgCpdHoursPerUser: Math.round(Number(avgCpdHours[0]?.avg_hours || 0) * 100) / 100,
      
      // Activity statistics
      totalFeedback: Number(totalFeedback[0]?.total || 0),
      totalReflections: Number(totalReflections[0]?.total || 0),
      totalAppraisals: Number(totalAppraisals[0]?.total || 0),
      
      // Breakdowns
      usersByRole: usersByRole.reduce((acc: any, row: any) => {
        acc[row.reg_type] = row.count;
        return acc;
      }, {}),
      usersByType: usersByType.reduce((acc: any, row: any) => {
        acc[row.user_type] = row.count;
        return acc;
      }, {}),
      subscriptionStatus: subscriptionStatus.reduce((acc: any, row: any) => {
        acc[row.subscription_status] = row.count;
        return acc;
      }, {}),
      
      // Recent activity (24 hours)
      recentActivity: {
        workHours: Number(recentActivity[0]?.work_hours_24h || 0),
        cpdHours: Number(recentActivity[0]?.cpd_hours_24h || 0),
        feedback: Number(recentActivity[0]?.feedback_24h || 0),
        reflections: Number(recentActivity[0]?.reflections_24h || 0),
        appraisals: Number(recentActivity[0]?.appraisals_24h || 0),
        // Last activity timestamps for context
        lastWorkHours: recentActivity[0]?.last_work_hours || null,
        lastCpdHours: recentActivity[0]?.last_cpd_hours || null,
        lastFeedback: recentActivity[0]?.last_feedback || null,
        lastReflections: recentActivity[0]?.last_reflections || null,
        lastAppraisals: recentActivity[0]?.last_appraisals || null,
      },
    },
  });
});
