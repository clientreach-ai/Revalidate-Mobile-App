import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function analyzeDesignations() {
    try {
        console.log('--- Analyzing User Roles and Designations ---');

        // 1. Get breakdown of designation_id vs reg_type
        const breakdown = await prisma.$queryRaw<any[]>`
      SELECT 
        designation_id, 
        reg_type,
        COUNT(*) as count
      FROM users 
      WHERE status = '1' -- Only look at verified users
      GROUP BY designation_id, reg_type
      ORDER BY designation_id, count DESC
    `;

        console.log('\nBreakdown (designation_id + reg_type):');
        console.table(breakdown);

        // 2. Sample 3 users for each designation_id to see their descriptions
        const designations = [...new Set(breakdown.map((b: any) => b.designation_id))];

        for (const dId of designations) {
            console.log(`\n\n--- Samples for Designation ID: ${dId} ---`);

            const samples = await prisma.$queryRaw<any[]>`
        SELECT id, email, reg_type, description, registration 
        FROM users 
        WHERE designation_id = ${dId} AND status = '1'
        LIMIT 3
      `;

            console.log(samples);
        }

    } catch (error) {
        console.error('Error analyzing designations:', error);
    } finally {
        await prisma.$disconnect();
    }
}

analyzeDesignations();
