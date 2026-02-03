import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function sampleDesignation4() {
    try {
        const samples = await prisma.$queryRaw<any[]>`
      SELECT id, email, reg_type, description, registration 
      FROM users 
      WHERE designation_id = 4
      LIMIT 5
    `;
        console.log('--- Designation 4 Samples ---');
        console.log(samples);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

sampleDesignation4();
