import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from './ui';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendingUp, BarChart2, Eye, ThumbsUp, MessageSquare, Award } from 'lucide-react';

export default function AnalyticsTab({ posts = [] }) {
  // Compute chart data from posts
  const chartData = [...posts]
    .reverse()
    .map((p, idx) => ({
      name: `Post #${idx + 1}`,
      date: new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      impressions: p.metrics?.impressions || 0,
      reactions: p.metrics?.reactions || 0,
      comments: p.metrics?.comments || 0,
      language: p.language
    }));

  const arPosts = posts.filter(p => p.language === 'AR');
  const enPosts = posts.filter(p => p.language === 'EN');

  const totalImpressions = posts.reduce((sum, p) => sum + (p.metrics?.impressions || 0), 0);
  const totalReactions = posts.reduce((sum, p) => sum + (p.metrics?.reactions || 0), 0);
  const avgImpressions = posts.length > 0 ? Math.round(totalImpressions / posts.length) : 0;
  const engagementRate = totalImpressions > 0 ? ((totalReactions / totalImpressions) * 100).toFixed(1) : '0.0';

  const langComparison = [
    {
      language: 'English 🇬🇧',
      avgViews: enPosts.length > 0 ? Math.round(enPosts.reduce((s, p) => s + (p.metrics?.impressions || 0), 0) / enPosts.length) : 0,
      count: enPosts.length
    },
    {
      language: 'Arabic 🇸🇦',
      avgViews: arPosts.length > 0 ? Math.round(arPosts.reduce((s, p) => s + (p.metrics?.impressions || 0), 0) / arPosts.length) : 0,
      count: arPosts.length
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-400" />
          LinkedIn Growth Analytics & Recruiter Reach
        </h2>
        <p className="text-xs text-slate-400">
          Visual insights into post reach, engagement rate, and language performance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Total Impressions</span>
              <Eye className="w-4 h-4 text-blue-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{totalImpressions.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500">Across {posts.length} tracked posts</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Total Reactions</span>
              <ThumbsUp className="w-4 h-4 text-emerald-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{totalReactions.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500">Likes, praises, & reposts</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Avg Views / Post</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{avgImpressions.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-500">Average recruiter dwell</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Engagement Rate</span>
              <Award className="w-4 h-4 text-amber-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{engagementRate}%</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-emerald-400 font-medium">Target: &gt; 2.5%</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Impressions Over Time */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Impression Velocity Over Time</span>
              <Badge variant="default">Daily Trend</Badge>
            </CardTitle>
            <CardDescription>Track growth in organic views per post</CardDescription>
          </CardHeader>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0F17', borderColor: '#334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#F1F5F9' }}
                  />
                  <Line type="monotone" dataKey="impressions" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="reactions" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Log post views in the Posts tab to see your curve!
              </div>
            )}
          </div>
        </Card>

        {/* Arabic vs English Comparison */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Language Performance Comparison</span>
              <Badge variant="purple">AR vs EN</Badge>
            </CardTitle>
            <CardDescription>Average impressions per language</CardDescription>
          </CardHeader>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={langComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="language" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B0F17', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="avgViews" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Avg Impressions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
