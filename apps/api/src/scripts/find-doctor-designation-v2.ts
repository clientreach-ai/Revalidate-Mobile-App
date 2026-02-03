import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function findDoctorDesignation() {
    try {
        const doctors = await prisma.$queryRaw<any[]>`
      SELECT u.designation_id, p.name as portfolio_name, COUNT(*) as count 
      FROM users u
      JOIN portfolios p ON CAST(u.registration AS CHAR) = CAST(p.id AS CHAR)
      WHERE p.name LIKE '%Doctor%'
      GROUP BY u.designation_id, p.name
    `;
        console.table(doctors);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

findDoctorDesignation();
