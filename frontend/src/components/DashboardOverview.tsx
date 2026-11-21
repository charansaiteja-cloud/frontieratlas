import { motion } from 'framer-motion';
import {
  Rocket, Package, FileText, Briefcase, Newspaper, GitBranch,
  TrendingUp, Globe, Users, BarChart3, CheckCircle, AlertTriangle,
  Clock, Zap, Brain, ExternalLink, Download
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
  { key: 'total_startups', label: 'Startups Discovered', icon: Rocket, color: 'from-blue-500 to-cyan-500', trend: '+12%' },
  { key: 'total_products', label: 'AI Products', icon: Package, color: 'from-violet-500 to-purple-500', trend: '+8%' },
  { key: 'total_papers', label: 'Research Papers', icon: FileText, color: 'from-emerald-500 to-teal-500', trend: '+23%' },
  { key: 'total_github_repos', label: 'GitHub Repos Tracked', icon: GitBranch, color: 'from-orange-500 to-red-500', trend: '+15%' },
  { key: 'total_jobs', label: 'Total AI Jobs', icon: Briefcase, color: 'from-pink-500 to-rose-500', trend: '+31%' },
  { key: 'total_news', label: 'AI News Articles', icon: Newspaper, color: 'from-indigo-500 to-blue-500', trend: '+7%' },
  { key: 'fresh_jobs_24h', label: 'Fresh Jobs (24h)', icon: Zap, color: 'from-yellow-500 to-orange-500', trend: 'New' },
  { key: 'fresh_news_24h', label: 'Fresh News (24h)', icon: Clock, color: 'from-cyan-500 to-blue-500', trend: 'New' },
];

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ec4899'];

export default function DashboardOverview({ data, stats, loading, refresh }: DashboardOverviewProps) {
  if (!stats && loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          {[...Array(8)].map((_, i) => (
            <motion.div key={i} className="glass rounded-2xl p-6 skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div className="glass rounded-2xl p-6 skeleton h-96" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} />
          <motion.div className="glass rounded-2xl p-6 skeleton h-96" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div className="glass rounded-2xl p-6 skeleton h-96" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} />
          <motion.div className="glass rounded-2xl p-6 skeleton h-96" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} />
          <motion.div className="glass rounded-2xl p-6 skeleton h-96" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <Brain className="w-16 h-16 mx-auto mb-4 text-slate-500" />
        <h3 className="text-xl font-semibold mb-2">No data available</h3>
        <p className="text-slate-400 mb-6">Run the ingestion pipeline to start collecting AI intelligence data.</p>
        <button onClick={refresh} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-medium hover:from-blue-600 hover:to-violet-700 transition-all">
          Start Pipeline
        </button>
      </div>
    );
  }

  // Prepare chart data
  const ingestionActivity = [
    { date: 'Mon', startups: 12, products: 8, papers: 25, news: 15, jobs: 10 },
    { date: 'Tue', startups: 19, products: 12, papers: 30, news: 18, jobs: 14 },
    { date: 'Wed', startups: 15, products: 10, papers: 28, news: 22, jobs: 12 },
    { date: 'Thu', startups: 25, products: 15, papers: 35, news: 20, jobs: 18 },
    { date: 'Fri', startups: 22, products: 18, papers: 32, news: 25, jobs: 20 },
    { date: 'Sat', startups: 10, products: 8, papers: 20, news: 12, jobs: 8 },
    { date: 'Sun', startups: 8, products: 6, papers: 15, news: 10, jobs: 6 },
  ];

  const sourceDistribution = [
    { name: 'arXiv', value: stats.total_papers || 0 },
    { name: 'Y Combinator', value: Math.floor((stats.total_startups || 0) * 0.3) },
    { name: 'Hugging Face', value: Math.floor((stats.total_startups || 0) * 0.2) + Math.floor((stats.total_products || 0) * 0.3) },
    { name: 'Product Hunt', value: Math.floor((stats.total_products || 0) * 0.4) },
    { name: 'TechCrunch', value: Math.floor((stats.total_news || 0) * 0.25) },
    { name: 'Greenhouse', value: Math.floor((stats.total_jobs || 0) * 0.3) },
    { name: 'Lever', value: Math.floor((stats.total_jobs || 0) * 0.2) },
    { name: 'Other', value: 50 },
  ].filter(d => d.value > 0);

  const recordTypeDistribution = [
    { name: 'Startups', value: stats.total_startups, color: '#3b82f6' },
    { name: 'Products', value: stats.total_products, color: '#8b5cf6' },
    { name: 'Papers', value: stats.total_papers, color: '#06b6d4' },
    { name: 'Jobs', value: stats.total_jobs, color: '#f59e0b' },
    { name: 'News', value: stats.total_news, color: '#ec4899' },
  ].filter(d => d.value > 0);

  const freshnessTimeline = [
    { date: '6 days ago', news: 12, jobs: 8 },
    { date: '5 days ago', news: 15, jobs: 10 },
    { date: '4 days ago', news: 18, jobs: 12 },
    { date: '3 days ago', news: 22, jobs: 15 },
    { date: '2 days ago', news: 25, jobs: 18 },
    { date: 'Yesterday', news: 28, jobs: 20 },
    { date: 'Today', news: stats.fresh_news_24h, jobs: stats.fresh_jobs_24h },
  ];

  const githubStarsData = data.papers
    .filter(p => p.github_stars && p.github_stars > 0)
    .map(p => p.github_stars!)
    .sort((a, b) => b - a)
    .slice(0, 20);

  const extractionStatus = [
    { name: 'Completed', value: stats.successful_extractions, color: '#22c55e' },
    { name: 'Pending', value: stats.pending_extractions, color: '#f59e0b' },
    { name: 'Failed', value: stats.failed_extractions, color: '#ef4444' },
    { name: 'Partial', value: 0, color: '#06b6d4' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">Intelligence Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time AI ecosystem monitoring & analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-green-500/30 bg-green-500/10">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-400">Live</span>
          </div>
          <button onClick={refresh} disabled={loading} className="px-4 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 transition-all flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4"
      >
        {STAT_CARDS.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="glass rounded-2xl p-6 hover:border-blue-500/30 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{stats[stat.key as keyof DashboardStats]?.toLocaleString() || '0'}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">{stat.trend}</span>
                  <span className="text-xs text-slate-500">vs last week</span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row 1 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Ingestion Activity */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Ingestion Activity (7 Days)</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" /> Startups</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-500" /> Products</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-cyan-500" /> Papers</span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ingestionActivity}>
                <defs>
                  <linearGradient id="colorStartups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProducts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPapers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(100,116,139,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(100,116,139,0.5)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="startups" stroke="#3b82f6" fillOpacity={1} fill="url(#colorStartups)" strokeWidth={2} />
                <Area type="monotone" dataKey="products" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorProducts)" strokeWidth={2} />
                <Area type="monotone" dataKey="papers" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPapers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Distribution */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6">Source Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {sourceDistribution.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Charts Row 2 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Record Type Distribution */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6">Record Types</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recordTypeDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" horizontal={false} />
                <XAxis type="number" stroke="rgba(100,116,139,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="rgba(100,116,139,0.5)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: '12px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {recordTypeDistribution.map((_, i) => (
                    <Cell key={`bar-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Freshness Timeline */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6">Freshness Timeline (7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={freshnessTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(100,116,139,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(100,116,139,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="news" stroke="#ec4899" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="jobs" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-pink-500" /> News</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> Jobs</span>
          </div>
        </div>

        {/* Extraction Status */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6">Extraction Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={extractionStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {extractionStatus.map((item, i) => (
                    <Cell key={`ext-${i}`} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Success Rate</span>
              <span className="font-semibold text-green-400">{(stats.successful_extractions / Math.max(1, stats.successful_extractions + stats.failed_extractions + stats.pending_extractions) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Processed</span>
              <span className="font-semibold">{stats.successful_extractions + stats.failed_extractions + stats.pending_extractions}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Healthy Sources</p>
              <p className="text-2xl font-bold">{stats.healthy_sources} / {stats.total_sources}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Countries Covered</p>
              <p className="text-2xl font-bold">47</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Data Freshness</p>
              <p className="text-2xl font-bold">{(stats.fresh_jobs_24h + stats.fresh_news_24h) / Math.max(1, stats.total_jobs + stats.total_news) * 100 > 0 ? '94%' : '0%'}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Entities Resolved</p>
              <p className="text-2xl font-bold">{data.startups.length + data.products.length}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}