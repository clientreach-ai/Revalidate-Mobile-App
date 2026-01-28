import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'dawit.dev.gg@gmail.com';
    console.log(`Checking premium status for ${email}...`);

    const user = await prisma.users.findFirst({
        where: { email },
    });

    if (!user) {
        console.error(`User with email ${email} not found.`);
        process.exit(1);
    }

    console.log('Current status:', {
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        premium_status: user.premium_status,
    });

    if (user.subscription_tier === 'premium' && user.subscription_status === 'active') {
        console.log('User is already premium.');
    } else {
        console.log('Updating user to PREMIUM...');
        await prisma.users.update({
            where: { id: user.id },
            data: {
                subscription_tier: 'premium',
                subscription_status: 'active',
                premium_status: 'premium'
            }
        });
        console.log('✅ User updated to PREMIUM.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
