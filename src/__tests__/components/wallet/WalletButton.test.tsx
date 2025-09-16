import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletButton } from '@/components/wallet/WalletButton';

// Mock the wallet context
const mockWallet = {
  publicKey: {
    toString: () => 'TestWallet123456789',
    toBase58: () => 'TestWallet123456789',
  },
  connected: false,
  connecting: false,
  disconnecting: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
  wallet: null,
};

jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => mockWallet,
}));

describe('WalletButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders connect button when wallet is not connected', () => {
    render(<WalletButton />);
    
    const connectButton = screen.getByText('Connect Wallet');
    expect(connectButton).toBeInTheDocument();
  });

  it('calls connect when connect button is clicked', async () => {
    render(<WalletButton />);
    
    const connectButton = screen.getByText('Connect Wallet');
    fireEvent.click(connectButton);
    
    await waitFor(() => {
      expect(mockWallet.connect).toHaveBeenCalledTimes(1);
    });
  });

  it('shows connecting state', () => {
    mockWallet.connecting = true;
    
    render(<WalletButton />);
    
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('shows connected state with truncated address', () => {
    mockWallet.connected = true;
    mockWallet.connecting = false;
    
    render(<WalletButton />);
    
    expect(screen.getByText('TestWa...56789')).toBeInTheDocument();
  });

  it('calls disconnect when disconnect button is clicked', async () => {
    mockWallet.connected = true;
    
    render(<WalletButton />);
    
    const disconnectButton = screen.getByText('TestWa...56789');
    fireEvent.click(disconnectButton);
    
    await waitFor(() => {
      expect(mockWallet.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  it('shows disconnecting state', () => {
    mockWallet.connected = true;
    mockWallet.disconnecting = true;
    
    render(<WalletButton />);
    
    expect(screen.getByText('Disconnecting...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-wallet-button';
    
    render(<WalletButton className={customClass} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(customClass);
  });
});
