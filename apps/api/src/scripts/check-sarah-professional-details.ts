import { connectMySQL, getMySQLPool } from '../config/database';
import { mapUserRow } from '../config/database-mapping';

async function checkSarahProfessionalDetails() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    const email = 'sarahthompson20@aol.co.uk';

    console.log(`\n🔍 Checking professional details for ${email}...\n`);

    // Find user
    const [users] = await pool.execute(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    ) as any[];

    if (users.length === 0) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    const user = users[0];
    const mapped = mapUserRow(user);

    console.log('='.repeat(100));
    console.log('📋 PROFESSIONAL DETAILS FIELDS:\n');
    console.log('='.repeat(100));

    // Check all professional detail fields
    const fields = {
      'Registration Number': user.registration || mapped.registration_number,
      'Revalidation Date': user.due_date || mapped.revalidation_date,
      'Professional Role': user.reg_type || mapped.professional_role,
      'Work Setting': user.work_settings || mapped.work_setting,
      'Scope of Practice': user.scope_practice || mapped.scope_of_practice,
      'Hourly Rate': user.hourly_rate,
      'Work Hours Completed': user.hours_completed_already,
      'Training Hours Completed': user.training_hours_completed_already,
      'Earnings Current Year': user.earned,
      'Work Description': user.description,
      'Notepad': user.notepad,
      'Subscription Tier': user.subscription_tier || mapped.subscription_tier,
      'Subscription Status': user.subscription_status || mapped.subscription_status,
    };

    let hasData = false;
    let missingFields: string[] = [];

    for (const [fieldName, value] of Object.entries(fields)) {
      const hasValue = value !== null && value !== undefined && value !== '' && value !== '0';
      const status = hasValue ? '✅' : '❌';
      
      if (hasValue) {
        hasData = true;
        console.log(`${status} ${fieldName}: ${value}`);
      } else {
        missingFields.push(fieldName);
        console.log(`${status} ${fieldName}: NOT SET`);
      }
    }

    // Check for professional registrations (stored in description field as JSON)
    console.log('\n📝 Professional Registrations:');
    if (user.description) {
      try {
        const desc = typeof user.description === 'string' ? JSON.parse(user.description) : user.description;
        if (desc.professionalRegistrations && Array.isArray(desc.professionalRegistrations)) {
          console.log(`✅ Professional Registrations: ${desc.professionalRegistrations.join(', ')}`);
        } else {
          console.log('❌ Professional Registrations: NOT SET');
          missingFields.push('Professional Registrations');
        }
      } catch (e) {
        console.log('❌ Professional Registrations: NOT SET (invalid JSON)');
        missingFields.push('Professional Registrations');
      }
    } else {
      console.log('❌ Professional Registrations: NOT SET');
      missingFields.push('Professional Registrations');
    }

    // Check registration PIN
    console.log('\n📌 Registration PIN:');
    if (user.registration_pin) {
      console.log(`✅ Registration PIN: ${user.registration_pin}`);
    } else {
      console.log('❌ Registration PIN: NOT SET');
      missingFields.push('Registration PIN');
    }

    console.log('\n' + '='.repeat(100));
    console.log('\n📊 SUMMARY:\n');
    
    if (hasData) {
      console.log(`✅ User has some professional details`);
    } else {
      console.log(`❌ User has NO professional details`);
    }

    if (missingFields.length > 0) {
      console.log(`\n❌ Missing Fields (${missingFields.length}):`);
      missingFields.forEach(field => {
        console.log(`   - ${field}`);
      });
    } else {
      console.log(`\n✅ All professional detail fields are set!`);
    }

    // Show raw database values for debugging
    console.log('\n' + '='.repeat(100));
    console.log('\n🔧 RAW DATABASE VALUES:\n');
    console.log(`registration: ${user.registration}`);
    console.log(`due_date: ${user.due_date}`);
    console.log(`reg_type: ${user.reg_type}`);
    console.log(`work_settings: ${user.work_settings}`);
    console.log(`scope_practice: ${user.scope_practice}`);
    console.log(`hourly_rate: ${user.hourly_rate}`);
    console.log(`hours_completed_already: ${user.hours_completed_already}`);
    console.log(`training_hours_completed_already: ${user.training_hours_completed_already}`);
    console.log(`earned: ${user.earned}`);
    console.log(`description: ${user.description ? (typeof user.description === 'string' ? user.description.substring(0, 200) : JSON.stringify(user.description).substring(0, 200)) : 'NULL'}`);
    console.log(`notepad: ${user.notepad || 'NULL'}`);
    console.log(`subscription_tier: ${user.subscription_tier}`);
    console.log(`subscription_status: ${user.subscription_status}`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkSarahProfessionalDetails();
