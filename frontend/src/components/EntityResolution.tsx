'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Search, Filter, Download, ChevronDown, ChevronUp,
  GitBranch, AlertTriangle, CheckCircle, XCircle, UserCheck,
  RefreshCw, Eye, Edit3, ExternalLink
} from 'lucide-react';
import type { EntityMapping } from '@/types';
import { fetchEntityMappings } from '@/lib/api';

interface EntityResolutionProps {
  data: any;
  stats: any;
  loading: boolean;
  refresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  AUTO: 'bg-green-500/20 text-green-400 border-green-500/30',
  PENDING_REVIEW: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  MANUAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const METHOD_COLORS: Record<string, string> = {
  EXACT_NORMALIZED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ALIAS_CONTAINS: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  FUZZY_HIGH: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FUZZY_MEDIUM: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  FUZZY_LOW: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  NO_MATCH: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function EntityResolution({ loading, refresh }: EntityResolutionProps) {
  const [mappings, setMappings] = useState<EntityMapping[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [selectedMapping, setSelectedMapping] = useState<EntityMapping | null>(null);

  useEffect(() => {
    loadMappings();
  }, [page, statusFilter]);

  const loadMappings = async () => {
    try {
      const res = await fetchEntityMappings({ page, page_size: pageSize, status: statusFilter || undefined });
      setMappings(res.items);
      setTotal(res.total);
    } catch (error) {
      console.error('Failed to load mappings:', error);
    }
  };

  const handleReview = async (mapping: EntityMapping, action: 'approve' | 'reject') => {
    try {
      // In production, this would call an API endpoint
      const updated = { ...mapping, resolution_status: action === 'approve' ? 'MANUAL' : 'REJECTED' };
      setMappings(mappings.map(m => m.id === mapping.id ? updated : m));
    } catch (error) {
      console.error('Failed to review mapping:', error);
    }
  };

  const filteredMappings = mappings.filter(m =>
    m.raw_entity_name.toLowerCase().includes(search.toLowerCase()) ||
    m.canonical_entity_name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: mappings.length,
    auto: mappings.filter(m => m.resolution_status === 'AUTO').length,
    pending: mappings.filter(m => m.resolution_status === 'PENDING_REVIEW').length,
    manual: mappings.filter(m => m.resolution_status === 'MANUAL').length,
    rejected: mappings.filter(m => m.resolution_status === 'REJECTED').length,
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
          <p className="text-slate-400 mt-1">Review and manage entity mappings across all data sources</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search mappings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5">
            <option value="">All Status</option>
            <option value="AUTO">Auto-Resolved</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="MANUAL">Manually Reviewed</option>
            <option value="REJECTED">Rejected</option>
          </select>
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
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-slate-400">Total Mappings</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-slate-400">Auto-Resolved</p>
          <p className="text-3xl font-bold text-green-400">{stats.auto}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-slate-400">Pending Review</p>
          <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-slate-400">Manually Reviewed</p>
          <p className="text-3xl font-bold text-blue-400">{stats.manual}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-slate-400">Rejected</p>
          <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-2xl overflow-hidden"
      >
        {loading && mappings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading mappings...</p>
          </div>
        ) : mappings.length === 0 ? (
          <div className="p-12 text-center">
            <GitBranch className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2">No mappings found</h3>
            <p className="text-slate-400 mb-6">Run the ingestion pipeline to generate entity mappings.</p>
            <button onClick={refresh} className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium">
              Start Pipeline
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    {[
                      { key: 'raw_entity_name', label: 'Raw Entity', width: '25%' },
                      { key: 'canonical_entity_name', label: 'Canonical Entity', width: '20%' },
                      { key: 'match_method', label: 'Match Method', width: '15%' },
                      { key: 'confidence_score', label: 'Confidence', width: '10%' },
                      { key: 'resolution_status', label: 'Status', width: '12%' },
                      { key: 'required_human_review', label: 'Review', width: '8%' },
                      { key: 'source_url', label: 'Source', width: '10%' },
                    ].map(col => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider"
                        style={{ width: col.width }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMappings.map((mapping, i) => (
                    <motion.tr
                      key={mapping.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{mapping.raw_entity_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-300">{mapping.canonical_entity_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full border ${METHOD_COLORS[mapping.match_method] || METHOD_COLORS.NO_MATCH}`}>
                          {mapping.match_method.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                mapping.confidence_score >= 0.9 ? 'bg-green-500' :
                                mapping.confidence_score >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${mapping.confidence_score * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono text-slate-300 w-12 text-right">
                            {(mapping.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full border ${STATUS_COLORS[mapping.resolution_status] || STATUS_COLORS.PENDING_REVIEW}`}>
                          {mapping.resolution_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {mapping.required_human_review ? (
                          <span title="Requires human review"><AlertTriangle className="w-5 h-5 text-yellow-400 mx-auto" /></span>
                        ) : (
                          <span title="Auto-resolved"><CheckCircle className="w-5 h-5 text-green-400 mx-auto" /></span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {mapping.source_url ? (
                          <a href={mapping.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300">
                            <ExternalLink className="w-3 h-3 inline-block align-middle" />
                          </a>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > pageSize && (
              <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredMappings.length)} of {total} results
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

      {/* Review Modal */}
      <AnimatePresence>
        {selectedMapping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedMapping(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-strong rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold">Review Entity Mapping</h3>
                  <p className="text-sm text-slate-400 mt-1">Confirm or reject this entity resolution</p>
                </div>
                <button onClick={() => setSelectedMapping(null)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Raw Entity Name</label>
                  <p className="text-lg font-medium text-white">{selectedMapping.raw_entity_name}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Canonical Entity</label>
                  <p className="text-lg font-medium text-blue-400">{selectedMapping.canonical_entity_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Match Method</label>
                    <span className={`px-3 py-1 text-sm rounded-full border ${METHOD_COLORS[selectedMapping.match_method] || METHOD_COLORS.NO_MATCH}`}>
                      {selectedMapping.match_method.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Confidence Score</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            selectedMapping.confidence_score >= 0.9 ? 'bg-green-500' :
                            selectedMapping.confidence_score >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${selectedMapping.confidence_score * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono w-12 text-right">
                        {(selectedMapping.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
                {selectedMapping.source_url && (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Source URL</label>
                    <a href={selectedMapping.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 break-all">
                      {selectedMapping.source_url}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => handleReview(selectedMapping, 'reject')}
                  className="px-6 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                >
                  <XCircle className="w-4 h-4 inline mr-2" />
                  Reject
                </button>
                <button
                  onClick={() => handleReview(selectedMapping, 'approve')}
                  className="px-6 py-2 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all"
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Approve & Merge
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Need to import AnimatePresence and X
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';