const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://admin:gHzAsyen7HFpmc6b@34.74.141.9:58832/prod_ad_insights',
  ssl: { rejectUnauthorized: false }
});

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

module.exports = router; 