'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  FileText, Github, Star, Calendar, Tag, Globe, BookOpen, RefreshCw
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
  const [items, setItems] = useState<Paper[]>(data.papers);

  const sortedItems = [...items].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const comparison = String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? comparison : -comparison;
  });

  const filteredItems = githubFilter
    ? sortedItems.filter(p => githubFilter === 'has' ? p.github_url : !p.github_url)
    : sortedItems;

  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: keyof Paper) => {
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

  const truncateAuthors = (authors: string[]) => {
    if (!authors || authors.length === 0) return '—';
    if (authors.length <= 2) return authors.join(', ');
    return `${authors.slice(0, 2).join(', ')} +${authors.length - 2} more`;
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
          <p className="text-slate-400 mt-1">Discovered AI research papers and publications</p>
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
          <p className="text-sm text-slate-400">Total Papers</p>
          <p className="text-2xl font-bold text-white">{data.papers.length.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">With GitHub</p>
          <p className="text-2xl font-bold text-emerald-400">
            {data.papers.filter(p => p.github_url).length.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">ArXiv Papers</p>
          <p className="text-2xl font-bold text-amber-400">
            {data.papers.filter(p => p.arxiv_id).length.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total Stars</p>
          <p className="text-2xl font-bold text-yellow-400">
            {data.papers.reduce((sum, p) => sum + (p.github_stars || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Sources</p>
          <p className="text-2xl font-bold text-white">
            {Array.from(new Set(data.papers.map(p => p.source_name))).length}
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
              placeholder="Search papers by title, authors..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-glass pl-10"
            />
          </div>
          <select
            value={githubFilter}
            onChange={e => { setGithubFilter(e.target.value); setPage(1); }}
            className="select-glass w-auto min-w-[160px]"
          >
            <option value="">All Papers</option>
            <option value="has">Has GitHub Repo</option>
            <option value="none">No GitHub Repo</option>
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
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading papers...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2">No papers found</h3>
            <p className="text-slate-400 mb-6">Start the ingestion pipeline to discover research papers.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-glass">
                <thead>
                  <tr>
                    {[
                      { key: 'title', label: 'Title', sortable: true },
                      { key: 'authors', label: 'Authors', sortable: false },
                      { key: 'published_date', label: 'Published', sortable: true },
                      { key: 'arxiv_id', label: 'ArXiv', sortable: false },
                      { key: 'github_stars', label: 'Stars', sortable: true },
                      { key: 'source_name', label: 'Source', sortable: true },
                      { key: 'created_at', label: 'Discovered', sortable: true },
                    ].map(col => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 ${col.sortable ? 'cursor-pointer hover:text-emerald-400' : ''}`}
                        onClick={() => col.sortable && handleSort(col.key as keyof Paper)}
                        style={{ minWidth: col.key === 'title' ? '280px' : col.key === 'authors' ? '180px' : '120px' }}
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.label}</span>
                          {col.sortable && sortKey === col.key && (
                            <span className="text-emerald-400">
                              {sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedItems.map((paper, i) => (
                    <motion.tr
                      key={paper.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">{paper.title}</p>
                            {paper.arxiv_id && (
                              <a href={`https://arxiv.org/abs/${paper.arxiv_id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                arXiv:{paper.arxiv_id}
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-300 truncate max-w-xs">{truncateAuthors(paper.authors)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(paper.published_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {paper.arxiv_id ? (
                          <span className="badge badge-amber">arXiv</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {paper.github_stars && paper.github_stars > 0 ? (
                            <span className="font-mono text-yellow-400 flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {paper.github_stars.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge badge-emerald">{paper.source_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">{formatDate(paper.published_date)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {paper.paper_url && (
                            <a href={paper.paper_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400" title="View Paper">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {paper.github_url && (
                            <a href={paper.github_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-emerald-400" title="View GitHub">
                              <Github className="w-4 h-4" />
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