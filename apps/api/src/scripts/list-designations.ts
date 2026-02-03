import { prisma } from '../lib/prisma';

async function listDesignations() {
    try {
        const list = await prisma.$queryRaw<any[]>`SELECT * FROM designations`;
        console.log('Designations:', list);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

listDesignations();
