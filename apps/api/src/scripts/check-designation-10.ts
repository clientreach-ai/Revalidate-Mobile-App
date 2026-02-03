import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function checkDesignation10() {
    try {
        const samples = await prisma.$queryRaw<any[]>`
      SELECT id, email, reg_type, description, registration 
      FROM users 
      WHERE designation_id = 10
      LIMIT 10
    `;
        console.log('--- Designation 10 Samples ---');
        console.log(samples);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDesignation10();
