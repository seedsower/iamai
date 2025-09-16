'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_IDS } from '@/lib/solana/connection';

export interface Proposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  status: 'active' | 'passed' | 'rejected' | 'pending';
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  endDate: string;
  category: string;
  onChainId?: PublicKey;
}

export const useGovernanceData = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [votingPower, setVotingPower] = useState(0);

  const fetchProposals = useCallback(async () => {
    if (!connection) return;
    
    setLoading(true);
    try {
      // Get all governance accounts from the program
      const accounts = await connection.getProgramAccounts(PROGRAM_IDS.governance);
      
      const proposalData: Proposal[] = [];
      
      for (const account of accounts) {
        try {
          // Parse the account data (this would need the actual program structure)
          // For now, we'll create some sample data based on real accounts
          const accountInfo = account.account;
          
          // This is a simplified parsing - in reality you'd use the program's IDL
          if (accountInfo.data.length > 0) {
            proposalData.push({
              id: proposalData.length + 1,
              title: `On-chain Proposal ${account.pubkey.toString().slice(0, 8)}`,
              description: `Proposal stored at ${account.pubkey.toString()}`,
              proposer: account.pubkey.toString().slice(0, 8) + '...',
              status: Math.random() > 0.5 ? 'active' : 'passed',
              votesFor: Math.floor(Math.random() * 2000) + 500,
              votesAgainst: Math.floor(Math.random() * 500) + 100,
              totalVotes: 0,
              endDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              category: ['Economic', 'Platform', 'Treasury'][Math.floor(Math.random() * 3)],
              onChainId: account.pubkey
            });
          }
        } catch (error) {
          console.warn('Failed to parse governance account:', error);
        }
      }
      
      // Calculate total votes for each proposal
      proposalData.forEach(proposal => {
        proposal.totalVotes = proposal.votesFor + proposal.votesAgainst;
      });
      
      // If no on-chain proposals found, show some default ones
      if (proposalData.length === 0) {
        proposalData.push({
          id: 1,
          title: 'Initialize Governance System',
          description: 'First proposal to initialize the IAMAI DAO governance system on Solana devnet.',
          proposer: 'System',
          status: 'active',
          votesFor: 0,
          votesAgainst: 0,
          totalVotes: 0,
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category: 'Platform'
        });
      }
      
      setProposals(proposalData);
    } catch (error) {
      console.error('Error fetching governance data:', error);
      // Fallback to empty state
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [connection]);

  const fetchVotingPower = useCallback(async () => {
    if (!connection || !publicKey) {
      setVotingPower(0);
      return;
    }

    try {
      // In a real implementation, this would fetch the user's staked tokens
      // or governance token balance to determine voting power
      const balance = await connection.getBalance(publicKey);
      // Convert SOL balance to approximate voting power (simplified)
      setVotingPower(Math.floor(balance / 1000000000 * 100));
    } catch (error) {
      console.error('Error fetching voting power:', error);
      setVotingPower(0);
    }
  }, [connection, publicKey]);

  const vote = useCallback(async (proposalId: number, voteType: 'for' | 'against') => {
    if (!connection || !publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // In a real implementation, this would create and send a vote transaction
      console.log(`Voting ${voteType} on proposal ${proposalId}`);
      
      // Update local state optimistically
      setProposals(prev => prev.map(proposal => {
        if (proposal.id === proposalId) {
          const updatedProposal = { ...proposal };
          if (voteType === 'for') {
            updatedProposal.votesFor += votingPower;
          } else {
            updatedProposal.votesAgainst += votingPower;
          }
          updatedProposal.totalVotes = updatedProposal.votesFor + updatedProposal.votesAgainst;
          return updatedProposal;
        }
        return proposal;
      }));

      return 'mock-transaction-signature';
    } catch (error) {
      console.error('Error voting:', error);
      throw error;
    }
  }, [connection, publicKey, votingPower]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  useEffect(() => {
    fetchVotingPower();
  }, [fetchVotingPower]);

  return {
    proposals,
    loading,
    votingPower,
    vote,
    refetch: fetchProposals
  };
};
