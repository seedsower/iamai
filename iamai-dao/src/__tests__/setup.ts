import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import  WalletAdapterNetwork,
  WalletError,
} from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: () => null,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Solana wallet adapter
const mockWallet = {
  adapter: {
    name: 'Phantom',
    icon: 'phantom-icon.svg',
    url: 'https://phantom.app',
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendTransaction: jest.fn(),
    signTransaction: jest.fn(),
    signAllTransactions: jest.fn(),
    signMessage: jest.fn(),
  },
  readyState: WalletReadyState.Installed,
};

jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    wallet: mockWallet,
    publicKey: null,
    connected: false,
    connecting: false,
    disconnecting: false,
    select: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendTransaction: jest.fn(),
    signTransaction: jest.fn(),
    signAllTransactions: jest.fn(),
    signMessage: jest.fn(),
  }),
  useConnection: () => ({
    connection: {
      getAccountInfo: jest.fn(),
      getBalance: jest.fn(),
      getTokenAccountsByOwner: jest.fn(),
      sendTransaction: jest.fn(),
      confirmTransaction: jest.fn(),
    },
  }),
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => children,
  WalletProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletModalProvider: ({ children }: { children: React.ReactNode }) => children,
  useWalletModal: () => ({
    visible: false,
    setVisible: jest.fn(),
  }),
}));

// Mock IPFS client
jest.mock('../lib/ipfs/client', () => ({
  ipfsClient: {
    add: jest.fn(),
    get: jest.fn(),
    pin: {
      add: jest.fn(),
      rm: jest.fn(),
    },
      description: 'A test file for testing',
    }),
    getGatewayUrl: jest.fn((hash: string) => `https://ipfs.io/ipfs/${hash}`),
    isAvailable: jest.fn().mockResolvedValue(true),
    pinContent: jest.fn().mockResolvedValue(undefined),
    unpinContent: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock auth client
jest.mock('@/lib/auth/client', () => ({
  authClient: {
    getChallenge: jest.fn().mockResolvedValue({
      challenge: 'Test challenge message',
      timestamp: Date.now(),
      nonce: 'test123',
    }),
    authenticate: jest.fn().mockResolvedValue({
      success: true,
      token: 'mock_jwt_token',
      walletAddress: 'TestWallet123456789',
      expiresIn: '24h',
    }),
    verifyToken: jest.fn().mockResolvedValue({
      valid: true,
      user: {
        walletAddress: 'TestWallet123456789',
        username: 'testuser',
        createdAt: '2024-01-01T00:00:00Z',
        lastLogin: '2024-01-01T00:00:00Z',
      },
    }),
    refreshToken: jest.fn().mockResolvedValue({
      success: true,
      token: 'new_mock_jwt_token',
    }),
    logout: jest.fn().mockResolvedValue(undefined),
    getToken: jest.fn().mockReturnValue('mock_jwt_token'),
    isAuthenticated: jest.fn().mockReturnValue(true),
    getAuthHeaders: jest.fn().mockReturnValue({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer mock_jwt_token',
    }),
    authenticatedRequest: jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }),
  },
}));

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve(''),
    status: 200,
    statusText: 'OK',
  })
) as jest.Mock;

// Mock window.localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
