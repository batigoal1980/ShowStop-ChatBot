const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://admin:gHzAsyen7HFpmc6b@34.74.141.9:58832/dev_ad_insights',
  ssl: { rejectUnauthorized: false }
});

async function testLogging() {
  try {
    console.log('🔌 Connecting to database...');
    
    // Test 1: Check if table exists
    console.log('📋 Checking if t_usage_logs table exists...');
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 't_usage_logs'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ t_usage_logs table exists');
    } else {
      console.log('❌ t_usage_logs table does not exist');
      return;
    }
    
    // Test 2: Check current log count
    console.log('📊 Checking current log count...');
    const countResult = await pool.query('SELECT COUNT(*) as count FROM t_usage_logs');
    console.log(`📈 Current logs: ${countResult.rows[0].count}`);
    
    // Test 3: Insert a test log
    console.log('📝 Inserting test log...');
    const testLogData = {
      sessionId: 'test123',
      queryId: 'qtest123',
      translationId: 'ttest123',
      schemaId: 'stest123',
      userMessage: 'Test message for logging',
      userAgent: 'Test Agent',
      ipAddress: '127.0.0.1',
      sqlQuery: 'SELECT * FROM test',
      cleanedSqlQuery: 'SELECT * FROM test',
      queryType: 'test',
      totalExecutionTime: 1000,
      queryExecutionTime: 500,
      translationTime: 300,
      schemaFetchTime: 200,
      success: true,
      rowCount: 5,
      errorMessage: null,
      errorCode: null,
      errorDetails: null,
      assetsFound: 2,
      systemPromptLength: 1000,
      schemaTablesCount: 26,
      metadata: { test: true }
    };
    
    const insertQuery = `
      INSERT INTO t_usage_logs (
        session_id, query_id, translation_id, schema_id,
        user_message, user_agent, ip_address,
        sql_query, cleaned_sql_query, query_type,
        total_execution_time_ms, query_execution_time_ms, translation_time_ms, schema_fetch_time_ms,
        success, row_count, error_message, error_code, error_details,
        assets_found, system_prompt_length, schema_tables_count, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    `;
    
    const values = [
      testLogData.sessionId,
      testLogData.queryId,
      testLogData.translationId,
      testLogData.schemaId,
      testLogData.userMessage,
      testLogData.userAgent,
      testLogData.ipAddress,
      testLogData.sqlQuery,
      testLogData.cleanedSqlQuery,
      testLogData.queryType,
      testLogData.totalExecutionTime,
      testLogData.queryExecutionTime,
      testLogData.translationTime,
      testLogData.schemaFetchTime,
      testLogData.success,
      testLogData.rowCount,
      testLogData.errorMessage,
      testLogData.errorCode,
      testLogData.errorDetails ? JSON.stringify(testLogData.errorDetails) : null,
      testLogData.assetsFound,
      testLogData.systemPromptLength,
      testLogData.schemaTablesCount,
      JSON.stringify(testLogData.metadata || {})
    ];
    
    await pool.query(insertQuery, values);
    console.log('✅ Test log inserted successfully');
    
    // Test 4: Check new log count
    const newCountResult = await pool.query('SELECT COUNT(*) as count FROM t_usage_logs');
    console.log(`📈 New log count: ${newCountResult.rows[0].count}`);
    
    // Test 5: Get the test log
    const testLog = await pool.query(`
      SELECT session_id, user_message, success, row_count, query_type
      FROM t_usage_logs 
      WHERE session_id = 'test123'
    `);
    
    if (testLog.rows.length > 0) {
      console.log('✅ Test log retrieved successfully:', testLog.rows[0]);
    } else {
      console.log('❌ Test log not found');
    }
    
    // Test 6: Test the analytics views
    console.log('📊 Testing analytics views...');
    
    const usageAnalytics = await pool.query('SELECT * FROM v_usage_analytics LIMIT 1');
    console.log(`✅ v_usage_analytics view: ${usageAnalytics.rows.length} rows`);
    
    const errorAnalysis = await pool.query('SELECT * FROM v_error_analysis LIMIT 1');
    console.log(`✅ v_error_analysis view: ${errorAnalysis.rows.length} rows`);
    
    const queryTypePerformance = await pool.query('SELECT * FROM v_query_type_performance LIMIT 1');
    console.log(`✅ v_query_type_performance view: ${queryTypePerformance.rows.length} rows`);
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Error details:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testLogging(); 