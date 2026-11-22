'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  Globe, Database, Zap, Shield, AlertTriangle, CheckCircle,
  XCircle, HelpCircle, RefreshCw, Plus, Edit, Trash2, Play, Pause,
  Wifi, Server, Cloud, Cpu, HardDrive, Monitor,
  GitBranch, Rss
} from 'lucide-react';

interface SourceDiscoveryProps {
  data: any;
  stats: any;
  loading: boolean;
  refresh: () => void;
}

const SOURCE_TYPES = [
  { key: 'api', label: 'REST API', icon: Globe, color: 'blue', description: 'HTTP/REST endpoints' },
  { key: 'graphql', label: 'GraphQL', icon: GitBranch, color: 'violet', description: 'GraphQL endpoints' },
  { key: 'rss', label: 'RSS/Atom', icon: Rss, color: 'emerald', description: 'Feed syndication' },
  { key: 'websocket', label: 'WebSocket', icon: Wifi, color: 'cyan', description: 'Real-time streams' },
  { key: 'database', label: 'Database', icon: Database, color: 'amber', description: 'Direct DB connections' },
  { key: 'scraper', label: 'Web Scraper', icon: Monitor, color: 'rose', description: 'HTML scraping' },
];

const STATUS_COLORS: Record<string, string> = {
  'active': 'badge-emerald',
  'inactive': 'badge-slate',
  'error': 'badge-rose',
  'pending': 'badge-amber',
  'discovering': 'badge-blue',
};

const HEALTH_COLORS: Record<string, string> = {
  'healthy': 'text-emerald-400',
  'degraded': 'text-amber-400',
  'unhealthy': 'text-rose-400',
  'unknown': 'text-slate-400',
};

// Mock data - in real app from API
const sources = [
  { id: 'src_1', name: 'Y Combinator API', type: 'api', status: 'active', health: 'healthy', lastSync: '2024-01-15T10:30:00Z', records: 12450, errors: 0, rateLimit: '1000/hr', auth: 'API Key' },
  { id: 'src_2', name: 'Crunchbase GraphQL', type: 'graphql', status: 'active', health: 'healthy', lastSync: '2024-01-15T10:25:00Z', records: 8920, errors: 2, rateLimit: '500/hr', auth: 'OAuth' },
  { id: 'src_3', name: 'ArXiv RSS', type: 'rss', status: 'active', health: 'healthy', lastSync: '2024-01-15T10:28:00Z', records: 15600, errors: 0, rateLimit: 'Unlimited', auth: 'None' },
  { id: 'src_4', name: 'GitHub Trending', type: 'scraper', status: 'active', health: 'degraded', lastSync: '2024-01-15T09:45:00Z', records: 3200, errors: 12, rateLimit: '60/hr', auth: 'None' },
  { id: 'src_5', name: 'AngelList API', type: 'api', status: 'error', health: 'unhealthy', lastSync: '2024-01-14T22:10:00Z', records: 0, errors: 45, rateLimit: '100/hr', auth: 'OAuth' },
  { id: 'src_6', name: 'Product Hunt RSS', type: 'rss', status: 'active', health: 'healthy', lastSync: '2024-01-15T10:15:00Z', records: 4100, errors: 1, rateLimit: 'Unlimited', auth: 'None' },
  { id: 'src_7', name: 'Hacker News API', type: 'api', status: 'active', health: 'healthy', lastSync: '2024-01-15T10:29:00Z', records: 25000, errors: 0, rateLimit: 'Unlimited', auth: 'None' },
  { id: 'src_8', name: 'LinkedIn Jobs', type: 'scraper', status: 'pending', health: 'unknown', lastSync: null, records: 0, errors: 0, rateLimit: '30/hr', auth: 'Session' },
  { id: 'src_9', name: 'Wellfound API', type: 'api', status: 'active', health: 'healthy', lastSync: '2024-01-15T10:20:00Z', records: 6700, errors: 3, rateLimit: '200/hr', auth: 'API Key' },
  { id: 'src_10', name: 'TechCrunch RSS', type: 'rss', status: 'active', health: 'healthy', lastSync: '2024-01-15T10:10:00Z', records: 8900, errors: 0, rateLimit: 'Unlimited', auth: 'None' },
];

export default function SourceDiscovery({ loading, refresh }: SourceDiscoveryProps) {
  const [activeTab, setActiveTab] = useState<'sources' | 'discovery' | 'registry'>('sources');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredSources = sources.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && s.type !== typeFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: sources.length,
    active: sources.filter(s => s.status === 'active').length,
    errors: sources.filter(s => s.status === 'error').length,
    totalRecords: sources.reduce((sum, s) => sum + s.records, 0),
  };

  const typeColors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    violet: 'bg-violet-500/20 text-violet-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    amber: 'bg-amber-500/20 text-amber-400',
    rose: 'bg-rose-500/20 text-rose-400',
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">API Discovery</h1>
          <p className="text-slate-400 mt-1">Discover, register, and monitor data sources</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Add Source</span>
          </button>
          <button onClick={refresh} disabled={loading} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Sources</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Active</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Errors</p>
              <p className="text-2xl font-bold text-rose-400">{stats.errors}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Records</p>
              <p className="text-2xl font-bold text-white">{stats.totalRecords.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-1"
      >
        <div className="flex gap-1" role="tablist">
          {[
            { id: 'sources', label: 'Registered Sources', count: sources.length },
            { id: 'discovery', label: 'Auto-Discovery', count: 3 },
            { id: 'registry', label: 'Schema Registry', count: 24 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'text-slate-300/80 hover:bg-white/5 hover:text-white'
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              <span>{tab.label}</span>
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4"
      >
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search sources by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-glass pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="select-glass w-auto min-w-[150px]"
          >
            <option value="">All Types</option>
            {SOURCE_TYPES.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="select-glass w-auto min-w-[150px]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
            <option value="pending">Pending</option>
            <option value="discovering">Discovering</option>
          </select>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card overflow-hidden"
      >
        {activeTab === 'sources' && (
          <>
            <div className="overflow-x-auto">
              <table className="table-glass">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Health</th>
                    <th className="px-4 py-3">Last Sync</th>
                    <th className="px-4 py-3">Records</th>
                    <th className="px-4 py-3">Errors</th>
                    <th className="px-4 py-3">Rate Limit</th>
                    <th className="px-4 py-3">Auth</th>
                    <th className="px-4 py-3 w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSources.map((source, i) => (
                    <motion.tr
                      key={source.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const typeInfo = SOURCE_TYPES.find(t => t.key === source.type);
                            const Icon = typeInfo?.icon || Globe;
                            const color = typeInfo?.color || 'blue';
                            return (
                              <div className={`w-8 h-8 rounded-xl ${typeColors[color]} flex items-center justify-center`}>
                                <Icon className="w-4 h-4" />
                              </div>
                            );
                          })()}
                          <div>
                            <p className="font-medium text-white">{source.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{source.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge badge-${SOURCE_TYPES.find(t => t.key === source.type)?.color || 'slate'}`}>
                          {SOURCE_TYPES.find(t => t.key === source.type)?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${STATUS_COLORS[source.status]}`}>
                          {source.status.charAt(0).toUpperCase() + source.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 ${HEALTH_COLORS[source.health]}`}>
                          <span className="w-2 h-2 rounded-full bg-current" />
                          {source.health.charAt(0).toUpperCase() + source.health.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">
                          {source.lastSync ? new Date(source.lastSync).toLocaleString() : 'Never'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-white">{source.records.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={source.errors > 0 ? 'text-rose-400 font-mono' : 'text-emerald-400 font-mono'}>
                          {source.errors}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300 font-mono">{source.rateLimit}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge badge-slate">{source.auth}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400" title="View Details">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-amber-400" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          {source.status === 'active' ? (
                            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-emerald-400" title="Sync Now">
                              <Play className="w-4 h-4" />
                            </button>
                          ) : (
                            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-blue-400" title="Activate">
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-rose-400" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'discovery' && (
          <div className="p-6 space-y-6">
            <div className="glass p-6 rounded-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Auto-Discovery Engine</h3>
                  <p className="text-sm text-slate-400">Automatically discover new API endpoints and data sources</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'OpenAPI Specs', desc: 'Discover REST APIs from OpenAPI/Swagger definitions', status: 'Running', count: 12 },
                  { title: 'GraphQL Introspection', desc: 'Extract schemas from GraphQL endpoints', status: 'Completed', count: 8 },
                  { title: 'RSS/Atom Feeds', desc: 'Find syndication feeds across domains', status: 'Pending', count: 24 },
                ].map((item, idx) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass p-4 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{item.title}</h4>
                      <span className={`badge ${item.status === 'Running' ? 'badge-blue' : item.status === 'Completed' ? 'badge-emerald' : 'badge-amber'}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{item.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-cyan-400">{item.count} sources found</span>
                      <button className="btn-ghost text-sm px-3 py-1.5">View</button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'registry' && (
          <div className="p-6 space-y-6">
            <div className="glass p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Schema Registry</h3>
                  <p className="text-sm text-slate-400">Manage and version API schemas</p>
                </div>
                <button className="btn-primary text-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Register Schema
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="table-glass">
                  <thead>
                    <tr>
                      <th className="px-4 py-3">Schema</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Version</th>
                      <th className="px-4 py-3">Format</th>
                      <th className="px-4 py-3">Fields</th>
                      <th className="px-4 py-3">Updated</th>
                      <th className="px-4 py-3 w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      { name: 'YCCompany', source: 'Y Combinator', version: 'v2.1', format: 'JSON', fields: 24, updated: '2024-01-10' },
                      { name: 'ArXivPaper', source: 'ArXiv', version: 'v1.0', format: 'XML', fields: 18, updated: '2024-01-08' },
                      { name: 'GitHubRepo', source: 'GitHub', version: 'v3.2', format: 'GraphQL', fields: 32, updated: '2024-01-12' },
                      { name: 'ProductHuntPost', source: 'Product Hunt', version: 'v1.5', format: 'JSON', fields: 15, updated: '2024-01-09' },
                      { name: 'HackerNewsItem', source: 'Hacker News', version: 'v1.0', format: 'JSON', fields: 12, updated: '2024-01-11' },
                    ].map((schema, idx) => (
                      <motion.tr
                        key={schema.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{schema.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="badge badge-blue">{schema.source}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-cyan-400">{schema.version}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="badge badge-violet">{schema.format}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300">{schema.fields} fields</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300">{schema.updated}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400" title="View Schema">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-amber-400" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-rose-400" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
