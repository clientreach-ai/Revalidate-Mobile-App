import { connectMySQL, getMySQLPool } from '../config/database';
import { mapUserRow } from '../config/database-mapping';

async function findUsersWithData() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    console.log('\n🔍 Searching for users with real data...\n');

    // Find all users with their data counts
    const [usersWithData] = await pool.execute(
      `SELECT 
        u.id,
        u.email,
        u.name,
        u.registration,
        u.due_date,
        u.reg_type,
        u.subscription_tier,
        u.status,
        (SELECT COUNT(*) FROM user_calendars WHERE user_id = u.id) as calendar_count,
        (SELECT COUNT(*) FROM personal_documents WHERE user_id = u.id) as documents_count,
        (SELECT COUNT(*) FROM work_hours WHERE user_id = u.id) as work_hours_count,
        (SELECT COUNT(*) FROM cpd_hours WHERE user_id = u.id) as cpd_count,
        (SELECT COUNT(*) FROM feedback_log WHERE user_id = u.id) as feedback_count,
        (SELECT COUNT(*) FROM reflective_accounts WHERE user_id = u.id) as reflections_count,
        (SELECT COUNT(*) FROM appraisal_records WHERE user_id = u.id) as appraisals_count,
        (SELECT COUNT(*) FROM earnings WHERE user_id = u.id) as earnings_count,
        (SELECT COUNT(*) FROM attendances WHERE user_id = u.id) as attendances_count
      FROM users u
      WHERE u.status != '0'
      ORDER BY 
        (calendar_count + documents_count + work_hours_count + 
         cpd_count + feedback_count + reflections_count + appraisals_count + 
         earnings_count + attendances_count) DESC
      LIMIT 50`
    ) as any[];

    if (usersWithData.length === 0) {
      console.log('No users found with data');
      process.exit(0);
    }

    console.log(`Found ${usersWithData.length} users with data:\n`);
    console.log('='.repeat(100));

    for (const user of usersWithData) {
      const totalData = 
        (user.calendar_count || 0) +
        (user.documents_count || 0) +
        (user.work_hours_count || 0) +
        (user.cpd_count || 0) +
        (user.feedback_count || 0) +
        (user.reflections_count || 0) +
        (user.appraisals_count || 0) +
        (user.earnings_count || 0) +
        (user.attendances_count || 0);

      if (totalData === 0) continue;

      const mapped = mapUserRow(user);
      
      console.log(`\n👤 User ID: ${mapped.id}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Email: ${mapped.email}`);
      console.log(`   Registration: ${mapped.registration_number || 'N/A'}`);
      console.log(`   Role: ${mapped.professional_role || 'N/A'}`);
      console.log(`   Subscription: ${user.subscription_tier || 'free'}`);
      console.log(`   Revalidation Date: ${mapped.revalidation_date || 'N/A'}`);
      console.log(`\n   📊 Data Summary:`);
      console.log(`      📅 Calendar Events: ${user.calendar_count || 0}`);
      console.log(`      📁 Gallery/Documents: ${user.documents_count || 0}`);
      console.log(`      ⏰ Work Hours: ${user.work_hours_count || 0}`);
      console.log(`      📚 CPD Hours: ${user.cpd_count || 0}`);
      console.log(`      💬 Feedback: ${user.feedback_count || 0}`);
      console.log(`      📝 Reflections: ${user.reflections_count || 0}`);
      console.log(`      ✅ Appraisals: ${user.appraisals_count || 0}`);
      console.log(`      💰 Earnings: ${user.earnings_count || 0}`);
      console.log(`      📋 Attendances: ${user.attendances_count || 0}`);
      console.log(`      ─────────────────────────`);
      console.log(`      📈 TOTAL: ${totalData} records`);

      // Show sample calendar events if any
      if (user.calendar_count > 0) {
        const [calendarEvents] = await pool.execute(
          `SELECT id, type, title, date, start_time, end_time, venue 
           FROM user_calendars 
           WHERE user_id = ? 
           ORDER BY date DESC 
           LIMIT 5`,
          [user.id]
        ) as any[];

        console.log(`\n      📅 Sample Calendar Events:`);
        calendarEvents.forEach((event: any) => {
          console.log(`         - ${event.title} (${event.type}) - ${event.date} ${event.start_time || ''} ${event.end_time || ''}`);
        });
      }

      // Show sample documents if any
      if (user.documents_count > 0) {
        const [documents] = await pool.execute(
          `SELECT id, type, document_name, date 
           FROM personal_documents 
           WHERE user_id = ? 
           ORDER BY date DESC 
           LIMIT 5`,
          [user.id]
        ) as any[];

        if (documents.length > 0) {
          console.log(`\n      📁 Sample Documents:`);
          documents.forEach((doc: any) => {
            console.log(`         - ${doc.document_name || doc.type} (${doc.type}) - ${doc.date || 'N/A'}`);
          });
        }
      }

      console.log('\n' + '-'.repeat(100));
    }

    // Summary statistics
    console.log('\n\n📊 SUMMARY STATISTICS:\n');
    console.log('='.repeat(100));

    const [stats] = await pool.execute(
      `SELECT 
        COUNT(DISTINCT u.id) as total_users,
        SUM((SELECT COUNT(*) FROM user_calendars WHERE user_id = u.id)) as total_calendar_events,
        SUM((SELECT COUNT(*) FROM personal_documents WHERE user_id = u.id)) as total_documents,
        SUM((SELECT COUNT(*) FROM work_hours WHERE user_id = u.id)) as total_work_hours,
        SUM((SELECT COUNT(*) FROM cpd_hours WHERE user_id = u.id)) as total_cpd_hours,
        SUM((SELECT COUNT(*) FROM feedback_log WHERE user_id = u.id)) as total_feedback,
        SUM((SELECT COUNT(*) FROM reflective_accounts WHERE user_id = u.id)) as total_reflections,
        SUM((SELECT COUNT(*) FROM appraisal_records WHERE user_id = u.id)) as total_appraisals
      FROM users u
      WHERE u.status != '0'`
    ) as any[];

    const summary = stats[0];
    console.log(`Total Active Users: ${summary.total_users || 0}`);
    console.log(`Total Calendar Events: ${summary.total_calendar_events || 0}`);
    console.log(`Total Documents: ${summary.total_documents || 0}`);
    console.log(`Total Work Hours Records: ${summary.total_work_hours || 0}`);
    console.log(`Total CPD Hours Records: ${summary.total_cpd_hours || 0}`);
    console.log(`Total Feedback Records: ${summary.total_feedback || 0}`);
    console.log(`Total Reflections: ${summary.total_reflections || 0}`);
    console.log(`Total Appraisals: ${summary.total_appraisals || 0}`);

    // Find users with calendar events
    console.log('\n\n📅 USERS WITH CALENDAR EVENTS:\n');
    console.log('='.repeat(100));
    const [usersWithCalendar] = await pool.execute(
      `SELECT DISTINCT u.id, u.email, u.name, 
       COUNT(uc.id) as event_count
       FROM users u
       INNER JOIN user_calendars uc ON u.id = uc.user_id
       WHERE u.status != '0'
       GROUP BY u.id, u.email, u.name
       ORDER BY event_count DESC
       LIMIT 20`
    ) as any[];

    if (usersWithCalendar.length > 0) {
      usersWithCalendar.forEach((user: any) => {
        console.log(`User ID: ${user.id} | Email: ${user.email} | Name: ${user.name || 'N/A'} | Events: ${user.event_count}`);
      });
    } else {
      console.log('No users found with calendar events');
    }

    // Find users with documents
    console.log('\n\n📁 USERS WITH DOCUMENTS:\n');
    console.log('='.repeat(100));
    const [usersWithDocuments] = await pool.execute(
      `SELECT DISTINCT u.id, u.email, u.name,
       (SELECT COUNT(*) FROM personal_documents WHERE user_id = u.id) as doc_count
       FROM users u
       WHERE u.status != '0'
       AND (SELECT COUNT(*) FROM personal_documents WHERE user_id = u.id) > 0
       ORDER BY doc_count DESC
       LIMIT 20`
    ) as any[];

    if (usersWithDocuments.length > 0) {
      usersWithDocuments.forEach((user: any) => {
        console.log(`User ID: ${user.id} | Email: ${user.email} | Name: ${user.name || 'N/A'} | Documents: ${user.doc_count}`);
      });
    } else {
      console.log('No users found with documents');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

findUsersWithData();
