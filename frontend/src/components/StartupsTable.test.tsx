// @ts-nocheck
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StartupsTable from './StartupsTable'

const mockStartups = {
  startups: [
    {
      id: '1',
      record: {
        id: 'rec1',
        source_name: 'YCombinator',
        source_url: 'https://ycombinator.com/companies/testai',
        collected_at: '2024-01-15T10:00:00Z',
        extraction_status: 'COMPLETED',
      },
      entity_name: 'TestAI',
      description: 'An AI startup for testing',
      website: 'https://testai.example.com',
      industry: 'Artificial Intelligence',
      stage: 'Series A',
      founded_year: 2023,
      employee_count: 25,
      total_funding_usd: 5000000,
      investors: ['VC Fund 1', 'Angel Investor'],
      headquarters: 'San Francisco, CA',
      tags: ['AI', 'ML', 'NLP'],
    },
    {
      id: '2',
      record: {
        id: 'rec2',
        source_name: 'HuggingFace Orgs',
        source_url: 'https://huggingface.co/openai',
        collected_at: '2024-01-14T10:00:00Z',
        extraction_status: 'COMPLETED',
      },
      entity_name: 'OpenAI',
      description: 'AI research and deployment company',
      website: 'https://openai.com',
      industry: 'Artificial Intelligence',
      stage: 'Mature',
      founded_year: 2015,
      employee_count: 1000,
      total_funding_usd: 10000000000,
      investors: ['Microsoft', 'Khosla Ventures'],
      headquarters: 'San Francisco, CA',
      tags: ['AI', 'LLM', 'Research'],
    },
  ],
  total: 2,
  page: 1,
  page_size: 20,
};

const mockProps = {
  data: mockStartups,
  stats: mockStartups,
  loading: false,
  refresh: jest.fn(),
};

describe('StartupsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with startup data', () => {
    render(<StartupsTable {...mockProps} />);
    
// @ts-ignore
    expect(screen.getByText('TestAI')).toBeInTheDocument();
// @ts-ignore
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
// @ts-ignore
    expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument();
// @ts-ignore
    expect(screen.getByText('Series A')).toBeInTheDocument();
// @ts-ignore
    expect(screen.getByText('Mature')).toBeInTheDocument();
  });

  it('renders funding amounts formatted', () => {
    render(<StartupsTable {...mockProps} />);
    
// @ts-ignore
    expect(screen.getByText('$5.0M')).toBeInTheDocument();
// @ts-ignore
    expect(screen.getByText('$10.0B')).toBeInTheDocument();
  });

  it('renders source links', () => {
    render(<StartupsTable {...mockProps} />);
    
    const links = screen.getAllByTestId('source-link');
    expect(links).toHaveLength(2);
  });

  it('shows pagination info', () => {
    render(<StartupsTable {...mockProps} />);
    
// @ts-ignore
    expect(screen.getByText('Showing 1 to 2 of 2 results')).toBeInTheDocument();
  });

  it('calls refresh when refresh button clicked', () => {
    render(<StartupsTable {...mockProps} />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    expect(mockProps.refresh).toHaveBeenCalledTimes(1);
  });

  it('filters by search term', () => {
    render(<StartupsTable {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search startups...');
    fireEvent.change(searchInput, { target: { value: 'OpenAI' } });
    
// @ts-ignore
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
// @ts-ignore
    expect(screen.queryByText('TestAI')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<StartupsTable {...mockProps} loading={true} />);
    
// @ts-ignore
    expect(screen.getByText('Loading startups...')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    const emptyProps = {
      ...mockProps,
      data: { startups: [], total: 0, page: 1, page_size: 20 },
    };
    
    render(<StartupsTable {...emptyProps} />);
    
// @ts-ignore
    expect(screen.getByText('No startups found')).toBeInTheDocument();
  });
});