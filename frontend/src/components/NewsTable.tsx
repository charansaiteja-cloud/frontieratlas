'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  Newspaper, Calendar, Clock, Globe, Tag
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

  const items = data.news;

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
    (item.headline.toLowerCase().includes(search.toLowerCase()) ||
     item.author?.toLowerCase().includes(search.toLowerCase()) ||
     item.source_name.toLowerCase().includes(search.toLowerCase())) &&
    (!sourceFilter || item.source_name === sourceFilter) &&
    (!freshOnly || new Date(item.published_at) > new Date(Date.now() - 24 * 60 * 60 * 1000))
  );

  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredItems.length / pageSize);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const sources = Array.from(new Set(items.map(i => i.source_name))).sort();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">AI News</h1>
          <p className="text-slate-400 mt-1">{filteredItems.length} articles from TechCrunch, VentureBeat, MIT Tech Review, The Decoder, and Hugging Face Blog</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search news..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5"
            />
          </div>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5">
            <option value="">All Sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
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
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading news...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <Newspaper className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2">No news found</h3>
            <p className="text-slate-400 mb-6">Run the ingestion pipeline to fetch AI news.</p>
            <button onClick={refresh} className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium">
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
                      { key: 'headline', label: 'Headline', width: '35%' },
                      { key: 'source_name', label: 'Source', width: '15%' },
                      { key: 'author', label: 'Author', width: '12%' },
                      { key: 'published_at', label: 'Published', width: '18%' },
                      { key: 'article_url', label: 'Link', width: '8%' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => {
                          const k = col.key as keyof NewsItem;
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
                          <p className="font-medium text-white line-clamp-1">{item.headline}</p>
                          {item.full_text && (
                            <p className="text-sm text-slate-400 line-clamp-1 mt-1 max-w-md">{item.full_text}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
                          {item.source_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-300">{item.author || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-slate-300">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatDate(item.published_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a href={item.article_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                          <Globe className="w-3 h-3" />
                          Read
                        </a>
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