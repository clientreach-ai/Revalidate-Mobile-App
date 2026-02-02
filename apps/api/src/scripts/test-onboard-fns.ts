import { updateOnboardingStep1, updateOnboardingStep3 } from '../modules/users/user.service';
import { prisma } from '../lib/prisma';

async function main() {
  try {
    const email = process.argv[2] || 'test23@gmail.com';
    const u = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1`, email);
    if (!u || u.length === 0) {
      console.error('User not found:', email);
      process.exit(1);
    }
    const userId = String(u[0].id);
    console.log('Testing onboarding functions for userId', userId);

    // Step 1: set role to 'nurse'
    await updateOnboardingStep1(userId, { professional_role: 'nurse' });
    console.log('updateOnboardingStep1 applied (nurse)');

    // Step 3: set professional registrations and due date
    await updateOnboardingStep3(userId, { professional_registrations: 'Registered Nurse', revalidation_date: '2027-01-01' });
    console.log('updateOnboardingStep3 applied (Registered Nurse, 2027-01-01)');

    // Inspect resulting row
    const row = await prisma.$queryRawUnsafe<any[]>(`SELECT id, email, reg_type, registration, due_date, description FROM users WHERE id = ? LIMIT 1`, BigInt(userId));
    console.log('Row after onboarding funcs:', row[0]);
  } catch (err: any) {
    console.error('Test failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
