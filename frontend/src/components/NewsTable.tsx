'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  Newspaper, Calendar, Clock, Globe, Tag, RefreshCw
} from 'lucide-react';
import type { NewsItem } from '@/types';

interface NewsTableProps {
  data: { news: NewsItem[] };
  stats: any;
  loading: boolean;
  refresh: () => void;
}

export default function NewsTable({ data, loading, refresh }: NewsTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<keyof NewsItem>('published_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [freshOnly, setFreshOnly] = useState(false);
  const [items, setItems] = useState<NewsItem[]>(data.news);

  const sortedItems = [...items].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const comparison = String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? comparison : -comparison;
  });

  const filteredItems = sortedItems.filter(news => {
    if (sourceFilter && news.source_name !== sourceFilter) return false;
    if (freshOnly) {
      const publishedDate = new Date(news.published_at);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (publishedDate < dayAgo) return false;
    }
    return true;
  });

  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: keyof NewsItem) => {
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
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '—';
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

  const sources = Array.from(new Set(data.news.map(n => n.source_name)));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">AI News</h1>
          <p className="text-slate-400 mt-1">Latest AI news and articles</p>
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
          <p className="text-sm text-slate-400">Total Articles</p>
          <p className="text-2xl font-bold text-white">{data.news.length.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Last 24h</p>
          <p className="text-2xl font-bold text-emerald-400">
            {data.news.filter(n => {
              const d = new Date(n.published_at);
              return d > new Date(Date.now() - 24 * 60 * 60 * 1000);
            }).length.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">This Week</p>
          <p className="text-2xl font-bold text-blue-400">
            {data.news.filter(n => {
              const d = new Date(n.published_at);
              return d > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            }).length.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Sources</p>
          <p className="text-2xl font-bold text-white">{sources.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">With Full Text</p>
          <p className="text-2xl font-bold text-violet-400">
            {data.news.filter(n => n.full_text).length.toLocaleString()}
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
              placeholder="Search news by headline, author..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-glass-premium pl-10"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
            className="select-glass-premium w-auto min-w-[150px]"
          >
            <option value="">All Sources</option>
            {sources.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 cursor-pointer text-sm">
            <input type="checkbox" checked={freshOnly} onChange={e => { setFreshOnly(e.target.checked); setPage(1); }} className="w-4 h-4 accent-blue-500" />
            <span>Last 24h only</span>
          </label>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="select-glass-premium w-auto min-w-[140px]"
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
            <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading news...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Newspaper className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2">No news found</h3>
            <p className="text-slate-400 mb-6">Start the ingestion pipeline to discover AI news.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-glass-premium">
                <thead>
                  <tr>
                    {[
                      { key: 'headline', label: 'Headline', sortable: true },
                      { key: 'source_name', label: 'Source', sortable: true },
                      { key: 'author', label: 'Author', sortable: true },
                      { key: 'published_at', label: 'Published', sortable: true },
                      { key: 'article_url', label: 'Link', sortable: false },
                    ].map(col => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 ${col.sortable ? 'cursor-pointer hover:text-rose-400' : ''}`}
                        onClick={() => col.sortable && handleSort(col.key as keyof NewsItem)}
                        style={{ minWidth: col.key === 'headline' ? '300px' : '140px' }}
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.label}</span>
                          {col.sortable && sortKey === col.key && (
                            <span className="text-rose-400">
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
                  {paginatedItems.map((news, i) => (
                    <motion.tr
                      key={news.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Newspaper className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">{news.headline}</p>
                            {news.full_text && (
                              <span className="badge badge-liquid-emerald text-xs">Full Text</span>
                            )}
                            {news.canonical_entity_id && (
                              <p className="text-xs text-slate-400 mt-1">Entity: {news.canonical_entity_id.slice(0, 8)}...</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge badge-liquid-rose">{news.source_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">{news.author || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-slate-300">{formatDate(news.published_at)}</span>
                          <span className="text-xs text-slate-500">{formatRelativeTime(news.published_at)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {news.article_url ? (
                          <a href={news.article_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            View
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {news.article_url && (
                            <a href={news.article_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors text-slate-400 hover:text-cyan-400" title="Read Article">
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