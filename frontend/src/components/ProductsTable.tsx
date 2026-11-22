'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  Package, Tag, DollarSign, Globe, RefreshCw
} from 'lucide-react';
import type { Product } from '@/types';

interface ProductsTableProps {
  data: { products: Product[] };
  stats: any;
  loading: boolean;
  refresh: () => void;
}

const PRICING_COLORS: Record<string, string> = {
  FREE: 'badge-emerald',
  FREEMIUM: 'badge-amber',
  PAID: 'badge-blue',
  ENTERPRISE: 'badge-violet',
  UNKNOWN: 'badge-slate',
};

export default function ProductsTable({ data, loading, refresh }: ProductsTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<keyof Product>('product_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [items, setItems] = useState<Product[]>(data.products);

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

  const handleSort = (key: keyof Product) => {
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
          <h1 className="text-3xl font-bold text-gradient">AI Products</h1>
          <p className="text-slate-400 mt-1">Discovered AI products and tools</p>
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
          <p className="text-sm text-slate-400">Total Products</p>
          <p className="text-2xl font-bold text-white">{data.products.length.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Free</p>
          <p className="text-2xl font-bold text-emerald-400">
            {data.products.filter(p => p.pricing_model === 'FREE').length.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Freemium</p>
          <p className="text-2xl font-bold text-amber-400">
            {data.products.filter(p => p.pricing_model === 'FREEMIUM').length.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Paid</p>
          <p className="text-2xl font-bold text-blue-400">
            {data.products.filter(p => p.pricing_model === 'PAID').length.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Enterprise</p>
          <p className="text-2xl font-bold text-violet-400">
            {data.products.filter(p => p.pricing_model === 'ENTERPRISE').length.toLocaleString()}
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
              placeholder="Search products by name, description..."
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
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading products...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-slate-400 mb-6">Start the ingestion pipeline to discover AI products.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-glass">
                <thead>
                  <tr>
                    {[
                      { key: 'product_name', label: 'Product', sortable: true },
                      { key: 'startup_name', label: 'Company', sortable: true },
                      { key: 'pricing_model', label: 'Pricing', sortable: true },
                      { key: 'product_url', label: 'URL', sortable: false },
                      { key: 'description', label: 'Description', sortable: false },
                      { key: 'source_name', label: 'Source', sortable: true },
                      { key: 'created_at', label: 'Discovered', sortable: true },
                    ].map(col => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 ${col.sortable ? 'cursor-pointer hover:text-violet-400' : ''}`}
                        onClick={() => col.sortable && handleSort(col.key as keyof Product)}
                        style={{ minWidth: col.key === 'description' ? '250px' : col.key === 'product_name' ? '180px' : '140px' }}
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.label}</span>
                          {col.sortable && sortKey === col.key && (
                            <span className="text-violet-400">
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
                  {paginatedItems.map((product, i) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                            <Package className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{product.product_name}</p>
                            {product.canonical_entity_id && (
                              <p className="text-xs text-slate-400">Canonical: {product.canonical_entity_id.slice(0, 8)}...</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">{product.startup_name || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${PRICING_COLORS[product.pricing_model] || 'badge-slate'}`}>
                          {product.pricing_model}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {product.product_url ? (
                          <a href={product.product_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm">
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-xs">{new URL(product.product_url).hostname}</span>
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-300 truncate max-w-xs">{product.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge badge-violet">{product.source_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">{formatDate(product.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {product.product_url && (
                            <a href={product.product_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400" title="Visit Product">
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