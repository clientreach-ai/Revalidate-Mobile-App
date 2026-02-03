import { prisma } from '../lib/prisma';

// Json serialization for BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function updateRole() {
    const email = 'dawit.worku@astu.edu.et';

    try {
        // Use raw query to fetch user to bypass any enum validation issues
        const users = await prisma.$queryRaw<any[]>`
      SELECT id, description, reg_type FROM users WHERE email = ${email} LIMIT 1
    `;

        if (!users || users.length === 0) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        const user = users[0];

        // Prepare description JSON
        let descriptionData: any = {};
        if (user.description) {
            try {
                descriptionData = typeof user.description === 'string'
                    ? JSON.parse(user.description)
                    : user.description;
            } catch (e) {
                descriptionData = {};
            }
        }

        // Set professionalRole explicitly
        descriptionData.professionalRole = 'Nurse';

        // Update user using raw SQL
        // We update reg_type to 'nurse' AND description with 'professionalRole': 'Nurse'
        // We match the whitespace of JSON_OBJECT which puts a space after colon: {"professionalRole": "Nurse"}
        // This is to ensure the Admin UI (if it uses naive parsing) sees it correctly.
        await prisma.$executeRaw`
      UPDATE users 
      SET reg_type = 'nurse', 
          description = '{"professionalRole": "Nurse"}',
          updated_at = NOW()
      WHERE id = ${BigInt(user.id)}
    `;

        console.log(`Successfully updated role for ${email}:`);
        console.log(`- reg_type: 'nurse'`);
        console.log(`- description.professionalRole: 'Nurse'`);

        // Verify
        const updated = await prisma.$queryRaw<any[]>`
      SELECT id, email, reg_type, description FROM users WHERE id = ${BigInt(user.id)}
    `;
        console.log('Updated user record:', updated[0]);

    } catch (error) {
        console.error('Error updating user role:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateRole();
