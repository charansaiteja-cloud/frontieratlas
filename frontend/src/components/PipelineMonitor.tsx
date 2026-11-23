'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  Activity, Play, Pause, Square, RotateCcw, AlertTriangle, CheckCircle,
  XCircle, Clock, Zap, Brain, Globe, Users, BarChart3, TrendingUp,
  RefreshCw, Server, Database, Cpu, MemoryStick, Network, Terminal,
  GitBranch, HardDrive
} from 'lucide-react';

interface PipelineMonitorProps {
  data: any;
  stats: any;
  loading: boolean;
  refresh: () => void;
}

const PIPELINE_STAGES = [
  { id: 'discovery', label: 'Discovery', icon: Search, color: 'blue', description: 'Find new sources' },
  { id: 'extraction', label: 'Extraction', icon: Database, color: 'violet', description: 'Extract raw data' },
  { id: 'processing', label: 'Processing', icon: Cpu, color: 'cyan', description: 'Transform & clean' },
  { id: 'enrichment', label: 'Enrichment', icon: Brain, color: 'emerald', description: 'AI enhancement' },
  { id: 'resolution', label: 'Resolution', icon: GitBranch, color: 'amber', description: 'Entity matching' },
  { id: 'storage', label: 'Storage', icon: Server, color: 'rose', description: 'Persist to DB' },
];

const STATUS_COLORS: Record<string, string> = {
  'running': 'badge-liquid-blue',
  'completed': 'badge-liquid-emerald',
  'failed': 'badge-liquid-rose',
  'pending': 'badge-liquid-amber',
  'paused': 'badge-liquid-slate',
};

const JOB_STATUS_COLORS: Record<string, string> = {
  'running': 'text-blue-400',
  'completed': 'text-emerald-400',
  'failed': 'text-rose-400',
  'pending': 'text-amber-400',
};

// Mock pipeline data
const pipelineRuns = [
  { id: 'run_001', started: '2024-01-15T10:00:00Z', completed: '2024-01-15T10:15:30Z', status: 'completed', stages: 6, records: 45230, duration: 930 },
  { id: 'run_002', started: '2024-01-15T08:00:00Z', completed: '2024-01-15T08:12:45Z', status: 'completed', stages: 6, records: 38100, duration: 765 },
  { id: 'run_003', started: '2024-01-15T06:00:00Z', completed: '2024-01-15T06:18:20Z', status: 'completed', stages: 6, records: 42500, duration: 1100 },
  { id: 'run_004', started: '2024-01-15T04:00:00Z', completed: null, status: 'running', stages: 3, records: 12400, duration: 0 },
  { id: 'run_005', started: '2024-01-14T22:00:00Z', completed: '2024-01-14T22:14:10Z', status: 'failed', stages: 4, records: 0, duration: 850 },
  { id: 'run_006', started: '2024-01-14T20:00:00Z', completed: '2024-01-14T20:11:30Z', status: 'completed', stages: 6, records: 41200, duration: 690 },
];

const currentRun = pipelineRuns.find(r => r.status === 'running') || pipelineRuns[0];

const stageStatus = [
  { id: 'discovery', status: 'completed', records: 150, duration: 120, started: '10:00:00', completed: '10:02:00' },
  { id: 'extraction', status: 'completed', records: 45230, duration: 245, started: '10:02:00', completed: '10:06:05' },
  { id: 'processing', status: 'completed', records: 45230, duration: 180, started: '10:06:05', completed: '10:09:05' },
  { id: 'enrichment', status: 'running', records: 28900, duration: 145, started: '10:09:05', completed: null },
  { id: 'resolution', status: 'pending', records: 0, duration: 0, started: null, completed: null },
  { id: 'storage', status: 'pending', records: 0, duration: 0, started: null, completed: null },
];

export default function PipelineMonitor({ loading, refresh }: PipelineMonitorProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'runs' | 'stages' | 'workers'>('overview');
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => {
      // Simulate live updates
    }, 5000);
    return () => clearInterval(interval);
  }, [live]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const typeColors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    violet: 'bg-violet-500/20 text-violet-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    rose: 'bg-rose-500/20 text-rose-400',
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
          <p className="text-slate-400 mt-1">Monitor ingestion pipeline execution and performance</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 cursor-pointer text-sm">
            <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} className="w-4 h-4 accent-blue-500" />
            <span>Live</span>
            {live && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          </label>
          <button onClick={refresh} disabled={loading} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Play className="w-4 h-4" />
            <span>Run Pipeline</span>
          </button>
        </div>
      </motion.div>

      {/* Current Run Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              currentRun.status === 'running' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
              currentRun.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-rose-500/20 text-rose-400'
            }`}>
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-white">Current Run: {currentRun.id}</h3>
                <span className={`badge ${STATUS_COLORS[currentRun.status]}`}>
                  {currentRun.status.charAt(0).toUpperCase() + currentRun.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Started {formatDate(currentRun.started)} {currentRun.completed ? `• Completed ${formatDate(currentRun.completed)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{currentRun.records.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Records Processed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{formatDuration(currentRun.duration)}</p>
              <p className="text-xs text-slate-400">Duration</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{currentRun.stages}/6</p>
              <p className="text-xs text-slate-400">Stages Complete</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {((currentRun.stages / 6) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-slate-400">Progress</p>
            </div>
          </div>
        </div>
        <div className="mt-6 h-3 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentRun.stages / 6) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
          />
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-1"
      >
        <div className="flex gap-1" role="tablist">
          {[
            { id: 'overview', label: 'Pipeline Flow', icon: Activity },
            { id: 'runs', label: 'Run History', icon: Clock },
            { id: 'stages', label: 'Stage Details', icon: Database },
            { id: 'workers', label: 'Workers', icon: Server },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'text-slate-300/80 hover:bg-[rgba(255,255,255,0.02)] hover:text-white'
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden"
      >
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            {/* Pipeline Flow Visualization */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Pipeline Stages</h3>
              <div className="relative">
                {/* Connector line */}
                <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-violet-500" />
                {PIPELINE_STAGES.map((stage, idx) => {
                  const status = stageStatus.find(s => s.id === stage.id)?.status || 'pending';
                  const isActive = status === 'running';
                  const isComplete = status === 'completed';
                  return (
                    <motion.div
                      key={stage.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative flex items-start gap-4 mb-6"
                    >
                      <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-blue-500/20 border-2 border-blue-500 animate-pulse' :
                        isComplete ? 'bg-emerald-500/20 border-2 border-emerald-500' :
                        'bg-white/5 border-2 border-white/10'
                      } ${typeColors[stage.color]}`}>
                        <stage.icon className="w-5 h-5" />
                        {isActive && <motion.div className="absolute inset-0 rounded-2xl border-2 border-blue-500 animate-ping opacity-75" />}
                      </div>
                      <div className="flex-1 pt-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-white">{stage.label}</h4>
                          <span className={`badge ${STATUS_COLORS[status]}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{stage.description}</p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm">
                          {stageStatus.find(s => s.id === stage.id)?.records && (
                            <span className="flex items-center gap-1 text-cyan-400">
                              <Database className="w-3 h-3" />
                              {stageStatus.find(s => s.id === stage.id)!.records.toLocaleString()} records
                            </span>
                          )}
                          {stageStatus.find(s => s.id === stage.id)?.duration && (
                            <span className="flex items-center gap-1 text-amber-400">
                              <Clock className="w-3 h-3" />
                              {formatDuration(stageStatus.find(s => s.id === stage.id)!.duration)}
                            </span>
                          )}
                          {stageStatus.find(s => s.id === stage.id)?.started && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3 h-3" />
                              Started: {stageStatus.find(s => s.id === stage.id)!.started}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* System Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-4">System Resources</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'CPU Usage', value: '67%', icon: Cpu, color: 'blue', trend: '+5%' },
                  { label: 'Memory', value: '4.2/8 GB', icon: MemoryStick, color: 'violet', trend: '+0.3 GB' },
                  { label: 'Network I/O', value: '125 MB/s', icon: Network, color: 'cyan', trend: '+23 MB/s' },
                  { label: 'Disk I/O', value: '89 MB/s', icon: HardDrive, color: 'emerald', trend: '-12 MB/s' },
                ].map((metric, idx) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass p-4 rounded-xl"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-xl ${typeColors[metric.color]} flex items-center justify-center`}>
                        <metric.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">{metric.label}</p>
                        <p className="text-xl font-bold text-white">{metric.value}</p>
                      </div>
                    </div>
                    <p className="text-xs text-amber-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {metric.trend} vs 1h ago
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'runs' && (
          <div className="overflow-x-auto">
            <table className="table-glass-premium">
              <thead>
                <tr>
                  <th className="px-4 py-3">Run ID</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Stages</th>
                  <th className="px-4 py-3">Records</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3 w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pipelineRuns.map((run, i) => (
                  <motion.tr
                    key={run.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-white">{run.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{formatDate(run.started)}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{run.completed ? formatDate(run.completed) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_COLORS[run.status]}`}>
                        {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white">{run.stages}/6</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-white">{run.records.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-300">{formatDuration(run.duration)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors text-slate-400 hover:text-cyan-400" title="View Logs">
                          <Terminal className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors text-slate-400 hover:text-amber-400" title="Retry">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'stages' && (
          <div className="p-6 space-y-4">
            {PIPELINE_STAGES.map((stage, idx) => {
              const status = stageStatus.find(s => s.id === stage.id) || { status: 'pending', records: 0, duration: 0, started: null, completed: null };
              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass p-6 rounded-xl"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${typeColors[stage.color]}`}>
                        <stage.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-lg">{stage.label}</h4>
                        <p className="text-sm text-slate-400">{stage.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className={`badge ${STATUS_COLORS[status.status]}`}>
                        {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                      </span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Database className="w-3 h-3" />
                          {status.records.toLocaleString()} records
                        </span>
                        <span className="flex items-center gap-1 text-amber-400">
                          <Clock className="w-3 h-3" />
                          {formatDuration(status.duration)}
                        </span>
                        {status.started && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" />
                            {status.started} → {status.completed || 'running'}
                          </span>
                        )}
                      </div>
                      <button className="btn-ghost text-sm">
                        <Terminal className="w-4 h-4 mr-1" />
                        Logs
                      </button>
                    </div>
                  </div>
                  {status.status === 'running' && (
                    <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '65%' }}
                        className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {activeTab === 'workers' && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                { id: 'worker-1', name: 'Primary Worker', status: 'running', cpu: 67, memory: 2.4, tasks: 12, uptime: '2d 14h' },
                { id: 'worker-2', name: 'Extraction Worker', status: 'running', cpu: 45, memory: 1.8, tasks: 8, uptime: '2d 14h' },
                { id: 'worker-3', name: 'Enrichment Worker', status: 'idle', cpu: 12, memory: 0.9, tasks: 0, uptime: '1d 8h' },
                { id: 'worker-4', name: 'Resolution Worker', status: 'running', cpu: 78, memory: 3.1, tasks: 5, uptime: '2d 14h' },
              ].map((worker, idx) => (
                <motion.div
                  key={worker.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass p-6 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${worker.status === 'running' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{worker.name}</h4>
                        <span className={`badge ${worker.status === 'running' ? 'badge-liquid-emerald' : 'badge-liquid-slate'}`}>
                          {worker.status.charAt(0).toUpperCase() + worker.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">Uptime: {worker.uptime}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="glass p-3 rounded-lg">
                      <p className="text-xs text-slate-400">CPU</p>
                      <p className="text-xl font-bold text-white">{worker.cpu}%</p>
                    </div>
                    <div className="glass p-3 rounded-lg">
                      <p className="text-xs text-slate-400">Memory</p>
                      <p className="text-xl font-bold text-white">{worker.memory} GB</p>
                    </div>
                    <div className="glass p-3 rounded-lg">
                      <p className="text-xs text-slate-400">Active Tasks</p>
                      <p className="text-xl font-bold text-white">{worker.tasks}</p>
                    </div>
                    <div className="glass p-3 rounded-lg">
                      <p className="text-xs text-slate-400">Status</p>
                      <p className="text-xl font-bold text-white">{worker.status === 'running' ? 'Busy' : 'Idle'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-ghost text-sm px-3 py-1.5 flex-1">
                      <Terminal className="w-4 h-4 mr-1" />
                      Logs
                    </button>
                    {worker.status === 'running' && (
                      <button className="btn-ghost text-sm px-3 py-1.5 flex-1 text-rose-400 hover:bg-rose-500/10">
                        <Square className="w-4 h-4 mr-1" />
                        Stop
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Need to import missing icons
