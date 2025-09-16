'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_IDS } from '@/lib/solana/connection';

export interface StakingPosition {
  id: string;
  amount: number;
  duration: number;
  apy: number;
  startDate: string;
  endDate: string;
  rewards: number;
  status: 'active' | 'completed' | 'withdrawn';
}

export const useStakingData = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [totalStaked, setTotalStaked] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchStakingData = useCallback(async () => {
    if (!connection || !publicKey) {
      setPositions([]);
      setTotalStaked(0);
      setTotalRewards(0);
      return;
    }

    setLoading(true);
    try {
      // Get all staking accounts for this user
      const accounts = await connection.getProgramAccounts(PROGRAM_IDS.staking, {
        filters: [
          {
            memcmp: {
              offset: 8, // Skip discriminator
              bytes: publicKey.toBase58(),
            },
          },
        ],
      });

      const stakingPositions: StakingPosition[] = [];
      let totalStakedAmount = 0;
      let totalRewardsAmount = 0;

      for (const account of accounts) {
        try {
          // Parse the account data (simplified - would use actual program structure)
          const accountInfo = account.account;
          
          if (accountInfo.data.length > 0) {
            // Mock parsing based on account existence
            const position: StakingPosition = {
              id: account.pubkey.toString(),
              amount: Math.floor(Math.random() * 5000) + 1000,
              duration: [30, 60, 90, 180][Math.floor(Math.random() * 4)],
              apy: [5, 8, 12, 20][Math.floor(Math.random() * 4)],
              startDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              endDate: new Date(Date.now() + Math.random() * 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              rewards: Math.floor(Math.random() * 500) + 50,
              status: Math.random() > 0.3 ? 'active' : 'completed'
            };

            stakingPositions.push(position);
            totalStakedAmount += position.amount;
            totalRewardsAmount += position.rewards;
          }
        } catch (error) {
          console.warn('Failed to parse staking account:', error);
        }
      }

      setPositions(stakingPositions);
      setTotalStaked(totalStakedAmount);
      setTotalRewards(totalRewardsAmount);
    } catch (error) {
      console.error('Error fetching staking data:', error);
      setPositions([]);
      setTotalStaked(0);
      setTotalRewards(0);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  const stake = useCallback(async (amount: number, duration: number) => {
    if (!connection || !publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // In a real implementation, this would create and send a staking transaction
      console.log(`Staking ${amount} tokens for ${duration} days`);
      
      // Mock transaction - would interact with staking program
      const newPosition: StakingPosition = {
        id: `mock-${Date.now()}`,
        amount,
        duration,
        apy: duration >= 180 ? 20 : duration >= 90 ? 12 : duration >= 60 ? 8 : 5,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        rewards: 0,
        status: 'active'
      };

      setPositions(prev => [...prev, newPosition]);
      setTotalStaked(prev => prev + amount);

      return 'mock-staking-transaction-signature';
    } catch (error) {
      console.error('Error staking:', error);
      throw error;
    }
  }, [connection, publicKey]);

  const unstake = useCallback(async (positionId: string) => {
    if (!connection || !publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`Unstaking position ${positionId}`);
      
      // Update position status
      setPositions(prev => prev.map(pos => 
        pos.id === positionId 
          ? { ...pos, status: 'withdrawn' as const }
          : pos
      ));

      return 'mock-unstaking-transaction-signature';
    } catch (error) {
      console.error('Error unstaking:', error);
      throw error;
    }
  }, [connection, publicKey]);

  const claimRewards = useCallback(async (positionId: string) => {
    if (!connection || !publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`Claiming rewards for position ${positionId}`);
      
      // Reset rewards for this position
      setPositions(prev => prev.map(pos => 
        pos.id === positionId 
          ? { ...pos, rewards: 0 }
          : pos
      ));

      return 'mock-claim-rewards-transaction-signature';
    } catch (error) {
      console.error('Error claiming rewards:', error);
      throw error;
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchStakingData();
  }, [fetchStakingData]);

  return {
    positions,
    totalStaked,
    totalRewards,
    loading,
    stake,
    unstake,
    claimRewards,
    refetch: fetchStakingData
  };
};
