import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function findCorrectMappings() {
    try {
        console.log('--- Searching for Doctor Designation IDs ---');
        // Doctor registrations are 10, 12
        const doctorSamples = await prisma.$queryRaw<any[]>`
      SELECT designation_id, registration, COUNT(*) as count 
      FROM users 
      WHERE registration IN ('10', '12')
      GROUP BY designation_id, registration
    `;
        console.table(doctorSamples);

        console.log('\n--- Searching for Other Healthcare Designation IDs ---');
        // Other Healthcare registration is 15
        const otherSamples = await prisma.$queryRaw<any[]>`
      SELECT designation_id, registration, COUNT(*) as count 
      FROM users 
      WHERE registration = '15'
      GROUP BY designation_id, registration
    `;
        console.table(otherSamples);

        // Also look for specific emails that user might have seen
        const testUsers = await prisma.$queryRaw<any[]>`
      SELECT email, registration, designation_id, reg_type, description
      FROM users
      WHERE email IN ('test22@ex.com', 'test33@e.com', 'test44@e.com')
    `;
        console.log('\n--- Test User Current States ---');
        console.log(testUsers);

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

findCorrectMappings();
