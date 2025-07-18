const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://admin:gHzAsyen7HFpmc6b@34.74.141.9:58832/prod_ad_insights',
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  try {
    console.log('🔌 Connecting to PostgreSQL database...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to database!');
    
    // Get database info
    const dbInfo = await client.query('SELECT current_database(), current_user, version()');
    console.log('\n📊 Database Information:');
    console.log(`   Database: ${dbInfo.rows[0].current_database}`);
    console.log(`   User: ${dbInfo.rows[0].current_user}`);
    console.log(`   Version: ${dbInfo.rows[0].version.split(',')[0]}`);
    
    // Get available tables
    const tablesQuery = `
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const tables = await client.query(tablesQuery);
    console.log('\n📋 Available Tables:');
    if (tables.rows.length === 0) {
      console.log('   No tables found in the database.');
    } else {
      tables.rows.forEach(table => {
        console.log(`   - ${table.table_name} (${table.table_type})`);
      });
    }
    
    // Get table schemas for marketing data
    const marketingTables = ['campaigns', 'ads', 'performance_metrics', 'audience_insights'];
    console.log('\n🔍 Marketing Data Schema:');
    
    for (const tableName of marketingTables) {
      try {
        const schemaQuery = `
          SELECT 
            column_name,
            data_type,
            is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position;
        `;
        
        const schema = await client.query(schemaQuery, [tableName]);
        
        if (schema.rows.length > 0) {
          console.log(`\n   📈 ${tableName.toUpperCase()}:`);
          schema.rows.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            console.log(`     - ${col.column_name}: ${col.data_type} (${nullable})`);
          });
        } else {
          console.log(`\n   ⚠️  Table '${tableName}' not found`);
        }
      } catch (error) {
        console.log(`\n   ❌ Error checking table '${tableName}': ${error.message}`);
      }
    }
    
    // Sample data check
    console.log('\n📊 Sample Data Check:');
    for (const tableName of marketingTables) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
        const count = await client.query(countQuery);
        console.log(`   ${tableName}: ${count.rows[0].count} records`);
      } catch (error) {
        console.log(`   ${tableName}: Table not found or error - ${error.message}`);
      }
    }
    
    client.release();
    
    console.log('\n🎉 Database setup verification complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Make sure you have an OpenAI API key in your .env file');
    console.log('   2. Run "npm run dev" to start the application');
    console.log('   3. Access the app at http://localhost:3000');
    console.log('   4. Login with: admin@showstop.com / password123');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Check if the database server is running');
    console.log('   - Verify the connection string in server/index.js');
    console.log('   - Ensure network connectivity to 34.74.141.9:58832');
  } finally {
    await pool.end();
  }
}

// Run the setup
setupDatabase(); 