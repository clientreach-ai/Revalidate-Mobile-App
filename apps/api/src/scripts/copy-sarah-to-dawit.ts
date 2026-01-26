import { connectMySQL, getMySQLPool } from '../config/database';

async function copySarahToDawit() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    const sourceEmail = 'sarahthompson20@aol.co.uk';
    const targetEmail = 'dawit.dev.gg@gmail.com';

    console.log(`\n🔄 Copying data from ${sourceEmail} to ${targetEmail}...\n`);

    // Find source user (Sarah)
    const [sourceUsers] = await pool.execute(
      'SELECT id, email, name FROM users WHERE email = ?',
      [sourceEmail]
    ) as any[];

    // Find target user (Dawit)
    const [targetUsers] = await pool.execute(
      'SELECT id, email, name FROM users WHERE email = ?',
      [targetEmail]
    ) as any[];

    if (sourceUsers.length === 0) {
      console.error(`❌ Source user with email ${sourceEmail} not found`);
      process.exit(1);
    }

    if (targetUsers.length === 0) {
      console.error(`❌ Target user with email ${targetEmail} not found`);
      process.exit(1);
    }

    const sourceUser = sourceUsers[0];
    const targetUser = targetUsers[0];
    const sourceUserId = sourceUser.id.toString();
    const targetUserId = targetUser.id.toString();

    console.log(`📋 Source: ${sourceUser.name || 'N/A'} (${sourceUser.email}) - ID: ${sourceUserId}`);
    console.log(`📋 Target: ${targetUser.name || 'N/A'} (${targetUser.email}) - ID: ${targetUserId}\n`);

    // Check existing data counts
    const [sourceCounts] = await pool.execute(
      `SELECT 
        (SELECT COUNT(*) FROM user_calendars WHERE user_id = ?) as calendar_count,
        (SELECT COUNT(*) FROM personal_documents WHERE user_id = ?) as documents_count,
        (SELECT COUNT(*) FROM work_hours WHERE user_id = ?) as work_hours_count,
        (SELECT COUNT(*) FROM cpd_hours WHERE user_id = ?) as cpd_count,
        (SELECT COUNT(*) FROM feedback_log WHERE user_id = ?) as feedback_count,
        (SELECT COUNT(*) FROM reflective_accounts WHERE user_id = ?) as reflections_count,
        (SELECT COUNT(*) FROM appraisal_records WHERE user_id = ?) as appraisals_count,
        (SELECT COUNT(*) FROM earnings WHERE user_id = ?) as earnings_count
      FROM users WHERE id = ?`,
      [sourceUserId, sourceUserId, sourceUserId, sourceUserId, sourceUserId, sourceUserId, sourceUserId, sourceUserId, sourceUserId]
    ) as any[];

    const counts = sourceCounts[0];
    console.log(`📊 Source user data summary:`);
    console.log(`   📅 Calendar Events: ${counts.calendar_count || 0}`);
    console.log(`   📁 Documents: ${counts.documents_count || 0}`);
    console.log(`   ⏰ Work Hours: ${counts.work_hours_count || 0}`);
    console.log(`   📚 CPD Hours: ${counts.cpd_count || 0}`);
    console.log(`   💬 Feedback: ${counts.feedback_count || 0}`);
    console.log(`   📝 Reflections: ${counts.reflections_count || 0}`);
    console.log(`   ✅ Appraisals: ${counts.appraisals_count || 0}`);
    console.log(`   💰 Earnings: ${counts.earnings_count || 0}\n`);

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let copiedCount = 0;

      // 1. Copy user_calendars
      const [calendarEvents] = await connection.execute(
        'SELECT * FROM user_calendars WHERE user_id = ?',
        [sourceUserId]
      ) as any[];

      if (calendarEvents.length > 0) {
        for (const cal of calendarEvents) {
          await connection.execute(
            `INSERT INTO user_calendars (user_id, type, title, date, end_date, 
             start_time, end_time, venue, invite, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              targetUserId,
              cal.type,
              cal.title,
              cal.date,
              cal.end_date,
              cal.start_time,
              cal.end_time,
              cal.venue,
              cal.invite,
              cal.status,
            ]
          );
        }
        console.log(`✓ Copied ${calendarEvents.length} calendar events`);
        copiedCount += calendarEvents.length;
      } else {
        console.log(`- No calendar events to copy`);
      }

      // 2. Copy personal_documents
      const [documents] = await connection.execute(
        'SELECT * FROM personal_documents WHERE user_id = ?',
        [sourceUserId]
      ) as any[];

      if (documents.length > 0) {
        for (const doc of documents) {
          await connection.execute(
            `INSERT INTO personal_documents (user_id, document, document_name, type, 
             date, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              targetUserId,
              doc.document,
              doc.document_name,
              doc.type,
              doc.date,
              doc.status,
            ]
          );
        }
        console.log(`✓ Copied ${documents.length} documents`);
        copiedCount += documents.length;
      } else {
        console.log(`- No documents to copy`);
      }

      // 3. Copy work_hours
      const [workHours] = await connection.execute(
        'SELECT * FROM work_hours WHERE user_id = ?',
        [sourceUserId]
      ) as any[];

      if (workHours.length > 0) {
        for (const wh of workHours) {
          await connection.execute(
            `INSERT INTO work_hours (user_id, start_time, end_time, duration_minutes, 
             work_description, document_ids, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              targetUserId,
              wh.start_time,
              wh.end_time,
              wh.duration_minutes,
              wh.work_description,
              wh.document_ids,
              wh.is_active,
            ]
          );
        }
        console.log(`✓ Copied ${workHours.length} work hours`);
        copiedCount += workHours.length;
      } else {
        console.log(`- No work hours to copy`);
      }

      // 4. Copy cpd_hours
      const [cpdHours] = await connection.execute(
        'SELECT * FROM cpd_hours WHERE user_id = ?',
        [sourceUserId]
      ) as any[];

      if (cpdHours.length > 0) {
        for (const cpd of cpdHours) {
          await connection.execute(
            `INSERT INTO cpd_hours (user_id, date, method, topic, link_code, 
             standards_proficiency, number_hours, participatory_hours, document, 
             learning_type, standard, learning, duration_minutes, status, reset, 
             created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              targetUserId,
              cpd.date,
              cpd.method,
              cpd.topic,
              cpd.link_code,
              cpd.standards_proficiency,
              cpd.number_hours,
              cpd.participatory_hours,
              cpd.document,
              cpd.learning_type,
              cpd.standard,
              cpd.learning,
              cpd.duration_minutes,
              cpd.status,
              cpd.reset,
            ]
          );
        }
        console.log(`✓ Copied ${cpdHours.length} CPD hours`);
        copiedCount += cpdHours.length;
      } else {
        console.log(`- No CPD hours to copy`);
      }

      // 5. Copy feedback_log
      const [feedbackLogs] = await connection.execute(
        'SELECT * FROM feedback_log WHERE user_id = ?',
        [sourceUserId]
      ) as any[];

      if (feedbackLogs.length > 0) {
        for (const fb of feedbackLogs) {
          await connection.execute(
            `INSERT INTO feedback_log (user_id, feedback_date, feedback_type, 
             feedback_text, document_ids, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              targetUserId,
              fb.feedback_date,
              fb.feedback_type,
              fb.feedback_text,
              fb.document_ids,
            ]
          );
        }
        console.log(`✓ Copied ${feedbackLogs.length} feedback logs`);
        copiedCount += feedbackLogs.length;
      } else {
        console.log(`- No feedback logs to copy`);
      }

      // 6. Copy reflective_accounts
      const [reflections] = await connection.execute(
        'SELECT * FROM reflective_accounts WHERE user_id = ?',
        [sourceUserId]
      ) as any[];

      if (reflections.length > 0) {
        for (const ref of reflections) {
          await connection.execute(
            `INSERT INTO reflective_accounts (user_id, reflection_date, reflection_text, 
             document_ids, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [
              targetUserId,
              ref.reflection_date,
              ref.reflection_text,
              ref.document_ids,
            ]
          );
        }
        console.log(`✓ Copied ${reflections.length} reflections`);
        copiedCount += reflections.length;
      } else {
        console.log(`- No reflections to copy`);
      }

      // 7. Copy appraisal_records
      const [appraisals] = await connection.execute(
        'SELECT * FROM appraisal_records WHERE user_id = ?',
        [sourceUserId]
      ) as any[];

      if (appraisals.length > 0) {
        for (const app of appraisals) {
          await connection.execute(
            `INSERT INTO appraisal_records (user_id, appraisal_date, notes, 
             document_ids, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [
              targetUserId,
              app.appraisal_date,
              app.notes,
              app.document_ids,
            ]
          );
        }
        console.log(`✓ Copied ${appraisals.length} appraisals`);
        copiedCount += appraisals.length;
      } else {
        console.log(`- No appraisals to copy`);
      }

      // 8. Copy earnings
      const [earnings] = await connection.execute(
        'SELECT * FROM earnings WHERE user_id = ?',
        [sourceUserId]
      ) as any[];

      if (earnings.length > 0) {
        for (const earn of earnings) {
          await connection.execute(
            `INSERT INTO earnings (user_id, financial_year_id, working_hour_id, 
             earnings, date_recorded, description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              targetUserId,
              earn.financial_year_id,
              earn.working_hour_id,
              earn.earnings,
              earn.date_recorded,
              earn.description,
            ]
          );
        }
        console.log(`✓ Copied ${earnings.length} earnings records`);
        copiedCount += earnings.length;
      } else {
        console.log(`- No earnings to copy`);
      }

      // 9. Update user's professional fields (but keep personal data like name, email)
      const [sourceUserData] = await connection.execute(
        `SELECT registration, due_date, reg_type, work_settings, scope_practice, 
         subscription_tier, subscription_status, trial_ends_at, hourly_rate,
         hours_completed_already, training_hours_completed_already, earned,
         description, notepad
         FROM users WHERE id = ?`,
        [sourceUserId]
      ) as any[];

      if (sourceUserData.length > 0) {
        const source = sourceUserData[0];
        await connection.execute(
          `UPDATE users SET
           registration = ?,
           due_date = ?,
           reg_type = ?,
           work_settings = ?,
           scope_practice = ?,
           subscription_tier = ?,
           subscription_status = ?,
           trial_ends_at = ?,
           hourly_rate = ?,
           hours_completed_already = ?,
           training_hours_completed_already = ?,
           earned = ?,
           description = ?,
           notepad = ?,
           updated_at = NOW()
           WHERE id = ?`,
          [
            source.registration,
            source.due_date,
            source.reg_type,
            source.work_settings,
            source.scope_practice,
            source.subscription_tier,
            source.subscription_status,
            source.trial_ends_at,
            source.hourly_rate,
            source.hours_completed_already,
            source.training_hours_completed_already,
            source.earned,
            source.description,
            source.notepad,
            targetUserId,
          ]
        );
        console.log(`✓ Updated user professional fields`);
      }

      // Commit transaction
      await connection.commit();
      connection.release();

      console.log(`\n✅ Successfully copied ${copiedCount} records from ${sourceEmail} to ${targetEmail}`);
      console.log(`\n📝 Note: Personal data (name, email, phone) was preserved for ${targetEmail}`);

    } catch (error: any) {
      await connection.rollback();
      connection.release();
      throw error;
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

copySarahToDawit();
