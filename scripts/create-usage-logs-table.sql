-- Create table for tracking user interactions and query performance
CREATE TABLE IF NOT EXISTS t_usage_logs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(10) NOT NULL,
    query_id VARCHAR(10),
    translation_id VARCHAR(10),
    schema_id VARCHAR(10),
    
    -- User interaction details
    user_message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    
    -- Query details
    sql_query TEXT,
    cleaned_sql_query TEXT,
    query_type VARCHAR(50), -- 'impressions', 'ctr', 'roas', 'general', etc.
    
    -- Performance metrics
    total_execution_time_ms INTEGER,
    query_execution_time_ms INTEGER,
    translation_time_ms INTEGER,
    schema_fetch_time_ms INTEGER,
    
    -- Results
    success BOOLEAN NOT NULL,
    row_count INTEGER,
    error_message TEXT,
    error_code VARCHAR(20),
    error_details JSONB,
    
    -- Asset extraction
    assets_found INTEGER DEFAULT 0,
    
    -- System info
    system_prompt_length INTEGER,
    schema_tables_count INTEGER,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON t_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_logs_success ON t_usage_logs(success);
CREATE INDEX IF NOT EXISTS idx_usage_logs_session_id ON t_usage_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_query_type ON t_usage_logs(query_type);
CREATE INDEX IF NOT EXISTS idx_usage_logs_error_code ON t_usage_logs(error_code);

-- Create a view for quick analytics
CREATE OR REPLACE VIEW v_usage_analytics AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour_bucket,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE success = true) as successful_requests,
    COUNT(*) FILTER (WHERE success = false) as failed_requests,
    ROUND(
        COUNT(*) FILTER (WHERE success = true)::float / COUNT(*) * 100, 2
    ) as success_rate,
    AVG(total_execution_time_ms) as avg_execution_time_ms,
    AVG(query_execution_time_ms) as avg_query_time_ms,
    AVG(translation_time_ms) as avg_translation_time_ms,
    AVG(row_count) as avg_row_count,
    AVG(assets_found) as avg_assets_found,
    COUNT(DISTINCT session_id) as unique_sessions
FROM t_usage_logs
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour_bucket DESC;

-- Create a view for error analysis
CREATE OR REPLACE VIEW v_error_analysis AS
SELECT 
    error_code,
    error_message,
    COUNT(*) as error_count,
    AVG(total_execution_time_ms) as avg_execution_time_before_error,
    MIN(timestamp) as first_occurrence,
    MAX(timestamp) as last_occurrence
FROM t_usage_logs
WHERE success = false
GROUP BY error_code, error_message
ORDER BY error_count DESC;

-- Create a view for query type performance
CREATE OR REPLACE VIEW v_query_type_performance AS
SELECT 
    query_type,
    COUNT(*) as total_queries,
    COUNT(*) FILTER (WHERE success = true) as successful_queries,
    ROUND(
        COUNT(*) FILTER (WHERE success = true)::float / COUNT(*) * 100, 2
    ) as success_rate,
    AVG(total_execution_time_ms) as avg_execution_time_ms,
    AVG(query_execution_time_ms) as avg_query_time_ms,
    AVG(row_count) as avg_row_count
FROM t_usage_logs
WHERE query_type IS NOT NULL
GROUP BY query_type
ORDER BY total_queries DESC; 