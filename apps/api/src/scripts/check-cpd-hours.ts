
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCpdHours(email: string) {
    try {
        const user = await prisma.users.findFirst({
            where: { email },
            select: { id: true }
        });

        if (!user) {
            console.log(`User with email ${email} not found`);
            return;
        }

        console.log(`User found with ID: ${user.id}`);

        const entries = await prisma.cpd_hours.findMany({
            where: { user_id: Number(user.id) }
        });

        console.log(`Found ${entries.length} CPD entries`);
        entries.forEach(e => {
            console.log(`ID:${e.id}|DATE:${e.date}|TOPIC:${e.topic}|PART:${e.participatory_hours}|DUR:${e.duration_minutes}`);
        });

    } catch (error) {
        console.error('Error checking CPD hours:', error);
    } finally {
        await prisma.$disconnect();
    }
}

const email = process.argv[2] || 'dawit.dev.gg@gmail.com';
checkCpdHours(email);
