
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAppraisals(email: string) {
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

        const appraisals = await prisma.appraisal_records.findMany({
            where: { user_id: Number(user.id) }
        });

        console.log(`Found ${appraisals.length} appraisal records`);
        appraisals.forEach(a => {
            console.log(`ID:${a.id}|DATE:${a.appraisal_date}|DOCS:${a.document_ids}`);
        });

    } catch (error) {
        console.error('Error checking appraisals:', error);
    } finally {
        await prisma.$disconnect();
    }
}

const email = process.argv[2] || 'dawit.dev.gg@gmail.com';
checkAppraisals(email);
