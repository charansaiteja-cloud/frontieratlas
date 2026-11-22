'use client';

import { motion } from 'framer-motion';
import {
  Rocket, Package, FileText, Briefcase, Newspaper, GitBranch,
  TrendingUp, Globe, Users, BarChart3, CheckCircle, AlertTriangle,
  Clock, Zap, Brain, ExternalLink, Download, RefreshCw
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import type { DashboardStats, Startup, Product, Paper, Job, NewsItem } from '@/types';

interface DashboardOverviewProps {
  data: { startups: Startup[]; products: Product[]; papers: Paper[]; jobs: Job[]; news: NewsItem[] };
  stats: DashboardStats | null;
  loading: boolean;
  refresh: () => void;
}

const STAT_CARDS = [
  { key: 'total_startups', label: 'Startups Discovered', icon: Rocket, gradient: 'from-blue-500 to-cyan-500', trend: '+12%' },
  { key: 'total_products', label: 'AI Products', icon: Package, gradient: 'from-violet-500 to-purple-500', trend: '+8%' },
  { key: 'total_papers', label: 'Research Papers', icon: FileText, gradient: 'from-emerald-500 to-teal-500', trend: '+23%' },
  { key: 'total_jobs', label: 'AI Jobs', icon: Briefcase, gradient: 'from-amber-500 to-orange-500', trend: '+15%' },
  { key: 'total_news', label: 'AI News', icon: Newspaper, gradient: 'from-rose-500 to-pink-500', trend: '+31%' },
  { key: 'successful_extractions', label: 'Extractions', icon: CheckCircle, gradient: 'from-green-500 to-emerald-500', trend: '94.2%' },
];

const RECENT_ITEMS = [
  { key: 'startups', label: 'Latest Startups', icon: Rocket, color: 'blue', dataKey: 'startups' as keyof DashboardOverviewProps['data'] },
  { key: 'products', label: 'Latest Products', icon: Package, color: 'violet', dataKey: 'products' as keyof DashboardOverviewProps['data'] },
  { key: 'papers', label: 'Latest Papers', icon: FileText, color: 'emerald', dataKey: 'papers' as keyof DashboardOverviewProps['data'] },
  { key: 'jobs', label: 'Latest Jobs', icon: Briefcase, color: 'amber', dataKey: 'jobs' as keyof DashboardOverviewProps['data'] },
  { key: 'news', label: 'Latest News', icon: Newspaper, color: 'rose', dataKey: 'news' as keyof DashboardOverviewProps['data'] },
];

const ICON_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-400',
  violet: 'bg-violet-500/20 text-violet-400',
  emerald: 'bg-emerald-500/20 text-emerald-400',
  amber: 'bg-amber-500/20 text-amber-400',
  rose: 'bg-rose-500/20 text-rose-400',
};

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

export default function DashboardOverview({ data, stats, loading, refresh }: DashboardOverviewProps) {
  const statValues = stats ? [
    stats.total_startups,
    stats.total_products,
    stats.total_papers,
    stats.total_jobs,
    stats.total_news,
    stats.successful_extractions,
  ] : [0, 0, 0, 0, 0, 0];

  // Sample chart data for extraction rate over time
  const chartData = [
    { name: 'Mon', extractions: 45, success: 42, failed: 3 },
    { name: 'Tue', extractions: 52, success: 48, failed: 4 },
    { name: 'Wed', extractions: 48, success: 45, failed: 3 },
    { name: 'Thu', extractions: 61, success: 57, failed: 4 },
    { name: 'Fri', extractions: 55, success: 52, failed: 3 },
    { name: 'Sat', extractions: 38, success: 35, failed: 3 },
    { name: 'Sun', extractions: 42, success: 39, failed: 3 },
  ];

  const sourceDistribution = [
    { name: 'Startups', value: data.startups.length, color: '#3b82f6' },
    { name: 'Products', value: data.products.length, color: '#8b5cf6' },
    { name: 'Papers', value: data.papers.length, color: '#06b6d4' },
    { name: 'Jobs', value: data.jobs.length, color: '#f59e0b' },
    { name: 'News', value: data.news.length, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-gradient">Dashboard</h1>
            <p className="text-slate-400 mt-1">Global AI Intelligence Overview</p>
          </div>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-6">
              <div className="skeleton h-6 w-3/4 mb-2 rounded" />
              <div className="skeleton h-8 w-1/2 rounded" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">Dashboard</h1>
          <p className="text-slate-400 mt-1">Global AI Intelligence Overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} disabled={loading} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        {STAT_CARDS.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="glass-card-hover p-6 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{statValues[i].toLocaleString()}</p>
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stat.trend} vs last week
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center glow-blue group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Extraction Rate Chart */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Extraction Rate (7 Days)</h3>
              <p className="text-sm text-slate-400 mt-1">Success vs failed extractions</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(148, 163, 184, 0.5)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(148, 163, 184, 0.5)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={val => val} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(20px)',
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                  itemStyle={{ fontWeight: 500 }}
                />
                <Area type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSuccess)" />
                <Area type="monotone" dataKey="failed" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorFailed)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Distribution */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Source Distribution</h3>
              <p className="text-sm text-slate-400 mt-1">Records by data source type</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            {sourceDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    stroke="transparent"
                  >
                    {sourceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(100, 116, 139, 0.3)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(20px)',
                    }}
                    formatter={(value: number) => [value.toLocaleString(), 'records']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-500 py-12">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No data available</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Recent Items Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      >
        {RECENT_ITEMS.map((item, i) => {
          const items = data[item.dataKey] as any[];
          const recentItems = items.slice(0, 3);

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-xl ${ICON_COLORS[item.color]} flex items-center justify-center`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-white">{item.label}</h4>
              </div>
              <div className="space-y-3">
                {recentItems.length > 0 ? (
                  recentItems.map((entry: any, idx: number) => (
                    <motion.div
                      key={`${item.key}-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 bg-gradient-to-r from-blue-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                          {entry.entity_name || entry.product_name || entry.title || entry.company || entry.headline}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {entry.source_name}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-500">
                    <p className="text-sm">No recent data</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}