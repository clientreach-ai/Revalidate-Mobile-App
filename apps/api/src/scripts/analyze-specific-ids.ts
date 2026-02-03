import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function analyzeSpecificIDs() {
    try {
        for (const dId of [11, 12]) {
            console.log(`\n--- Analyzing Users with Designation ID: ${dId} ---`);
            const users = await prisma.$queryRaw<any[]>`
        SELECT id, email, reg_type, description, registration 
        FROM users 
        WHERE designation_id = ${dId}
        LIMIT 10
      `;

            for (const user of users) {
                let role = 'N/A';
                try {
                    const desc = typeof user.description === 'string' ? JSON.parse(user.description) : user.description;
                    role = desc.professionalRole || 'N/A';
                } catch (e) { }
                console.log(`Email: ${user.email}, reg_type: ${user.reg_type}, Role in JSON: ${role}, Registration: ${user.registration}`);
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

analyzeSpecificIDs();
