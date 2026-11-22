'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  Briefcase, MapPin, Globe, Calendar, Clock, Home, Building2, Tag, RefreshCw
} from 'lucide-react';
import type { Job } from '@/types';

interface JobsTableProps {
  data: { jobs: Job[] };
  stats: any;
  loading: boolean;
  refresh: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  'ML Research': 'badge-blue',
  'Engineering': 'badge-emerald',
  'Product': 'badge-violet',
  'Data': 'badge-amber',
  'Other': 'badge-slate',
};

const EMPLOYMENT_COLORS: Record<string, string> = {
  'full-time': 'badge-blue',
  'part-time': 'badge-amber',
  'contract': 'badge-violet',
  'internship': 'badge-emerald',
  'other': 'badge-slate',
};

export default function JobsTable({ data, loading, refresh }: JobsTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<keyof Job>('published_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [remoteFilter, setRemoteFilter] = useState<string>('');
  const [items, setItems] = useState<Job[]>(data.jobs);

  const sortedItems = [...items].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const comparison = String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? comparison : -comparison;
  });

  const filteredItems = sortedItems.filter(job => {
    if (roleFilter && job.role_family !== roleFilter) return false;
    if (remoteFilter === 'true' && !job.is_remote) return false;
    if (remoteFilter === 'false' && job.is_remote) return false;
    return true;
  });

  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: keyof Job) => {
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

  const roles = Array.from(new Set(data.jobs.map(j => j.role_family).filter((v): v is string => Boolean(v))));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">AI Jobs</h1>
          <p className="text-slate-400 mt-1">Discovered AI job postings and opportunities</p>
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
        className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total Jobs</p>
          <p className="text-2xl font-bold text-white">{data.jobs.length.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Remote</p>
          <p className="text-2xl font-bold text-cyan-400">
            {data.jobs.filter(j => j.is_remote).length.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Full-time</p>
          <p className="text-2xl font-bold text-blue-400">
            {data.jobs.filter(j => j.employment_type === 'full-time').length.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Companies</p>
          <p className="text-2xl font-bold text-white">
            {Array.from(new Set(data.jobs.map(j => j.company))).length}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Sources</p>
          <p className="text-2xl font-bold text-white">
            {Array.from(new Set(data.jobs.map(j => j.source_name))).length}
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
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search jobs by title, company..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-glass pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="select-glass w-auto min-w-[150px]"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <select
            value={remoteFilter}
            onChange={e => { setRemoteFilter(e.target.value); setPage(1); }}
            className="select-glass w-auto min-w-[140px]"
          >
            <option value="">All Locations</option>
            <option value="true">Remote Only</option>
            <option value="false">On-site Only</option>
          </select>
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
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading jobs...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
            <p className="text-slate-400 mb-6">Start the ingestion pipeline to discover AI jobs.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-glass">
                <thead>
                  <tr>
                    {[
                      { key: 'title', label: 'Title', sortable: true },
                      { key: 'company', label: 'Company', sortable: true },
                      { key: 'role_family', label: 'Role', sortable: true },
                      { key: 'location', label: 'Location', sortable: true },
                      { key: 'is_remote', label: 'Remote', sortable: true },
                      { key: 'employment_type', label: 'Type', sortable: true },
                      { key: 'published_date', label: 'Posted', sortable: true },
                      { key: 'source_name', label: 'Source', sortable: true },
                    ].map(col => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 ${col.sortable ? 'cursor-pointer hover:text-amber-400' : ''}`}
                        onClick={() => col.sortable && handleSort(col.key as keyof Job)}
                        style={{ minWidth: col.key === 'title' ? '220px' : col.key === 'company' ? '160px' : '120px' }}
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.label}</span>
                          {col.sortable && sortKey === col.key && (
                            <span className="text-amber-400">
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
                  {paginatedItems.map((job, i) => (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-white truncate max-w-xs">{job.title}</p>
                            {job.canonical_entity_id && (
                              <p className="text-xs text-slate-400">Canonical: {job.canonical_entity_id.slice(0, 8)}...</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">{job.company}</span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const role = job.role_family || 'Other';
                          return <span className={`badge ${ROLE_COLORS[role] || 'badge-slate'}`}>{role}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {job.is_remote ? (
                          <span className="badge badge-cyan flex items-center gap-1">
                            <Home className="w-3 h-3" />
                            Remote
                          </span>
                        ) : (
                          <span className="badge badge-slate">On-site</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {job.employment_type && (
                          <span className={`badge ${EMPLOYMENT_COLORS[job.employment_type] || 'badge-slate'}`}>
                            {job.employment_type.replace('-', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(job.published_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge badge-amber">{job.source_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {job.job_url && (
                            <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400" title="View Job">
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

            {filteredItems.length > pageSize && (
              <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length} results
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-3 py-1.5 text-sm">Previous</button>
                  <span className="px-3 text-sm text-slate-300">Page {page} / {Math.ceil(filteredItems.length / pageSize)}</span>
                  <button onClick={() => setPage(p => Math.min(Math.ceil(filteredItems.length / pageSize), p + 1))} disabled={page === Math.ceil(filteredItems.length / pageSize)} className="btn-ghost px-3 py-1.5 text-sm">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}