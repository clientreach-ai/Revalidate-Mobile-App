import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

async function createUser(email: string, passwordHash: string, name: string) {
    try {
        const sql = `
            INSERT INTO users (
                email, 
                password, 
                name, 
                reg_type, 
                status, 
                user_type, 
                registration,
                created_at, 
                updated_at
            ) VALUES (?, ?, ?, 'email', 'one', 'Customer', 4, NOW(), NOW())
        `;

        await prisma.$executeRawUnsafe(sql, email, passwordHash, name);
        console.log(`Successfully created user: ${email}`);
    } catch (error: any) {
        console.error(`Error creating user ${email}:`, error.message);
    }
}

async function main() {
    const password = '12345678';
    const passwordHash = await bcrypt.hash(password, 10);

    const usersToCreate = [
        { email: 'testuser11@gmail.com', name: 'Test User 11' },
        { email: 'testuser12@gmail.com', name: 'Test User 12' }
    ];

    for (const user of usersToCreate) {
        await createUser(user.email, passwordHash, user.name);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
