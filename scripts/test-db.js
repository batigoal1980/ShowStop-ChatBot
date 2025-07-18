const { Pool } = require('pg');

// Test connection to postgres database first
const testPool = new Pool({
  connectionString: 'postgresql://admin:gHzAsyen7HFpmc6b@34.74.141.9:58832/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const result = await testPool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL server:', result.rows[0].now);
    
    // List all databases
    const databases = await testPool.query(`
      SELECT datname FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname;
    `);
    
    console.log('\n📋 Available databases:');
    databases.rows.forEach(db => {
      console.log(`  - ${db.datname}`);
    });
    
    // Try to connect to prod_ad_insights specifically
console.log('\n🔍 Testing prod_ad_insights database...');
    const devPool = new Pool({
              connectionString: 'postgresql://admin:gHzAsyen7HFpmc6b@34.74.141.9:58832/prod_ad_insights',
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    try {
      const devResult = await devPool.query('SELECT NOW()');
              console.log('✅ prod_ad_insights database exists and is accessible');
      
      // Check what tables exist
      const tables = await devPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      
              console.log('\n📊 Tables in prod_ad_insights:');
      if (tables.rows.length > 0) {
        tables.rows.forEach(table => {
          console.log(`  - ${table.table_name}`);
        });
      } else {
        console.log('  No tables found');
      }
      
      await devPool.end();
    } catch (devError) {
              console.log('❌ prod_ad_insights database does not exist or is not accessible');
      console.log('   Error:', devError.message);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await testPool.end();
  }
}

testConnection(); 