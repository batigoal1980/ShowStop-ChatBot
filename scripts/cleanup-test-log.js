const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://admin:gHzAsyen7HFpmc6b@34.74.141.9:58832/dev_ad_insights',
  ssl: { rejectUnauthorized: false }
});

async function cleanupTestLog() {
  try {
    console.log('🔌 Connecting to database...');
    
    // Delete the test log
    console.log('🧹 Cleaning up test log...');
    const deleteResult = await pool.query(`
      DELETE FROM t_usage_logs 
      WHERE session_id = 'test123'
    `);
    
    console.log(`✅ Deleted ${deleteResult.rowCount} test log(s)`);
    
    // Check remaining logs
    const countResult = await pool.query('SELECT COUNT(*) as count FROM t_usage_logs');
    console.log(`📊 Remaining logs: ${countResult.rows[0].count}`);
    
    console.log('🎉 Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the cleanup
cleanupTestLog(); 