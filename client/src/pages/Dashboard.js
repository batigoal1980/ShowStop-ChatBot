import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, Target, BarChart3, Calendar } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/overview');
      if (response.data.success) {
        setOverview(response.data.metrics);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    {
      name: 'Total Campaigns',
      value: overview?.total_campaigns || 0,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Total Ads',
      value: overview?.total_ads || 0,
      icon: BarChart3,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Total Spend',
      value: `$${(overview?.total_spend || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Total Conversions',
      value: (overview?.total_conversions || 0).toLocaleString(),
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your marketing performance</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Click-Through Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {overview?.avg_ctr || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Conversion Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {overview?.avg_cvr || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cost Per Acquisition</span>
              <span className="text-sm font-medium text-gray-900">
                ${overview?.avg_cpa || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Impressions</span>
              <span className="text-sm font-medium text-gray-900">
                {(overview?.total_impressions || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Clicks</span>
              <span className="text-sm font-medium text-gray-900">
                {(overview?.total_clicks || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Conversions</span>
              <span className="text-sm font-medium text-gray-900">
                {(overview?.total_conversions || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors">
              View Chat Interface
            </button>
            <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg text-sm text-green-700 transition-colors">
              Export Reports
            </button>
            <button className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-sm text-purple-700 transition-colors">
              View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-8 w-8" />
          <div>
            <h3 className="text-lg font-medium">Welcome to ShowStop Analytics</h3>
            <p className="text-blue-100">
              Your AI-powered marketing analytics platform. Ask questions in natural language and get instant insights from your data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 