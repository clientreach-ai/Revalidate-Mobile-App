import { prisma } from '../lib/prisma';

const emails = process.argv
  .slice(2)
  .map((e) => e.trim())
  .filter(Boolean);

async function main() {
  if (emails.length === 0) {
    console.error(
      'Usage: pnpm -C apps/api run delete:users-by-email -- <email1> <email2> ...'
    );
    process.exitCode = 1;
    return;
  }

  const users = await prisma.users.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, name: true },
  });

  if (users.length === 0) {
    console.log('No matching users found.');
    return;
  }

  console.log('Deleting users:');
  for (const user of users) {
    console.log(`- ${user.email} (id=${user.id.toString()}, name=${user.name ?? ''})`);
  }

  const result = await prisma.users.deleteMany({
    where: { email: { in: emails } },
  });

  console.log(`Deleted ${result.count} user(s).`);
}

main()
  .catch((e) => {
    console.error('Failed to delete users:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
