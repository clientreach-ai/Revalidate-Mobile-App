
import mysql from 'mysql2/promise';
import { MYSQL_CONFIG } from '../config/env';

async function fetchUserData(email: string) {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: MYSQL_CONFIG.host,
            port: MYSQL_CONFIG.port,
            user: MYSQL_CONFIG.user,
            password: MYSQL_CONFIG.password,
            database: MYSQL_CONFIG.database,
        });

        console.log(`✅ Connected to MySQL database`);

        const [users] = await connection.execute('SELECT id, email FROM users WHERE email = ?', [email]) as any[];

        if (users.length === 0) {
            console.log(`User with email ${email} not found`);
            return;
        }

        const user = users[0];
        console.log(`User found: ${user.email} (ID: ${user.id})`);

        const [appraisals] = await connection.execute(`
            SELECT * FROM appraisal_records WHERE user_id = ?
        `, [user.id]) as any[];

        console.log(`\nFound ${appraisals.length} appraisal records:`);
        appraisals.forEach(a => {
            console.log(`- ID: ${a.id}`);
            console.log(`  Date: ${a.appraisal_date}`);
            console.log(`  Notes: ${a.notes || 'None'}`);
            console.log(`  Document IDs: ${a.document_ids || 'None'}`);
            console.log('---');
        });

        const [hospitals] = await connection.execute('SELECT id, name FROM hospitals WHERE status = "1" LIMIT 10') as any[];

        console.log(`\nSample of available hospitals:`);
        hospitals.forEach(h => {
            console.log(`- [${h.id}] ${h.name}`);
        });

    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        if (connection) await connection.end();
    }
}

const email = process.argv[2] || 'dawit.dev.gg@gmail.com';
fetchUserData(email);
