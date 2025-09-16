'use client';

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navigation } from '@/components/Navigation';
import { useToken } from '@/hooks/useToken';
import { 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  Users, 
  BarChart3,
  Activity,
  Coins,
  Vote
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const { tokenBalance, loading } = useToken();

  const stats = [
    {
      title: 'IAMAI Balance',
      value: loading ? 'Loading...' : `${tokenBalance.toLocaleString()} IAMAI`,
      icon: Coins,
      change: '+12.5%',
      changeType: 'positive' as const,
    },
    {
      title: 'SOL Balance',
      value: '2.45 SOL',
      icon: DollarSign,
      change: '+5.2%',
      changeType: 'positive' as const,
    },
    {
      title: 'Staking Rewards',
      value: '156.78 IAMAI',
      icon: TrendingUp,
      change: '+8.1%',
      changeType: 'positive' as const,
    },
    {
      title: 'Governance Power',
      value: '1,250 Votes',
      icon: Vote,
      change: '+2.3%',
      changeType: 'positive' as const,
    },
  ];

  const activities = [
    {
      type: 'stake',
      description: 'Staked 500 IAMAI tokens',
      amount: '+500 IAMAI',
      time: '2 hours ago',
      status: 'completed',
    },
    {
      type: 'vote',
      description: 'Voted on Proposal #12',
      amount: '1 Vote',
      time: '5 hours ago',
      status: 'completed',
    },
    {
      type: 'purchase',
      description: 'Purchased AI Model License',
      amount: '-25 IAMAI',
      time: '1 day ago',
      status: 'completed',
    },
    {
      type: 'reward',
      description: 'Staking rewards earned',
      amount: '+12.5 IAMAI',
      time: '2 days ago',
      status: 'completed',
    },
  ];

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400">Please connect your wallet to view your dashboard</p>
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
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">
            Welcome back! Here's your IAMAI DAO overview.
          </p>
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-300">
              <span className="font-medium">Wallet:</span> {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className="p-3 bg-purple-600 bg-opacity-20 rounded-lg">
                  <stat.icon className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-400 ml-2">from last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Portfolio Overview */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Portfolio Overview</h3>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                      <Coins className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">IAMAI Tokens</p>
                      <p className="text-sm text-gray-400">Governance & Utility</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{tokenBalance.toLocaleString()} IAMAI</p>
                    <p className="text-sm text-green-400">+12.5%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Staked IAMAI</p>
                      <p className="text-sm text-gray-400">Earning rewards</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">750 IAMAI</p>
                    <p className="text-sm text-green-400">12% APY</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                      <Vote className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Voting Power</p>
                      <p className="text-sm text-gray-400">Governance participation</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">1,250 Votes</p>
                    <p className="text-sm text-blue-400">Active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Recent Activity</h3>
                <Activity className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                    <div className="w-8 h-8 bg-purple-600 bg-opacity-20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        activity.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {activity.amount}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
