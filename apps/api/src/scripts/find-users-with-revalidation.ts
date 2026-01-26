import { connectMySQL, getMySQLPool } from '../config/database';
import { mapUserRow } from '../config/database-mapping';

async function findUsersWithRevalidation() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    // Find users with revalidation dates
    const [users] = await pool.execute(
      `SELECT id, email, name, registration, due_date, reg_type, 
       work_settings, scope_practice, subscription_tier, subscription_status,
       status, created_at, updated_at
       FROM users 
       WHERE due_date IS NOT NULL 
       AND due_date != '' 
       AND due_date != '0000-00-00'
       ORDER BY due_date ASC
       LIMIT 20`
    ) as any[];

    if (users.length === 0) {
      console.log('No users found with revalidation dates');
      process.exit(0);
    }

    console.log(`Found ${users.length} users with revalidation dates:\n`);

    for (const user of users) {
      const mapped = mapUserRow(user);
      
      // Check for related data
      const [workHoursCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM work_hours WHERE user_id = ?',
        [user.id]
      ) as any[];

      const [cpdCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM cpd_hours WHERE user_id = ?',
        [user.id]
      ) as any[];

      const [feedbackCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM feedback_log WHERE user_id = ?',
        [user.id]
      ) as any[];

      const [reflectionsCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM reflective_accounts WHERE user_id = ?',
        [user.id]
      ) as any[];

      const [appraisalsCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM appraisal_records WHERE user_id = ?',
        [user.id]
      ) as any[];

      // Calculate days until revalidation
      let daysUntil = null;
      if (mapped.revalidation_date) {
        try {
          const revalidationDate = new Date(mapped.revalidation_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          revalidationDate.setHours(0, 0, 0, 0);
          const diffTime = revalidationDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          daysUntil = diffDays;
        } catch (e) {
          // Invalid date
        }
      }

      console.log('='.repeat(80));
      console.log(`User ID: ${mapped.id}`);
      console.log(`Name: ${user.name || 'N/A'}`);
      console.log(`Email: ${mapped.email}`);
      console.log(`Registration Number: ${mapped.registration_number || 'N/A'}`);
      console.log(`Revalidation Date: ${mapped.revalidation_date || 'N/A'}`);
      if (daysUntil !== null) {
        if (daysUntil < 0) {
          console.log(`Status: OVERDUE by ${Math.abs(daysUntil)} days`);
        } else if (daysUntil === 0) {
          console.log(`Status: DUE TODAY`);
        } else {
          console.log(`Status: ${daysUntil} days remaining`);
        }
      }
      console.log(`Professional Role: ${mapped.professional_role || 'N/A'}`);
      console.log(`Work Setting: ${mapped.work_setting || 'N/A'}`);
      console.log(`Scope of Practice: ${mapped.scope_of_practice || 'N/A'}`);
      console.log(`Subscription: ${mapped.subscription_tier || 'N/A'} (${mapped.subscription_status || 'N/A'})`);
      console.log(`Status: ${user.status === '1' ? 'Active' : 'Inactive'}`);
      console.log(`\nActivity Data:`);
      console.log(`  - Work Hours: ${workHoursCount[0]?.count || 0}`);
      console.log(`  - CPD Hours: ${cpdCount[0]?.count || 0}`);
      console.log(`  - Feedback Logs: ${feedbackCount[0]?.count || 0}`);
      console.log(`  - Reflections: ${reflectionsCount[0]?.count || 0}`);
      console.log(`  - Appraisals: ${appraisalsCount[0]?.count || 0}`);
      console.log();
    }

    // Find a user with the most complete revalidation data
    console.log('\n' + '='.repeat(80));
    console.log('Finding user with most complete revalidation data...\n');

    const [bestUser] = await pool.execute(
      `SELECT u.id, u.email, u.name, u.registration, u.due_date, u.reg_type,
       (SELECT COUNT(*) FROM work_hours WHERE user_id = u.id) as work_hours_count,
       (SELECT COUNT(*) FROM cpd_hours WHERE user_id = u.id) as cpd_count,
       (SELECT COUNT(*) FROM feedback_log WHERE user_id = u.id) as feedback_count,
       (SELECT COUNT(*) FROM reflective_accounts WHERE user_id = u.id) as reflections_count,
       (SELECT COUNT(*) FROM appraisal_records WHERE user_id = u.id) as appraisals_count
       FROM users u
       WHERE u.due_date IS NOT NULL 
       AND u.due_date != '' 
       AND u.due_date != '0000-00-00'
       ORDER BY 
         (work_hours_count + cpd_count + feedback_count + reflections_count + appraisals_count) DESC
       LIMIT 1`
    ) as any[];

    if (bestUser && bestUser.length > 0) {
      const user = bestUser[0];
      const mapped = mapUserRow(user);
      
      console.log('User with most complete revalidation data:');
      console.log(`  ID: ${mapped.id}`);
      console.log(`  Name: ${user.name || 'N/A'}`);
      console.log(`  Email: ${mapped.email}`);
      console.log(`  Revalidation Date: ${mapped.revalidation_date}`);
      console.log(`  Total Activities:`);
      console.log(`    - Work Hours: ${user.work_hours_count || 0}`);
      console.log(`    - CPD Hours: ${user.cpd_count || 0}`);
      console.log(`    - Feedback: ${user.feedback_count || 0}`);
      console.log(`    - Reflections: ${user.reflections_count || 0}`);
      console.log(`    - Appraisals: ${user.appraisals_count || 0}`);
      console.log(`  Total: ${(user.work_hours_count || 0) + (user.cpd_count || 0) + (user.feedback_count || 0) + (user.reflections_count || 0) + (user.appraisals_count || 0)} activities`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

findUsersWithRevalidation();
