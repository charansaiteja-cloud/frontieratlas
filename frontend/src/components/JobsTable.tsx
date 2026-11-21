'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  Briefcase, MapPin, Globe, Calendar, Clock, Home, Building2, Tag
} from 'lucide-react';
import type { Job } from '@/types';

interface JobsTableProps {
  data: { jobs: Job[] };
  stats: any;
  loading: boolean;
  refresh: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  'ML Research': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Engineering': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Product': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Data': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Other': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function JobsTable({ data, loading, refresh }: JobsTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<keyof Job>('published_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [remoteFilter, setRemoteFilter] = useState<string>('');
  const [freshOnly, setFreshOnly] = useState(false);

  const items = data.jobs;
  
  const sortedItems = [...items].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const filteredItems = sortedItems.filter(item =>
    (item.title.toLowerCase().includes(search.toLowerCase()) ||
     item.company.toLowerCase().includes(search.toLowerCase()) ||
     item.location?.toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || item.role_family === roleFilter) &&
    (remoteFilter === '' || (remoteFilter === 'true' && item.is_remote) || (remoteFilter === 'false' && !item.is_remote)) &&
    (!freshOnly || new Date(item.published_date) > new Date(Date.now() - 24 * 60 * 60 * 1000))
  );

  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredItems.length / pageSize);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
          <h1 className="text-3xl font-bold text-gradient">AI Jobs</h1>
          <p className="text-slate-400 mt-1">{filteredItems.length} positions from Greenhouse, Lever, Wellfound, Hugging Face, and company career pages</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5"
            />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5">
            <option value="">All Roles</option>
            <option value="ML Research">ML Research</option>
            <option value="Engineering">Engineering</option>
            <option value="Product">Product</option>
            <option value="Data">Data</option>
          </select>
          <select value={remoteFilter} onChange={e => setRemoteFilter(e.target.value)} className="px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5">
            <option value="">All Locations</option>
            <option value="true">Remote</option>
            <option value="false">On-site</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 cursor-pointer text-sm">
            <input type="checkbox" checked={freshOnly} onChange={e => setFreshOnly(e.target.checked)} className="w-4 h-4 accent-blue-500" />
            <span>Fresh (24h)</span>
          </label>
          <button onClick={refresh} disabled={loading} className="px-4 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 transition-all flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl overflow-hidden"
      >
        {loading && filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading jobs...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
            <p className="text-slate-400 mb-6">Run the ingestion pipeline to discover AI job postings.</p>
            <button onClick={refresh} className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium">
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
                      { key: 'title', label: 'Position', width: '22%' },
                      { key: 'company', label: 'Company', width: '15%' },
                      { key: 'role_family', label: 'Role', width: '12%' },
                      { key: 'location', label: 'Location', width: '15%' },
                      { key: 'published_date', label: 'Posted', width: '12%' },
                      { key: 'employment_type', label: 'Type', width: '10%' },
                      { key: 'source_name', label: 'Source', width: '14%' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => {
                          const k = col.key as keyof Job;
                          setSortDir(sortKey === k && sortDir === 'asc' ? 'desc' : 'asc');
                          setSortKey(k);
                        }}
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
                        style={{ width: col.width }}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && (
                            sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedItems.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{item.title}</p>
                          {item.description && (
                            <p className="text-sm text-slate-400 line-clamp-1 mt-1 max-w-xs">{item.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-300 font-medium">{item.company}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full border ${item.role_family ? ROLE_COLORS[item.role_family] || ROLE_COLORS.Other : ROLE_COLORS.Other}`}>
                          {item.role_family || 'Other'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-slate-300">
                          {item.is_remote ? (
                            <>
                              <Home className="w-3 h-3 text-green-400" />
                              <span className="text-green-400">Remote</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {item.location || 'On-site'}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-slate-300">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatDate(item.published_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">
                          {item.employment_type || 'Full-time'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {item.source_name}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length} results
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg glass border border-white/10 hover:border-blue-500/30 disabled:opacity-50 text-sm">Previous</button>
                  <span className="px-3 text-sm text-slate-300">Page {page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg glass border border-white/10 hover:border-blue-500/30 disabled:opacity-50 text-sm">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}