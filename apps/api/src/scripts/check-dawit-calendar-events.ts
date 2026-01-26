import { connectMySQL, getMySQLPool } from '../config/database';

async function checkDawitCalendarEvents() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    const email = 'dawit.dev.gg@gmail.com';

    console.log(`\n🔍 Checking calendar events for ${email}...\n`);

    // Find user
    const [users] = await pool.execute(
      `SELECT id FROM users WHERE email = ?`,
      [email]
    ) as any[];

    if (users.length === 0) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    const userId = users[0].id;

    // Get all calendar events
    const [events] = await pool.execute(
      `SELECT id, type, title, date, start_time, end_time, venue, status 
       FROM user_calendars 
       WHERE user_id = ? 
       ORDER BY date ASC`,
      [userId]
    ) as any[];

    console.log(`Found ${events.length} calendar events:\n`);
    console.log('='.repeat(100));

    if (events.length === 0) {
      console.log('No calendar events found');
    } else {
      events.forEach((event: any, index: number) => {
        console.log(`${index + 1}. ${event.title}`);
        console.log(`   Type: ${event.type}`);
        console.log(`   Date: ${event.date}`);
        console.log(`   Time: ${event.start_time || 'N/A'} - ${event.end_time || 'N/A'}`);
        console.log(`   Location: ${event.venue || 'N/A'}`);
        console.log(`   Status: ${event.status}`);
        console.log('');
      });

      // Show date range
      const dates = events.map((e: any) => new Date(e.date));
      const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
      
      console.log('='.repeat(100));
      console.log(`\n📅 Date Range:`);
      console.log(`   Earliest: ${minDate.toISOString().split('T')[0]}`);
      console.log(`   Latest: ${maxDate.toISOString().split('T')[0]}`);
      
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      const eventsThisMonth = events.filter((e: any) => {
        const eventDate = new Date(e.date);
        return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
      });
      
      console.log(`\n📊 Current Month (${today.toLocaleString('en-US', { month: 'long', year: 'numeric' })}):`);
      console.log(`   Events this month: ${eventsThisMonth.length}`);
      
      if (eventsThisMonth.length === 0 && events.length > 0) {
        console.log(`\n⚠️  WARNING: No events in current month!`);
        console.log(`   The calendar might be filtering by current month, so events won't show.`);
        console.log(`   Events are in: ${minDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })} - ${maxDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`);
      }
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkDawitCalendarEvents();
