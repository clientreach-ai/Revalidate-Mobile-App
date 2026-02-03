import { prisma } from '../lib/prisma';
import { registerUser } from '../modules/users/user.service';
import bcrypt from 'bcrypt';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function createTestUser33() {
    const email = 'test33@e.com';
    const password = '12345678';

    try {
        console.log(`--- Creating Blank Verified User ${email} ---`);

        // 1. Cleanup: Delete if exists
        await prisma.$executeRaw`DELETE FROM users WHERE email = ${email}`;

        // 2. Register User (will get designation_id: 2 automatically now)
        const hash = await bcrypt.hash(password, 10);
        const registered = await registerUser(email, hash);
        console.log('   Registered ID:', registered.id);

        // 3. Verify User (setting status = 1)
        await prisma.$executeRaw`UPDATE users SET status = '1' WHERE id = ${BigInt(registered.id)}`;
        console.log('   User verified (status = 1)');

        console.log('\n✅ User created successfully!');
        console.log('   Email:', email);
        console.log('   Password:', password);
        console.log('   You can now login on mobile and proceed with onboarding.');

    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestUser33();
