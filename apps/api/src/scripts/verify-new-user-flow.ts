import { prisma } from '../lib/prisma';
import { registerUser, updateOnboardingStep1 } from '../modules/users/user.service';
import bcrypt from 'bcrypt';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function verifyNewUserFlow() {
    const email = 'test22@ex.com';
    const password = '12345678';

    try {
        console.log(`--- Starting Verification Flow for ${email} ---`);

        // 1. Cleanup: Delete if exists
        console.log('1. Cleaning up previous specific test user...');
        await prisma.$executeRaw`DELETE FROM users WHERE email = ${email}`;

        // 2. Register User
        console.log('2. Registering new user...');
        const hash = await bcrypt.hash(password, 10);
        const registered = await registerUser(email, hash);
        console.log('   Registered ID:', registered.id);

        // 3. Verify User (Simulate email verification)
        console.log('3. Verifying user...');
        await prisma.$executeRaw`UPDATE users SET status = '1' WHERE id = ${BigInt(registered.id)}`;

        // 4. Test all roles with REFINED mapping
        const rolesToTest: Array<{ role: 'nurse' | 'doctor' | 'pharmacist' | 'other_healthcare', expectedDId: number }> = [
            { role: 'nurse', expectedDId: 2 },
            { role: 'doctor', expectedDId: 1 },
            { role: 'pharmacist', expectedDId: 12 },
            { role: 'other_healthcare', expectedDId: 11 },
        ];

        for (const testCase of rolesToTest) {
            console.log(`\n--- Testing Role: ${testCase.role} ---`);
            await updateOnboardingStep1(String(registered.id), { professional_role: testCase.role });

            const finalUser = await prisma.$queryRaw<any[]>`
        SELECT id, email, reg_type, description, designation_id 
        FROM users 
        WHERE id = ${BigInt(registered.id)}
      `;

            console.log('   reg_type:', finalUser[0].reg_type);
            console.log('   designation_id:', finalUser[0].designation_id);
            console.log('   description:', finalUser[0].description);

            if (
                finalUser[0].reg_type === testCase.role &&
                finalUser[0].designation_id === testCase.expectedDId
            ) {
                console.log(`   ✅ SUCCESS: ${testCase.role} -> ${testCase.expectedDId}`);
            } else {
                console.log(`   ❌ FAILED: ${testCase.role} -> ${testCase.expectedDId} (Got ${finalUser[0].designation_id})`);
            }
        }

    } catch (error) {
        console.error('Error in verification flow:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyNewUserFlow();
