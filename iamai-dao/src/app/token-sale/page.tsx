'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useWallet } from '@/hooks/useWallet';
import { useToken } from '@/hooks/useToken';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Shield,
  Calculator,
  Wallet
} from 'lucide-react';

export default function TokenSale() {
  const { connected, balance } = useWallet();
  const { tokenBalance, purchaseTokens, loading } = useToken();
  const [solAmount, setSolAmount] = useState('');
  const [tokenAmount, setTokenAmount] = useState(0);
  const [tokenPrice] = useState(0.1); // $0.10 per token
  const [solPrice] = useState(100); // $100 per SOL (mock price)

  useEffect(() => {
    if (solAmount) {
      const tokens = (parseFloat(solAmount) * solPrice) / tokenPrice;
      setTokenAmount(tokens);
    } else {
      setTokenAmount(0);
    }
  }, [solAmount, tokenPrice, solPrice]);

  const handlePurchase = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!solAmount || parseFloat(solAmount) <= 0) {
      toast.error('Please enter a valid SOL amount');
      return;
    }

    if (parseFloat(solAmount) > balance) {
      toast.error('Insufficient SOL balance');
      return;
    }

    try {
      await purchaseTokens(parseFloat(solAmount));
      toast.success(`Successfully purchased ${formatNumber(tokenAmount)} IAMAI tokens!`);
      setSolAmount('');
    } catch (error) {
      toast.error('Purchase failed. Please try again.');
    }
  };

  const saleStats = [
    { label: 'Token Price', value: formatCurrency(tokenPrice), icon: DollarSign },
    { label: 'Tokens Sold', value: '750M', icon: TrendingUp },
    { label: 'Time Remaining', value: '45 days', icon: Clock },
    { label: 'Security Audit', value: 'Completed', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            IAMAI Token Sale
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Join the future of decentralized AI development. Purchase IAMAI tokens and become part of our growing ecosystem.
          </p>
        </div>

        {/* Sale Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {saleStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="p-6 text-center">
                <Icon className="w-8 h-8 text-purple-400 mx-auto mb-4" />
                <div className="text-2xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Purchase Form */}
          <Card className="p-8">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Calculator className="w-6 h-6" />
                Purchase IAMAI Tokens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!connected ? (
                <div className="text-center py-8">
                  <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Connect your wallet to purchase tokens</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      SOL Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={solAmount}
                        onChange={(e) => setSolAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter SOL amount"
                        step="0.1"
                        min="0"
                      />
                      <div className="absolute right-3 top-3 text-gray-400 text-sm">
                        SOL
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Balance: {formatNumber(balance, 4)} SOL
                    </div>
                  </div>

                  <div className="flex items-center justify-center py-2">
                    <div className="text-gray-400">↓</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      IAMAI Tokens
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formatNumber(tokenAmount)}
                        readOnly
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      />
                      <div className="absolute right-3 top-3 text-gray-400 text-sm">
                        IAMAI
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Token Price:</span>
                      <span className="text-white">{formatCurrency(tokenPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">SOL Price:</span>
                      <span className="text-white">{formatCurrency(solPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">USD Value:</span>
                      <span className="text-white">{formatCurrency(tokenAmount * tokenPrice)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handlePurchase}
                    disabled={loading || !solAmount || parseFloat(solAmount) <= 0}
                    className="w-full py-4 text-lg"
                    size="lg"
                  >
                    {loading ? 'Processing...' : 'Purchase Tokens'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Token Information */}
          <div className="space-y-8">
            <Card className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl">Token Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Symbol</div>
                    <div className="text-lg font-semibold text-white">IAMAI</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Decimals</div>
                    <div className="text-lg font-semibold text-white">9</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Total Supply</div>
                    <div className="text-lg font-semibold text-white">1,000,000,000</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Network</div>
                    <div className="text-lg font-semibold text-white">Solana</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {connected && (
              <Card className="p-8">
                <CardHeader>
                  <CardTitle className="text-2xl">Your Holdings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">
                      {formatNumber(tokenBalance)}
                    </div>
                    <div className="text-gray-400">IAMAI Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400 mb-2">
                      {formatCurrency(tokenBalance * tokenPrice)}
                    </div>
                    <div className="text-gray-400">Portfolio Value</div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl">Sale Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sale Type:</span>
                    <span className="text-white">Public Sale</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min Purchase:</span>
                    <span className="text-white">0.1 SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Purchase:</span>
                    <span className="text-white">100 SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vesting:</span>
                    <span className="text-white">Immediate</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Why Purchase IAMAI Tokens?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-4">Staking Rewards</h3>
                <p className="text-gray-300">
                  Earn up to 20% APY by staking your IAMAI tokens with flexible lock periods.
                </p>
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-center">
                <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-4">Governance Rights</h3>
                <p className="text-gray-300">
                  Participate in DAO governance and help shape the future of the platform.
                </p>
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-center">
                <DollarSign className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-4">Marketplace Access</h3>
                <p className="text-gray-300">
                  Use tokens to access premium AI models and services in our marketplace.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
