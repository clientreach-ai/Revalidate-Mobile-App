import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function findRoleMapping() {
    try {
        console.log('--- Analyzing Role to Designation Mapping ---');

        // Get users who have description JSON
        const users = await prisma.$queryRaw<any[]>`
      SELECT id, description, designation_id 
      FROM users 
      WHERE description IS NOT NULL 
        AND description LIKE '%professionalRole%'
    `;

        const mapping: Record<string, Record<number, number>> = {};

        for (const user of users) {
            try {
                const desc = typeof user.description === 'string' ? JSON.parse(user.description) : user.description;
                const role = desc.professionalRole;
                if (role) {
                    const dId = Number(user.designation_id);
                    if (!mapping[role]) mapping[role] = {};
                    mapping[role][dId] = (mapping[role][dId] || 0) + 1;
                }
            } catch (e) {
                // Skip invalid JSON
            }
        }

        console.log('Results (Role -> { DesignationID: Count }):');
        console.log(JSON.stringify(mapping, null, 2));

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

findRoleMapping();
