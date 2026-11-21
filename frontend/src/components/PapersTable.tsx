'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  FileText, Github, Star, Calendar, Tag, Globe, BookOpen
} from 'lucide-react';
import type { Paper } from '@/types';

interface PapersTableProps {
  data: { papers: Paper[] };
  stats: any;
  loading: boolean;
  refresh: () => void;
}

export default function PapersTable({ data, loading, refresh }: PapersTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<keyof Paper>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [githubFilter, setGithubFilter] = useState<string>('');

  const items = data.papers;
  
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
     item.authors?.some(a => a.toLowerCase().includes(search.toLowerCase())) ||
     item.arxiv_id?.toLowerCase().includes(search.toLowerCase())) &&
    (githubFilter === '' || (githubFilter === 'with_github' && item.github_url) || (githubFilter === 'without_github' && !item.github_url))
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
          <h1 className="text-3xl font-bold text-gradient">Research Papers</h1>
          <p className="text-slate-400 mt-1">{filteredItems.length} papers indexed from arXiv, Papers with Code, OpenAlex, and Hugging Face</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search papers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5"
            />
          </div>
          <select
            value={githubFilter}
            onChange={e => setGithubFilter(e.target.value)}
            className="px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5"
          >
            <option value="">All Papers</option>
            <option value="with_github">Has GitHub Repo</option>
            <option value="without_github">No GitHub Repo</option>
          </select>
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
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading papers...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2">No papers found</h3>
            <p className="text-slate-400 mb-6">Run the ingestion pipeline to index research papers.</p>
            <button onClick={refresh} className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium">
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
                      { key: 'title', label: 'Title', width: '35%' },
                      { key: 'authors', label: 'Authors', width: '15%' },
                      { key: 'published_date', label: 'Published', width: '12%' },
                      { key: 'github_stars', label: '⭐ Stars', width: '8%' },
                      { key: 'github_url', label: 'Code', width: '8%' },
                      { key: 'arxiv_id', label: 'arXiv', width: '10%' },
                      { key: 'source_name', label: 'Source', width: '12%' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => {
                          const k = col.key as keyof Paper;
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
                          <p className="font-medium text-white line-clamp-1">{item.title}</p>
                          {item.abstract && (
                            <p className="text-sm text-slate-400 line-clamp-1 mt-1 max-w-md">{item.abstract}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-300 line-clamp-1">
                          {item.authors?.slice(0, 3).join(', ')}{item.authors && item.authors.length > 3 ? ` +${item.authors.length - 3} more` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-slate-300">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatDate(item.published_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span className={item.github_stars && item.github_stars > 100 ? 'font-bold text-yellow-400' : 'text-slate-300'}>
                            {item.github_stars?.toLocaleString() || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.github_url ? (
                          <a href={item.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300 transition-colors">
                            <Github className="w-3 h-3" />
                            Repo
                          </a>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.arxiv_id ? (
                          <a href={`https://arxiv.org/abs/${item.arxiv_id}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 font-mono">
                            {item.arxiv_id}
                          </a>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
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
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg glass border border-white/10 hover:border-blue-500/30 disabled:opacity-50 text-sm"
                  >
                    Previous
                  </button>
                  <span className="px-3 text-sm text-slate-300">Page {page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg glass border border-white/10 hover:border-blue-500/30 disabled:opacity-50 text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}