import '@testing-library/jest-dom';

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: () => <svg data-testid="search" />,
  Filter: () => <svg data-testid="filter" />,
  Download: () => <svg data-testid="download" />,
  ChevronDown: () => <svg data-testid="chevron-down" />,
  ChevronUp: () => <svg data-testid="chevron-up" />,
  GitBranch: () => <svg data-testid="git-branch" />,
  AlertTriangle: () => <svg data-testid="alert-triangle" />,
  CheckCircle: () => <svg data-testid="check-circle" />,
  XCircle: () => <svg data-testid="x-circle" />,
  UserCheck: () => <svg data-testid="user-check" />,
  RefreshCw: () => <svg data-testid="refresh-cw" />,
  Eye: () => <svg data-testid="eye" />,
  Edit3: () => <svg data-testid="edit3" />,
  Globe: () => <svg data-testid="globe" />,
  Database: () => <svg data-testid="database" />,
  Server: () => <svg data-testid="server" />,
  Wifi: () => <svg data-testid="wifi" />,
  Activity: () => <svg data-testid="activity" />,
  Zap: () => <svg data-testid="zap" />,
  Play: () => <svg data-testid="play" />,
  Pause: () => <svg data-testid="pause" />,
  RotateCcw: () => <svg data-testid="rotate-ccw" />,
  Clock: () => <svg data-testid="clock" />,
  BarChart3: () => <svg data-testid="bar-chart" />,
  Settings: () => <svg data-testid="settings" />,
  Key: () => <svg data-testid="key" />,
  Save: () => <svg data-testid="save" />,
  EyeOff: () => <svg data-testid="eye-off" />,
  Copy: () => <svg data-testid="copy" />,
  Trash2: () => <svg data-testid="trash2" />,
  Upload: () => <svg data-testid="upload" />,
  Terminal: () => <svg data-testid="terminal" />,
  X: () => <svg data-testid="x" />,
  TrendingUp: () => <svg data-testid="trending-up" />,
  TrendingDown: () => <svg data-testid="trending-down" />,
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock axios
jest.mock('axios', () => ({
  create: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  }),
}));

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));