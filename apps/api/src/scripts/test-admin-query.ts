import { prisma } from '../lib/prisma';
import { mapUserRow } from '../config/database-mapping';

async function testAdminQuery() {
    const email = 'dawit.worku@astu.edu.et';

    try {
        const result = await prisma.$queryRaw<any[]>`
      SELECT u.id, u.email, u.reg_type, u.description, u.registration,
      
      COALESCE(
        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(u.description, '$.professionalRole')), ''),
        CASE
            WHEN u.registration IN (3,4,5,6,7,8,9) THEN 'Nurse'
            WHEN u.registration IN (10,12) THEN 'Doctor'
            WHEN u.registration IN (13,14) THEN 'Pharmacist'
            ELSE NULL
        END,
        NULLIF(u.reg_type, ''),
        CASE
            WHEN u.registration IN (3,4,5,6,7,8,9) THEN 'Nurse'
            WHEN u.registration IN (10,12) THEN 'Doctor'
            WHEN u.registration IN (13,14) THEN 'Pharmacist'
            ELSE NULL
        END
        ) AS professional_role
        
      FROM users u
      WHERE u.email = ${email}
    `;

        console.log('Raw result for Dawit:', result[0]);
        console.log('Mapped result for Dawit:', mapUserRow(result[0]));

        // Also run for Test User 11 for comparison
        const result2 = await prisma.$queryRaw<any[]>`
      SELECT u.id, u.email, u.reg_type, u.description, u.registration,
      
      COALESCE(
        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(u.description, '$.professionalRole')), ''),
        CASE
            WHEN u.registration IN (3,4,5,6,7,8,9) THEN 'Nurse'
            WHEN u.registration IN (10,12) THEN 'Doctor'
            WHEN u.registration IN (13,14) THEN 'Pharmacist'
            ELSE NULL
        END,
        NULLIF(u.reg_type, ''),
        CASE
            WHEN u.registration IN (3,4,5,6,7,8,9) THEN 'Nurse'
            WHEN u.registration IN (10,12) THEN 'Doctor'
            WHEN u.registration IN (13,14) THEN 'Pharmacist'
            ELSE NULL
        END
        ) AS professional_role
        
      FROM users u
      WHERE u.email = 'testuser11@example.com'
    `;
        console.log('Mapped result for Test User 11:', mapUserRow(result2[0]));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testAdminQuery();
