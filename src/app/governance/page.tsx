'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navigation } from '@/components/Navigation';
import { useGovernanceData } from '@/hooks/useGovernanceData';
import { 
  Vote, 
  Users, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Plus,
  Calendar,
  Wallet
} from 'lucide-react';

interface Proposal {
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
}

const Governance: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const { proposals, loading, votingPower, vote } = useGovernanceData();

  const activeProposals = proposals.filter(p => p.status === 'active');
  const completedProposals = proposals.filter(p => p.status !== 'active');

  const handleVote = async (proposalId: number, voteType: 'for' | 'against') => {
    try {
      await vote(proposalId, voteType);
      // Success feedback could be added here
    } catch (error) {
      console.error('Voting failed:', error);
      // Error feedback could be added here
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-400 bg-blue-900/20';
      case 'passed': return 'text-green-400 bg-green-900/20';
      case 'rejected': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Clock;
      case 'passed': return CheckCircle;
      case 'rejected': return XCircle;
      default: return Clock;
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400">Please connect your wallet to participate in governance</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Governance</h1>
          <p className="text-gray-400 mb-6">
            Participate in IAMAI DAO governance by voting on proposals that shape the future of the platform.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <Vote className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-sm text-gray-400">Your Voting Power</p>
                  <p className="text-xl font-bold text-white">1,250</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-400">Active Proposals</p>
                  <p className="text-xl font-bold text-white">{activeProposals.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">Participation Rate</p>
                  <p className="text-xl font-bold text-white">78%</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <Calendar className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">Total Proposals</p>
                  <p className="text-xl font-bold text-white">{proposals.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'active'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Active Proposals ({activeProposals.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'completed'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Completed ({completedProposals.length})
          </button>
        </div>

        {/* Create Proposal Button */}
        <div className="mb-6">
          <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" />
            <span>Create Proposal</span>
          </button>
        </div>

        {/* Proposals List */}
        <div className="space-y-4">
          {(activeTab === 'active' ? activeProposals : completedProposals).map((proposal) => {
            const StatusIcon = getStatusIcon(proposal.status);
            const votePercentage = proposal.totalVotes > 0 ? (proposal.votesFor / proposal.totalVotes) * 100 : 0;

            return (
              <div key={proposal.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{proposal.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                        <StatusIcon className="w-3 h-3 inline mr-1" />
                        {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                      </span>
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">
                        {proposal.category}
                      </span>
                    </div>
                    <p className="text-gray-400 mb-4">{proposal.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>Proposed by: {proposal.proposer}</span>
                      <span>Ends: {proposal.endDate}</span>
                    </div>
                  </div>
                </div>

                {/* Voting Stats */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Voting Progress</span>
                    <span className="text-sm text-gray-400">{proposal.totalVotes} total votes</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${votePercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">For: {proposal.votesFor} ({votePercentage.toFixed(1)}%)</span>
                    <span className="text-red-400">Against: {proposal.votesAgainst} ({(100 - votePercentage).toFixed(1)}%)</span>
                  </div>
                </div>

                {/* Voting Buttons */}
                {proposal.status === 'active' && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleVote(proposal.id, 'for')}
                      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Vote For</span>
                    </button>
                    <button
                      onClick={() => handleVote(proposal.id, 'against')}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Vote Against</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Governance;
