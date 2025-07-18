const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://admin:gHzAsyen7HFpmc6b@34.74.141.9:58832/prod_ad_insights',
  ssl: { rejectUnauthorized: false }
});

// Get dashboard overview metrics
router.get('/overview', async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    
    const overviewQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as total_campaigns,
        COUNT(DISTINCT a.id) as total_ads,
        COALESCE(SUM(p.spend), 0) as total_spend,
        COALESCE(SUM(p.impressions), 0) as total_impressions,
        COALESCE(SUM(p.clicks), 0) as total_clicks,
        COALESCE(SUM(p.conversions), 0) as total_conversions,
        CASE 
          WHEN COALESCE(SUM(p.impressions), 0) > 0 THEN ROUND((COALESCE(SUM(p.clicks), 0)::float / SUM(p.impressions) * 100)::numeric, 2)
          ELSE 0 
        END as avg_ctr,
        CASE 
          WHEN COALESCE(SUM(p.clicks), 0) > 0 THEN ROUND((COALESCE(SUM(p.conversions), 0)::float / SUM(p.clicks) * 100)::numeric, 2)
          ELSE 0 
        END as avg_cvr,
        CASE 
          WHEN COALESCE(SUM(p.conversions), 0) > 0 THEN ROUND((COALESCE(SUM(p.spend), 0)::float / SUM(p.conversions))::numeric, 2)
          ELSE 0 
        END as avg_cpa
      FROM t_ad_campaign c
      LEFT JOIN t_ad a ON c.raw_campaign_id = a.raw_campaign_id
      LEFT JOIN t_ad_daily_performance p ON a.raw_ad_id = p.raw_ad_id
      WHERE p.date >= CURRENT_DATE - INTERVAL '${period} days'
        OR p.date IS NULL;
    `;
    
    const result = await pool.query(overviewQuery);
    
    res.json({
      success: true,
      period: `${period} days`,
      metrics: result.rows[0]
    });
    
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard overview'
    });
  }
});

// Get performance trends over time
router.get('/trends', async (req, res) => {
  try {
    const { period = '30', metric = 'spend' } = req.query;
    
    const trendsQuery = `
      SELECT 
        DATE(p.date) as date,
        COALESCE(SUM(p.${metric}), 0) as value,
        COUNT(DISTINCT c.id) as active_campaigns
      FROM t_ad_daily_performance p
      JOIN t_ad a ON p.raw_ad_id = a.raw_ad_id
      JOIN t_ad_campaign c ON a.raw_campaign_id = c.raw_campaign_id
      WHERE p.date >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY DATE(p.date)
      ORDER BY date ASC;
    `;
    
    const result = await pool.query(trendsQuery);
    
    res.json({
      success: true,
      period: `${period} days`,
      metric: metric,
      trends: result.rows
    });
    
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance trends'
    });
  }
});

// Get top performing campaigns
router.get('/top-campaigns', async (req, res) => {
  try {
    const { limit = 10, period = '30' } = req.query;
    
    const topCampaignsQuery = `
      SELECT 
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
      FROM t_ad_campaign c
      JOIN t_ad a ON c.raw_campaign_id = a.raw_campaign_id
      JOIN t_ad_daily_performance p ON a.raw_ad_id = p.raw_ad_id
      WHERE p.date >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY c.id, c.name, c.platform
      ORDER BY total_conversions DESC
      LIMIT ${limit};
    `;
    
    const result = await pool.query(topCampaignsQuery);
    
    res.json({
      success: true,
      period: `${period} days`,
      campaigns: result.rows
    });
    
  } catch (error) {
    console.error('Top campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top campaigns'
    });
  }
});

// Get platform comparison
router.get('/platform-comparison', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    
    const platformQuery = `
      SELECT 
        c.platform,
        COUNT(DISTINCT c.id) as campaign_count,
        COALESCE(SUM(p.spend), 0) as total_spend,
        COALESCE(SUM(p.impressions), 0) as total_impressions,
        COALESCE(SUM(p.clicks), 0) as total_clicks,
        COALESCE(SUM(p.conversions), 0) as total_conversions,
        CASE 
          WHEN COALESCE(SUM(p.impressions), 0) > 0 THEN ROUND((COALESCE(SUM(p.clicks), 0)::float / SUM(p.impressions) * 100)::numeric, 2)
          ELSE 0 
        END as avg_ctr,
        CASE 
          WHEN COALESCE(SUM(p.clicks), 0) > 0 THEN ROUND((COALESCE(SUM(p.conversions), 0)::float / SUM(p.clicks) * 100)::numeric, 2)
          ELSE 0 
        END as avg_cvr,
        CASE 
          WHEN COALESCE(SUM(p.conversions), 0) > 0 THEN ROUND((COALESCE(SUM(p.spend), 0)::float / SUM(p.conversions))::numeric, 2)
          ELSE 0 
        END as avg_cpa
      FROM t_ad_campaign c
      JOIN t_ad a ON c.raw_campaign_id = a.raw_campaign_id
      JOIN t_ad_daily_performance p ON a.raw_ad_id = p.raw_ad_id
      WHERE p.date >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY c.platform
      ORDER BY total_spend DESC;
    `;
    
    const result = await pool.query(platformQuery);
    
    res.json({
      success: true,
      period: `${period} days`,
      platforms: result.rows
    });
    
  } catch (error) {
    console.error('Platform comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platform comparison'
    });
  }
});

// Get audience insights
router.get('/audience-insights', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    
    const audienceQuery = `
      SELECT 
        'All' as age_group,
        'All' as gender,
        'All' as location,
        COALESCE(SUM(p.spend), 0) as total_spend,
        COALESCE(SUM(p.impressions), 0) as total_impressions,
        COALESCE(SUM(p.clicks), 0) as total_clicks,
        COALESCE(SUM(p.conversions), 0) as total_conversions,
        CASE 
          WHEN COALESCE(SUM(p.impressions), 0) > 0 THEN ROUND((COALESCE(SUM(p.clicks), 0)::float / SUM(p.impressions) * 100)::numeric, 2)
          ELSE 0 
        END as ctr
      FROM t_ad_daily_performance p
      WHERE p.date >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY 1, 2, 3
      ORDER BY total_conversions DESC
      LIMIT 50;
    `;
    
    const result = await pool.query(audienceQuery);
    
    res.json({
      success: true,
      period: `${period} days`,
      audience: result.rows
    });
    
  } catch (error) {
    console.error('Audience insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audience insights'
    });
  }
});

// Get recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const activityQuery = `
      SELECT 
        c.name as campaign_name,
        c.platform,
        p.date,
        COALESCE(p.spend, 0) as spend,
        COALESCE(p.impressions, 0) as impressions,
        COALESCE(p.clicks, 0) as clicks,
        COALESCE(p.conversions, 0) as conversions
      FROM t_ad_daily_performance p
      JOIN t_ad a ON p.raw_ad_id = a.raw_ad_id
      JOIN t_ad_campaign c ON a.raw_campaign_id = c.raw_campaign_id
      ORDER BY p.date DESC
      LIMIT ${limit};
    `;
    
    const result = await pool.query(activityQuery);
    
    res.json({
      success: true,
      activity: result.rows
    });
    
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    });
  }
});

module.exports = router; 