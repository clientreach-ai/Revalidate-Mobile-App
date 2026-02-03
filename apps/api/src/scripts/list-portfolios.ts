import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function listPortfolios() {
    try {
        const portfolios = await prisma.$queryRaw<any[]>`SELECT id, name FROM portfolios`;
        console.table(portfolios);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

listPortfolios();
