
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserDocuments(email: string) {
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

        const docs = await prisma.personal_documents.findMany({
            where: { user_id: Number(user.id) },
            select: { id: true, document_name: true, type: true, created_at: true }
        });

        console.log('DOC_LIST_START');
        docs.forEach(doc => {
            console.log(`ID:${doc.id}|NAME:${doc.document_name}|TYPE:${doc.type}`);
        });
        console.log('DOC_LIST_END');

    } catch (error) {
        console.error('Error checking documents:', error);
    } finally {
        await prisma.$disconnect();
    }
}

const email = process.argv[2] || 'dawit.dev.gg@gmail.com';
checkUserDocuments(email);
