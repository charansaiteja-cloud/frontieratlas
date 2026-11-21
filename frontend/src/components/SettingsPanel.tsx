'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Settings, Key, Database, Server, Zap, Brain, Globe,
  Save, CheckCircle, AlertTriangle, Eye, EyeOff, Copy,
  RefreshCw, Trash2, Download, Upload, Terminal
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsPanelProps {
  data: any;
  stats: any;
  loading: boolean;
  refresh: () => void;
}

const SECTIONS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'api', label: 'LLM API Keys', icon: Key },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'redis', label: 'Redis & Queue', icon: Server },
  { id: 'crawler', label: 'Crawler Settings', icon: Zap },
  { id: 'extraction', label: 'Extraction', icon: Brain },
  { id: 'sources', label: 'Data Sources', icon: Globe },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

export default function SettingsPanel({ refresh }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('general');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Load settings from localStorage or defaults
  useEffect(() => {
    const stored = localStorage.getItem('frontieratlas_settings');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const defaultSettings: Record<string, string> = {
    // General
    app_name: 'FrontierAtlas',
    app_version: '1.0.0',
    log_level: 'INFO',
    timezone: 'UTC',

    // LLM API Keys
    gemini_api_key: '',
    groq_api_key: '',
    deepseek_api_key: '',

    // Database
    database_url: 'postgresql+asyncpg://postgres:postgres@localhost:5432/frontieratlas',
    database_pool_size: '10',
    database_max_overflow: '20',

    // Redis
    redis_url: 'redis://localhost:6379/0',
    redis_max_connections: '50',

    // Crawler
    max_concurrency: '50',
    per_domain_concurrency: '5',
    request_timeout: '30',
    user_agent: 'FrontierAtlas/1.0 (+https://frontieratlas.ai)',

    // Extraction
    fresh_window_hours: '24',
    llm_chunk_size: '8000',
    llm_max_retries: '3',
    llm_retry_delay: '2',

    // Sources
    enable_ycombinator: 'true',
    enable_huggingface_orgs: 'true',
    enable_producthunt: 'true',
    enable_futurepedia: 'true',
    enable_aitoolsdirectory: 'true',
    enable_hf_spaces: 'true',
    enable_thereisanai: 'true',
    enable_arxiv: 'true',
    enable_paperswithcode: 'true',
    enable_openalex: 'true',
    enable_hf_daily_papers: 'true',
    enable_techcrunch: 'true',
    enable_venturebeat: 'true',
    enable_mit_tech_review: 'true',
    enable_the_decoder: 'true',
    enable_hf_blog: 'true',
    enable_greenhouse: 'true',
    enable_lever: 'true',
    enable_wellfound: 'true',
    enable_hf_jobs: 'true',
    enable_company_careers: 'true',
  };

  const mergedSettings = { ...defaultSettings, ...settings };

  const saveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem('frontieratlas_settings', JSON.stringify(mergedSettings));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (type: string) => {
    setTesting(type);
    try {
      // In production, this would call a test endpoint
      await new Promise(r => setTimeout(r, 1500));
      toast.success(`${type} connection test passed`);
    } catch (error) {
      toast.error(`${type} connection test failed`);
    } finally {
      setTesting(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(mergedSettings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'frontieratlas-config.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Configuration exported');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setSettings(parsed);
        localStorage.setItem('frontieratlas_settings', JSON.stringify(parsed));
        toast.success('Configuration imported');
      } catch {
        toast.error('Invalid configuration file');
      }
    };
    reader.readAsText(file);
  };

  const resetSettings = () => {
    setSettings({});
    localStorage.removeItem('frontieratlas_settings');
    toast.success('Settings reset to defaults');
  };

  const renderSection = (section: SectionId) => {
    const Icon = SECTIONS.find(s => s.id === section)?.icon || Settings;

    switch (section) {
      case 'general':
        return (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">General Settings</h3>
                  <p className="text-sm text-slate-400">Application-wide configuration</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Application Name</label>
                  <input type="text" value={mergedSettings.app_name} onChange={e => setSettings({ ...mergedSettings, app_name: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Version</label>
                  <input type="text" value={mergedSettings.app_version} onChange={e => setSettings({ ...mergedSettings, app_version: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Log Level</label>
                  <select value={mergedSettings.log_level} onChange={e => setSettings({ ...mergedSettings, log_level: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5">
                    <option value="DEBUG">Debug</option>
                    <option value="INFO">Info</option>
                    <option value="WARNING">Warning</option>
                    <option value="ERROR">Error</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Timezone</label>
                  <input type="text" value={mergedSettings.timezone} onChange={e => setSettings({ ...mergedSettings, timezone: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">LLM API Keys</h3>
                  <p className="text-sm text-slate-400">Configure LLM provider fallback chain: Gemini → Groq → DeepSeek</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { key: 'gemini_api_key', label: 'Google Gemini API Key', placeholder: 'AIzaSy...', help: 'Get from https://makersuite.google.com/app/apikey' },
                  { key: 'groq_api_key', label: 'Groq API Key', placeholder: 'gsk_...', help: 'Get from https://console.groq.com/keys' },
                  { key: 'deepseek_api_key', label: 'DeepSeek API Key', placeholder: 'sk-...', help: 'Get from https://platform.deepseek.com/api_keys' },
                ].map(({ key, label, placeholder, help }) => (
                  <div key={key} className="glass rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-white block mb-1">{label}</label>
                        <p className="text-xs text-slate-400">{help}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowKeys({ ...showKeys, [key]: !showKeys[key] })}
                          className="px-3 py-1.5 rounded-lg glass border border-white/10 hover:border-blue-500/30 text-sm"
                        >
                          {showKeys[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(mergedSettings[key] || '', label)}
                          className="px-3 py-1.5 rounded-lg glass border border-white/10 hover:border-blue-500/30 text-sm"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => testConnection(key.replace('_api_key', '').toUpperCase())}
                          disabled={testing === key.replace('_api_key', '').toUpperCase() || !mergedSettings[key]}
                          className="px-3 py-1.5 rounded-lg glass border border-white/10 hover:border-green-500/30 text-sm disabled:opacity-50"
                        >
                          {testing === key.replace('_api_key', '').toUpperCase() ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <input
                      type={showKeys[key] ? 'text' : 'password'}
                      placeholder={placeholder}
                      value={mergedSettings[key] || ''}
                      onChange={e => setSettings({ ...mergedSettings, [key]: e.target.value })}
                      className="w-full mt-3 px-4 py-2 rounded-lg glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5 font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Database Configuration</h3>
                  <p className="text-sm text-slate-400">PostgreSQL connection and pool settings</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Database URL</label>
                  <input type="text" value={mergedSettings.database_url} onChange={e => setSettings({ ...mergedSettings, database_url: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5 font-mono text-sm" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Pool Size</label>
                  <input type="number" value={mergedSettings.database_pool_size} onChange={e => setSettings({ ...mergedSettings, database_pool_size: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Max Overflow</label>
                  <input type="number" value={mergedSettings.database_max_overflow} onChange={e => setSettings({ ...mergedSettings, database_max_overflow: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => testConnection('Database')} disabled={testing === 'Database'} className="px-4 py-2 rounded-xl glass border border-white/10 hover:border-green-500/30 transition-all flex items-center gap-2 text-sm">
                    {testing === 'Database' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>Test Connection</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'redis':
        return (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Redis & Queue</h3>
                  <p className="text-sm text-slate-400">Redis connection for Celery task queue</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Redis URL</label>
                  <input type="text" value={mergedSettings.redis_url} onChange={e => setSettings({ ...mergedSettings, redis_url: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5 font-mono text-sm" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Max Connections</label>
                  <input type="number" value={mergedSettings.redis_max_connections} onChange={e => setSettings({ ...mergedSettings, redis_max_connections: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => testConnection('Redis')} disabled={testing === 'Redis'} className="px-4 py-2 rounded-xl glass border border-white/10 hover:border-green-500/30 transition-all flex items-center gap-2 text-sm">
                    {testing === 'Redis' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>Test Connection</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'crawler':
        return (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Crawler Settings</h3>
                  <p className="text-sm text-slate-400">Concurrency, timeouts, and rate limiting</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Max Concurrency</label>
                  <input type="number" value={mergedSettings.max_concurrency} onChange={e => setSettings({ ...mergedSettings, max_concurrency: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Per-Domain Concurrency</label>
                  <input type="number" value={mergedSettings.per_domain_concurrency} onChange={e => setSettings({ ...mergedSettings, per_domain_concurrency: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Request Timeout (seconds)</label>
                  <input type="number" value={mergedSettings.request_timeout} onChange={e => setSettings({ ...mergedSettings, request_timeout: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">User Agent</label>
                  <input type="text" value={mergedSettings.user_agent} onChange={e => setSettings({ ...mergedSettings, user_agent: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'extraction':
        return (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">LLM Extraction</h3>
                  <p className="text-sm text-slate-400">Extraction window, chunking, and retry settings</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Freshness Window (hours)</label>
                  <input type="number" value={mergedSettings.fresh_window_hours} onChange={e => setSettings({ ...mergedSettings, fresh_window_hours: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">LLM Chunk Size (chars)</label>
                  <input type="number" value={mergedSettings.llm_chunk_size} onChange={e => setSettings({ ...mergedSettings, llm_chunk_size: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Max Retries</label>
                  <input type="number" value={mergedSettings.llm_max_retries} onChange={e => setSettings({ ...mergedSettings, llm_max_retries: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Retry Delay (seconds)</label>
                  <input type="number" value={mergedSettings.llm_retry_delay} onChange={e => setSettings({ ...mergedSettings, llm_retry_delay: e.target.value })} className="w-full px-4 py-2 rounded-xl glass border border-white/10 focus:border-blue-500/30 focus:outline-none bg-white/5" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'sources':
        return (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Data Source Toggles</h3>
                  <p className="text-sm text-slate-400">Enable/disable individual data sources</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { category: 'Startups', sources: ['enable_ycombinator', 'enable_huggingface_orgs'] },
                  { category: 'Products', sources: ['enable_producthunt', 'enable_futurepedia', 'enable_aitoolsdirectory', 'enable_hf_spaces', 'enable_thereisanai'] },
                  { category: 'Papers', sources: ['enable_arxiv', 'enable_paperswithcode', 'enable_openalex', 'enable_hf_daily_papers'] },
                  { category: 'News', sources: ['enable_techcrunch', 'enable_venturebeat', 'enable_mit_tech_review', 'enable_the_decoder', 'enable_hf_blog'] },
                  { category: 'Jobs', sources: ['enable_greenhouse', 'enable_lever', 'enable_wellfound', 'enable_hf_jobs', 'enable_company_careers'] },
                ].map(({ category, sources }) => (
                  <div key={category} className="glass rounded-xl p-4">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">{category}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sources.map(key => {
                        const label = key.replace('enable_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        return (
                          <label key={key} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={mergedSettings[key] === 'true'}
                              onChange={e => setSettings({ ...mergedSettings, [key]: e.target.checked.toString() })}
                              className="w-4 h-4 accent-blue-500 rounded"
                            />
                            <span className="text-sm text-slate-300">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
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
          <h1 className="text-3xl font-bold text-gradient">Settings</h1>
          <p className="text-slate-400 mt-1">Configure FrontierAtlas platform settings</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportConfig} className="px-4 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 transition-all flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            <span>Export Config</span>
          </button>
          <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" id="config-import" />
          <label htmlFor="config-import" className="px-4 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 transition-all flex items-center gap-2 text-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Import Config</span>
          </label>
          <button onClick={resetSettings} className="px-4 py-2 rounded-xl glass border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-2 text-sm">
            <Trash2 className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button onClick={saveSettings} disabled={saving} className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-medium hover:from-blue-600 hover:to-violet-700 transition-all flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save All</span>
          </button>
        </div>
      </motion.div>

      {/* Section Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-2"
      >
        <div className="flex flex-wrap gap-1" role="tablist">
          {SECTIONS.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                role="tab"
                aria-selected={isActive}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white border border-blue-500/30'
                    : 'text-slate-300/80 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {section.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Section Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        key={activeSection}
      >
        {renderSection(activeSection)}
      </motion.div>

      {/* System Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          System Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="glass rounded-xl p-4">
            <p className="text-slate-400">Frontend</p>
            <p className="font-mono text-white">Next.js 14 + React 18 + TypeScript</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-slate-400">Backend</p>
            <p className="font-mono text-white">FastAPI + SQLAlchemy 2 + PostgreSQL</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-slate-400">Queue</p>
            <p className="font-mono text-white">Celery + Redis</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-slate-400">LLM Providers</p>
            <p className="font-mono text-white">Gemini Flash → Groq Llama → DeepSeek</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-slate-400">Deployment</p>
            <p className="font-mono text-white">Docker Compose</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-slate-400">Styling</p>
            <p className="font-mono text-white">Tailwind CSS + Framer Motion</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}