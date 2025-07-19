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
    
    // Cache schema to avoid repeated queries
    this.schemaCache = null;
    this.schemaCacheTime = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  // Dynamically fetch complete database schema
  async getDatabaseSchema() {
    try {
      // Check if we have a valid cached schema
      if (this.schemaCache && this.schemaCacheTime && 
          (Date.now() - this.schemaCacheTime) < this.CACHE_DURATION) {
        return this.schemaCache;
      }

      console.log('🔍 Fetching fresh database schema...');
      
      // Get all tables in the database
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      
      const tablesResult = await this.pool.query(tablesQuery);
      const tableNames = tablesResult.rows.map(row => row.table_name);
      
      // Get detailed schema for all tables
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
      
      console.log(`✅ Schema cached for ${Object.keys(schemaByTable).length} tables`);
      return schemaByTable;
      
    } catch (error) {
      console.error('Error fetching schema:', error);
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

**AD FORMAT COMPARISON EXAMPLES:**

**IMAGE AD FORMATS:**
SELECT 
    il.f_ad_type,
    SUM(ad_performance.spend) as total_spend,
    SUM(ad_performance.impressions) as total_impressions,
    SUM(ad_performance.clicks) as total_clicks,
    ROUND((SUM(ad_performance.clicks)::float / NULLIF(SUM(ad_performance.impressions), 0) * 100)::numeric, 2) as ctr
FROM t_ad_image_labelings il
JOIN t_ad a ON il.raw_asset_id = a.asset_id
JOIN (
    SELECT raw_ad_id, SUM(spend) as spend, SUM(impressions) as impressions, SUM(clicks) as clicks
    FROM t_ad_daily_performance 
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY raw_ad_id
) ad_performance ON a.raw_ad_id = ad_performance.raw_ad_id
GROUP BY il.f_ad_type
ORDER BY total_spend DESC
LIMIT 100

**VIDEO AD FORMATS:**
SELECT 
    vl.video_ad_type,
    SUM(ad_performance.spend) as total_spend,
    SUM(ad_performance.impressions) as total_impressions,
    SUM(ad_performance.clicks) as total_clicks,
    ROUND((SUM(ad_performance.clicks)::float / NULLIF(SUM(ad_performance.impressions), 0) * 100)::numeric, 2) as ctr
FROM t_ad_video_labelings vl
JOIN t_ad a ON vl.raw_asset_id = a.asset_id
JOIN (
    SELECT raw_ad_id, SUM(spend) as spend, SUM(impressions) as impressions, SUM(clicks) as clicks
    FROM t_ad_daily_performance 
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY raw_ad_id
) ad_performance ON a.raw_ad_id = ad_performance.raw_ad_id
GROUP BY vl.video_ad_type
ORDER BY total_spend DESC
LIMIT 100

**COMBINED AD FORMATS (IMAGE + VIDEO):**
SELECT 
    COALESCE(il.f_ad_type, vl.video_ad_type) as ad_format,
    CASE 
        WHEN il.f_ad_type IS NOT NULL THEN 'Image'
        WHEN vl.video_ad_type IS NOT NULL THEN 'Video'
    END as media_type,
    SUM(ad_performance.spend) as total_spend,
    SUM(ad_performance.impressions) as total_impressions,
    SUM(ad_performance.clicks) as total_clicks,
    ROUND((SUM(ad_performance.clicks)::float / NULLIF(SUM(ad_performance.impressions), 0) * 100)::numeric, 2) as ctr
FROM t_ad a
LEFT JOIN t_ad_image_labelings il ON il.raw_asset_id = a.asset_id
LEFT JOIN t_ad_video_labelings vl ON vl.raw_asset_id = a.asset_id
JOIN (
    SELECT raw_ad_id, SUM(spend) as spend, SUM(impressions) as impressions, SUM(clicks) as clicks
    FROM t_ad_daily_performance 
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY raw_ad_id
) ad_performance ON a.raw_ad_id = ad_performance.raw_ad_id
WHERE (il.f_ad_type IS NOT NULL OR vl.video_ad_type IS NOT NULL)
GROUP BY COALESCE(il.f_ad_type, vl.video_ad_type), 
         CASE 
             WHEN il.f_ad_type IS NOT NULL THEN 'Image'
             WHEN vl.video_ad_type IS NOT NULL THEN 'Video'
         END
ORDER BY total_spend DESC
LIMIT 100

**TOP PERFORMING VIDEOS (CORRECT PATTERN - NO DOUBLE COUNTING):**
SELECT DISTINCT ON (a.raw_ad_id)
    a.raw_ad_id,
    a.name as ad_name,
    vl.url as video_url,
    vl.video_ad_type,
    ad_performance.spend as total_spend,
    ad_performance.impressions as total_impressions,
    ad_performance.clicks as total_clicks,
    ad_performance.purchases as total_purchases,
    ad_performance.purchase_value as total_revenue,
    ROUND((ad_performance.purchase_value::float / NULLIF(ad_performance.spend, 0))::numeric, 2) as roas,
    ROUND((ad_performance.clicks::float / NULLIF(ad_performance.impressions, 0) * 100)::numeric, 2) as ctr
FROM t_ad a
JOIN (
    SELECT raw_ad_id, SUM(spend) as spend, SUM(impressions) as impressions, SUM(clicks) as clicks, 
           SUM(purchases) as purchases, SUM(purchase_value) as purchase_value
    FROM t_ad_daily_performance 
    WHERE date >= '2025-07-01' AND date < '2025-08-01'
    GROUP BY raw_ad_id
) ad_performance ON a.raw_ad_id = ad_performance.raw_ad_id
JOIN t_ad_video_labelings vl ON vl.raw_asset_id = a.asset_id
WHERE ad_performance.spend > 0
ORDER BY ad_performance.purchase_value DESC, a.raw_ad_id
LIMIT 5

**TOP PERFORMING VIDEOS BY IMPRESSIONS (CORRECT ORDERING):**
SELECT DISTINCT ON (a.raw_ad_id)
    a.raw_ad_id,
    a.name as ad_name,
    vl.url as video_url,
    vl.video_ad_type,
    vl.video_duration,
    ad_performance.impressions as total_impressions,
    ad_performance.spend as total_spend,
    ad_performance.clicks as total_clicks,
    ad_performance.purchases as total_purchases,
    ROUND((ad_performance.clicks::float / NULLIF(ad_performance.impressions, 0) * 100)::numeric, 2) as ctr,
    ROUND((ad_performance.purchase_value::float / NULLIF(ad_performance.spend, 0))::numeric, 2) as roas
FROM t_ad a
JOIN (
    SELECT raw_ad_id, 
           SUM(impressions) as impressions,
           SUM(spend) as spend,
           SUM(clicks) as clicks,
           SUM(purchases) as purchases,
           SUM(purchase_value) as purchase_value
    FROM t_ad_daily_performance
    WHERE date >= '2025-07-01' AND date < '2025-08-01'
    GROUP BY raw_ad_id
) ad_performance ON a.raw_ad_id = ad_performance.raw_ad_id
JOIN t_ad_video_labelings vl ON vl.raw_asset_id = a.asset_id
WHERE ad_performance.impressions > 0
ORDER BY ad_performance.impressions DESC, a.raw_ad_id
LIMIT 10

IMPORTANT RULES:
1. **ALWAYS SCAN SCHEMA FIRST** - Check which columns exist in which tables before writing queries
2. **NEVER use column names that don't exist in the schema**
3. **ALWAYS verify column names before using them in queries**
4. **Use exact column names as shown in the schema (case-sensitive)**
5. Write clean PostgreSQL queries
6. For date filtering: Use proper date functions and intervals
7. Use aggregation functions (SUM, AVG, COUNT) when appropriate
8. Always include LIMIT 100 unless asked for specific limit
9. Use COALESCE() for NULL values
10. Common metrics: spend, impressions, clicks, purchases, purchase_value, roas
11. Image creative features: Use f_xxx columns from t_ad_image_labelings (e.g., f_bright_colors, f_dominant_color, f_ad_type)
12. Video creative features: Use cf_xxx columns from t_ad_video_labelings (e.g., cf_bright_colors, cf_dominant_color)
13. Ad format analysis: Use t_ad_image_labelings.f_ad_type for comparing different ad formats (NOT t_ad.f_ad_type)
14. **CRITICAL ANTI-DOUBLE-COUNTING RULE**: NEVER use direct JOIN between creative labelings tables (t_ad_video_labelings, t_ad_image_labelings) and t_ad_daily_performance. ALWAYS aggregate t_ad_daily_performance by raw_ad_id first using a subquery.
15. **UNIQUE AD RULE**: When querying video/image ads, use DISTINCT ON (raw_ad_id) to ensure only one row per unique ad, since multiple video clips can belong to the same ad.
15. **CRITICAL POSTGRESQL SYNTAX RULES**:
    - ALWAYS use ROUND(value::numeric, 2) for rounding (NEVER use ROUND(double, int))
    - ALWAYS cast to ::numeric before using ROUND() function
    - Use ::float for division operations
    - Use ::numeric for decimal precision
    - Use NULLIF(denominator, 0) to avoid division by zero
    - AVOID CTEs (WITH clauses) - use simple SELECT statements
    - Example: ROUND((SUM(spend)::float / NULLIF(SUM(impressions), 0) * 100)::numeric, 2)
    - **CRITICAL ORDERING RULE**: When using DISTINCT ON, order by the metric you want to rank by FIRST, then by the DISTINCT column
    - Example: ORDER BY ad_performance.impressions DESC, a.raw_ad_id (NOT a.raw_ad_id, ad_performance.impressions DESC)

**FINAL VERIFICATION:**
Before returning the SQL, double-check that:
1. Every column used exists in the schema above
2. All ROUND() functions use ::numeric casting
3. All division operations use proper type casting

Return ONLY the SQL query, no explanations.`;
  }

  // Translate natural language to SQL using dynamic schema
  async translateToSQL(userQuestion) {
    try {
      console.log(`🤖 Translating: "${userQuestion}"`);
      
      // Get fresh schema
      const schema = await this.getDatabaseSchema();
      
      // Generate system prompt based on actual schema
      const systemPrompt = this.generateSystemPrompt(schema);
      
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          { role: "user", content: userQuestion }
        ]
      });

      const sqlQuery = response.content[0].text.trim();
      console.log(`📝 Generated SQL: ${sqlQuery}`);
      
      // Clean and validate the SQL query
      return this.cleanSQLQuery(sqlQuery);
    } catch (error) {
      console.error('Error translating to SQL:', error);
      throw new Error('Failed to translate question to SQL');
    }
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
    try {
      console.log(`🔍 Executing SQL: ${sqlQuery}`);
      const result = await this.pool.query(sqlQuery);
      
      console.log(`✅ Query executed successfully: ${result.rowCount} rows returned`);
      
      return {
        success: true,
        data: result.rows,
        rowCount: result.rowCount,
        columns: result.fields.map(field => field.name),
        query: sqlQuery
      };
    } catch (error) {
      console.error('SQL execution error:', error);
      return {
        success: false,
        error: error.message,
        query: sqlQuery
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

  // Main chat method
  async processChatMessage(userMessage) {
    try {
      console.log(`🤖 Processing chat message: "${userMessage}"`);
      
      // Step 1: Translate to SQL
      const sqlQuery = await this.translateToSQL(userMessage);
      
      // Step 2: Execute query
      const queryResult = await this.executeQuery(sqlQuery);
      
      if (!queryResult.success) {
        return {
          success: false,
          error: queryResult.error,
          message: "I couldn't execute that query. Please try rephrasing your question."
        };
      }
      
      // Step 3: Extract asset URLs from data with dynamic metrics based on user question
      const assetUrls = this.extractAssetUrls(queryResult.data, userMessage);
      
      // Step 4: Generate explanation
      const explanation = await this.explainResults(queryResult, userMessage);
      
      return {
        success: true,
        data: queryResult.data,
        explanation: explanation,
        sqlQuery: sqlQuery,
        rowCount: queryResult.rowCount,
        columns: queryResult.columns,
        assetUrls: assetUrls,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Chat processing error:', error);
      return {
        success: false,
        error: error.message,
        message: "I encountered an error processing your request. Please try again."
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