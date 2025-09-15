import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { STAKING_CONFIG } from '@/lib/solana/connection';

export interface StakingPosition {
  id: string;
  amount: number;
  duration: number;
  apy: number;
  startDate: Date;
  endDate: Date;
  rewards: number;
  status: 'active' | 'completed' | 'unstaked';
}

export function useStaking() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [totalStaked, setTotalStaked] = useState<number>(0);
  const [totalRewards, setTotalRewards] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Fetch staking positions
  const fetchPositions = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/staking/positions/${publicKey.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPositions(data.positions || []);
        setTotalStaked(data.totalStaked || 0);
        setTotalRewards(data.totalRewards || 0);
      }
    } catch (error) {
      console.error('Error fetching staking positions:', error);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  // Stake tokens
  const stakeTokens = useCallback(async (amount: number, duration: number) => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    const tier = STAKING_CONFIG.tiers.find(t => t.duration === duration);
    if (!tier) {
      throw new Error('Invalid staking duration');
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/staking/stake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          amount,
          duration,
          apy: tier.apy,
        }),
      });

      if (!response.ok) {
        throw new Error('Staking failed');
      }

      const result = await response.json();
      await fetchPositions(); // Refresh positions
      return result;
    } catch (error) {
      console.error('Staking error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, fetchPositions]);

  // Unstake tokens
  const unstakeTokens = useCallback(async (positionId: string, early: boolean = false) => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/staking/unstake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          positionId,
          early,
        }),
      });

      if (!response.ok) {
        throw new Error('Unstaking failed');
      }

      const result = await response.json();
      await fetchPositions(); // Refresh positions
      return result;
    } catch (error) {
      console.error('Unstaking error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, fetchPositions]);

  // Claim rewards
  const claimRewards = useCallback(async (positionId: string) => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/staking/claim-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          positionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Claiming rewards failed');
      }

      const result = await response.json();
      await fetchPositions(); // Refresh positions
      return result;
    } catch (error) {
      console.error('Claim rewards error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, fetchPositions]);

  // Calculate estimated rewards
  const calculateRewards = useCallback((amount: number, duration: number) => {
    const tier = STAKING_CONFIG.tiers.find(t => t.duration === duration);
    if (!tier) return 0;
    
    return (amount * tier.apy / 100 * duration / 365);
  }, []);

  useEffect(() => {
    if (publicKey) {
      fetchPositions();
    } else {
      setPositions([]);
      setTotalStaked(0);
      setTotalRewards(0);
    }
  }, [publicKey, fetchPositions]);

  return {
    positions,
    totalStaked,
    totalRewards,
    loading,
    stakeTokens,
    unstakeTokens,
    claimRewards,
    calculateRewards,
    fetchPositions,
  };
}
