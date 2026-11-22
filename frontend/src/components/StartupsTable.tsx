'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  Building2, Globe, Users, Calendar, MapPin, DollarSign
} from 'lucide-react';
import type { Startup } from '@/types';
import { fetchStartups } from '@/lib/api';

interface StartupsTableProps {
  data: { startups: Startup[] };
  stats: any;
  loading: boolean;
  refresh: () => void;
}

export default function StartupsTable({ data, loading, refresh }: StartupsTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<keyof Startup>('entity_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<Startup[]>(data.startups);

  const sortedItems = [...items].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const comparison = String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? comparison : -comparison;
  });

  const paginatedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: keyof Startup) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">Startups</h1>
          <p className="text-slate-400 mt-1">Discovered AI startups and companies</p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </motion.div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total Startups</p>
          <p className="text-2xl font-bold text-white">{data.startups.length.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">With Website</p>
          <p className="text-2xl font-bold text-white">
            {data.startups.filter(s => s.website).length.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">With Employees</p>
          <p className="text-2xl font-bold text-white">
            {data.startups.filter(s => s.employee_count).length.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Sources</p>
          <p className="text-2xl font-bold text-white">
            {Array.from(new Set(data.startups.map(s => s.source_name))).length}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-4"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search startups by name, description..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-glass pl-10"
            />
          </div>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="select-glass w-auto min-w-[140px]"
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden"
      >
        {loading && items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading startups...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2">No startups found</h3>
            <p className="text-slate-400 mb-6">Start the ingestion pipeline to discover AI startups.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-glass">
                <thead>
                  <tr>
                    {[
                      { key: 'entity_name', label: 'Company', sortable: true },
                      { key: 'description', label: 'Description', sortable: false },
                      { key: 'website', label: 'Website', sortable: false },
                      { key: 'employee_count', label: 'Employees', sortable: true },
                      { key: 'industry', label: 'Industry', sortable: true },
                      { key: 'headquarters', label: 'HQ', sortable: true },
                      { key: 'founding_year', label: 'Founded', sortable: true },
                      { key: 'source_name', label: 'Source', sortable: true },
                      { key: 'created_at', label: 'Discovered', sortable: true },
                    ].map(col => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 ${col.sortable ? 'cursor-pointer hover:text-blue-400' : ''}`}
                        onClick={() => col.sortable && handleSort(col.key as keyof Startup)}
                        style={{ minWidth: col.key === 'description' ? '250px' : '140px' }}
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.label}</span>
                          {col.sortable && sortKey === col.key && (
                            <span className="text-blue-400">
                              {sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedItems.map((startup, i) => (
                    <motion.tr
                      key={startup.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{startup.entity_name}</p>
                            {startup.canonical_entity_id && (
                              <p className="text-xs text-slate-400">Canonical: {startup.canonical_entity_id.slice(0, 8)}...</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-300 truncate max-w-xs">{startup.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {startup.website ? (
                          <a href={startup.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm">
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-xs">{new URL(startup.website).hostname}</span>
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {startup.employee_count ? (
                          <span className="font-mono text-white">{startup.employee_count.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">{startup.industry || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {startup.headquarters || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300 font-mono">{startup.founding_year || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge badge-blue">{startup.source_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">{formatDate(startup.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {startup.website && (
                            <a href={startup.website} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400" title="Visit Website">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sortedItems.length > pageSize && (
              <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sortedItems.length)} of {sortedItems.length} results
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-3 py-1.5 text-sm">Previous</button>
                  <span className="px-3 text-sm text-slate-300">Page {page} / {Math.ceil(sortedItems.length / pageSize)}</span>
                  <button onClick={() => setPage(p => Math.min(Math.ceil(sortedItems.length / pageSize), p + 1))} disabled={page === Math.ceil(sortedItems.length / pageSize)} className="btn-ghost px-3 py-1.5 text-sm">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

// Need to import RefreshCw
import { RefreshCw } from 'lucide-react';