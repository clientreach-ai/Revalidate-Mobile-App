import { prisma } from '../lib/prisma';
import { registerUser, updateOnboardingStep1, updateOnboardingStep3 } from '../modules/users/user.service';
import bcrypt from 'bcrypt';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function verifyRegistrationFix() {
    const email = 'test99@regfix.com';
    const password = '12345678';

    try {
        console.log(`--- Starting Verification for Registration Fix ---`);

        // 1. Cleanup
        await prisma.$executeRaw`DELETE FROM users WHERE email = ${email}`;

        // 2. Register
        const hash = await bcrypt.hash(password, 10);
        const registered = await registerUser(email, hash);
        const userId = String(registered.id);

        // 3. Step 1: Set as Doctor
        console.log('1. Setting role to Doctor in Step 1...');
        await updateOnboardingStep1(userId, { professional_role: 'doctor' });

        // 4. Step 3: Set registrations using ID "10" (which is Doctor portfolio)
        console.log('2. Submitting Step 3 with Registration ID "10"...');
        await updateOnboardingStep3(userId, {
            professional_registrations: '10',
            gmc_registration_number: 'DOC123'
        });

        // 5. Check result
        const result1 = await prisma.$queryRaw<any[]>`SELECT registration, description FROM users WHERE id = ${BigInt(userId)}`;
        console.log('   Registration:', result1[0].registration);
        if (result1[0].registration === '10') {
            console.log('   ✅ SUCCESS: Registration ID 10 preserved.');
        } else {
            console.log('   ❌ FAILED: Registration ID 10 lost or mapped incorrectly. Got:', result1[0].registration);
        }

        // 6. Test Fallback: Submit Step 3 with EMPTY registrations
        console.log('\n3. Submitting Step 3 with EMPTY registrations (testing fallback)...');
        // Clear registration first
        await prisma.$executeRaw`UPDATE users SET registration = NULL WHERE id = ${BigInt(userId)}`;

        await updateOnboardingStep3(userId, {
            professional_registrations: '',
            gmc_registration_number: 'DOC123'
        });

        const result2 = await prisma.$queryRaw<any[]>`SELECT registration FROM users WHERE id = ${BigInt(userId)}`;
        console.log('   Registration Fallback:', result2[0].registration);
        if (result2[0].registration === '10') {
            console.log('   ✅ SUCCESS: Fallback to Doctor ID 10 worked.');
        } else {
            console.log('   ❌ FAILED: Fallback failed. Got:', result2[0].registration);
        }

        // 7. Test Other Healthcare Fallback
        console.log('\n4. Testing Other Healthcare fallback...');
        await updateOnboardingStep1(userId, { professional_role: 'other_healthcare' });
        await prisma.$executeRaw`UPDATE users SET registration = NULL WHERE id = ${BigInt(userId)}`;

        await updateOnboardingStep3(userId, {
            professional_registrations: '',
        });

        const result3 = await prisma.$queryRaw<any[]>`SELECT registration FROM users WHERE id = ${BigInt(userId)}`;
        console.log('   Registration Fallback:', result3[0].registration);
        if (result3[0].registration === '15') {
            console.log('   ✅ SUCCESS: Fallback to Other Healthcare ID 15 worked.');
        } else {
            console.log('   ❌ FAILED: Fallback failed. Got:', result3[0].registration);
        }

    } catch (error) {
        console.error('Error in verification:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyRegistrationFix();
