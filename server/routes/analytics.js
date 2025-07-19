const express = require('express');
const router = express.Router();

// Get detailed campaign analytics
router.get('/campaigns', async (req, res) => {
  try {
    const { 
      platform, 
      start_date, 
      end_date, 
      limit = 50,
      sort_by = 'total_spend',
      sort_order = 'DESC'
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (platform) {
      params.push(platform);
      whereClause += ` AND c.platform = $${params.length}`;
    }
    
    if (start_date) {
      params.push(start_date);
      whereClause += ` AND p.date >= $${params.length}`;
    }
    
    if (end_date) {
      params.push(end_date);
      whereClause += ` AND p.date <= $${params.length}`;
    }
    
    const query = `
      SELECT 
        c.id,
        c.name as campaign_name,
        c.platform,
        c.status,
        c.created_at,
        COUNT(DISTINCT a.id) as ad_count,
        COALESCE(SUM(p.spend), 0) as total_spend,
        COALESCE(SUM(p.impressions), 0) as total_impressions,
        COALESCE(SUM(p.clicks), 0) as total_clicks,
        COALESCE(SUM(p.conversions), 0) as total_conversions,
        CASE 
          WHEN COALESCE(SUM(p.impressions), 0) > 0 THEN ROUND((COALESCE(SUM(p.clicks), 0)::float / SUM(p.impressions) * 100)::numeric, 2)
          ELSE 0 
        END as ctr,
        CASE 
          WHEN COALESCE(SUM(p.clicks), 0) > 0 THEN ROUND((COALESCE(SUM(p.conversions), 0)::float / SUM(p.clicks) * 100)::numeric, 2)
          ELSE 0 
        END as cvr,
        CASE 
          WHEN COALESCE(SUM(p.conversions), 0) > 0 THEN ROUND((COALESCE(SUM(p.spend), 0)::float / SUM(p.conversions))::numeric, 2)
          ELSE 0 
        END as cpa
      FROM t_ad_campaign c
      LEFT JOIN t_ad a ON c.raw_campaign_id = a.raw_campaign_id
      LEFT JOIN t_ad_daily_performance p ON a.raw_ad_id = p.raw_ad_id
      ${whereClause}
      GROUP BY c.id, c.name, c.platform, c.status, c.created_at
      ORDER BY ${sort_by} ${sort_order}
      LIMIT ${limit};
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      campaigns: result.rows,
      total: result.rowCount
    });
    
  } catch (error) {
    console.error('Campaign analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign analytics'
    });
  }
});

// Get ad performance analytics
router.get('/ads', async (req, res) => {
  try {
    const { 
      campaign_id, 
      platform, 
      start_date, 
      end_date, 
      limit = 50 
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (campaign_id) {
      params.push(campaign_id);
      whereClause += ` AND a.raw_campaign_id = $${params.length}`;
    }
    
    if (platform) {
      params.push(platform);
      whereClause += ` AND c.platform = $${params.length}`;
    }
    
    if (start_date) {
      params.push(start_date);
      whereClause += ` AND p.date >= $${params.length}`;
    }
    
    if (end_date) {
      params.push(end_date);
      whereClause += ` AND p.date <= $${params.length}`;
    }
    
    const query = `
      SELECT 
        a.id,
        a.name as ad_name,
        a.status as ad_type,
        a.creative_id as creative_url,
        c.name as campaign_name,
        c.platform,
        COALESCE(SUM(p.spend), 0) as total_spend,
        COALESCE(SUM(p.impressions), 0) as total_impressions,
        COALESCE(SUM(p.clicks), 0) as total_clicks,
        COALESCE(SUM(p.conversions), 0) as total_conversions,
        CASE 
          WHEN COALESCE(SUM(p.impressions), 0) > 0 THEN ROUND((COALESCE(SUM(p.clicks), 0)::float / SUM(p.impressions) * 100)::numeric, 2)
          ELSE 0 
        END as ctr,
        CASE 
          WHEN COALESCE(SUM(p.clicks), 0) > 0 THEN ROUND((COALESCE(SUM(p.conversions), 0)::float / SUM(p.clicks) * 100)::numeric, 2)
          ELSE 0 
        END as cvr,
        CASE 
          WHEN COALESCE(SUM(p.conversions), 0) > 0 THEN ROUND((COALESCE(SUM(p.spend), 0)::float / SUM(p.conversions))::numeric, 2)
          ELSE 0 
        END as cpa
      FROM t_ad a
      JOIN t_ad_campaign c ON a.raw_campaign_id = c.raw_campaign_id
      LEFT JOIN t_ad_daily_performance p ON a.raw_ad_id = p.raw_ad_id
      ${whereClause}
      GROUP BY a.id, a.name, a.status, a.creative_id, c.name, c.platform
      ORDER BY total_conversions DESC
      LIMIT ${limit};
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      ads: result.rows,
      total: result.rowCount
    });
    
  } catch (error) {
    console.error('Ad analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ad analytics'
    });
  }
});

// Get performance metrics by date range
router.get('/performance', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      group_by = 'date',
      platform 
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (start_date) {
      params.push(start_date);
      whereClause += ` AND p.date >= $${params.length}`;
    }
    
    if (end_date) {
      params.push(end_date);
      whereClause += ` AND p.date <= $${params.length}`;
    }
    
    if (platform) {
      params.push(platform);
      whereClause += ` AND c.platform = $${params.length}`;
    }
    
    let groupByClause = 'DATE(p.date)';
    if (group_by === 'week') {
      groupByClause = 'DATE_TRUNC(\'week\', p.date)';
    } else if (group_by === 'month') {
      groupByClause = 'DATE_TRUNC(\'month\', p.date)';
    }
    
    const query = `
      SELECT 
        ${groupByClause} as period,
        COALESCE(SUM(p.spend), 0) as total_spend,
        COALESCE(SUM(p.impressions), 0) as total_impressions,
        COALESCE(SUM(p.clicks), 0) as total_clicks,
        COALESCE(SUM(p.conversions), 0) as total_conversions,
        COUNT(DISTINCT c.id) as active_campaigns,
        COUNT(DISTINCT a.id) as active_ads,
        CASE 
          WHEN COALESCE(SUM(p.impressions), 0) > 0 THEN ROUND((COALESCE(SUM(p.clicks), 0)::float / SUM(p.impressions) * 100)::numeric, 2)
          ELSE 0 
        END as ctr,
        CASE 
          WHEN COALESCE(SUM(p.clicks), 0) > 0 THEN ROUND((COALESCE(SUM(p.conversions), 0)::float / SUM(p.clicks) * 100)::numeric, 2)
          ELSE 0 
        END as cvr,
        CASE 
          WHEN COALESCE(SUM(p.conversions), 0) > 0 THEN ROUND((COALESCE(SUM(p.spend), 0)::float / SUM(p.conversions))::numeric, 2)
          ELSE 0 
        END as cpa
      FROM t_ad_daily_performance p
      JOIN t_ad a ON p.raw_ad_id = a.raw_ad_id
      JOIN t_ad_campaign c ON a.raw_campaign_id = c.raw_campaign_id
      ${whereClause}
      GROUP BY ${groupByClause}
      ORDER BY period ASC;
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      group_by: group_by,
      performance: result.rows
    });
    
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance analytics'
    });
  }
});

// Get audience demographics
router.get('/audience', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      group_by = 'platform',
      platform 
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (start_date) {
      params.push(start_date);
      whereClause += ` AND p.date >= $${params.length}`;
    }
    
    if (end_date) {
      params.push(end_date);
      whereClause += ` AND p.date <= $${params.length}`;
    }
    
    if (platform) {
      params.push(platform);
      whereClause += ` AND c.platform = $${params.length}`;
    }
    
    const query = `
      SELECT 
        c.${group_by},
        COALESCE(SUM(p.spend), 0) as total_spend,
        COALESCE(SUM(p.impressions), 0) as total_impressions,
        COALESCE(SUM(p.clicks), 0) as total_clicks,
        COALESCE(SUM(p.conversions), 0) as total_conversions,
        COUNT(DISTINCT c.id) as campaign_count,
        CASE 
          WHEN COALESCE(SUM(p.impressions), 0) > 0 THEN ROUND((COALESCE(SUM(p.clicks), 0)::float / SUM(p.impressions) * 100)::numeric, 2)
          ELSE 0 
        END as ctr,
        CASE 
          WHEN COALESCE(SUM(p.clicks), 0) > 0 THEN ROUND((COALESCE(SUM(p.conversions), 0)::float / SUM(p.clicks) * 100)::numeric, 2)
          ELSE 0 
        END as cvr
      FROM t_ad_daily_performance p
      JOIN t_ad a ON p.raw_ad_id = a.raw_ad_id
      JOIN t_ad_campaign c ON a.raw_campaign_id = c.raw_campaign_id
      ${whereClause}
      GROUP BY c.${group_by}
      ORDER BY total_conversions DESC;
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      group_by: group_by,
      audience: result.rows
    });
    
  } catch (error) {
    console.error('Audience analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audience analytics'
    });
  }
});

// Get conversion funnel analysis
router.get('/funnel', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      platform 
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (start_date) {
      params.push(start_date);
      whereClause += ` AND p.date >= $${params.length}`;
    }
    
    if (end_date) {
      params.push(end_date);
      whereClause += ` AND p.date <= $${params.length}`;
    }
    
    if (platform) {
      params.push(platform);
      whereClause += ` AND c.platform = $${params.length}`;
    }
    
    const query = `
      SELECT 
        'Impressions' as stage,
        COALESCE(SUM(p.impressions), 0) as count,
        100 as conversion_rate
      FROM t_ad_daily_performance p
      JOIN t_ad a ON p.raw_ad_id = a.raw_ad_id
      JOIN t_ad_campaign c ON a.raw_campaign_id = c.raw_campaign_id
      ${whereClause}
      
      UNION ALL
      
      SELECT 
        'Clicks' as stage,
        COALESCE(SUM(p.clicks), 0) as count,
        CASE 
          WHEN COALESCE(SUM(p.impressions), 0) > 0 THEN ROUND((COALESCE(SUM(p.clicks), 0)::float / SUM(p.impressions) * 100)::numeric, 2)
          ELSE 0 
        END as conversion_rate
      FROM t_ad_daily_performance p
      JOIN t_ad a ON p.raw_ad_id = a.raw_ad_id
      JOIN t_ad_campaign c ON a.raw_campaign_id = c.raw_campaign_id
      ${whereClause}
      
      UNION ALL
      
      SELECT 
        'Conversions' as stage,
        COALESCE(SUM(p.conversions), 0) as count,
        CASE 
          WHEN COALESCE(SUM(p.clicks), 0) > 0 THEN ROUND((COALESCE(SUM(p.conversions), 0)::float / SUM(p.clicks) * 100)::numeric, 2)
          ELSE 0 
        END as conversion_rate
      FROM t_ad_daily_performance p
      JOIN t_ad a ON p.raw_ad_id = a.raw_ad_id
      JOIN t_ad_campaign c ON a.raw_campaign_id = c.raw_campaign_id
      ${whereClause}
      
      ORDER BY 
        CASE stage
          WHEN 'Impressions' THEN 1
          WHEN 'Clicks' THEN 2
          WHEN 'Conversions' THEN 3
        END;
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      funnel: result.rows
    });
    
  } catch (error) {
    console.error('Funnel analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch funnel analytics'
    });
  }
});

// Get basic usage analytics data
router.get('/usage', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    
    // Get total requests in last 24 hours
    const totalRequests = await pool.query(`
      SELECT COUNT(*) as count 
      FROM t_usage_logs 
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
    `);
    
    // Get success rate in last 24 hours
    const successRate = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE success = true) as successful,
        COUNT(*) as total,
        ROUND((COUNT(*) FILTER (WHERE success = true)::float / COUNT(*) * 100)::numeric, 2) as rate
      FROM t_usage_logs 
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
    `);
    
    // Get average response time in last 24 hours
    const avgResponseTime = await pool.query(`
      SELECT AVG(total_execution_time_ms) as avg_time
      FROM t_usage_logs 
      WHERE timestamp >= NOW() - INTERVAL '24 hours' AND success = true
    `);
    
    res.json({
      success: true,
      data: {
        totalRequests: totalRequests.rows[0].count,
        successRate: successRate.rows[0].rate || 0,
        avgResponseTime: Math.round(avgResponseTime.rows[0].avg_time || 0),
        successfulRequests: successRate.rows[0].successful,
        totalRequestsInPeriod: successRate.rows[0].total
      }
    });
  } catch (error) {
    console.error('Usage analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage analytics'
    });
  }
});

// Get usage analytics from the view
router.get('/usage-details', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { hours = 24 } = req.query;
    
    const usageData = await pool.query(`
      SELECT * FROM v_usage_analytics 
      WHERE hour_bucket >= NOW() - INTERVAL '${hours} hours'
      ORDER BY hour_bucket DESC
      LIMIT 50
    `);
    
    res.json({
      success: true,
      data: usageData.rows
    });
  } catch (error) {
    console.error('Usage details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage details'
    });
  }
});

// Get error analysis
router.get('/errors', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { days = 7 } = req.query;
    
    const errorData = await pool.query(`
      SELECT * FROM v_error_analysis 
      WHERE last_occurrence >= NOW() - INTERVAL '${days} days'
      ORDER BY error_count DESC
      LIMIT 20
    `);
    
    res.json({
      success: true,
      data: errorData.rows
    });
  } catch (error) {
    console.error('Error analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error analysis'
    });
  }
});

// Get query type performance
router.get('/query-types', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { days = 7 } = req.query;
    
    const queryTypeData = await pool.query(`
      SELECT * FROM v_query_type_performance 
      WHERE query_type IS NOT NULL
      ORDER BY total_queries DESC
      LIMIT 20
    `);
    
    res.json({
      success: true,
      data: queryTypeData.rows
    });
  } catch (error) {
    console.error('Query type performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch query type performance'
    });
  }
});

// Get recent logs
router.get('/logs', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { limit = 50, success } = req.query;
    
    let whereClause = '';
    if (success !== undefined) {
      whereClause = `WHERE success = ${success === 'true'}`;
    }
    
    const logs = await pool.query(`
      SELECT 
        session_id, user_message, success, row_count, 
        total_execution_time_ms, query_type, error_message,
        timestamp
      FROM t_usage_logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT ${parseInt(limit)}
    `);
    
    res.json({
      success: true,
      data: logs.rows
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs'
    });
  }
});

module.exports = router; 