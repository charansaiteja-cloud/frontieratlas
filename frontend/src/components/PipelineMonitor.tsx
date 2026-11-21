'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Search, Filter, Download, ChevronDown, ChevronUp,
  Activity, Play, Pause, RotateCcw, AlertTriangle, CheckCircle,
  XCircle, Clock, Zap, Database, Server, RefreshCw,
  TrendingUp, TrendingDown, BarChart3
} from 'lucide-react';
import type { PipelineTask } from '@/types';
import { fetchPipelineLogs, fetchPipelineStatus, startPipeline, stopPipeline, retryFailed } from '@/lib/api';

interface PipelineMonitorProps {
  data: any;
  stats: any;
  loading: boolean;
  refresh: () => void;
}

const TASK_STATUS_COLORS: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  PENDING: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', icon: Clock },
  RUNNING: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', icon: Activity },
  COMPLETED: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', icon: CheckCircle },
  FAILED: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle },
};

const TASK_TYPE_LABELS: Record<string, string> = {
  full_pipeline: 'Full Pipeline',
  startup: 'Startup Ingestion',
  product: 'Product Ingestion',
  paper: 'Paper Ingestion',
  news: 'News Ingestion',
  job: 'Job Ingestion',
};

export default function PipelineMonitor({ loading, refresh }: PipelineMonitorProps) {
  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [runningCount, setRunningCount] = useState(0);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(() => {
      if (autoRefresh) loadTasks();
    }, 5000);
    return () => clearInterval(interval);
  }, [page, statusFilter, autoRefresh]);

  const loadTasks = async () => {
    try {
      const res = await fetchPipelineLogs({ page, page_size: pageSize, status: statusFilter || undefined });
      setTasks(res.items);
      setTotal(res.total);
      setRunningCount(res.items.filter((t: PipelineTask) => t.status === 'RUNNING').length);
    } catch (error) {
      console.error('Failed to load pipeline logs:', error);
    }
  };

  const handleStartPipeline = async (type?: string) => {
    try {
      await startPipeline(type);
      loadTasks();
    } catch (error) {
      console.error('Failed to start pipeline:', error);
    }
  };

  const handleStopPipeline = async () => {
    try {
      await stopPipeline();
      loadTasks();
    } catch (error) {
      console.error('Failed to stop pipeline:', error);
    }
  };

  const handleRetryFailed = async () => {
    try {
      await retryFailed();
      loadTasks();
    } catch (error) {
      console.error('Failed to retry:', error);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getDuration = (started?: string, completed?: string) => {
    if (!started) return '—';
    const start = new Date(started).getTime();
    const end = completed ? new Date(completed).getTime() : Date.now();
    const diff = end - start;
    if (diff < 1000) return `${diff}ms`;
    if (diff < 60000) return `${(diff / 1000).toFixed(1)}s`;
    return `${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`;
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    running: tasks.filter(t => t.status === 'RUNNING').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    failed: tasks.filter(t => t.status === 'FAILED').length,
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">Pipeline Monitor</h1>
          <p className="text-slate-400 mt-1">Track ingestion pipeline execution and task status</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 cursor-pointer text-sm">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="w-4 h-4 accent-blue-500" />
            <span>Auto-refresh (5s)</span>
          </label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none text-sm bg-white/5">
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="RUNNING">Running</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
          <button onClick={() => handleStartPipeline()} disabled={loading} className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2 text-sm">
            <Play className="w-4 h-4" />
            <span>Start Full</span>
          </button>
          <button onClick={handleStopPipeline} className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium hover:from-red-600 hover:to-rose-700 transition-all flex items-center gap-2 text-sm">
            <Pause className="w-4 h-4" />
            <span>Stop</span>
          </button>
          <button onClick={handleRetryFailed} className="px-4 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 transition-all flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4" />
            <span>Retry Failed</span>
          </button>
          <button onClick={loadTasks} disabled={loading} className="px-4 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 transition-all flex items-center gap-2 text-sm">
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
          <p className="text-sm text-slate-400">Total Tasks</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-slate-400">Pending</p>
          <p className="text-3xl font-bold text-slate-400">{stats.pending}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-slate-400">Running</p>
          <p className="text-3xl font-bold text-blue-400">{stats.running}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-slate-400">Completed</p>
          <p className="text-3xl font-bold text-green-400">{stats.completed}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-slate-400">Failed</p>
          <p className="text-3xl font-bold text-red-400">{stats.failed}</p>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-2xl p-4"
      >
        <h3 className="text-lg font-semibold mb-4">Quick Pipeline Launch</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { type: 'startup', label: 'Startups', icon: Database, color: 'from-blue-500 to-cyan-500' },
            { type: 'product', label: 'Products', icon: Server, color: 'from-violet-500 to-purple-500' },
            { type: 'paper', label: 'Papers', icon: BarChart3, color: 'from-emerald-500 to-teal-500' },
            { type: 'news', label: 'News', icon: Zap, color: 'from-pink-500 to-rose-500' },
            { type: 'job', label: 'Jobs', icon: Activity, color: 'from-amber-500 to-orange-500' },
          ].map(item => (
            <button
              key={item.type}
              onClick={() => handleStartPipeline(item.type)}
              disabled={loading}
              className={`flex items-center gap-3 p-4 rounded-xl glass border border-white/10 hover:border-blue-500/30 transition-all text-left ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white">{item.label}</p>
                <p className="text-xs text-slate-400">Ingest {item.label.toLowerCase()}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tasks Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl overflow-hidden"
      >
        {loading && tasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading pipeline tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2">No pipeline tasks</h3>
            <p className="text-slate-400 mb-6">Start a pipeline to see tasks here.</p>
            <button onClick={() => handleStartPipeline()} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-medium">
              Start Full Pipeline
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    {[
                      { key: 'task_type', label: 'Task Type', width: '18%' },
                      { key: 'source_name', label: 'Source', width: '15%' },
                      { key: 'status', label: 'Status', width: '12%' },
                      { key: 'attempt_count', label: 'Attempts', width: '10%' },
                      { key: 'created_at', label: 'Created', width: '15%' },
                      { key: 'started_at', label: 'Started', width: '12%' },
                      { key: 'completed_at', label: 'Completed', width: '12%' },
                      { key: 'last_error', label: 'Error', width: '6%' },
                    ].map(col => (
                      <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider" style={{ width: col.width }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tasks.map((task, i) => {
                    const statusConfig = TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS.PENDING;
                    return (
                      <motion.tr
                        key={task.task_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                              {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300">{task.source_name || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full border flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                            <statusConfig.icon className="w-3 h-3" />
                            {task.status}
                            {task.status === 'RUNNING' && <span className="w-2 h-2 rounded-full bg-current animate-pulse ml-1" />}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-slate-300">{task.attempt_count}/{task.max_attempts}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300">{formatDate(task.created_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300">{formatDate(task.started_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300">{formatDate(task.completed_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          {task.last_error ? (
                            <span title={task.last_error}><AlertTriangle className="w-5 h-5 text-red-400 mx-auto cursor-help" /></span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > pageSize && (
              <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, tasks.length)} of {total} results
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
    </div>
  );
}