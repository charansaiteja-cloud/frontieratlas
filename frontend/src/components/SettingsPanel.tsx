'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Search, Filter, Download, ExternalLink, ChevronDown, ChevronUp,
  Settings, User, Shield, Key, Database, Globe, Bell, Moon, Sun,
  Monitor, Palette, Languages, Save, RefreshCw, Eye, EyeOff,
  Trash2, Plus, Edit, Copy, Check, X, AlertTriangle, Info,
  Server, Cpu, MemoryStick, HardDrive, Network, GitBranch, Zap
} from 'lucide-react';

interface SettingsPanelProps {
  data: any;
  stats: any;
  loading: boolean;
  refresh: () => void;
}

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'pipeline', label: 'Pipeline', icon: GitBranch },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'advanced', label: 'Advanced', icon: Server },
];

export default function SettingsPanel({ loading, refresh }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'api' | 'database' | 'pipeline' | 'notifications' | 'advanced'>('general');
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [language, setLanguage] = useState('en');
  const [animations, setAnimations] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [pipelineAlerts, setPipelineAlerts] = useState(true);
  const [errorAlerts, setErrorAlerts] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [logLevel, setLogLevel] = useState<'debug' | 'info' | 'warn' | 'error'>('info');
  const [telemetry, setTelemetry] = useState(true);

  // API Keys state
  const [apiKeys, setApiKeys] = useState([
    { id: 'openai', name: 'OpenAI', value: 'sk-••••••••••••••••••••••••', enabled: true },
    { id: 'anthropic', name: 'Anthropic', value: 'sk-ant-••••••••••••••••••••••', enabled: true },
    { id: 'google', name: 'Google AI', value: 'AIza••••••••••••••••••••••••••', enabled: false },
    { id: 'github', name: 'GitHub', value: 'ghp_••••••••••••••••••••••••••••', enabled: true },
    { id: 'crunchbase', name: 'Crunchbase', value: '••••••••••••••••••••••••••••', enabled: false },
  ]);

  const [showKey, setShowKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState('');

  const typeColors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    violet: 'bg-violet-500/20 text-violet-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    amber: 'bg-amber-500/20 text-amber-400',
    rose: 'bg-rose-500/20 text-rose-400',
  };

  const handleSave = () => {
    // In real app, call API to save settings
    console.log('Settings saved');
  };

  const handleTestConnection = async (keyId: string) => {
    // In real app, test the API key
    console.log(`Testing ${keyId} connection`);
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey(showKey === keyId ? null : keyId);
  };

  const startEditKey = (keyId: string) => {
    setEditingKey(keyId);
    setNewKeyValue('');
  };

  const saveKey = (keyId: string) => {
    if (newKeyValue.trim()) {
      setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, value: newKeyValue, enabled: true } : k));
      setEditingKey(null);
      setNewKeyValue('');
    }
  };

  const cancelEditKey = () => {
    setEditingKey(null);
    setNewKeyValue('');
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
          <p className="text-slate-400 mt-1">Configure FrontierAtlas preferences and integrations</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
          <button onClick={refresh} disabled={loading} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-1"
      >
        <div className="flex flex-wrap gap-1" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'text-slate-300/80 hover:bg-white/5 hover:text-white'
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

      {/* Tab Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-6"
      >
        {activeTab === 'general' && (
          <div className="space-y-8 max-w-3xl">
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Application
              </h3>
              <div className="space-y-4">
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Language</p>
                      <p className="text-sm text-slate-400">Interface language</p>
                    </div>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="select-glass w-auto min-w-[180px]"
                    >
                      <option value="en">English</option>
                      <option value="zh">中文</option>
                      <option value="ja">日本語</option>
                      <option value="ko">한국어</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Auto Refresh</p>
                      <p className="text-sm text-slate-400">Automatically refresh data</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
                <div className="glass p-4 rounded-xl" style={{ opacity: autoRefresh ? 1 : 0.5 }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Refresh Interval</p>
                      <p className="text-sm text-slate-400">Seconds between auto-refresh</p>
                    </div>
                    <select
                      value={refreshInterval}
                      onChange={e => setRefreshInterval(Number(e.target.value))}
                      disabled={!autoRefresh}
                      className="select-glass w-auto min-w-[180px]"
                    >
                      <option value="30">30 seconds</option>
                      <option value="60">1 minute</option>
                      <option value="120">2 minutes</option>
                      <option value="300">5 minutes</option>
                      <option value="600">10 minutes</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-violet-400" />
                Display
              </h3>
              <div className="space-y-4">
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Animations</p>
                      <p className="text-sm text-slate-400">Enable motion and transitions</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={animations} onChange={e => setAnimations(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Compact Mode</p>
                      <p className="text-sm text-slate-400">Reduce spacing for more density</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={compactMode} onChange={e => setCompactMode(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-8 max-w-3xl">
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-400" />
                Theme
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'dark', label: 'Dark', icon: Moon, desc: 'Dark mode (default)' },
                  { id: 'light', label: 'Light', icon: Sun, desc: 'Light mode' },
                  { id: 'system', label: 'System', icon: Monitor, desc: 'Follow system preference' },
                ].map(option => (
                  <motion.button
                    key={option.id}
                    onClick={() => setTheme(option.id as any)}
                    className={`relative p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
                      theme === option.id
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-white/10 hover:border-blue-500/30 bg-white/5'
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: ['dark', 'light', 'system'].indexOf(option.id) * 0.05 }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === option.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-slate-400'}`}>
                        <option.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{option.label}</p>
                        <p className="text-xs text-slate-400">{option.desc}</p>
                      </div>
                    </div>
                    {theme === option.id && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                Regional
              </h3>
              <div className="glass p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Language</p>
                    <p className="text-sm text-slate-400">Interface language</p>
                  </div>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="select-glass w-auto min-w-[180px]"
                  >
                    <option value="en">English</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                    <option value="ko">한국어</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-8 max-w-3xl">
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                API Keys
              </h3>
              <p className="text-sm text-slate-400 mb-6">Manage your API keys for external integrations. Keys are encrypted at rest.</p>
              <div className="space-y-4">
                {apiKeys.map(key => (
                  <motion.div
                    key={key.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass p-4 rounded-xl"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${key.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                          <Key className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-white capitalize">{key.name}</p>
                          <p className="text-xs text-slate-400 font-mono">
                            {editingKey === key.id ? (
                              <input
                                type="password"
                                value={newKeyValue}
                                onChange={e => setNewKeyValue(e.target.value)}
                                placeholder="Enter new API key"
                                className="input-glass w-[300px]"
                              />
                            ) : (
                              <>
                                {showKey === key.id ? key.value : key.value.replace(/./g, '•')}
                                <button
                                  onClick={() => toggleKeyVisibility(key.id)}
                                  className="ml-2 text-slate-400 hover:text-white text-xs"
                                >
                                  {showKey === key.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingKey === key.id ? (
                          <>
                            <button onClick={() => saveKey(key.id)} className="btn-primary text-sm">
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </button>
                            <button onClick={cancelEditKey} className="btn-ghost text-sm">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditKey(key.id)} className="btn-ghost text-sm">
                              <Edit className="w-4 h-4 mr-1" />
                              {key.enabled ? 'Update' : 'Add'}
                            </button>
                            <button onClick={() => handleTestConnection(key.id)} className="btn-ghost text-sm">
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Test
                            </button>
                            {key.enabled && (
                              <button onClick={() => setApiKeys(prev => prev.map(k => k.id === key.id ? { ...k, enabled: false, value: '••••••••••••••••••••••••' } : k))} className="btn-ghost text-sm text-rose-400 hover:bg-rose-500/10">
                                <Trash2 className="w-4 h-4 mr-1" />
                                Revoke
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="btn-ghost w-full py-4 border-2 border-dashed border-white/10 hover:border-blue-500/50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add New API Key
                </motion.button>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="space-y-8 max-w-3xl">
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                Connection
              </h3>
              <div className="space-y-4">
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">PostgreSQL</p>
                      <p className="text-sm text-slate-400">Primary database connection</p>
                    </div>
                    <span className="badge badge-emerald">Connected</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-slate-400">Host</p>
                      <p className="font-mono text-white">postgres:5432</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Database</p>
                      <p className="font-mono text-white">frontieratlas</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Pool Size</p>
                      <p className="font-mono text-white">20 connections</p>
                    </div>
                    <div>
                      <p className="text-slate-400">SSL Mode</p>
                      <p className="font-mono text-white">require</p>
                    </div>
                  </div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Redis</p>
                      <p className="text-sm text-slate-400">Cache and message broker</p>
                    </div>
                    <span className="badge badge-emerald">Connected</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-slate-400">Host</p>
                      <p className="font-mono text-white">redis:6379</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Database</p>
                      <p className="font-mono text-white">0</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-violet-400" />
                Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass p-4 rounded-xl">
                  <p className="text-sm text-slate-400 mb-2">Query Timeout</p>
                  <input type="number" defaultValue={30} className="input-glass w-32" />
                  <p className="text-xs text-slate-500 mt-1">seconds</p>
                </div>
                <div className="glass p-4 rounded-xl">
                  <p className="text-sm text-slate-400 mb-2">Pool Timeout</p>
                  <input type="number" defaultValue={10} className="input-glass w-32" />
                  <p className="text-xs text-slate-500 mt-1">seconds</p>
                </div>
                <div className="glass p-4 rounded-xl">
                  <p className="text-sm text-slate-400 mb-2">Max Retries</p>
                  <input type="number" defaultValue={3} className="input-glass w-32" />
                </div>
                <div className="glass p-4 rounded-xl">
                  <p className="text-sm text-slate-400 mb-2">Batch Size</p>
                  <input type="number" defaultValue={1000} className="input-glass w-32" />
                  <p className="text-xs text-slate-500 mt-1">records per batch</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className="space-y-8 max-w-3xl">
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-emerald-400" />
                Pipeline Configuration
              </h3>
              <div className="space-y-4">
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Concurrent Workers</p>
                      <p className="text-sm text-slate-400">Number of parallel pipeline workers</p>
                    </div>
                    <input type="number" defaultValue={4} min={1} max={16} className="input-glass w-24 text-center" />
                  </div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Batch Size</p>
                      <p className="text-sm text-slate-400">Records per processing batch</p>
                    </div>
                    <input type="number" defaultValue={500} min={100} max={5000} step={100} className="input-glass w-24 text-center" />
                  </div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Retry Attempts</p>
                      <p className="text-sm text-slate-400">Failed stage retries</p>
                    </div>
                    <input type="number" defaultValue={3} min={0} max={10} className="input-glass w-24 text-center" />
                  </div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Timeout</p>
                      <p className="text-sm text-slate-400">Stage execution timeout</p>
                    </div>
                    <input type="number" defaultValue={300} min={60} max={3600} step={60} className="input-glass w-24 text-center" />
                    <span className="text-slate-400">seconds</span>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Scheduling
              </h3>
              <div className="space-y-4">
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Auto Run</p>
                      <p className="text-sm text-slate-400">Automatically run pipeline on schedule</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Schedule</p>
                      <p className="text-sm text-slate-400">Cron expression for auto runs</p>
                    </div>
                    <input type="text" defaultValue="0 */2 * * *" className="input-glass w-48 font-mono" />
                    <span className="text-slate-400 text-sm">(Every 2 hours)</span>
                  </div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Timezone</p>
                      <p className="text-sm text-slate-400">Schedule timezone</p>
                    </div>
                    <select className="select-glass w-auto min-w-[200px]">
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Asia/Shanghai">Shanghai</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-8 max-w-3xl">
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-rose-400" />
                Notification Preferences
              </h3>
              <div className="space-y-4">
                {[
                  { id: 'email', label: 'Email Notifications', desc: 'Receive email alerts', enabled: emailNotifications, setter: setEmailNotifications },
                  { id: 'push', label: 'Push Notifications', desc: 'Browser push notifications', enabled: pushNotifications, setter: setPushNotifications },
                  { id: 'pipeline', label: 'Pipeline Alerts', desc: 'Pipeline completion/failure alerts', enabled: pipelineAlerts, setter: setPipelineAlerts },
                  { id: 'errors', label: 'Error Alerts', desc: 'System error notifications', enabled: errorAlerts, setter: setErrorAlerts },
                ].map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass p-4 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{item.label}</p>
                        <p className="text-sm text-slate-400">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={item.enabled} onChange={e => item.setter(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                      </label>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                Webhook Integrations
              </h3>
              <div className="space-y-4">
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Slack Webhook</p>
                      <p className="text-sm text-slate-400">Send alerts to Slack channel</p>
                    </div>
                    <input type="url" placeholder="https://hooks.slack.com/services/..." className="input-glass w-80" />
                  </div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Discord Webhook</p>
                      <p className="text-sm text-slate-400">Send alerts to Discord channel</p>
                    </div>
                    <input type="url" placeholder="https://discord.com/api/webhooks/..." className="input-glass w-80" />
                  </div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Generic Webhook</p>
                      <p className="text-sm text-slate-400">Custom HTTP webhook endpoint</p>
                    </div>
                    <input type="url" placeholder="https://your-webhook-endpoint.com" className="input-glass w-80" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-8 max-w-3xl">
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-rose-400" />
                Developer Options
              </h3>
              <div className="space-y-4">
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Debug Mode</p>
                      <p className="text-sm text-slate-400">Enable verbose logging and debug tools</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={debugMode} onChange={e => setDebugMode(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                    </label>
                  </div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Log Level</p>
                      <p className="text-sm text-slate-400">Minimum log severity</p>
                    </div>
                    <select
                      value={logLevel}
                      onChange={e => setLogLevel(e.target.value as any)}
                      className="select-glass w-auto min-w-[180px]"
                    >
                      <option value="debug">Debug</option>
                      <option value="info">Info</option>
                      <option value="warn">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Telemetry</p>
                      <p className="text-sm text-slate-400">Send anonymous usage statistics</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={telemetry} onChange={e => setTelemetry(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                System Information
              </h3>
              <div className="glass p-4 rounded-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Frontend Version</p>
                    <p className="font-mono text-white">1.0.0</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Backend Version</p>
                    <p className="font-mono text-white">1.0.0</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Node Version</p>
                    <p className="font-mono text-white">20.x</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Python Version</p>
                    <p className="font-mono text-white">3.11</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">PostgreSQL</p>
                    <p className="font-mono text-white">16.x</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Redis</p>
                    <p className="font-mono text-white">7.x</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Danger Zone
              </h3>
              <div className="glass p-4 rounded-xl border border-rose-500/30">
                <p className="text-sm text-rose-400 mb-4">These actions are irreversible. Use with caution.</p>
                <div className="flex flex-wrap gap-3">
                  <button className="btn-danger text-sm">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear All Data
                  </button>
                  <button className="btn-ghost text-sm text-rose-400 hover:bg-rose-500/10">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reset Settings
                  </button>
                  <button className="btn-ghost text-sm text-amber-400 hover:bg-amber-500/10">
                    <Download className="w-4 h-4 mr-1" />
                    Export Config
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </motion.div>
    </div>
  );
}