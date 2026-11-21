export interface Startup {
  id: string;
  record_id: string;
  entity_name: string;
  description?: string;
  website?: string;
  employee_count?: number;
  industry?: string;
  headquarters?: string;
  founding_year?: number;
  canonical_entity_id?: string;
  source_name: string;
  created_at: string;
}

export interface Product {
  id: string;
  record_id: string;
  product_name: string;
  product_url?: string;
  description?: string;
  startup_name?: string;
  pricing_model: string;
  canonical_entity_id?: string;
  source_name: string;
  created_at: string;
}

export interface Paper {
  id: string;
  record_id: string;
  title: string;
  authors: string[];
  abstract?: string;
  paper_url: string;
  arxiv_id?: string;
  github_url?: string;
  github_stars?: number;
  github_repo_owner?: string;
  github_repo_name?: string;
  published_date: string;
  metrics_updated_at?: string;
  source_name: string;
}

export interface Job {
  id: string;
  record_id: string;
  company: string;
  title: string;
  job_url: string;
  description?: string;
  location?: string;
  is_remote: boolean;
  employment_type?: string;
  role_family?: string;
  published_date: string;
  canonical_entity_id?: string;
  source_name: string;
}

export interface NewsItem {
  id: string;
  record_id: string;
  headline: string;
  author?: string;
  published_at: string;
  full_text?: string;
  article_url: string;
  source_name: string;
  canonical_entity_id?: string;
}

export interface DashboardStats {
  total_startups: number;
  total_products: number;
  total_papers: number;
  total_github_repos: number;
  total_jobs: number;
  total_news: number;
  fresh_jobs_24h: number;
  fresh_news_24h: number;
  successful_extractions: number;
  failed_extractions: number;
  pending_extractions: number;
  extraction_rate: number;
  total_sources: number;
  healthy_sources: number;
}

export interface EntityMapping {
  id: string;
  raw_entity_name: string;
  canonical_entity_name: string;
  canonical_entity_id?: string;
  match_method: string;
  confidence_score: number;
  source_url?: string;
  required_human_review: boolean;
  resolution_status: string;
  created_at: string;
}

export interface SourceHealth {
  id: string;
  source_name: string;
  source_url?: string;
  source_type: string;
  last_successful_crawl?: string;
  last_crawl_status?: string;
  records_discovered: number;
  failure_count: number;
  health_status: string;
  blocked_reason?: string;
  rate_limit_hit_at?: string;
}

export interface PipelineTask {
  id: string;
  task_id: string;
  task_type: string;
  source_name?: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  last_error?: string;
  started_at?: string;
  completed_at?: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface APISource {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  documentation_url?: string;
  source_url?: string;
  auth_type: string;
  https_support: boolean;
  cors_support: string;
  rate_limit?: string;
  free_tier: boolean;
  pricing_notes?: string;
  status: string;
  enabled: boolean;
  last_checked_at?: string;
  last_successful_call?: string;
  consecutive_failures: number;
  health_status: string;
  tags: string[];
  provenance: Record<string, unknown>;
  integration_priority: number;
  adapter_class?: string;
  created_at: string;
  updated_at: string;
}

export interface APISourceHealthLog {
  id: string;
  api_source_id: string;
  status_code?: number;
  response_time_ms?: number;
  success: boolean;
  error_message?: string;
  rate_limit_remaining?: string;
  rate_limit_reset?: string;
  created_at: string;
}

export interface SourceDiscoveryStats {
  total_sources: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  by_health: Record<string, number>;
  enabled_sources: number;
  integrated_sources: number;
  sources_needing_review: number;
}