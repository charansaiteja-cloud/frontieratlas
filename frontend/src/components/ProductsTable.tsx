'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  Package, Tag, DollarSign, Globe
} from 'lucide-react';
import type { Product } from '@/types';

interface ProductsTableProps {
  data: { products: Product[] };
  stats: any;
  loading: boolean;
  refresh: () => void;
}

const PRICING_COLORS: Record<string, string> = {
  FREE: 'bg-green-500/20 text-green-400 border-green-500/30',
  FREEMIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  PAID: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ENTERPRISE: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  UNKNOWN: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function ProductsTable({ data, loading, refresh }: ProductsTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<keyof Product>('product_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pricingFilter, setPricingFilter] = useState<string>('');

  const items = data.products;
  
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
    (item.product_name.toLowerCase().includes(search.toLowerCase()) ||
     item.description?.toLowerCase().includes(search.toLowerCase()) ||
     item.startup_name?.toLowerCase().includes(search.toLowerCase())) &&
    (!pricingFilter || item.pricing_model === pricingFilter)
  );

  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredItems.length / pageSize);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">AI Products</h1>
          <p className="text-slate-400 mt-1">{filteredItems.length} products cataloged from global directories</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5"
            />
          </div>
          <select
            value={pricingFilter}
            onChange={e => setPricingFilter(e.target.value)}
            className="px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5"
          >
            <option value="">All Pricing</option>
            <option value="FREE">Free</option>
            <option value="FREEMIUM">Freemium</option>
            <option value="PAID">Paid</option>
            <option value="ENTERPRISE">Enterprise</option>
            <option value="UNKNOWN">Unknown</option>
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
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading products...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-slate-400 mb-6">Run the ingestion pipeline to discover AI products.</p>
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
                      { key: 'product_name', label: 'Product', width: '25%' },
                      { key: 'startup_name', label: 'Company', width: '18%' },
                      { key: 'pricing_model', label: 'Pricing', width: '12%' },
                      { key: 'description', label: 'Description', width: '30%' },
                      { key: 'product_url', label: 'Link', width: '8%' },
                      { key: 'source_name', label: 'Source', width: '15%' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => {
                          const k = col.key as keyof Product;
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
                          <p className="font-medium text-white">{item.product_name}</p>
                          {item.startup_name && (
                            <p className="text-sm text-slate-400">{item.startup_name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">{item.startup_name || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full border ${PRICING_COLORS[item.pricing_model] || PRICING_COLORS.UNKNOWN}`}>
                          {item.pricing_model}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-400 line-clamp-1 max-w-xs">{item.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {item.product_url ? (
                          <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                            <Globe className="w-3 h-3" />
                            Visit
                          </a>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
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