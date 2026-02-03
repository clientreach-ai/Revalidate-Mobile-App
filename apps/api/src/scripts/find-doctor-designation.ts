import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function findDoctorDesignation() {
    try {
        const doctors = await prisma.$queryRaw<any[]>`
      SELECT designation_id, COUNT(*) as count 
      FROM users 
      WHERE reg_type = 'doctor' OR description LIKE '%Doctor%'
      GROUP BY designation_id
    `;
        console.log('--- Doctor Designations ---');
        console.table(doctors);

        // Sample one
        const sample = await prisma.$queryRaw<any[]>`
      SELECT id, email, reg_type, description, designation_id 
      FROM users 
      WHERE reg_type = 'doctor' LIMIT 1
    `;
        console.log(sample[0]);

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

findDoctorDesignation();
