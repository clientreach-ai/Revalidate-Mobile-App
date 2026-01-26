import { connectMySQL, getMySQLPool } from '../config/database';

async function copyUserData(sourceUserId: string, targetUserId: string) {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    console.log(`Copying data from user ${sourceUserId} to user ${targetUserId}...\n`);

    // Verify both users exist
    const [sourceUser] = await pool.execute(
      'SELECT id, email, name FROM users WHERE id = ?',
      [sourceUserId]
    ) as any[];

    const [targetUser] = await pool.execute(
      'SELECT id, email, name FROM users WHERE id = ?',
      [targetUserId]
    ) as any[];

    if (sourceUser.length === 0) {
      console.error(`Source user ${sourceUserId} not found`);
      process.exit(1);
    }

    if (targetUser.length === 0) {
      console.error(`Target user ${targetUserId} not found`);
      process.exit(1);
    }

    console.log(`Source: ${sourceUser[0].name} (${sourceUser[0].email})`);
    console.log(`Target: ${targetUser[0].name} (${targetUser[0].email})\n`);

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let copiedCount = 0;

      // 1. Copy work_hours
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

      // 2. Copy cpd_hours
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

      // 3. Copy feedback_log
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

      // 4. Copy reflective_accounts
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

      // 5. Copy appraisal_records
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

      // 6. Copy user_calendars
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

      // 7. Copy personal_documents
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

      // 8. Update user's professional fields (but keep personal data)
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

      console.log(`\n✅ Successfully copied ${copiedCount} records from user ${sourceUserId} to user ${targetUserId}`);
      console.log(`\nNote: Personal data (name, email, phone) was preserved for user ${targetUserId}`);

    } catch (error: any) {
      await connection.rollback();
      connection.release();
      throw error;
    }

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

const sourceUserId = process.argv[2] || '376';
const targetUserId = process.argv[3] || '416';

if (!sourceUserId || !targetUserId) {
  console.error('Usage: tsx copy-user-data.ts <source_user_id> <target_user_id>');
  process.exit(1);
}

copyUserData(sourceUserId, targetUserId);
