import { connectMySQL, getMySQLPool } from '../config/database';
import { mapUserRow } from '../config/database-mapping';

async function getUserDetails(userId: string) {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    // Get user with all fields
    const [users] = await pool.execute(
      `SELECT * FROM users WHERE id = ?`,
      [userId]
    ) as any[];

    if (users.length === 0) {
      console.log('User not found');
      process.exit(1);
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

    // Get calendar events
    const [calendarEvents] = await pool.execute(
      'SELECT * FROM user_calendars WHERE user_id = ? ORDER BY date DESC LIMIT 100',
      [userId]
    ) as any[];

    // Get personal documents
    const [documents] = await pool.execute(
      'SELECT * FROM personal_documents WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [userId]
    ) as any[];

    // Parse description JSON if it exists
    let onboardingData = null;
    if (dbUser.description) {
      try {
        onboardingData = typeof dbUser.description === 'string' 
          ? JSON.parse(dbUser.description) 
          : dbUser.description;
      } catch (e) {
        // Description is not JSON
      }
    }

    const result = {
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
        description: onboardingData,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.updated_at,
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
        let hours = 0;
        if (ch.number_hours && ch.number_hours !== '' && ch.number_hours !== '0') {
          hours = parseFloat(ch.number_hours) || 0;
        } else if (ch.duration_minutes) {
          hours = ch.duration_minutes / 60;
        }

        return {
          id: ch.id,
          date: ch.date,
          activityDate: ch.date,
          method: ch.method,
          topic: ch.topic,
          linkCode: ch.link_code,
          standardsProficiency: ch.standards_proficiency,
          numberHours: ch.number_hours,
          hours: hours,
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
      calendarEvents: calendarEvents.map((ce: any) => ({
        id: ce.id,
        type: ce.type,
        title: ce.title,
        date: ce.date,
        endDate: ce.end_date,
        startTime: ce.start_time,
        endTime: ce.end_time,
        venue: ce.venue,
        invite: ce.invite,
        status: ce.status,
        createdAt: ce.created_at,
        updatedAt: ce.updated_at,
      })),
      documents: documents.map((doc: any) => ({
        id: doc.id,
        document: doc.document,
        documentName: doc.document_name,
        type: doc.type,
        date: doc.date,
        status: doc.status,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      })),
    };

    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

const userId = process.argv[2] || '349';
getUserDetails(userId);
