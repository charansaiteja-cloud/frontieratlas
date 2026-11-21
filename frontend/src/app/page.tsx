'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Rocket, Package, FileText, Briefcase, Newspaper,
  GitBranch, Settings, ChevronLeft, Menu, RefreshCw, TrendingUp,
  Download, Filter, Search, ExternalLink, AlertTriangle, CheckCircle,
  XCircle, Clock, Zap, Brain, Globe, Users, BarChart3, Activity
} from 'lucide-react';
import DashboardOverview from '@/components/DashboardOverview';
import StartupsTable from '@/components/StartupsTable';
import ProductsTable from '@/components/ProductsTable';
import PapersTable from '@/components/PapersTable';
import JobsTable from '@/components/JobsTable';
import NewsTable from '@/components/NewsTable';
import EntityResolution from '@/components/EntityResolution';
import SourceDiscovery from '@/components/SourceDiscovery';
import PipelineMonitor from '@/components/PipelineMonitor';
import SettingsPanel from '@/components/SettingsPanel';
import { fetchDashboardStats, fetchStartups, fetchProducts, fetchPapers, fetchJobs, fetchNews } from '@/lib/api';
import type { DashboardStats, Startup, Product, Paper, Job, NewsItem } from '@/types';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'startups', label: 'Startups', icon: Rocket },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'papers', label: 'Research Papers', icon: FileText },
  { id: 'jobs', label: 'AI Jobs', icon: Briefcase },
  { id: 'news', label: 'AI News', icon: Newspaper },
  { id: 'entities', label: 'Entity Resolution', icon: GitBranch },
  { id: 'discovery', label: 'Source Discovery', icon: Search },
  { id: 'pipeline', label: 'Pipeline Monitor', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type NavId = typeof NAV_ITEMS[number]['id'];

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState<NavId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    startups: Startup[];
    products: Product[];
    papers: Paper[];
    jobs: Job[];
    news: NewsItem[];
  }>({
    startups: [], products: [], papers: [], jobs: [], news: []
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, startupsRes, productsRes, papersRes, jobsRes, newsRes] = await Promise.all([
        fetchDashboardStats(),
        fetchStartups({ page_size: 50 }),
        fetchProducts({ page_size: 50 }),
        fetchPapers({ page_size: 50 }),
        fetchJobs({ page_size: 50 }),
        fetchNews({ page_size: 50 }),
      ]);
      setStats(statsRes);
      setData({
        startups: startupsRes.items,
        products: productsRes.items,
        papers: papersRes.items,
        jobs: jobsRes.items,
        news: newsRes.items,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    const commonProps = { data, stats, loading, refresh: loadDashboardData };
    
    switch (activeNav) {
      case 'overview':
        return <DashboardOverview {...commonProps} />;
      case 'startups':
        return <StartupsTable {...commonProps} />;
      case 'products':
        return <ProductsTable {...commonProps} />;
      case 'papers':
        return <PapersTable {...commonProps} />;
      case 'jobs':
        return <JobsTable {...commonProps} />;
      case 'news':
        return <NewsTable {...commonProps} />;
      case 'entities':
        return <EntityResolution {...commonProps} />;
      case 'discovery':
        return <SourceDiscovery {...commonProps} />;
      case 'pipeline':
        return <PipelineMonitor {...commonProps} />;
      case 'settings':
        return <SettingsPanel {...commonProps} />;
      default:
        return <DashboardOverview {...commonProps} />;
    }
  };

  const currentNav = NAV_ITEMS.find(n => n.id === activeNav);

  return (
    <div className="min-h-screen relative">
      {/* Animated Background */}
      <div className="animated-bg" aria-hidden="true" />
      
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 glass-strong transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Navigation"
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-6 border-b border-white/10 mb-6">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <Brain className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-gradient">FrontierAtlas</h1>
              <p className="text-xs text-slate-400">AI Intelligence Engine</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1" role="navigation" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => { setActiveNav(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10'
                      : 'text-slate-300/80 hover:bg-white/5 hover:text-white'
                  }`}
                  whileHover={{ x: isActive ? 0 : 4 }}
                  whileTap={{ scale: 0.98 }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} aria-hidden="true" />
                  <span className="font-medium">{item.label}</span>
                </motion.button>
              );
            })}
          </nav>

          {/* Footer Stats */}
          <div className="border-t border-white/10 pt-4 px-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span>Real-time intelligence</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Global coverage</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 glass border-b border-white/10 backdrop-blur-2xl">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-white/5 transition-colors"
                aria-label="Open navigation"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="hidden sm:block">
                <h2 className="text-lg font-semibold text-white">{currentNav?.label}</h2>
                <p className="text-xs text-slate-400">Global AI Intelligence Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 transition-all text-sm font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-white/10 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-slate-300">Live</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeNav}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}