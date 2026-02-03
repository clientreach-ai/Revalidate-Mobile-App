import { prisma } from '../lib/prisma';

async function removeTestUsers() {
    const emails = [
        'test101@e.com',
        'test99@regfix.com',
        'test22@ex.com',
        'test44@e.com',
        'test33@e.com'
    ];

    try {
        console.log(`--- Removing ${emails.length} Test Users ---`);

        for (const email of emails) {
            const result = await prisma.$executeRaw`DELETE FROM users WHERE email = ${email}`;
            if (result > 0) {
                console.log(`   ✅ Removed: ${email}`);
            } else {
                console.log(`   ℹ️ Not found: ${email}`);
            }
        }

        console.log('--- Cleanup Complete ---');
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

removeTestUsers();
