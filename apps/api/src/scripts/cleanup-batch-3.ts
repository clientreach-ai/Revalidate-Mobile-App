import { prisma } from '../lib/prisma';

async function removeBatch3() {
    const emails = [
        'dawitmasaye51@gmail.com',
        'lisaedmunds3@gmail.com',
        'dawitworkujm@gmail.com',
        'testuser11@gmail.com'
    ];

    try {
        console.log(`--- Removing ${emails.length} Test Users (Batch 3) ---`);

        for (const email of emails) {
            const result = await prisma.$executeRaw`DELETE FROM users WHERE email = ${email}`;
            if (result > 0) {
                console.log(`   ✅ Removed: ${email}`);
            } else {
                console.log(`   ℹ️ Not found: ${email}`);
            }
        }

        console.log('--- Batch 3 Cleanup Complete ---');
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

removeBatch3();
