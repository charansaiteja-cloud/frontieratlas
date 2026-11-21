import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardOverview } from './DashboardOverview';

// Mock data
const mockStats = {
  total_startups: 150,
  total_products: 300,
  total_papers: 500,
  total_github_repos: 200,
  total_jobs: 1000,
  total_news: 50,
  fresh_jobs_24h: 25,
  fresh_news_24h: 10,
  successful_extractions: 900,
  failed_extractions: 50,
  pending_extractions: 50,
  extraction_rate: 0.9,
  total_sources: 25,
  healthy_sources: 20,
};

const mockActivity = [
  { date: '2024-01-15', record_type: 'startup', count: 10 },
  { date: '2024-01-15', record_type: 'product', count: 20 },
  { date: '2024-01-14', record_type: 'paper', count: 15 },
];

const mockSourceDist = [
  { source_name: 'YCombinator', count: 50 },
  { source_name: 'Product Hunt', count: 80 },
  { source_name: 'arXiv', count: 200 },
];

const mockRecordTypeDist = [
  { record_type: 'startup', count: 150 },
  { record_type: 'product', count: 300 },
  { record_type: 'paper', count: 500 },
  { record_type: 'job', count: 1000 },
  { record_type: 'news', count: 50 },
];

const mockFreshness = {
  news: [
    { date: '2024-01-15', news_count: 5 },
    { date: '2024-01-14', news_count: 3 },
  ],
  jobs: [
    { date: '2024-01-15', job_count: 10 },
    { date: '2024-01-14', job_count: 8 },
  ],
};

const mockGithubStars = {
  stars: [10, 50, 100, 200, 500, 1000, 5000],
};

const mockExtractionStatus = {
  status: [
    { extraction_status: 'COMPLETED', count: 900 },
    { extraction_status: 'FAILED', count: 50 },
    { extraction_status: 'PENDING', count: 50 },
  ],
};

const mockProps = {
  data: mockStats,
  stats: mockStats,
  loading: false,
  refresh: jest.fn(),
  activity: mockActivity,
  sourceDist: mockSourceDist,
  recordTypeDist: mockRecordTypeDist,
  freshness: mockFreshness,
  githubStars: mockGithubStars,
  extractionStatus: mockExtractionStatus,
};

describe('DashboardOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard title and description', () => {
    render(<DashboardOverview {...mockProps} />);
    
    expect(screen.getByText('FrontierAtlas Dashboard')).toBeInTheDocument();
    expect(screen.getByText('AI Intelligence Graph - Real-time insights')).toBeInTheDocument();
  });

  it('renders stat cards with correct values', () => {
    render(<DashboardOverview {...mockProps} />);
    
    expect(screen.getByText('150')).toBeInTheDocument(); // Startups
    expect(screen.getByText('300')).toBeInTheDocument(); // Products
    expect(screen.getByText('500')).toBeInTheDocument(); // Papers
    expect(screen.getByText('1,000')).toBeInTheDocument(); // Jobs
    expect(screen.getByText('50')).toBeInTheDocument(); // News
  });

  it('renders freshness indicators', () => {
    render(<DashboardOverview {...mockProps} />);
    
    expect(screen.getByText('25')).toBeInTheDocument(); // Fresh jobs
    expect(screen.getByText('10')).toBeInTheDocument(); // Fresh news
  });

  it('renders extraction rate', () => {
    render(<DashboardOverview {...mockProps} />);
    
    expect(screen.getByText('90%')).toBeInTheDocument(); // Extraction rate
  });

  it('calls refresh when refresh button clicked', () => {
    render(<DashboardOverview {...mockProps} />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    expect(mockProps.refresh).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<DashboardOverview {...mockProps} loading={true} />);
    
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('renders charts when data available', () => {
    render(<DashboardOverview {...mockProps} />);
    
    // Check for chart containers
    expect(screen.getByTestId('ingestion-activity-chart')).toBeInTheDocument();
    expect(screen.getByTestId('source-distribution-chart')).toBeInTheDocument();
    expect(screen.getByTestId('record-type-chart')).toBeInTheDocument();
  });
});