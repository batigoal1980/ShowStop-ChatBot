const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

class ChatService {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.pool = new Pool({
      connectionString: 'postgresql://admin:gHzAsyen7HFpmc6b@34.74.141.9:58832/prod_ad_insights',
      ssl: { rejectUnauthorized: false }
    });
    
    // Separate pool for logging to dev database
    this.loggingPool = new Pool({
      connectionString: 'postgresql://admin:gHzAsyen7HFpmc6b@34.74.141.9:58832/dev_ad_insights',
      ssl: { rejectUnauthorized: false }
    });
    
    // Cache schema to avoid repeated queries
    this.schemaCache = null;
    this.schemaCacheTime = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  // Dynamically fetch complete database schema
  async getDatabaseSchema() {
    const schemaId = Math.random().toString(36).substring(2, 8);
    const startTime = Date.now();
    
    try {
      // Check if we have a valid cached schema
      if (this.schemaCache && this.schemaCacheTime && 
          (Date.now() - this.schemaCacheTime) < this.CACHE_DURATION) {
        console.log(`📋 [${schemaId}] Using cached schema (${Object.keys(this.schemaCache).length} tables)`);
        return this.schemaCache;
      }

      console.log(`🔍 [${schemaId}] Fetching fresh database schema...`);
      
      // Get all tables in the database
      console.log(`📋 [${schemaId}] Querying table list...`);
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      
      const tablesResult = await this.pool.query(tablesQuery);
      const tableNames = tablesResult.rows.map(row => row.table_name);
      console.log(`✅ [${schemaId}] Found ${tableNames.length} tables: ${tableNames.join(', ')}`);
      
      // Get detailed schema for all tables
      console.log(`📋 [${schemaId}] Fetching detailed column information...`);
      const schemaQuery = `
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          c.ordinal_position
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.table_schema = 'public'
        ORDER BY t.table_name, c.ordinal_position;
      `;
      
      const schemaResult = await this.pool.query(schemaQuery);
      console.log(`✅ [${schemaId}] Retrieved ${schemaResult.rows.length} column definitions`);
      
      // Group columns by table
      const schemaByTable = {};
      schemaResult.rows.forEach(row => {
        if (!schemaByTable[row.table_name]) {
          schemaByTable[row.table_name] = [];
        }
        schemaByTable[row.table_name].push({
          column: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default,
          maxLength: row.character_maximum_length,
          precision: row.numeric_precision,
          scale: row.numeric_scale
        });
      });
      
      // Cache the schema
      this.schemaCache = schemaByTable;
      this.schemaCacheTime = Date.now();
      
      const schemaTime = Date.now() - startTime;
      console.log(`✅ [${schemaId}] Schema cached for ${Object.keys(schemaByTable).length} tables in ${schemaTime}ms`);
      
      // Log table details
      Object.keys(schemaByTable).forEach(tableName => {
        const columnCount = schemaByTable[tableName].length;
        console.log(`📊 [${schemaId}] Table ${tableName}: ${columnCount} columns`);
      });
      
      return schemaByTable;
      
    } catch (error) {
      const schemaTime = Date.now() - startTime;
      console.error(`💥 [${schemaId}] Schema fetch FAILED after ${schemaTime}ms`);
      console.error(`🚨 [${schemaId}] Schema error: ${error.message}`);
      console.error(`📋 [${schemaId}] Error details:`, error);
      return {};
    }
  }

  // Generate a comprehensive system prompt based on actual schema
  generateSystemPrompt(schema) {
    // Focus on the most important tables for marketing analytics
    const importantTables = [
      't_ad_campaign',
      't_ad',
      't_ad_daily_performance', 
      't_ad_campaign_daily_performance',
      't_ad_account_daily_performance',
      't_ad_account',
      't_adset',
      't_ad_opportunity',
      't_ad_video_labelings',
      't_ad_image_labelings'
    ];

    let schemaText = 'DATABASE SCHEMA:\n\n';
    
    Object.keys(schema).forEach(tableName => {
      // Only include important tables to keep prompt manageable
      if (importantTables.includes(tableName)) {
        schemaText += `TABLE: ${tableName}\n`;
        
        // Get all columns for creative tables to show the actual feature columns
        const columns = schema[tableName];
        let maxColumns;
        
        if (tableName === 't_ad_image_labelings') {
          // Include all f_xxx columns for image features
          maxColumns = columns.length;
          schemaText += `  # Image creative features (f_xxx columns):\n`;
        } else if (tableName === 't_ad_video_labelings') {
          // Include all cf_xxx columns for video features  
          maxColumns = columns.length;
          schemaText += `  # Video creative features (cf_xxx columns):\n`;
        } else {
          // Limit other tables to avoid token limits
          maxColumns = 30;
        }
        
        columns.slice(0, maxColumns).forEach(col => {
          let colDef = `  - ${col.column} (${col.type}`;
          if (col.maxLength) colDef += `(${col.maxLength})`;
          if (col.precision && col.scale) colDef += `(${col.precision},${col.scale})`;
          if (!col.nullable) colDef += ' NOT NULL';
          colDef += ')';
          schemaText += colDef + '\n';
        });
        
        if (columns.length > maxColumns) {
          schemaText += `  ... and ${columns.length - maxColumns} more columns\n`;
        }
        schemaText += '\n';
      }
    });

    return `You are an expert SQL query generator for a marketing analytics database. Convert natural language questions into accurate PostgreSQL queries.

🚨 **CRITICAL ANTI-DOUBLE-COUNTING RULE** 🚨
NEVER use direct JOIN between t_ad_video_labelings/t_ad_image_labelings and t_ad_daily_performance. 
ALWAYS use subquery to aggregate t_ad_daily_performance by raw_ad_id first, then join with creative labelings tables.
This prevents double counting when multiple video clips belong to the same ad.

🚨 **CRITICAL AD FORMAT COMPARISON RULE** 🚨
For ad format comparison queries, ALWAYS use this pattern:
FROM (SELECT DISTINCT a.raw_ad_id, ...) subquery GROUP BY format
NEVER use direct GROUP BY on creative labelings tables - this causes double-counting!

${schemaText}

STEP-BY-STEP QUERY GENERATION PROCESS:

1. **MANDATORY: SCAN TABLE SCHEMAS FIRST** - Before writing ANY SQL, you MUST:
   - Look at the exact column names in each table above
   - Verify which columns exist and their exact spelling (case-sensitive)
   - Check data types and constraints
   - Identify primary keys and foreign keys for joins
   - Which table contains the required columns (e.g., f_ad_type is in t_ad_image_labelings, not t_ad)

2. **ANALYZE the user question** to identify:
   - What data is being requested (spend, performance, creative features, etc.)
   - What time period (this week, last week, this month, etc.)
   - What comparison or analysis is needed

3. **CHOOSE the correct table(s)** based on the schema scan and the data type:
   - Performance data (spend, impressions, clicks): t_ad_campaign_daily_performance
   - Campaign metadata: t_ad_campaign
   - Ad-level data: t_ad_daily_performance
   - Account-level data: t_ad_account_daily_performance
   - Image creative features: t_ad_image_labelings (f_xxx columns)
   - Video creative features: t_ad_video_labelings (cf_xxx columns)

4. **PLAN COLUMN SELECTION**: Based on the schema scan, identify:
   - Which columns to SELECT (verify they exist in schema)
   - Which columns to use in WHERE clauses (verify they exist in schema)
   - Which columns to use for JOINs (verify they exist in schema)
   - Which columns to use for GROUP BY, ORDER BY (verify they exist in schema)

5. **APPLY proper date filtering**:
   - Last week: WHERE date >= CURRENT_DATE - INTERVAL '7 days' AND date < CURRENT_DATE
   - This week: WHERE date >= DATE_TRUNC('week', CURRENT_DATE)
   - This month: WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
   - Last month: WHERE date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND date < DATE_TRUNC('month', CURRENT_DATE)

6. **USE appropriate aggregations**:
   - SUM() for spend, impressions, clicks, purchases
   - AVG() for averages
   - COUNT() for counts
   - COALESCE() to handle NULL values
   - ROUND(value::numeric, 2) for rounding (use ::numeric cast)

7. **VALIDATE QUERY**: Ensure the query:
   - Only uses columns that exist in the scanned schema (VERIFY EACH COLUMN)
   - Has proper syntax (no semicolons before LIMIT, ORDER BY, etc.)
   - Includes LIMIT 100 unless specified otherwise
   - Uses COALESCE() for NULL values when appropriate

CRITICAL TABLE USAGE RULES:
1. For performance data (spend, impressions, clicks, conversions): Query t_ad_campaign_daily_performance DIRECTLY
2. For campaign metadata (name, status, platform): Use t_ad_campaign table
3. For ad-level performance: Use t_ad_daily_performance directly
4. For account-level performance: Use t_ad_account_daily_performance directly
5. For ad format analysis: 
   - Image formats: Use t_ad_image_labelings.f_ad_type
   - Video formats: Use t_ad_video_labelings.video_ad_type
   - Combined: Use both tables with LEFT JOINs
6. For image creative features: JOIN t_ad (asset_id) with t_ad_image_labelings (raw_asset_id), then JOIN t_ad (raw_ad_id) with aggregated t_ad_daily_performance (raw_ad_id). Use f_xxx columns from t_ad_image_labelings. IMPORTANT: Aggregate performance data by raw_ad_id first to avoid double counting. Use DISTINCT ON (raw_ad_id) to ensure unique ads.
7. For video creative features: JOIN t_ad (asset_id) with t_ad_video_labelings (raw_asset_id), then JOIN t_ad (raw_ad_id) with aggregated t_ad_daily_performance (raw_ad_id). Use cf_xxx columns from t_ad_video_labelings. IMPORTANT: Aggregate performance data by raw_ad_id first to avoid double counting since multiple video clips can belong to the same ad. Use DISTINCT ON (raw_ad_id) to ensure unique ads.

QUERY PATTERNS:
- Performance queries: SELECT FROM t_ad_campaign_daily_performance WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
- Campaign info + performance: JOIN t_ad_campaign ON raw_campaign_id
- Image creative analysis: JOIN t_ad (asset_id) with t_ad_image_labelings (raw_asset_id), then JOIN t_ad (raw_ad_id) with aggregated t_ad_daily_performance (raw_ad_id) - aggregate by raw_ad_id first
- Video creative analysis: JOIN t_ad (asset_id) with t_ad_video_labelings (raw_asset_id), then JOIN t_ad (raw_ad_id) with aggregated t_ad_daily_performance (raw_ad_id) - aggregate by raw_ad_id first to avoid double counting
- Image ad format analysis: Use t_ad_image_labelings.f_ad_type
- Video ad format analysis: Use t_ad_video_labelings.video_ad_type
- Combined ad format analysis: Use LEFT JOINs with both tables and COALESCE
- DO NOT filter by campaign status unless explicitly requested
- Most campaigns are 'paused' - only filter by 'active' if specifically asked

JOIN RELATIONSHIPS:
- t_ad_campaign_daily_performance.raw_campaign_id = t_ad_campaign.raw_campaign_id
- t_ad.asset_id = t_ad_image_labelings.raw_asset_id (for image creative features)
- t_ad.asset_id = t_ad_video_labelings.raw_asset_id (for video creative features)
- t_ad.raw_ad_id = t_ad_daily_performance.raw_ad_id (for ad performance data) - IMPORTANT: Aggregate t_ad_daily_performance by raw_ad_id first to avoid double counting

**ESSENTIAL QUERY PATTERNS:**

**1. AD FORMAT COMPARISON (AGGREGATED BY FORMAT):**
SELECT 
    ad_format,
    media_type,
    COUNT(DISTINCT raw_ad_id) as number_of_ads,
    SUM(spend) as total_spend,
    SUM(impressions) as total_impressions,
    SUM(clicks) as total_clicks,
    SUM(purchases) as total_purchases,
    SUM(purchase_value) as total_revenue,
    ROUND((SUM(clicks)::float / NULLIF(SUM(impressions), 0) * 100)::numeric, 2) as ctr,
    ROUND((SUM(purchase_value)::float / NULLIF(SUM(spend), 0))::numeric, 2) as roas
FROM (
    SELECT DISTINCT
        a.raw_ad_id,
        COALESCE(il.f_ad_type, vl.video_ad_type) as ad_format,
        CASE 
            WHEN il.f_ad_type IS NOT NULL THEN 'Image'
            WHEN vl.video_ad_type IS NOT NULL THEN 'Video'
        END as media_type,
        ad_performance.spend,
        ad_performance.impressions,
        ad_performance.clicks,
        ad_performance.purchases,
        ad_performance.purchase_value
    FROM t_ad a
    LEFT JOIN t_ad_image_labelings il ON il.raw_asset_id = a.asset_id
    LEFT JOIN t_ad_video_labelings vl ON vl.raw_asset_id = a.asset_id
    JOIN (
        SELECT raw_ad_id, SUM(spend) as spend, SUM(impressions) as impressions, 
               SUM(clicks) as clicks, SUM(purchases) as purchases, SUM(purchase_value) as purchase_value
        FROM t_ad_daily_performance 
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY raw_ad_id
    ) ad_performance ON a.raw_ad_id = ad_performance.raw_ad_id
    WHERE (il.f_ad_type IS NOT NULL OR vl.video_ad_type IS NOT NULL)
) distinct_ads
GROUP BY ad_format, media_type
HAVING SUM(impressions) >= 1000
ORDER BY total_spend DESC
LIMIT 100

**2. VIDEO PERFORMANCE ACROSS DIFFERENT AD TYPES:**
SELECT 
    video_ad_type,
    COUNT(DISTINCT raw_ad_id) as number_of_ads,
    SUM(spend) as total_spend,
    SUM(impressions) as total_impressions,
    SUM(clicks) as total_clicks,
    SUM(purchases) as total_purchases,
    SUM(purchase_value) as total_revenue,
    ROUND((SUM(clicks)::float / NULLIF(SUM(impressions), 0) * 100)::numeric, 2) as ctr,
    ROUND((SUM(purchase_value)::float / NULLIF(SUM(spend), 0))::numeric, 2) as roas
FROM (
    SELECT DISTINCT
        a.raw_ad_id,
        vl.video_ad_type,
        ad_performance.spend,
        ad_performance.impressions,
        ad_performance.clicks,
        ad_performance.purchases,
        ad_performance.purchase_value
    FROM t_ad a
    JOIN t_ad_video_labelings vl ON vl.raw_asset_id = a.asset_id
    JOIN (
        SELECT raw_ad_id, SUM(spend) as spend, SUM(impressions) as impressions, 
               SUM(clicks) as clicks, SUM(purchases) as purchases, SUM(purchase_value) as purchase_value
        FROM t_ad_daily_performance 
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY raw_ad_id
    ) ad_performance ON a.raw_ad_id = ad_performance.raw_ad_id
    WHERE vl.video_ad_type IS NOT NULL
) distinct_video_ads
GROUP BY video_ad_type
HAVING SUM(impressions) >= 1000
ORDER BY total_spend DESC
LIMIT 100

**3. TOP PERFORMING VIDEOS BY IMPRESSIONS:**
SELECT 
    a.raw_ad_id,
    a.name as ad_name,
    vl.url as video_url,
    vl.video_ad_type,
    vl.video_duration,
    ad_performance.impressions as total_impressions,
    ad_performance.clicks as total_clicks,
    ad_performance.spend as total_spend,
    ad_performance.purchases as total_purchases,
    ROUND((ad_performance.clicks::float / NULLIF(ad_performance.impressions, 0) * 100)::numeric, 2) as ctr,
    ROUND((ad_performance.purchase_value::float / NULLIF(ad_performance.spend, 0))::numeric, 2) as roas
FROM (
    SELECT raw_ad_id, 
           SUM(impressions) as impressions,
           SUM(spend) as spend,
           SUM(clicks) as clicks,
           SUM(purchases) as purchases,
           SUM(purchase_value) as purchase_value
    FROM t_ad_daily_performance
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY raw_ad_id
    HAVING SUM(video_views) > 0  -- ✅ CRITICAL: Filter for video ads only
    ORDER BY SUM(impressions) DESC
    LIMIT 50  -- ✅ Use larger limit to account for ads without video clips
) ad_performance
JOIN t_ad a ON a.raw_ad_id = ad_performance.raw_ad_id
JOIN t_ad_video_labelings vl ON vl.raw_asset_id = a.asset_id AND vl.clip_sno = 1
ORDER BY total_impressions DESC
LIMIT 10

**4. SIMPLE GROWTH TREND ANALYSIS (SINGLE SUBQUERY):**
SELECT 
    ad_format,
    media_type,
    month,
    total_impressions,
    prev_month_impressions,
    ROUND(((total_impressions::float / NULLIF(prev_month_impressions, 0) - 1) * 100)::numeric, 2) as growth_rate
FROM (
    SELECT 
        COALESCE(il.f_ad_type, vl.video_ad_type) as ad_format,
        CASE 
            WHEN il.f_ad_type IS NOT NULL THEN 'Image'
            WHEN vl.video_ad_type IS NOT NULL THEN 'Video'
        END as media_type,
        DATE_TRUNC('month', adp.date) as month,
        SUM(adp.impressions) as total_impressions,
        LAG(SUM(adp.impressions)) OVER (PARTITION BY COALESCE(il.f_ad_type, vl.video_ad_type) ORDER BY DATE_TRUNC('month', adp.date)) as prev_month_impressions
    FROM (
        SELECT raw_ad_id, date, SUM(impressions) as impressions
        FROM t_ad_daily_performance 
        WHERE date >= '2025-01-01' AND date < '2026-01-01'
        GROUP BY raw_ad_id, date
    ) adp
    JOIN t_ad a ON a.raw_ad_id = adp.raw_ad_id
    LEFT JOIN t_ad_image_labelings il ON il.raw_asset_id = a.asset_id
    LEFT JOIN t_ad_video_labelings vl ON vl.raw_asset_id = a.asset_id AND vl.clip_sno = 1
    WHERE il.f_ad_type IS NOT NULL OR vl.video_ad_type IS NOT NULL
    GROUP BY DATE_TRUNC('month', adp.date), COALESCE(il.f_ad_type, vl.video_ad_type), 
             CASE WHEN il.f_ad_type IS NOT NULL THEN 'Image' WHEN vl.video_ad_type IS NOT NULL THEN 'Video' END
) monthly_data
WHERE prev_month_impressions IS NOT NULL
ORDER BY growth_rate DESC
LIMIT 100

**5. SIMPLE CTE EXAMPLE (SINGLE WITH CLAUSE ONLY):**
WITH monthly_data AS (
    SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(impressions) as total_impressions
    FROM t_ad_daily_performance 
    WHERE date >= '2025-01-01' AND date < '2026-01-01'
    GROUP BY DATE_TRUNC('month', date)
)
SELECT 
    month,
    total_impressions,
    LAG(total_impressions) OVER (ORDER BY month) as prev_month_impressions
FROM monthly_data
ORDER BY month
LIMIT 100



**❌ WRONG PATTERNS (DO NOT USE):**
-- 1. Direct GROUP BY on creative labelings tables (causes double counting)
-- 2. ORDER BY calculated expressions in SELECT DISTINCT
-- 3. Missing subquery with SELECT DISTINCT for format comparisons
-- 4. ORDER BY ctr DESC, roas DESC, etc. in SELECT DISTINCT (use ORDER BY raw_ad_id instead)

**RANKING QUERIES RULE:**
For ranking queries (top X by CTR, ROAS, etc.), use subquery to get top N ads first, then join with creative details.
Use AND vl.clip_sno = 1 in the JOIN to get only the first video clip per ad and avoid duplicates.
**CRITICAL VIDEO FILTERING**: For ALL video-specific queries, ALWAYS use HAVING SUM(video_views) > 0 in subquery to filter for video ads only.
**IMPORTANT**: Use LIMIT X*5 in subquery to account for ads without video clips, then LIMIT X in final SELECT.
This allows proper ordering by calculated expressions (CTR, ROAS) in the final SELECT.

IMPORTANT RULES:
1. **ALWAYS SCAN SCHEMA FIRST** - Check which columns exist in which tables before writing queries
2. **NEVER use column names that don't exist in the schema**
3. **Use exact column names as shown in the schema (case-sensitive)**
4. **CRITICAL ANTI-DOUBLE-COUNTING RULE**: NEVER use direct JOIN between creative labelings tables and t_ad_daily_performance. ALWAYS aggregate t_ad_daily_performance by raw_ad_id first using a subquery.
5. **AD FORMAT COMPARISON RULE**: When comparing ad formats, use a subquery with SELECT DISTINCT first to get unique ads, then GROUP BY the format in the outer query.
6. **Image creative features**: Use f_xxx columns from t_ad_image_labelings
7. **Video creative features**: Use cf_xxx columns from t_ad_video_labelings
8. **Ad format analysis**: Use t_ad_image_labelings.f_ad_type for image formats, t_ad_video_labelings.video_ad_type for video formats
9. **Video filtering**: For video-specific queries, use HAVING SUM(video_views) > 0 in subquery to filter for video ads only
10. **CRITICAL POSTGRESQL SYNTAX RULES**:
    - ALWAYS use ROUND(value::numeric, 2) for rounding (NEVER use ROUND(double, int))
    - ALWAYS cast to ::numeric before using ROUND() function
    - Use ::float for division operations
    - Use ::numeric for decimal precision
    - Use NULLIF(denominator, 0) to avoid division by zero
    - For complex queries, PREFER simple subqueries over CTEs to avoid syntax errors
    - For trend analysis (growth/declining), use LAG() window function in a single subquery
    - If CTEs are needed, ONLY use simple CTEs with a single WITH clause
    - Simple CTE pattern: WITH cte_name AS (SELECT ...) SELECT ... FROM cte_name
    - NEVER use multiple CTEs (WITH cte1 AS (...), cte2 AS (...)) - this causes syntax errors
    - For growth rate calculations, use LAG() window function with proper NULLIF() to avoid division by zero
    - Example: ROUND((SUM(spend)::float / NULLIF(SUM(impressions), 0) * 100)::numeric, 2)
    - **SELECT DISTINCT RULE**: When using SELECT DISTINCT, ORDER BY can ONLY reference columns in the SELECT list
    - **RANKING QUERIES**: Use subquery to get top N ads first, then join with creative details
    - **DUPLICATE PREVENTION**: Always use AND vl.clip_sno = 1 when joining with video_labelings to get only the first clip per ad
    - **ORDERING**: For ranking queries, use exact LIMIT X in subquery and ORDER BY the raw metric value (ad_performance.impressions) in final SELECT
    - **CRITICAL VIDEO FILTERING**: For ALL video queries, ALWAYS use HAVING SUM(video_views) > 0 in subquery
    - Example: FROM (SELECT raw_ad_id, SUM(impressions) FROM t_ad_daily_performance GROUP BY raw_ad_id ORDER BY SUM(impressions) DESC LIMIT 50) ad_performance
    - CTR Example: FROM (SELECT raw_ad_id, SUM(clicks), SUM(impressions) FROM t_ad_daily_performance GROUP BY raw_ad_id HAVING SUM(impressions) >= 1000 ORDER BY (SUM(clicks)::float / NULLIF(SUM(impressions), 0)) DESC LIMIT 100) ad_performance
    - ROAS Example: FROM (SELECT raw_ad_id, SUM(spend), SUM(purchase_value) FROM t_ad_daily_performance WHERE date >= '2025-07-01' GROUP BY raw_ad_id ORDER BY (SUM(purchase_value)::float / NULLIF(SUM(spend), 0)) DESC LIMIT 50) ad_performance

**FINAL VERIFICATION:**
Before returning the SQL, double-check that:
1. Every column used exists in the schema above
2. All ROUND() functions use ::numeric casting
3. All division operations use proper type casting

Return ONLY the SQL query, no explanations.`;
  }

  // Translate natural language to SQL using dynamic schema
  async translateToSQL(userQuestion, errorContext = null) {
    const translationId = Math.random().toString(36).substring(2, 8);
    const startTime = Date.now();
    
    try {
      console.log(`🔄 [${translationId}] Starting SQL translation for: "${userQuestion}"`);
      if (errorContext) {
        console.log(`🔄 [${translationId}] This is a retry attempt with error context`);
      }
      
      // Get fresh schema
      console.log(`📋 [${translationId}] Fetching database schema...`);
      const schema = await this.getDatabaseSchema();
      console.log(`✅ [${translationId}] Schema fetched: ${schema.length} tables available`);
      
      // Generate system prompt based on actual schema
      console.log(`📝 [${translationId}] Generating system prompt...`);
      const systemPrompt = this.generateSystemPrompt(schema);
      console.log(`✅ [${translationId}] System prompt generated (${systemPrompt.length} characters)`);
      
      // Prepare user message with error context if this is a retry
      let userMessage = userQuestion;
      if (errorContext) {
        userMessage = this.buildRetryMessage(userQuestion, errorContext);
      }
      
      // Call Anthropic API
      console.log(`🤖 [${translationId}] Calling Anthropic Claude API...`);
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          { role: "user", content: userMessage }
        ]
      });

      const rawSQL = response.content[0].text.trim();
      console.log(`📝 [${translationId}] Raw SQL generated: ${rawSQL.length} characters`);
      
      // Clean and validate the SQL query
      console.log(`🧹 [${translationId}] Cleaning and validating SQL...`);
      const cleanedSQL = this.cleanSQLQuery(rawSQL);
      console.log(`✅ [${translationId}] SQL cleaned and validated`);
      
      const translationTime = Date.now() - startTime;
      console.log(`🎯 [${translationId}] SQL translation COMPLETED in ${translationTime}ms`);
      
      return cleanedSQL;
    } catch (error) {
      const translationTime = Date.now() - startTime;
      console.error(`💥 [${translationId}] SQL translation FAILED after ${translationTime}ms`);
      console.error(`🚨 [${translationId}] Translation error: ${error.message}`);
      console.error(`📋 [${translationId}] Error details:`, error);
      throw new Error('Failed to translate question to SQL');
    }
  }

  // Build retry message with error context
  buildRetryMessage(originalQuestion, errorContext) {
    const { sqlQuery, error, errorCode, errorDetails } = errorContext;
    
    let retryMessage = `Original question: "${originalQuestion}"\n\n`;
    retryMessage += `The previous SQL query failed with an error. Please fix the query:\n\n`;
    retryMessage += `Failed SQL query:\n${sqlQuery}\n\n`;
    retryMessage += `Error: ${error}\n`;
    retryMessage += `Error code: ${errorCode}\n`;
    
    if (errorDetails) {
      if (errorDetails.detail) {
        retryMessage += `Error detail: ${errorDetails.detail}\n`;
      }
      if (errorDetails.hint) {
        retryMessage += `Hint: ${errorDetails.hint}\n`;
      }
      if (errorDetails.position) {
        retryMessage += `Error position: ${errorDetails.position}\n`;
      }
    }
    
    retryMessage += `\nPlease generate a corrected SQL query that addresses the error above.`;
    
    return retryMessage;
  }

  // Clean and validate SQL query
  cleanSQLQuery(sql) {
    // Remove markdown code blocks if present
    sql = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '');
    
    // Trim whitespace
    sql = sql.trim();
    
    // Find the actual SQL query (look for SELECT statement)
    const selectMatch = sql.match(/SELECT[\s\S]*?(?:;|$)/i);
    if (selectMatch) {
      sql = selectMatch[0];
    }
    
    // Ensure it starts with SELECT
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      throw new Error('Query must start with SELECT');
    }
    
    // Fix common syntax issues - more comprehensive approach
    sql = sql.replace(/;\s*LIMIT/gi, ' LIMIT'); // Remove semicolon before LIMIT (case insensitive)
    sql = sql.replace(/;\s*ORDER\s+BY/gi, ' ORDER BY'); // Remove semicolon before ORDER BY
    sql = sql.replace(/;\s*GROUP\s+BY/gi, ' GROUP BY'); // Remove semicolon before GROUP BY
    sql = sql.replace(/;\s*HAVING/gi, ' HAVING'); // Remove semicolon before HAVING
    sql = sql.replace(/;\s*WHERE/gi, ' WHERE'); // Remove semicolon before WHERE
    sql = sql.replace(/;\s*$/g, ''); // Remove trailing semicolon
    
    // Remove any remaining semicolons in the middle of the query
    sql = sql.replace(/;\s+(?!LIMIT|ORDER|GROUP|HAVING|WHERE)/gi, ' ');
    
    // Add LIMIT if not present and query doesn't already have one
    if (!sql.toUpperCase().includes('LIMIT')) {
      sql += ' LIMIT 100';
    }
    
    return sql.trim();
  }

  // Execute SQL query and format results
  async executeQuery(sqlQuery) {
    const startTime = Date.now();
    const queryId = Math.random().toString(36).substring(2, 8);
    
    try {
      console.log(`🔍 [${queryId}] Executing SQL query...`);
      console.log(`📝 [${queryId}] SQL: ${sqlQuery}`);
      
      const result = await this.pool.query(sqlQuery);
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ [${queryId}] Query SUCCESS: ${result.rowCount} rows returned in ${executionTime}ms`);
      console.log(`📊 [${queryId}] Columns: ${result.fields.map(field => field.name).join(', ')}`);
      
      return {
        success: true,
        data: result.rows,
        rowCount: result.rowCount,
        columns: result.fields.map(field => field.name),
        query: sqlQuery,
        executionTime: executionTime,
        queryId: queryId
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ [${queryId}] Query FAILED after ${executionTime}ms`);
      console.error(`🚨 [${queryId}] Error: ${error.message}`);
      console.error(`🔍 [${queryId}] Error Code: ${error.code}`);
      console.error(`📋 [${queryId}] Error Details:`, {
        severity: error.severity,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        file: error.file,
        line: error.line,
        routine: error.routine
      });
      
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        errorDetails: {
          severity: error.severity,
          detail: error.detail,
          hint: error.hint,
          position: error.position,
          file: error.file,
          line: error.line,
          routine: error.routine
        },
        query: sqlQuery,
        executionTime: executionTime,
        queryId: queryId
      };
    }
  }

  // Extract asset URLs from data with dynamic metadata based on user question
  extractAssetUrls(data, userQuestion = '') {
    const assetUrls = [];
    
    if (!data || !Array.isArray(data)) return assetUrls;
    
    // Determine which metrics to include based on the user's question
    const questionLower = userQuestion.toLowerCase();
    const includeMetrics = {
      spend: questionLower.includes('spend') || questionLower.includes('cost') || questionLower.includes('roas'),
      impressions: questionLower.includes('impression') || questionLower.includes('reach') || questionLower.includes('exposure'),
      clicks: questionLower.includes('click') || questionLower.includes('ctr') || questionLower.includes('engagement'),
      purchases: questionLower.includes('purchase') || questionLower.includes('conversion') || questionLower.includes('revenue'),
      revenue: questionLower.includes('revenue') || questionLower.includes('roas') || questionLower.includes('return'),
      roas: questionLower.includes('roas') || questionLower.includes('return'),
      ctr: questionLower.includes('ctr') || questionLower.includes('click'),
      cpa: questionLower.includes('cpa') || questionLower.includes('acquisition'),
      cpm: questionLower.includes('cpm') || questionLower.includes('cost per thousand'),
      cvr: questionLower.includes('cvr') || questionLower.includes('conversion rate')
    };
    
    // If no specific metrics mentioned, include common ones
    const hasSpecificMetrics = Object.values(includeMetrics).some(Boolean);
    if (!hasSpecificMetrics) {
      includeMetrics.spend = true;
      includeMetrics.impressions = true;
      includeMetrics.clicks = true;
      includeMetrics.ctr = true;
      includeMetrics.roas = true;
    }
    
    data.forEach((row, index) => {
      Object.entries(row).forEach(([key, value]) => {
        if (typeof value === 'string' && value.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|mp4|mov|avi|webm|mkv)/i)) {
          // Extract dynamic metrics from the same row based on user question
          const metrics = {};
          
          if (includeMetrics.spend) {
            metrics.spend = row.spend || row.total_spend;
          }
          if (includeMetrics.impressions) {
            metrics.impressions = row.impressions || row.total_impressions;
          }
          if (includeMetrics.clicks) {
            metrics.clicks = row.clicks || row.total_clicks;
          }
          if (includeMetrics.purchases) {
            metrics.purchases = row.purchases || row.total_purchases;
          }
          if (includeMetrics.revenue) {
            metrics.revenue = row.purchase_value || row.total_revenue || row.revenue;
          }
          if (includeMetrics.roas) {
            metrics.roas = row.roas;
          }
          if (includeMetrics.ctr) {
            metrics.ctr = row.ctr;
          }
          if (includeMetrics.cpa) {
            metrics.cpa = row.cpa;
          }
          if (includeMetrics.cpm) {
            metrics.cpm = row.cpm;
          }
          if (includeMetrics.cvr) {
            metrics.cvr = row.cvr;
          }
          
          // Always include campaign name if available
          if (row.campaign_name || row.ad_name || row.ad_format || row.media_type) {
            metrics.campaign_name = row.campaign_name || row.ad_name || row.ad_format || row.media_type;
          }
          
          assetUrls.push({
            url: value,
            title: `Asset ${index + 1}`,
            metrics: metrics,
            rowIndex: index
          });
        }
      });
    });
    
    return assetUrls;
  }

  // Generate natural language explanation of results
  async explainResults(data, originalQuestion) {
    try {
      const prompt = `Given this marketing data query result, provide a brief, natural explanation:

Original Question: "${originalQuestion}"
Data Summary: ${data.rowCount} rows returned
Columns: ${data.columns.join(', ')}

First few rows: ${JSON.stringify(data.data.slice(0, 3))}

Provide a 2-3 sentence explanation of what this data shows in business terms. Focus on key insights and trends.

If the data contains asset URLs (image or video files), include them in your response so they can be displayed. Format them as clickable links or mention them naturally in the context.`;

      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 200,
        temperature: 0.7,
        messages: [
          { role: "user", content: prompt }
        ]
      });

      return response.content[0].text.trim();
    } catch (error) {
      console.error('Error explaining results:', error);
      return `Retrieved ${data.rowCount} records from the database.`;
    }
  }

  // Log usage data to database
  async logUsageData(logData) {
    try {
      const query = `
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
        logData.sessionId,
        logData.queryId,
        logData.translationId,
        logData.schemaId,
        logData.userMessage,
        logData.userAgent,
        logData.ipAddress,
        logData.sqlQuery,
        logData.cleanedSqlQuery,
        logData.queryType,
        logData.totalExecutionTime,
        logData.queryExecutionTime,
        logData.translationTime,
        logData.schemaFetchTime,
        logData.success,
        logData.rowCount,
        logData.errorMessage,
        logData.errorCode,
        logData.errorDetails ? JSON.stringify(logData.errorDetails) : null,
        logData.assetsFound,
        logData.systemPromptLength,
        logData.schemaTablesCount,
        JSON.stringify(logData.metadata || {})
      ];
      
      await this.loggingPool.query(query, values);
      console.log(`📊 [${logData.sessionId}] Usage logged to dev database`);
    } catch (error) {
      console.error(`❌ [${logData.sessionId}] Failed to log usage: ${error.message}`);
    }
  }

  // Detect query type from user message
  detectQueryType(userMessage) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('ctr') || message.includes('click through rate')) {
      return 'ctr';
    } else if (message.includes('roas') || message.includes('return on ad spend')) {
      return 'roas';
    } else if (message.includes('impression')) {
      return 'impressions';
    } else if (message.includes('spend') || message.includes('cost')) {
      return 'spend';
    } else if (message.includes('conversion') || message.includes('purchase')) {
      return 'conversions';
    } else if (message.includes('video')) {
      return 'video_analysis';
    } else if (message.includes('image') || message.includes('creative')) {
      return 'creative_analysis';
    } else {
      return 'general';
    }
  }

  // Detect if a question requires SQL or can be answered with general knowledge using Claude
  async detectQuestionType(userMessage) {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `You are helping to classify user questions for a marketing analytics chatbot. 

The chatbot has access to a marketing/advertising database with tables for campaigns, ads, performance metrics, creative assets, etc.

Determine if the user's question requires querying the marketing database (SQL) or can be answered with general knowledge about marketing concepts.

Question: "${userMessage}"

Respond with ONLY "sql" if the question requires database querying (e.g., "show me top campaigns", "what is our spend", "compare performance", "find ads with specific criteria").

Respond with ONLY "general" if the question is about concepts, definitions, how-to, best practices, or general marketing knowledge (e.g., "what is CTR", "how to improve performance", "explain ROAS", "best practices for video ads").

Be strict - only use "sql" if the question specifically asks for data, metrics, or analysis from the database.`
          }
        ]
      });
      
      const answer = response.content[0].text.trim().toLowerCase();
      console.log(`🔍 Question type detection result: "${answer}" for question: "${userMessage}"`);
      
      // Default to SQL for ambiguous cases
      return answer === 'general' ? 'general' : 'sql';
      
    } catch (error) {
      console.error(`💥 Error in question type detection: ${error.message}`);
      // Default to SQL for safety
      return 'sql';
    }
  }

  // Handle general knowledge questions with regular Claude
  async handleGeneralQuestion(userMessage, sessionId) {
    try {
      console.log(`🤖 [${sessionId}] Handling general knowledge question with Claude...`);
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `You are a helpful marketing analytics assistant. Answer the following question about marketing, advertising, analytics, or general business concepts. Keep your response concise, informative, and practical. If the question is about marketing analytics concepts, provide clear explanations with examples when helpful.

Question: ${userMessage}`
          }
        ]
      });
      
      const answer = response.content[0].text;
      console.log(`✅ [${sessionId}] General question answered successfully`);
      
      return {
        success: true,
        data: [],
        explanation: answer,
        sqlQuery: null,
        rowCount: 0,
        columns: [],
        assetUrls: [],
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        executionTime: 0,
        queryExecutionTime: 0,
        queryId: null,
        retryCount: 0,
        isGeneralQuestion: true
      };
      
    } catch (error) {
      console.error(`💥 [${sessionId}] Error handling general question: ${error.message}`);
      throw error;
    }
  }

  // Main chat method
  async processChatMessage(userMessage, requestInfo = {}) {
    const sessionId = Math.random().toString(36).substring(2, 8);
    const startTime = Date.now();
    let translationTime = 0;
    let schemaFetchTime = 0;
    let queryExecutionTime = 0;
    let translationId = null;
    let schemaId = null;
    let queryId = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    try {
      console.log(`🤖 [${sessionId}] Processing chat message: "${userMessage}"`);
      
      // Step 0: Detect question type
      const questionType = await this.detectQuestionType(userMessage);
      console.log(`🔍 [${sessionId}] Question type detected: ${questionType}`);
      
      // If it's a general question, handle with regular Claude
      if (questionType === 'general') {
        console.log(`📚 [${sessionId}] Using regular Claude for general knowledge question`);
        return await this.handleGeneralQuestion(userMessage, sessionId);
      }
      
      // Otherwise, proceed with SQL processing
      console.log(`🗄️ [${sessionId}] Using SQL processing for data analysis question`);
      
      let sqlQuery = null;
      let queryResult = null;
      
      // Retry loop for SQL translation and execution
      while (retryCount <= maxRetries) {
        try {
          // Step 1: Translate to SQL (with error context on retries)
          console.log(`🔄 [${sessionId}] Step 1: Translating natural language to SQL (attempt ${retryCount + 1}/${maxRetries + 1})...`);
          const translationStart = Date.now();
          
          // Pass error context for retries
          const errorContext = retryCount > 0 ? {
            sqlQuery: sqlQuery,
            error: queryResult?.error,
            errorCode: queryResult?.errorCode,
            errorDetails: queryResult?.errorDetails
          } : null;
          
          sqlQuery = await this.translateToSQL(userMessage, errorContext);
          translationTime = Date.now() - translationStart;
          translationId = Math.random().toString(36).substring(2, 8);
          console.log(`✅ [${sessionId}] SQL translation completed in ${translationTime}ms`);
          
          // Step 2: Execute query
          console.log(`🔄 [${sessionId}] Step 2: Executing SQL query (attempt ${retryCount + 1}/${maxRetries + 1})...`);
          queryResult = await this.executeQuery(sqlQuery);
          queryExecutionTime = queryResult.executionTime || 0;
          queryId = queryResult.queryId;
          
          if (queryResult.success) {
            console.log(`✅ [${sessionId}] Query execution successful: ${queryResult.rowCount} rows`);
            break; // Success! Exit retry loop
          } else {
            console.log(`❌ [${sessionId}] Query execution failed (attempt ${retryCount + 1}/${maxRetries + 1}): ${queryResult.error}`);
            
            if (retryCount === maxRetries) {
              // Final attempt failed, log and return error
              console.log(`💥 [${sessionId}] All ${maxRetries + 1} attempts failed. Giving up.`);
              
              this.logUsageData({
                sessionId,
                queryId,
                translationId,
                schemaId,
                userMessage,
                userAgent: requestInfo.userAgent,
                ipAddress: requestInfo.ipAddress,
                sqlQuery: sqlQuery,
                cleanedSqlQuery: sqlQuery,
                queryType: questionType, // Use the detected questionType
                totalExecutionTime: Date.now() - startTime,
                queryExecutionTime,
                translationTime,
                schemaFetchTime,
                success: false,
                rowCount: null,
                errorMessage: queryResult.error,
                errorCode: queryResult.errorCode,
                errorDetails: queryResult.errorDetails,
                assetsFound: 0,
                systemPromptLength: 0,
                schemaTablesCount: 0,
                metadata: { 
                  step: 'query_execution_final_failure',
                  retryCount: retryCount,
                  maxRetries: maxRetries
                }
              });
              
              return {
                success: false,
                error: queryResult.error,
                errorCode: queryResult.errorCode,
                errorDetails: queryResult.errorDetails,
                message: `I couldn't execute that query after ${maxRetries + 1} attempts. Please try rephrasing your question.`,
                sessionId: sessionId,
                executionTime: Date.now() - startTime,
                retryCount: retryCount
              };
            } else {
              // Log the failure and continue to next retry
              console.log(`🔄 [${sessionId}] Retrying with error context...`);
              this.logUsageData({
                sessionId,
                queryId,
                translationId,
                schemaId,
                userMessage,
                userAgent: requestInfo.userAgent,
                ipAddress: requestInfo.ipAddress,
                sqlQuery: sqlQuery,
                cleanedSqlQuery: sqlQuery,
                queryType: questionType, // Use the detected questionType
                totalExecutionTime: Date.now() - startTime,
                queryExecutionTime,
                translationTime,
                schemaFetchTime,
                success: false,
                rowCount: null,
                errorMessage: queryResult.error,
                errorCode: queryResult.errorCode,
                errorDetails: queryResult.errorDetails,
                assetsFound: 0,
                systemPromptLength: 0,
                schemaTablesCount: 0,
                metadata: { 
                  step: 'query_execution_retry',
                  retryCount: retryCount,
                  maxRetries: maxRetries
                }
              });
            }
          }
        } catch (translationError) {
          console.error(`💥 [${sessionId}] Translation error on attempt ${retryCount + 1}: ${translationError.message}`);
          
          if (retryCount === maxRetries) {
            throw translationError; // Re-throw on final attempt
          }
        }
        
        retryCount++;
      }
      
      console.log(`✅ [${sessionId}] Query execution successful: ${queryResult.rowCount} rows`);
      
      // Step 3: Extract asset URLs
      console.log(`🔄 [${sessionId}] Step 3: Extracting asset URLs...`);
      const assetUrls = this.extractAssetUrls(queryResult.data, userMessage);
      console.log(`✅ [${sessionId}] Asset extraction completed: ${assetUrls.length} assets found`);
      
      // Step 4: Generate explanation
      console.log(`🔄 [${sessionId}] Step 4: Generating explanation...`);
      const explanation = await this.explainResults(queryResult, userMessage);
      console.log(`✅ [${sessionId}] Explanation generated`);
      
      const totalTime = Date.now() - startTime;
      console.log(`🎉 [${sessionId}] Chat processing COMPLETED successfully in ${totalTime}ms`);
      console.log(`📊 [${sessionId}] Final stats: ${queryResult.rowCount} rows, ${assetUrls.length} assets, ${totalTime}ms total`);
      
      // Log the success
      this.logUsageData({
        sessionId,
        queryId,
        translationId,
        schemaId,
        userMessage,
        userAgent: requestInfo.userAgent,
        ipAddress: requestInfo.ipAddress,
        sqlQuery: sqlQuery,
        cleanedSqlQuery: sqlQuery,
        queryType: questionType, // Use the detected questionType
        totalExecutionTime: totalTime,
        queryExecutionTime,
        translationTime,
        schemaFetchTime,
        success: true,
        rowCount: queryResult.rowCount,
        errorMessage: null,
        errorCode: null,
        errorDetails: null,
        assetsFound: assetUrls.length,
        systemPromptLength: 0, // We'll get this from schema fetch
        schemaTablesCount: 0,  // We'll get this from schema fetch
        metadata: { 
          step: 'success',
          columns: queryResult.columns,
          hasAssets: assetUrls.length > 0,
          retryCount: retryCount,
          maxRetries: maxRetries
        }
      });
      
      return {
        success: true,
        data: queryResult.data,
        explanation: explanation,
        sqlQuery: sqlQuery,
        rowCount: queryResult.rowCount,
        columns: queryResult.columns,
        assetUrls: assetUrls,
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        executionTime: totalTime,
        queryExecutionTime: queryResult.executionTime,
        queryId: queryResult.queryId,
        retryCount: retryCount,
        isGeneralQuestion: false
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`💥 [${sessionId}] Chat processing FAILED after ${totalTime}ms`);
      console.error(`🚨 [${sessionId}] Error: ${error.message}`);
      console.error(`📋 [${sessionId}] Error stack:`, error.stack);
      
      // Log the error
      this.logUsageData({
        sessionId,
        queryId,
        translationId,
        schemaId,
        userMessage,
        userAgent: requestInfo.userAgent,
        ipAddress: requestInfo.ipAddress,
        sqlQuery: null,
        cleanedSqlQuery: null,
        queryType: questionType, // Use the detected questionType
        totalExecutionTime: totalTime,
        queryExecutionTime,
        translationTime,
        schemaFetchTime,
        success: false,
        rowCount: null,
        errorMessage: error.message,
        errorCode: 'PROCESSING_ERROR',
        errorDetails: { stack: error.stack },
        assetsFound: 0,
        systemPromptLength: 0,
        schemaTablesCount: 0,
        metadata: { step: 'processing_error' }
      });
      
      return {
        success: false,
        error: error.message,
        message: "I encountered an error processing your request. Please try again.",
        sessionId: sessionId,
        executionTime: totalTime
      };
    }
  }









  // Get available metrics for suggestions
  async getAvailableMetrics() {
    try {
      const schema = await this.getDatabaseSchema();
      const metrics = [];
      
      // Extract common metric columns
      Object.keys(schema).forEach(tableName => {
        schema[tableName].forEach(col => {
          if (col.column.toLowerCase().includes('spend') || 
              col.column.toLowerCase().includes('impression') ||
              col.column.toLowerCase().includes('click') ||
              col.column.toLowerCase().includes('conversion') ||
              col.column.toLowerCase().includes('purchase') ||
              col.column.toLowerCase().includes('revenue') ||
              col.column.toLowerCase().includes('cost') ||
              col.column.toLowerCase().includes('ctr') ||
              col.column.toLowerCase().includes('cvr') ||
              col.column.toLowerCase().includes('cpa') ||
              col.column.toLowerCase().includes('roas')) {
            metrics.push(`${tableName}.${col.column}`);
          }
        });
      });
      
      return [...new Set(metrics)]; // Remove duplicates
    } catch (error) {
      console.error('Error getting metrics:', error);
      return [];
    }
  }

  // Generate chat suggestions based on available data
  async generateSuggestions() {
    try {
      const schema = await this.getDatabaseSchema();
      const suggestions = [
        "Show me top performing campaigns this month",
        "What's our total spend across all platforms?",
        "Compare performance between different ad formats",
        "Which campaigns have the highest conversion rate?",
        "Show me daily spend trends over the last 30 days",
        "What's our average cost per acquisition?",
        "Which ads are generating the most impressions?",
        "Show me platform performance comparison",
        "What's our return on ad spend (ROAS)?",
        "Which campaigns are underperforming?",
        "Show me top 5 performing videos (highest ROAS) in July 2025"
      ];
      
      return suggestions;
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [
        "Show me top performing campaigns",
        "What's our total spend?",
        "Compare platform performance"
      ];
    }
  }
}

module.exports = new ChatService(); 