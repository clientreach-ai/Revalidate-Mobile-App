import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function updateDesignation() {
    const email = 'dawit.worku@astu.edu.et';

    try {
        const users = await prisma.$queryRaw<any[]>`SELECT id FROM users WHERE email = ${email}`;
        if (!users || users.length === 0) return;
        const user = users[0];

        // Update designation_id to 2 (Sub Admin like Test User 11)
        await prisma.$executeRaw`
      UPDATE users 
      SET designation_id = 2,
          updated_at = NOW()
      WHERE id = ${BigInt(user.id)}
    `;

        console.log(`Updated designation_id to 2 for ${email}`);

    } catch (error) {
        console.error('Error updating designation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateDesignation();
