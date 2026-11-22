'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  GitBranch, Link2, Merge, Split, AlertTriangle, CheckCircle,
  XCircle, HelpCircle, RefreshCw, Briefcase, Newspaper
} from 'lucide-react';

interface EntityResolutionProps {
  data: any;
  stats: any;
  loading: boolean;
  refresh: () => void;
}

const ENTITY_TYPES = [
  { key: 'startup', label: 'Startups', icon: '🚀', color: 'blue' },
  { key: 'product', label: 'Products', icon: '📦', color: 'violet' },
  { key: 'paper', label: 'Papers', icon: '📄', color: 'emerald' },
  { key: 'job', label: 'Jobs', icon: '💼', color: 'amber' },
  { key: 'news', label: 'News', icon: '📰', color: 'rose' },
];

const STATUS_COLORS: Record<string, string> = {
  'resolved': 'badge-emerald',
  'pending': 'badge-amber',
  'conflict': 'badge-rose',
  'merged': 'badge-blue',
};

export default function EntityResolution({ loading, refresh }: EntityResolutionProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'clusters' | 'conflicts'>('overview');
  const [search, setSearch] = useState('');

  // Mock data for demonstration - in real app this would come from API
  const clusters = [
    { id: 'ent_1', canonical_name: 'Anthropic', type: 'startup', count: 12, status: 'resolved', aliases: ['Anthropic', 'Anthropic AI', 'Anthropic PBC'], confidence: 0.98 },
    { id: 'ent_2', canonical_name: 'OpenAI', type: 'startup', count: 15, status: 'resolved', aliases: ['OpenAI', 'OpenAI Inc.', 'Open Artificial Intelligence'], confidence: 0.99 },
    { id: 'ent_3', canonical_name: 'GPT-4', type: 'product', count: 8, status: 'resolved', aliases: ['GPT-4', 'GPT 4', 'Generative Pre-trained Transformer 4'], confidence: 0.95 },
    { id: 'ent_4', canonical_name: 'Claude', type: 'product', count: 6, status: 'pending', aliases: ['Claude', 'Claude AI', 'Claude 3', 'Claude 3.5'], confidence: 0.87 },
    { id: 'ent_5', canonical_name: 'Transformer Architecture', type: 'paper', count: 23, status: 'conflict', aliases: ['Attention Is All You Need', 'Transformer', 'Transformer Model'], confidence: 0.72 },
    { id: 'ent_6', canonical_name: 'LangChain', type: 'product', count: 9, status: 'resolved', aliases: ['LangChain', 'Lang Chain', 'LangChain Framework'], confidence: 0.93 },
    { id: 'ent_7', canonical_name: 'ML Research Scientist', type: 'job', count: 45, status: 'resolved', aliases: ['ML Research Scientist', 'Machine Learning Researcher', 'AI Research Scientist'], confidence: 0.91 },
    { id: 'ent_8', canonical_name: 'Mistral AI', type: 'startup', count: 7, status: 'pending', aliases: ['Mistral', 'Mistral AI', 'Mistral 7B'], confidence: 0.85 },
  ];

  const conflicts = clusters.filter(c => c.status === 'conflict' || c.status === 'pending');

  const typeColors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    violet: 'bg-violet-500/20 text-violet-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    rose: 'bg-rose-500/20 text-rose-400',
  };

  const typeIcons: Record<string, any> = {
    startup: GitBranch,
    product: Merge,
    paper: HelpCircle,
    job: Briefcase,
    news: Newspaper,
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">Entity Resolution</h1>
          <p className="text-slate-400 mt-1">Deduplicate and merge entities across all data sources</p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total Clusters</p>
          <p className="text-2xl font-bold text-white">{clusters.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Resolved</p>
          <p className="text-2xl font-bold text-emerald-400">
            {clusters.filter(c => c.status === 'resolved').length}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Pending Review</p>
          <p className="text-2xl font-bold text-amber-400">
            {clusters.filter(c => c.status === 'pending').length}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Conflicts</p>
          <p className="text-2xl font-bold text-rose-400">
            {clusters.filter(c => c.status === 'conflict').length}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Avg Confidence</p>
          <p className="text-2xl font-bold text-white">
            {(clusters.reduce((sum, c) => sum + c.confidence, 0) / clusters.length * 100).toFixed(1)}%
          </p>
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
            { id: 'overview', label: 'Overview', count: clusters.length },
            { id: 'clusters', label: 'All Clusters', count: clusters.length },
            { id: 'conflicts', label: 'Needs Review', count: conflicts.length },
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

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4"
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search entities by name, alias..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-glass pl-10"
          />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card overflow-hidden"
      >
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            {/* Type Distribution */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Entity Types</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {ENTITY_TYPES.map(type => {
                  const typeClusters = clusters.filter(c => c.type === type.key);
                  const resolved = typeClusters.filter(c => c.status === 'resolved').length;
                  return (
                    <motion.div
                      key={type.key}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: ENTITY_TYPES.indexOf(type) * 0.05 }}
                      className="glass p-4 rounded-xl"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{type.icon}</span>
                        <div>
                          <p className="font-medium text-white">{type.label}</p>
                          <p className="text-xs text-slate-400">{typeClusters.length} clusters</p>
                        </div>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${typeClusters.length > 0 ? (resolved / typeClusters.length * 100) : 0}%` }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1 text-right">{resolved}/{typeClusters.length} resolved</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Confidence Distribution */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Confidence Distribution</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { range: '95-100%', label: 'Very High', color: 'emerald', count: clusters.filter(c => c.confidence >= 0.95).length },
                  { range: '85-95%', label: 'High', color: 'blue', count: clusters.filter(c => c.confidence >= 0.85 && c.confidence < 0.95).length },
                  { range: '70-85%', label: 'Medium', color: 'amber', count: clusters.filter(c => c.confidence >= 0.7 && c.confidence < 0.85).length },
                  { range: '<70%', label: 'Low', color: 'rose', count: clusters.filter(c => c.confidence < 0.7).length },
                ].map(bucket => (
                  <motion.div
                    key={bucket.range}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-4 rounded-xl text-center"
                  >
                    <p className="text-3xl font-bold" style={{ color: `var(--accent-${bucket.color})` }}>{bucket.count}</p>
                    <p className="text-sm text-slate-400">{bucket.label}</p>
                    <p className="text-xs text-slate-500">{bucket.range}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'clusters' || activeTab === 'conflicts') && (
          <div className="overflow-x-auto">
            <table className="table-glass">
              <thead>
                <tr>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Aliases</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Records</th>
                  <th className="px-4 py-3 w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(activeTab === 'clusters' ? clusters : conflicts).map((cluster, i) => {
                    const entityType = ENTITY_TYPES.find(t => t.key === cluster.type);
                    const color = entityType?.color || 'blue';
                    const icon = entityType?.icon;
                    return (
                      <motion.tr
                    key={cluster.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${typeColors[color]} flex items-center justify-center`}>
                          {icon && <span className="text-xl">{icon}</span>}
                        </div>
                        <div>
                          <p className="font-medium text-white">{cluster.canonical_name}</p>
                          <p className="text-xs text-slate-400 font-mono">{cluster.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge badge-${color}`}>{cluster.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {cluster.aliases.slice(0, 3).map((alias: string, idx: number) => (
                          <span key={idx} className="badge badge-slate text-xs">{alias}</span>
                        ))}
                        {cluster.aliases.length > 3 && (
                          <span className="badge badge-slate text-xs">+{cluster.aliases.length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_COLORS[cluster.status]}`}>
                        {cluster.status.charAt(0).toUpperCase() + cluster.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                            style={{ width: `${cluster.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono text-white w-14 text-right">
                          {(cluster.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-white">{cluster.count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400" title="View Details">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-amber-400" title="Merge">
                          <Merge className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-rose-400" title="Split">
                          <Split className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
