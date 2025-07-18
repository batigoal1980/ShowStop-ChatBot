import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Filter, Download } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [campaignsRes, performanceRes] = await Promise.all([
        axios.get('/api/analytics/campaigns?limit=10'),
        axios.get('/api/analytics/performance?period=30')
      ]);

      setAnalytics({
        campaigns: campaignsRes.data.success ? campaignsRes.data.campaigns : [],
        performance: performanceRes.data.success ? performanceRes.data.performance : []
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Detailed marketing performance insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Top Campaigns */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Campaigns</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CTR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CVR
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics?.campaigns?.slice(0, 5).map((campaign, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {campaign.campaign_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.platform}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${campaign.total_spend?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.total_conversions?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.ctr || 0}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.cvr || 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
          <div className="space-y-4">
            {analytics?.performance?.slice(-7).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {new Date(item.period).toLocaleDateString()}
                </span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-900">
                    ${item.total_spend?.toLocaleString() || 0}
                  </span>
                  <span className="text-sm text-gray-500">
                    {item.total_conversions || 0} conv.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">Total Active Campaigns</span>
              <span className="text-sm font-medium text-blue-900">
                {analytics?.campaigns?.length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-700">Total Spend (30 days)</span>
              <span className="text-sm font-medium text-green-900">
                ${analytics?.performance?.reduce((sum, item) => sum + (item.total_spend || 0), 0).toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-purple-700">Total Conversions (30 days)</span>
              <span className="text-sm font-medium text-purple-900">
                {analytics?.performance?.reduce((sum, item) => sum + (item.total_conversions || 0), 0).toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center space-x-3 mb-4">
          <TrendingUp className="h-6 w-6" />
          <h3 className="text-lg font-medium">AI-Powered Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <h4 className="font-medium mb-2">Top Performing Platform</h4>
            <p className="text-blue-100">Meta Ads shows highest conversion rates</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <h4 className="font-medium mb-2">Optimization Opportunity</h4>
            <p className="text-blue-100">Consider increasing budget for high-CTR campaigns</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <h4 className="font-medium mb-2">Trend Analysis</h4>
            <p className="text-blue-100">Conversion rates improving over the last 30 days</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 