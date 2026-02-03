import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function checkPortfolios() {
    try {
        const res = await prisma.$queryRaw<any[]>`SELECT id, name FROM portfolios WHERE id IN (11, 15)`;
        console.log(res);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPortfolios();
