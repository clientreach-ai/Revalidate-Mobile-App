import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function inspectUserRegistrations() {
    const email = 'test22@ex.com';
    try {
        console.log(`--- Inspecting Registrations for ${email} ---`);

        const user = await prisma.$queryRaw<any[]>`
      SELECT id, email, registration, reg_type, description, designation_id 
      FROM users 
      WHERE email = ${email}
    `;

        if (user.length === 0) {
            console.log('User not found.');
            return;
        }

        console.log('Raw User Data:');
        console.log(user[0]);

        if (user[0].registration) {
            const regId = user[0].registration;
            const portfolio = await prisma.$queryRaw<any[]>`
        SELECT id, name FROM portfolios WHERE id = ${regId}
      `;
            console.log('\nResolved Portfolio Name:');
            console.log(portfolio[0] || 'No matching portfolio found');
        } else {
            console.log('\nRegistration field is NULL or empty.');
        }

    } catch (error) {
        console.error('Error inspecting user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

inspectUserRegistrations();
