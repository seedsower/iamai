import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useToken } from '@/hooks/useToken';

// Mock the dependencies
const mockConnection = {
  getTokenAccountBalance: jest.fn(),
  sendTransaction: jest.fn(),
  confirmTransaction: jest.fn(),
};

const mockWallet = {
  publicKey: {
    toString: () => 'TestWallet123456789',
  },
  sendTransaction: jest.fn(),
  connected: true,
};

jest.mock('@solana/wallet-adapter-react', () => ({
  useConnection: () => ({ connection: mockConnection }),
  useWallet: () => mockWallet,
}));

describe('useToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useToken());

    expect(result.current.balance).toBe('0');
    expect(result.current.loading).toBe(false);
    expect(result.current.purchasing).toBe(false);
    expect(result.current.transferring).toBe(false);
  });

  it('fetches token balance successfully', async () => {
    mockConnection.getTokenAccountBalance.mockResolvedValue({
      value: { amount: '1000000000', decimals: 9 }
    });

    const { result } = renderHook(() => useToken());

    await act(async () => {
      await result.current.fetchBalance();
    });

    expect(result.current.balance).toBe('1000000000');
    expect(mockConnection.getTokenAccountBalance).toHaveBeenCalled();
  });

  it('handles balance fetch error', async () => {
    mockConnection.getTokenAccountBalance.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useToken());

    await act(async () => {
      await result.current.fetchBalance();
    });

    expect(result.current.balance).toBe('0');
  });

  it('purchases tokens successfully', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        success: true,
        transactionId: 'test_tx_id',
        amount: 100,
        walletAddress: 'TestWallet123456789'
      })
    };

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    mockWallet.sendTransaction.mockResolvedValue('mock_signature');
    mockConnection.confirmTransaction.mockResolvedValue({ value: { err: null } });

    const { result } = renderHook(() => useToken());

    let purchaseResult;
    await act(async () => {
      purchaseResult = await result.current.purchaseTokens(100, 0.01);
    });

    expect(purchaseResult).toEqual({
      success: true,
      signature: 'mock_signature',
      amount: 100
    });
  });

  it('handles purchase error', async () => {
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({
        error: 'Insufficient funds'
      })
    };

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useToken());

    let purchaseResult;
    await act(async () => {
      purchaseResult = await result.current.purchaseTokens(100, 0.01);
    });

    expect(purchaseResult).toEqual({
      success: false,
      error: 'Insufficient funds'
    });
  });

  it('transfers tokens successfully', async () => {
    mockWallet.sendTransaction.mockResolvedValue('transfer_signature');
    mockConnection.confirmTransaction.mockResolvedValue({ value: { err: null } });

    const { result } = renderHook(() => useToken());

    let transferResult;
    await act(async () => {
      transferResult = await result.current.transferTokens('RecipientWallet123', 50);
    });

    expect(transferResult).toEqual({
      success: true,
      signature: 'transfer_signature',
      amount: 50
    });
  });

  it('handles transfer error when wallet not connected', async () => {
    mockWallet.connected = false;

    const { result } = renderHook(() => useToken());

    let transferResult;
    await act(async () => {
      transferResult = await result.current.transferTokens('RecipientWallet123', 50);
    });

    expect(transferResult).toEqual({
      success: false,
      error: 'Wallet not connected'
    });

    // Reset for other tests
    mockWallet.connected = true;
  });

  it('sets loading states correctly during operations', async () => {
    mockConnection.getTokenAccountBalance.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        value: { amount: '1000000000', decimals: 9 }
      }), 100))
    );

    const { result } = renderHook(() => useToken());

    act(() => {
      result.current.fetchBalance();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.loading).toBe(false);
  });
});
