import { prisma } from '../lib/prisma';

async function removeBatch2() {
    const emails = [
        'dawit.worku@astu.edu.et',
        'testuser11@example.com',
        'dawitthecreator@gmail.com',
        'dawitworkujima@gmail.com',
        'testuser12@gmail.com'
    ];

    try {
        console.log(`--- Removing ${emails.length} Test Users (Batch 2) ---`);

        for (const email of emails) {
            const result = await prisma.$executeRaw`DELETE FROM users WHERE email = ${email}`;
            if (result > 0) {
                console.log(`   ✅ Removed: ${email}`);
            } else {
                console.log(`   ℹ️ Not found: ${email}`);
            }
        }

        console.log('--- Batch 2 Cleanup Complete ---');
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

removeBatch2();
