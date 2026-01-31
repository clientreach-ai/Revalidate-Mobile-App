import { connectMySQL, getMySQLPool } from './apps/api/src/config/database.ts';

async function checkNotifications() {
    try {
        await connectMySQL();
        const pool = getMySQLPool();
        const [rows]: any = await pool.execute(
            'SELECT id, user_id, title, message, type, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 5',
            ['416']
        );
        console.log('Recent Notifications for User 416:', JSON.stringify(rows, null, 2));

        const [allRows]: any = await pool.execute(
            'SELECT id, user_id, title, message, type, created_at FROM notifications ORDER BY id DESC LIMIT 5'
        );
        console.log('Overall Recent Notifications:', JSON.stringify(allRows, null, 2));
    } catch (err) {
        console.error('Error checking notifications:', err);
    }
}

checkNotifications();
