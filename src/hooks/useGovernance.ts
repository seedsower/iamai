import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { GOVERNANCE_CONFIG } from '@/lib/solana/connection';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: 'treasury' | 'technical' | 'community';
  proposer: string;
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  quorumReached: boolean;
  status: 'active' | 'passed' | 'rejected' | 'executed';
  startDate: Date;
  endDate: Date;
  executionDate?: Date;
  userVote?: 'for' | 'against';
}

export function useGovernance() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userVotingPower, setUserVotingPower] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Fetch all proposals
  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/governance/proposals');
      if (response.ok) {
        const data = await response.json();
        setProposals(data.proposals || []);
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user voting power
  const fetchVotingPower = useCallback(async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(`/api/governance/voting-power/${publicKey.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setUserVotingPower(data.votingPower || 0);
      }
    } catch (error) {
      console.error('Error fetching voting power:', error);
    }
  }, [publicKey]);

  // Create a new proposal
  const createProposal = useCallback(async (
    title: string,
    description: string,
    type: 'treasury' | 'technical' | 'community'
  ) => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    if (userVotingPower < GOVERNANCE_CONFIG.minTokensForProposal) {
      throw new Error(`Minimum ${GOVERNANCE_CONFIG.minTokensForProposal} tokens required to create proposal`);
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/governance/create-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          title,
          description,
          type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create proposal');
      }

      const result = await response.json();
      await fetchProposals(); // Refresh proposals
      return result;
    } catch (error) {
      console.error('Create proposal error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, userVotingPower, fetchProposals]);

  // Vote on a proposal
  const vote = useCallback(async (proposalId: string, support: boolean) => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    if (userVotingPower === 0) {
      throw new Error('No voting power available');
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/governance/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          proposalId,
          support,
          votingPower: userVotingPower,
        }),
      });

      if (!response.ok) {
        throw new Error('Voting failed');
      }

      const result = await response.json();
      await fetchProposals(); // Refresh proposals
      return result;
    } catch (error) {
      console.error('Voting error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, userVotingPower, fetchProposals]);

  // Execute a passed proposal
  const executeProposal = useCallback(async (proposalId: string) => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/governance/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          proposalId,
        }),
      });

      if (!response.ok) {
        throw new Error('Execution failed');
      }

      const result = await response.json();
      await fetchProposals(); // Refresh proposals
      return result;
    } catch (error) {
      console.error('Execute proposal error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, fetchProposals]);

  // Get proposal results
  const getProposalResults = useCallback(async (proposalId: string) => {
    try {
      const response = await fetch(`/api/governance/results/${proposalId}`);
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch results');
    } catch (error) {
      console.error('Get proposal results error:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  useEffect(() => {
    if (publicKey) {
      fetchVotingPower();
    } else {
      setUserVotingPower(0);
    }
  }, [publicKey, fetchVotingPower]);

  return {
    proposals,
    userVotingPower,
    loading,
    createProposal,
    vote,
    executeProposal,
    getProposalResults,
    fetchProposals,
    fetchVotingPower,
  };
}
