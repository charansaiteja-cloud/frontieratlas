import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchDashboardStats = async () => {
  const res = await api.get('/dashboard/stats');
  return res.data;
};

export const fetchStartups = async (params: Record<string, unknown> = {}) => {
  const res = await api.get('/startups', { params });
  return res.data;
};

export const fetchProducts = async (params: Record<string, unknown> = {}) => {
  const res = await api.get('/products', { params });
  return res.data;
};

export const fetchPapers = async (params: Record<string, unknown> = {}) => {
  const res = await api.get('/papers', { params });
  return res.data;
};

export const fetchJobs = async (params: Record<string, unknown> = {}) => {
  const res = await api.get('/jobs', { params });
  return res.data;
};

export const fetchNews = async (params: Record<string, unknown> = {}) => {
  const res = await api.get('/news', { params });
  return res.data;
};

export const fetchEntityMappings = async (params: Record<string, unknown> = {}) => {
  const res = await api.get('/entities/mappings', { params });
  return res.data;
};

export const fetchSources = async () => {
  const res = await api.get('/sources');
  return res.data;
};

export const fetchPipelineStatus = async () => {
  const res = await api.get('/pipeline/status');
  return res.data;
};

export const fetchPipelineLogs = async (params: Record<string, unknown> = {}) => {
  const res = await api.get('/pipeline/logs', { params });
  return res.data;
};

export const startPipeline = async (recordType?: string) => {
  const res = await api.post('/pipeline/start', null, { params: { record_type: recordType } });
  return res.data;
};

export const stopPipeline = async () => {
  const res = await api.post('/pipeline/stop');
  return res.data;
};

export const retryFailed = async () => {
  const res = await api.post('/pipeline/retry-failed');
  return res.data;
};

export const triggerAPISync = async () => {
  const res = await api.post('/pipeline/api-sync');
  return res.data;
};

export const triggerAPIHealthCheck = async () => {
  const res = await api.post('/pipeline/api-health-check');
  return res.data;
};

export const exportData = async (recordType: string) => {
  const res = await api.get(`/exports/${recordType}`);
  return res.data;
};

// API Discovery Registry
export const fetchAPISources = async (params: Record<string, unknown> = {}) => {
  const res = await api.get('/api-sources', { params });
  return res.data;
};

export const fetchAPISourcesStats = async () => {
  const res = await api.get('/api-sources/stats');
  return res.data;
};

export const fetchAPISource = async (sourceId: string) => {
  const res = await api.get(`/api-sources/${sourceId}`);
  return res.data;
};

export const createAPISource = async (data: Record<string, unknown>) => {
  const res = await api.post('/api-sources', data);
  return res.data;
};

export const updateAPISource = async (sourceId: string, data: Record<string, unknown>) => {
  const res = await api.patch(`/api-sources/${sourceId}`, data);
  return res.data;
};

export const enableAPISource = async (sourceId: string) => {
  const res = await api.post(`/api-sources/${sourceId}/enable`);
  return res.data;
};

export const disableAPISource = async (sourceId: string) => {
  const res = await api.post(`/api-sources/${sourceId}/disable`);
  return res.data;
};

export const syncAPIRegistry = async () => {
  const res = await api.post('/api-sources/sync');
  return res.data;
};

export const runAPIHealthChecks = async () => {
  const res = await api.post('/api-sources/health-check');
  return res.data;
};

export const fetchAPISourceHealthHistory = async (sourceId: string, limit = 50) => {
  const res = await api.get(`/api-sources/${sourceId}/health-history`, { params: { limit } });
  return res.data;
};

export const fetchAPICategories = async () => {
  const res = await api.post('/api-sources/categories/refresh');
  return res.data;
};

export default api;