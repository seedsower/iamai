'use client';

import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useWallet } from '@/hooks/useWallet';
import { useToken } from '@/hooks/useToken';
import { useStaking } from '@/hooks/useStaking';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { 
  Coins, 
  TrendingUp, 
  Clock, 
  Award,
  Lock,
  Unlock,
  Calculator
} from 'lucide-react';

const STAKING_TIERS = [
  { duration: 30, apy: 5, label: '30 Days' },
  { duration: 60, apy: 8, label: '60 Days' },
  { duration: 90, apy: 12, label: '90 Days' },
  { duration: 180, apy: 20, label: '180 Days' },
];

export default function Staking() {
  const { connected } = useWallet();
  const { tokenBalance } = useToken();
  const { 
    positions, 
    totalStaked, 
    totalRewards, 
    loading, 
    stakeTokens, 
    unstakeTokens, 
    claimRewards,
    calculateRewards 
  } = useStaking();

  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(30);

  const handleStake = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(stakeAmount) > tokenBalance) {
      toast.error('Insufficient token balance');
      return;
    }

    try {
      await stakeTokens(parseFloat(stakeAmount), selectedDuration);
      toast.success('Tokens staked successfully!');
      setStakeAmount('');
    } catch (error) {
      toast.error('Staking failed. Please try again.');
    }
  };

  const handleUnstake = async (positionId: string, early: boolean = false) => {
    try {
      await unstakeTokens(positionId, early);
      toast.success('Tokens unstaked successfully!');
    } catch (error) {
      toast.error('Unstaking failed. Please try again.');
    }
  };

  const handleClaimRewards = async (positionId: string) => {
    try {
      await claimRewards(positionId);
      toast.success('Rewards claimed successfully!');
    } catch (error) {
      toast.error('Claiming rewards failed. Please try again.');
    }
  };

  const selectedTier = STAKING_TIERS.find(tier => tier.duration === selectedDuration);
  const estimatedRewards = stakeAmount ? calculateRewards(parseFloat(stakeAmount), selectedDuration) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Stake IAMAI Tokens
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Earn rewards by staking your IAMAI tokens. Choose from multiple staking tiers with different lock periods and APY rates.
          </p>
        </div>

        {/* Staking Overview */}
        {connected && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="p-6 text-center">
              <Coins className="w-8 h-8 text-purple-400 mx-auto mb-4" />
              <div className="text-2xl font-bold text-white mb-2">
                {formatNumber(totalStaked)}
              </div>
              <div className="text-gray-400">Total Staked</div>
            </Card>
            <Card className="p-6 text-center">
              <Award className="w-8 h-8 text-green-400 mx-auto mb-4" />
              <div className="text-2xl font-bold text-green-400 mb-2">
                {formatNumber(totalRewards)}
              </div>
              <div className="text-gray-400">Total Rewards</div>
            </Card>
            <Card className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-4" />
              <div className="text-2xl font-bold text-blue-400 mb-2">
                {positions.length}
              </div>
              <div className="text-gray-400">Active Positions</div>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Staking Form */}
          <div className="space-y-8">
            <Card className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Calculator className="w-6 h-6" />
                  Stake Tokens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!connected ? (
                  <div className="text-center py-8">
                    <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">Connect your wallet to start staking</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Amount to Stake
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter amount"
                          step="0.01"
                          min="0"
                        />
                        <div className="absolute right-3 top-3 text-gray-400 text-sm">
                          IAMAI
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Balance: {formatNumber(tokenBalance)} IAMAI
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-4">
                        Lock Duration
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {STAKING_TIERS.map((tier) => (
                          <button
                            key={tier.duration}
                            onClick={() => setSelectedDuration(tier.duration)}
                            className={`p-4 rounded-lg border-2 transition-colors ${
                              selectedDuration === tier.duration
                                ? 'border-purple-500 bg-purple-500/20'
                                : 'border-gray-600 hover:border-gray-500'
                            }`}
                          >
                            <div className="text-white font-semibold">{tier.label}</div>
                            <div className="text-purple-400 text-sm">{tier.apy}% APY</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {stakeAmount && selectedTier && (
                      <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Lock Period:</span>
                          <span className="text-white">{selectedTier.label}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">APY:</span>
                          <span className="text-white">{selectedTier.apy}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Estimated Rewards:</span>
                          <span className="text-green-400">{formatNumber(estimatedRewards)} IAMAI</span>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleStake}
                      disabled={loading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                      className="w-full py-4 text-lg"
                      size="lg"
                    >
                      {loading ? 'Processing...' : 'Stake Tokens'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Staking Tiers Info */}
            <Card className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl">Staking Tiers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {STAKING_TIERS.map((tier) => (
                    <div key={tier.duration} className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                      <div>
                        <div className="text-white font-semibold">{tier.label}</div>
                        <div className="text-gray-400 text-sm">Lock Period</div>
                      </div>
                      <div className="text-right">
                        <div className="text-purple-400 font-bold">{tier.apy}%</div>
                        <div className="text-gray-400 text-sm">APY</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    <strong>Note:</strong> Early unstaking incurs a 10% penalty on the staked amount.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Positions */}
          <div>
            <Card className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Lock className="w-6 h-6" />
                  Your Staking Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!connected ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Connect your wallet to view positions</p>
                  </div>
                ) : positions.length === 0 ? (
                  <div className="text-center py-8">
                    <Coins className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No active staking positions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {positions.map((position) => (
                      <div key={position.id} className="p-4 bg-gray-800 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-white font-semibold">
                              {formatNumber(position.amount)} IAMAI
                            </div>
                            <div className="text-gray-400 text-sm">
                              {position.duration} days • {position.apy}% APY
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs ${
                            position.status === 'active' 
                              ? 'bg-green-900 text-green-300' 
                              : 'bg-gray-700 text-gray-300'
                          }`}>
                            {position.status}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div>
                            <div className="text-gray-400">Start Date</div>
                            <div className="text-white">{position.startDate.toLocaleDateString()}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">End Date</div>
                            <div className="text-white">{position.endDate.toLocaleDateString()}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Rewards Earned</div>
                            <div className="text-green-400">{formatNumber(position.rewards)} IAMAI</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Status</div>
                            <div className="text-white capitalize">{position.status}</div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {position.status === 'active' && (
                            <>
                              {position.rewards > 0 && (
                                <Button
                                  onClick={() => handleClaimRewards(position.id)}
                                  disabled={loading}
                                  variant="secondary"
                                  size="sm"
                                >
                                  Claim Rewards
                                </Button>
                              )}
                              {new Date() >= position.endDate ? (
                                <Button
                                  onClick={() => handleUnstake(position.id, false)}
                                  disabled={loading}
                                  size="sm"
                                >
                                  <Unlock className="w-4 h-4 mr-2" />
                                  Unstake
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleUnstake(position.id, true)}
                                  disabled={loading}
                                  variant="outline"
                                  size="sm"
                                >
                                  Early Unstake (10% penalty)
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
