require('dotenv').config();
const ChatService = require('../server/services/chatService');

async function testChatService() {
  try {
    console.log('🔍 Testing ChatService step by step...');
    
    // Test 1: Database connection
    console.log('\n1️⃣ Testing database connection...');
    const schema = await ChatService.getDatabaseSchema();
    console.log(`✅ Schema fetched: ${schema.length} columns found`);
    
    // Test 2: Show some table names
    const tableNames = [...new Set(schema.map(col => col.table_name))];
    console.log('\n📊 Available tables:');
    tableNames.slice(0, 10).forEach(table => {
      console.log(`  - ${table}`);
    });
    
    // Test 3: Test SQL translation
    console.log('\n2️⃣ Testing SQL translation...');
    const userQuestion = "What is the total spend across all campaigns?";
    console.log(`Question: "${userQuestion}"`);
    
    const sqlQuery = await ChatService.translateToSQL(userQuestion);
    console.log(`✅ SQL Query generated:`);
    console.log('```sql');
    console.log(sqlQuery);
    console.log('```');
    
    // Test 4: Test query execution
    console.log('\n3️⃣ Testing query execution...');
    const result = await ChatService.executeQuery(sqlQuery);
    
    if (result.success) {
      console.log(`✅ Query executed successfully:`);
      console.log(`   Rows: ${result.rowCount}`);
      console.log(`   Columns: ${result.columns.join(', ')}`);
      if (result.data.length > 0) {
        console.log(`   Sample data:`, JSON.stringify(result.data[0], null, 2));
      }
    } else {
      console.log(`❌ Query failed: ${result.error}`);
      console.log(`   Query was: ${result.query}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testChatService(); 