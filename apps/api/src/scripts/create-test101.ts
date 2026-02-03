import { prisma } from '../lib/prisma';
import { registerUser } from '../modules/users/user.service';
import bcrypt from 'bcrypt';

async function createTest101() {
    const email = 'test101@e.com';
    const password = '12345678';

    try {
        console.log(`--- Creating Test User: ${email} ---`);

        // 1. Cleanup if exists (to ensure fresh state)
        await prisma.$executeRaw`DELETE FROM users WHERE email = ${email}`;

        // 2. Register
        const hash = await bcrypt.hash(password, 10);
        const registered = await registerUser(email, hash);
        console.log('   User registered with ID:', registered.id);

        // 3. Verify automatically
        await prisma.$executeRaw`UPDATE users SET status = '1' WHERE id = ${BigInt(registered.id)}`;
        console.log('   User status set to "1" (Verified)');

        // 4. Set unverified designation_id to 0 for a clean onboarding start
        await prisma.$executeRaw`UPDATE users SET designation_id = 0 WHERE id = ${BigInt(registered.id)}`;
        console.log('   User designation_id set to 0');

        console.log('✅ SUCCESS: test101@e.com created and ready to use.');
    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTest101();
