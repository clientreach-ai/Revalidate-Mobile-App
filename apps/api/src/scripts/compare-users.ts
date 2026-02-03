import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function compareUsers() {
    const email1 = 'dawit.worku@astu.edu.et';
    const email2 = 'testuser11@example.com';

    try {
        const user1 = await prisma.$queryRaw<any[]>`SELECT * FROM users WHERE email = ${email1}`;
        const user2 = await prisma.$queryRaw<any[]>`SELECT * FROM users WHERE email = ${email2}`;

        if (!user1.length) console.log(`User ${email1} not found`);
        if (!user2.length) console.log(`User ${email2} not found`);

        if (user1.length && user2.length) {
            const u1 = user1[0];
            const u2 = user2[0];

            console.log('--- Comparison ---');
            const keys = new Set([...Object.keys(u1), ...Object.keys(u2)]);

            // Sort keys for easier reading
            const sortedKeys = Array.from(keys).sort();

            sortedKeys.forEach(key => {
                const val1 = u1[key];
                const val2 = u2[key];

                // Simple equality check
                if (JSON.stringify(val1) !== JSON.stringify(val2)) {
                    console.log(`${key}:`);
                    console.log(`  Dawit: ${JSON.stringify(val1)}`);
                    console.log(`  Test11: ${JSON.stringify(val2)}`);
                }
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

compareUsers();
