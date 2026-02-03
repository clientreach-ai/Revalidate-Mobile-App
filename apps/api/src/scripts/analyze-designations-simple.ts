import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function analyzeDesignations() {
    try {
        const breakdown = await prisma.$queryRaw<any[]>`
      SELECT 
        designation_id, 
        reg_type,
        COUNT(*) as count
      FROM users 
      WHERE status = '1'
      GROUP BY designation_id, reg_type
      ORDER BY designation_id, count DESC
    `;
        console.table(breakdown);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

analyzeDesignations();
