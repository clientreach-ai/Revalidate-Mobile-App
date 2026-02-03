import { prisma } from '../lib/prisma';

async function resetTest33() {
    const email = 'test33@e.com';
    try {
        const user = await prisma.users.findFirst({ where: { email } });
        if (!user) return;

        await prisma.$executeRaw`
      UPDATE users 
      SET designation_id = 0,
          reg_type = 'email',
          description = NULL,
          updated_at = NOW()
      WHERE id = ${BigInt(user.id)}
    `;
        console.log(`Reset ${email} to blank slate (designation 0)`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

resetTest33();
