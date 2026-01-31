import { PrismaClient } from '@prisma/client';
import { getMySQLPool, connectMySQL } from '../config/database';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
    await connectMySQL();
    const pool = getMySQLPool();
    const testEmail = 'test-verification-user@example.com';

    console.log('--- Starting Verification Script ---');

    try {
        // 1. Clean up potential leftover data
        console.log('Cleaning up previous test data...');
        await pool.execute('DELETE FROM users WHERE email = ?', [testEmail]);

        // 2. Insert test user with invalid status '' using raw SQL
        console.log('Inserting test user with invalid status ""...');
        await pool.execute(
            `INSERT INTO users (name, email, password, status, created_at, updated_at, reg_type, block_user, update_status) 
       VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)`,
            ['Test User', testEmail, 'hashedpassword', '', 'email', '1', '1']
        );

        // 3. Simulate requestPasswordReset logic
        console.log('Simulating requestPasswordReset logic...');

        let user;
        let fallbackTriggered = false;

        // First attempt: Prisma findFirst (Should fail but be caught)
        try {
            console.log('Attempting Prisma findFirst...');
            user = await prisma.users.findFirst({
                where: { email: testEmail },
                select: { id: true, email: true, status: true },
            });
            console.log('Prisma findFirst succeeded (Unexpected if status is invalid).');
        } catch (dbError: any) {
            console.log('Prisma findFirst failed explicitly (Caught).');
            console.log('Error message:', dbError.message);
            fallbackTriggered = true;
            user = null; // Prepare for fallback
        }

        // Fallback logic check
        if (!user) {
            console.log('User not found via Prisma (or error caught). Attempting fallback raw SQL...');
            try {
                const emailLower = testEmail.toLowerCase();
                const result = await prisma.$queryRaw<Array<{ id: bigint; email: string; status: string }>>`
          SELECT id, email, status 
          FROM users 
          WHERE LOWER(TRIM(email)) = LOWER(TRIM(${emailLower}))
          LIMIT 1
        `;

                if (result && result.length > 0) {
                    console.log('Fallback raw SQL succeeded!');
                    user = {
                        id: result[0].id,
                        email: result[0].email,
                        status: result[0].status as any,
                    };
                } else {
                    console.log('Fallback raw SQL returned no results.');
                }
            } catch (dbError: any) {
                console.error('Fallback raw SQL failed:', dbError);
            }
        }

        // Final verification
        if (user && user.email === testEmail) {
            console.log('--- VERIFICATION SUCCESSFUL ---');
            console.log(`Fallback triggered: ${fallbackTriggered}`);
            console.log('User retrieved successfully despite invalid enum value.');
        } else {
            console.error('--- VERIFICATION FAILED ---');
            console.error('User could not be retrieved.');
        }

    } catch (error) {
        console.error('Script failed with unexpected error:', error);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        try {
            await pool.execute('DELETE FROM users WHERE email = ?', [testEmail]);
        } catch (e) {
            console.error('Cleanup failed:', e);
        }
        await prisma.$disconnect();
        // process.exit(0); // Let node exit naturally
    }
}

main();
