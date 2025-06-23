'use client';

import React, { useState, useEffect } from 'react';
import { ContentService } from '@/lib/content';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  AcademicCapIcon, 
  TrophyIcon,
  ClockIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  // Platform Overview
  totalUsers: number;
  activeUsers: number;
  totalPaths: number;
  totalLessons: number;
  totalCertificates: number;
  
  // User Engagement
  avgSessionTime: number;
  completionRate: number;
  retentionRate: number;
  
  // Learning Progress
  totalXpEarned: number;
  avgXpPerUser: number;
  topPerformers: Array<{
    id: string;
    name: string;
    email: string;
    totalXp: number;
    level: number;
    title: string;
  }>;
  
  // Content Analytics
  popularPaths: Array<{
    id: string;
    title: string;
    enrollments: number;
    completions: number;
    avgRating: number;
  }>;
  
  // Recent Activity
  recentActivities: Array<{
    id: string;
    type: 'lesson_completed' | 'path_started' | 'certificate_earned' | 'level_up';
    userName: string;
    contentTitle: string;
    timestamp: string;
  }>;
  
  // Time-based metrics
  dailyActiveUsers: Array<{
    date: string;
    users: number;
  }>;
  
  weeklyProgress: Array<{
    week: string;
    lessonsCompleted: number;
    xpEarned: number;
  }>;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon: Icon, color }) => {
  const changeColor = change && change > 0 ? 'text-green-600' : 'text-red-600';
  const ChangeIcon = change && change > 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 ${changeColor}`}>
              <ChangeIcon className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
};

const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await ContentService.getAnalytics(timeRange);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadAnalytics}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Platform insights and learning metrics</p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Users"
          value={analytics.totalUsers.toLocaleString()}
          change={12}
          icon={UserGroupIcon}
          color="bg-blue-500"
        />
        <MetricCard
          title="Active Learners"
          value={analytics.activeUsers.toLocaleString()}
          change={8}
          icon={FireIcon}
          color="bg-green-500"
        />
        <MetricCard
          title="Certificates Issued"
          value={analytics.totalCertificates.toLocaleString()}
          change={25}
          icon={TrophyIcon}
          color="bg-yellow-500"
        />
        <MetricCard
          title="Completion Rate"
          value={`${analytics.completionRate}%`}
          change={-3}
          icon={CheckCircleIcon}
          color="bg-purple-500"
        />
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Learning Progress Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Learning Progress</h3>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Lessons Completed</span>
                <span>{analytics.weeklyProgress.reduce((sum, week) => sum + week.lessonsCompleted, 0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Total XP Earned</span>
                <span>{analytics.totalXpEarned.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Avg Session Time</span>
                <span>{Math.round(analytics.avgSessionTime)} min</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
            <TrophyIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {analytics.topPerformers.slice(0, 5).map((user, index) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-800' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{user.totalXp.toLocaleString()} XP</p>
                  <p className="text-xs text-gray-500">Level {user.level}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Content and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Learning Paths */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Popular Learning Paths</h3>
            <EyeIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {analytics.popularPaths.slice(0, 5).map((path) => (
              <div key={path.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{path.title}</p>
                  <p className="text-xs text-gray-500">
                    {path.enrollments} enrollments • {path.completions} completions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {Math.round((path.completions / path.enrollments) * 100)}%
                  </p>
                  <p className="text-xs text-gray-500">completion</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <ClockIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {analytics.recentActivities.slice(0, 6).map((activity) => (
              <div key={activity.id} className="flex items-start">
                <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                  activity.type === 'certificate_earned' ? 'bg-yellow-500' :
                  activity.type === 'level_up' ? 'bg-purple-500' :
                  activity.type === 'path_started' ? 'bg-blue-500' :
                  'bg-green-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.userName}</span>
                    {activity.type === 'lesson_completed' && ' completed '}
                    {activity.type === 'path_started' && ' started '}
                    {activity.type === 'certificate_earned' && ' earned certificate for '}
                    {activity.type === 'level_up' && ' leveled up in '}
                    <span className="font-medium">{activity.contentTitle}</span>
                  </p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 