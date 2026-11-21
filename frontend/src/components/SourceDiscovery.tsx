'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Search, Filter, ChevronDown, ChevronUp, Globe, Database, Server,
  Wifi, Zap, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Activity, TrendingUp, TrendingDown, ExternalLink, Plug,
  ToggleLeft, ToggleRight, Download, Upload, Eye, Settings,
  Shield, Star, Tag, Wrench, Target
} from 'lucide-react';
import type { APISource, SourceDiscoveryStats, APISourceHealthLog } from '@/types';
import {
  fetchAPISources,
  fetchAPISourcesStats,
  enableAPISource,
  disableAPISource,
  syncAPIRegistry,
  runAPIHealthChecks,
  fetchAPISourceHealthHistory,
  updateAPISource,
  fetchAPICategories
} from '@/lib/api';

interface SourceDiscoveryProps {
  loading: boolean;
  refresh: () => void;
}

const HEALTH_COLORS: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  HEALTHY: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', icon: CheckCircle, label: 'Healthy' },
  DEGRADED: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: AlertTriangle, label: 'Degraded' },
  UNHEALTHY: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle, label: 'Unhealthy' },
  UNKNOWN: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', icon: Activity, label: 'Unknown' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  DISABLED: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' },
  DEPRECATED: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  UNHEALTHY: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

const AUTH_COLORS: Record<string, { bg: string; text: string }> = {
  none: { bg: 'bg-green-500/20', text: 'text-green-400' },
  apiKey: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  OAuth: { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  'apiKey+OAuth': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

const CATEGORY_ICONS: Record<string, any> = {
  machine_learning: Server,
  news: Wifi,
  jobs: Zap,
  development: Database,
  open_data: Globe,
  open_source_projects: Server,
  business: TrendingUp,
  programming: Wrench,
  ai_startups: Target,
  research_papers: Server,
  github_repos: Globe,
  ai_products: Database,
  ai_news: Wifi,
  ai_jobs: Zap,
  ml_general: Server,
  business_intelligence: TrendingUp,
};

export default function SourceDiscovery({ loading, refresh }: SourceDiscoveryProps) {
  const [sources, setSources] = useState<APISource[]>([]);
  const [stats, setStats] = useState<SourceDiscoveryStats | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [healthFilter, setHealthFilter] = useState<string>('');
  const [enabledFilter, setEnabledFilter] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [healthHistory, setHealthHistory] = useState<APISourceHealthLog[]>([]);
  const [showHealthModal, setShowHealthModal] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadSources();
    loadStats();
    loadCategories();
  }, [page, categoryFilter, statusFilter, healthFilter, enabledFilter]);

  const loadSources = async () => {
    try {
      const res = await fetchAPISources({
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        health_status: healthFilter || undefined,
        enabled: enabledFilter === 'true' ? true : enabledFilter === 'false' ? false : undefined,
        search: search || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setSources(res);
      setTotal(res.length); // This is just for the current page, actual total would need a separate count endpoint
    } catch (error) {
      console.error('Failed to load API sources:', error);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetchAPISourcesStats();
      setStats(res);
      // Use stats total for pagination
      setTotal(res.total_sources);
    } catch (error) {
      console.error('Failed to load API source stats:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetchAPICategories();
      setCategories(res.categories.map((c: any) => c.category));
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncAPIRegistry();
      await loadSources();
      await loadStats();
      alert(`Sync complete: ${res.created} created, ${res.updated} updated, ${res.errors} errors`);
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleHealthCheck = async () => {
    setHealthChecking(true);
    try {
      const res = await runAPIHealthChecks();
      await loadSources();
      await loadStats();
      alert(`Health check complete: ${res.healthy} healthy, ${res.degraded} degraded, ${res.unhealthy} unhealthy`);
    } catch (error) {
      console.error('Health check failed:', error);
      alert('Health check failed');
    } finally {
      setHealthChecking(false);
    }
  };

  const handleToggleEnable = async (source: APISource) => {
    try {
      if (source.enabled) {
        await disableAPISource(source.id);
      } else {
        await enableAPISource(source.id);
      }
      await loadSources();
      await loadStats();
    } catch (error) {
      console.error('Failed to toggle source:', error);
    }
  };

  const handleViewHealthHistory = async (sourceId: string) => {
    try {
      const history = await fetchAPISourceHealthHistory(sourceId);
      setHealthHistory(history);
      setShowHealthModal(sourceId);
    } catch (error) {
      console.error('Failed to load health history:', error);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return formatDate(dateStr);
    } catch {
      return dateStr;
    }
  };

  const statCards = [
    { label: 'Total Sources', value: stats?.total_sources || 0, icon: Globe, color: 'text-cyan-400' },
    { label: 'Enabled', value: stats?.enabled_sources || 0, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Integrated', value: stats?.integrated_sources || 0, icon: Plug, color: 'text-violet-400' },
    { label: 'Need Review', value: stats?.sources_needing_review || 0, icon: AlertTriangle, color: 'text-yellow-400' },
    { label: 'Categories', value: categories.length, icon: Tag, color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">API Discovery Registry</h1>
          <p className="text-slate-400 mt-1">Discover, manage, and integrate external APIs for AI intelligence gathering</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleSync} disabled={syncing || loading} className="px-4 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 transition-all flex items-center gap-2 text-sm">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync from public-apis</span>
          </button>
          <button onClick={handleHealthCheck} disabled={healthChecking || loading} className="px-4 py-2 rounded-xl glass border border-white/10 hover:border-green-500/30 transition-all flex items-center gap-2 text-sm">
            <Activity className={`w-4 h-4 ${healthChecking ? 'animate-pulse' : ''}`} />
            <span>Run Health Checks</span>
          </button>
          <button onClick={refresh} disabled={loading} className="px-4 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 transition-all flex items-center gap-2 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-2xl p-4"
      >
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search APIs by name, description..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5"
            />
          </div>
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5 min-w-[150px]">
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5 min-w-[150px]">
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
            <option value="DEPRECATED">Deprecated</option>
            <option value="UNHEALTHY">Unhealthy</option>
          </select>
          <select value={healthFilter} onChange={e => { setHealthFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5 min-w-[150px]">
            <option value="">All Health</option>
            <option value="HEALTHY">Healthy</option>
            <option value="DEGRADED">Degraded</option>
            <option value="UNHEALTHY">Unhealthy</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          <select value={enabledFilter} onChange={e => { setEnabledFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5 min-w-[120px]">
            <option value="">All</option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>
      </motion.div>

      {/* Sources Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl overflow-hidden"
      >
        {loading && sources.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading API sources...</p>
          </div>
        ) : sources.length === 0 ? (
          <div className="p-12 text-center">
            <Globe className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2">No API sources discovered</h3>
            <p className="text-slate-400 mb-6">Click "Sync from public-apis" to discover 2000+ APIs across 50+ categories.</p>
            <button onClick={handleSync} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-medium">
              Sync from public-apis
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    {[
                      { key: 'name', label: 'API Name', width: '20%' },
                      { key: 'category', label: 'Category', width: '12%' },
                      { key: 'auth_type', label: 'Auth', width: '10%' },
                      { key: 'health_status', label: 'Health', width: '12%' },
                      { key: 'status', label: 'Status', width: '10%' },
                      { key: 'enabled', label: 'Enabled', width: '8%' },
                      { key: 'integration_priority', label: 'Priority', width: '8%' },
                      { key: 'last_checked_at', label: 'Last Checked', width: '12%' },
                      { key: 'actions', label: 'Actions', width: '8%' },
                    ].map(col => (
                      <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider" style={{ width: col.width }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sources.map((source, i) => {
                    const health = HEALTH_COLORS[source.health_status] || HEALTH_COLORS.UNKNOWN;
                    const status = STATUS_COLORS[source.status] || STATUS_COLORS.DISABLED;
                    const auth = AUTH_COLORS[source.auth_type] || { bg: 'bg-slate-500/20', text: 'text-slate-400' };
                    const CategoryIcon = CATEGORY_ICONS[source.category] || Globe;

                    return (
                      <motion.tr
                        key={source.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                              <CategoryIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{source.name}</p>
                              {source.description && (
                                <p className="text-xs text-slate-400 truncate max-w-xs">{source.description}</p>
                              )}
                              {source.documentation_url && (
                                <a href={source.documentation_url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" /> Docs
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center gap-1">
                            <CategoryIcon className="w-3 h-3" />
                            {source.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full border ${auth.bg} ${auth.text}`}>
                            {source.auth_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full border flex items-center gap-1 ${health.bg} ${health.text} ${health.border}`}>
                            <health.icon className="w-3 h-3" />
                            {health.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full border ${status.bg} ${status.text} ${status.border}`}>
                            {source.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleEnable(source); }}
                            className={`w-10 h-6 rounded-full flex items-center transition-all ${
                              source.enabled
                                ? 'bg-green-500 justify-end pr-1'
                                : 'bg-slate-500 justify-start pl-1'
                            }`}
                          >
                            <div className="w-4 h-4 bg-white rounded-full shadow" />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star className={`w-4 h-4 ${source.integration_priority > 50 ? 'text-yellow-400' : source.integration_priority > 20 ? 'text-blue-400' : 'text-slate-400'}`} />
                            <span className="text-sm font-mono text-slate-300">{source.integration_priority}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300">{formatRelativeTime(source.last_checked_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewHealthHistory(source.id); }}
                              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400"
                              title="Health History"
                            >
                              <Activity className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(source.documentation_url || source.source_url || '#', '_blank'); }}
                              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-blue-400"
                              title="Documentation"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > pageSize && (
              <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} results
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg glass border border-white/10 hover:border-blue-500/30 disabled:opacity-50 text-sm">Previous</button>
                  <span className="px-3 text-sm text-slate-300">Page {page} / {Math.ceil(total / pageSize)}</span>
                  <button onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))} disabled={page === Math.ceil(total / pageSize)} className="px-3 py-1.5 rounded-lg glass border border-white/10 hover:border-blue-500/30 disabled:opacity-50 text-sm">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Source Detail Drawer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: expandedId ? 1 : 0 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-end lg:items-center lg:justify-end bg-black/50 backdrop-blur-sm"
        onClick={() => setExpandedId(null)}
      >
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          className="glass-strong rounded-2xl lg:rounded-l-2xl p-6 w-full max-w-2xl lg:max-w-4xl h-full lg:h-auto max-h-[85vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold">API Source Details</h3>
              <p className="text-sm text-slate-400 mt-1">{sources.find(s => s.id === expandedId)?.name}</p>
            </div>
            <button onClick={() => setExpandedId(null)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {expandedId && sources.find(s => s.id === expandedId) && (
            <div>
              {(() => {
                const source = sources.find(s => s.id === expandedId)!;
                const health = HEALTH_COLORS[source.health_status] || HEALTH_COLORS.UNKNOWN;
                const status = STATUS_COLORS[source.status] || STATUS_COLORS.DISABLED;
                const auth = AUTH_COLORS[source.auth_type] || { bg: 'bg-slate-500/20', text: 'text-slate-400' };
                const CategoryIcon = CATEGORY_ICONS[source.category] || Globe;

                return (
                  <div className="space-y-4">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                        <CategoryIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-white truncate">{source.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full border ${status.bg} ${status.text} ${status.border}`}>{source.status}</span>
                          <span className={`px-2 py-1 text-xs rounded-full border ${health.bg} ${health.text} ${health.border} flex items-center gap-1`}>
                            <health.icon className="w-3 h-3" />
                            {health.label}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full border ${auth.bg} ${auth.text}`}>{source.auth_type.toUpperCase()}</span>
                          <span className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                            {source.category.replace(/_/g, ' ')}
                          </span>
                          {source.free_tier && (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Free Tier</span>
                          )}
                          {source.https_support && (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">HTTPS</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleEnable(source)} className={`px-4 py-2 rounded-xl font-medium transition-all ${source.enabled ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30 hover:bg-slate-500/30'}`}>
                          {source.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {source.description && (
                        <div className="glass rounded-xl p-4 sm:col-span-2">
                          <p className="text-xs text-slate-400 uppercase tracking-wide">Description</p>
                          <p className="text-sm text-white mt-1">{source.description}</p>
                        </div>
                      )}
                      {source.documentation_url && (
                        <div className="glass rounded-xl p-4">
                          <p className="text-xs text-slate-400 uppercase tracking-wide">Documentation</p>
                          <a href={source.documentation_url} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 break-all flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {source.documentation_url}
                          </a>
                        </div>
                      )}
                      {source.source_url && (
                        <div className="glass rounded-xl p-4">
                          <p className="text-xs text-slate-400 uppercase tracking-wide">Base URL</p>
                          <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 break-all flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {source.source_url}
                          </a>
                        </div>
                      )}
                      {source.rate_limit && (
                        <div className="glass rounded-xl p-4">
                          <p className="text-xs text-slate-400 uppercase tracking-wide">Rate Limit</p>
                          <p className="text-sm text-white mt-1 font-mono">{source.rate_limit}</p>
                        </div>
                      )}
                      {source.pricing_notes && (
                        <div className="glass rounded-xl p-4">
                          <p className="text-xs text-slate-400 uppercase tracking-wide">Pricing Notes</p>
                          <p className="text-sm text-slate-300 mt-1">{source.pricing_notes}</p>
                        </div>
                      )}
                      <div className="glass rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Integration Priority</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className={`w-5 h-5 ${source.integration_priority > 50 ? 'text-yellow-400' : source.integration_priority > 20 ? 'text-blue-400' : 'text-slate-400'}`} />
                          <span className="text-lg font-bold text-white">{source.integration_priority}</span>
                        </div>
                      </div>
                      <div className="glass rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Adapter</p>
                        <p className="text-sm text-slate-300 mt-1 font-mono">{source.adapter_class || 'Not integrated'}</p>
                      </div>
                      <div className="glass rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Last Checked</p>
                        <p className="text-sm text-white mt-1">{formatDate(source.last_checked_at)}</p>
                      </div>
                      <div className="glass rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Last Successful Call</p>
                        <p className="text-sm text-white mt-1">{formatDate(source.last_successful_call)}</p>
                      </div>
                      <div className="glass rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Consecutive Failures</p>
                        <p className="text-sm {source.consecutive_failures > 0 ? 'text-red-400' : 'text-green-400'} mt-1 font-mono">{source.consecutive_failures}</p>
                      </div>
                    </div>

                    {/* Tags */}
                    {source.tags.length > 0 && (
                      <div className="glass rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {source.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Provenance */}
                    {Object.keys(source.provenance).length > 0 && (
                      <div className="glass rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Provenance</p>
                        <pre className="text-xs text-slate-300 bg-white/5 p-3 rounded-lg overflow-x-auto">
                          {JSON.stringify(source.provenance, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Health History Modal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showHealthModal ? 1 : 0 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => setShowHealthModal(null)}
      >
        {showHealthModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-strong rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Health Check History</h3>
              <button onClick={() => setShowHealthModal(null)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {healthHistory.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                <p className="text-slate-400">No health history available</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {healthHistory.map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`glass rounded-xl p-4 flex items-center justify-between ${log.success ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${log.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {log.success ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {log.success ? 'Healthy' : 'Failed'}
                          {log.status_code && ` (${log.status_code})`}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(log.created_at)}
                          {log.response_time_ms && ` • ${log.response_time_ms}ms`}
                        </p>
                        {log.error_message && (
                          <p className="text-xs text-red-400 mt-1">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      {log.rate_limit_remaining && (
                        <p>Rate Limit: {log.rate_limit_remaining}</p>
                      )}
                      {log.rate_limit_reset && (
                        <p>Resets: {formatDate(log.rate_limit_reset)}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

import { X } from 'lucide-react';