'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useWallet } from '@/hooks/useWallet';
import { useToken } from '@/hooks/useToken';
import { formatNumber, calculateTimeRemaining } from '@/lib/utils';
import { 
  TrendingUp, 
  Users, 
  Coins, 
  Shield, 
  Zap, 
  Globe,
  ArrowRight,
  Star
} from 'lucide-react';

const tokenSaleEndDate = new Date('2024-12-31T23:59:59Z');

export default function Home() {
  const { connected } = useWallet();
  const { tokenBalance } = useToken();
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(tokenSaleEndDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(tokenSaleEndDate));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const stats = [
    { label: 'Total Supply', value: '1B', icon: Coins },
    { label: 'Holders', value: '12.5K', icon: Users },
    { label: 'Staking APY', value: 'Up to 20%', icon: TrendingUp },
    { label: 'Security Audits', value: '3', icon: Shield },
  ];

  const features = [
    {
      icon: Coins,
      title: 'Token Staking',
      description: 'Earn rewards by staking IAMAI tokens with flexible lock periods and competitive APY rates.',
    },
    {
      icon: Globe,
      title: 'Decentralized Governance',
      description: 'Participate in DAO decisions and shape the future of AI development on the blockchain.',
    },
    {
      icon: Zap,
      title: 'AI Marketplace',
      description: 'Access and trade cutting-edge AI models in our decentralized marketplace.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              The Future of{' '}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                AI Development
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Join IAMAI DAO - a decentralized platform where AI innovation meets blockchain technology. 
              Stake tokens, participate in governance, and access cutting-edge AI models.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link href="/token-sale">
                <Button size="lg" className="px-8 py-4 text-lg">
                  Buy IAMAI Tokens
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
                  Explore Dashboard
                </Button>
              </Link>
            </div>

            {/* Token Sale Countdown */}
            <Card className="max-w-2xl mx-auto bg-gradient-to-r from-purple-800/50 to-blue-800/50 border-purple-500/50">
              <CardHeader>
                <CardTitle className="text-center text-2xl">Token Sale Ends In</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-purple-400">{timeRemaining.days}</div>
                    <div className="text-sm text-gray-400">Days</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-400">{timeRemaining.hours}</div>
                    <div className="text-sm text-gray-400">Hours</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-400">{timeRemaining.minutes}</div>
                    <div className="text-sm text-gray-400">Minutes</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-400">{timeRemaining.seconds}</div>
                    <div className="text-sm text-gray-400">Seconds</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <Icon className="w-8 h-8 text-purple-400 mx-auto mb-4" />
                  <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-400">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose IAMAI DAO?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Experience the next generation of decentralized AI development with our comprehensive platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="p-8 hover:bg-gray-700/50 transition-colors">
                  <div className="text-center">
                    <Icon className="w-12 h-12 text-purple-400 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                    <p className="text-gray-300">{feature.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* User Status Section */}
      {connected && (
        <section className="py-16 bg-gray-800/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-6">Your IAMAI Portfolio</h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <div className="text-3xl font-bold text-purple-400 mb-2">
                      {formatNumber(tokenBalance)}
                    </div>
                    <div className="text-gray-400">IAMAI Tokens</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-400 mb-2">
                      ${formatNumber(tokenBalance * 0.1)}
                    </div>
                    <div className="text-gray-400">Portfolio Value</div>
                  </div>
                </div>
                <div className="mt-8">
                  <Link href="/dashboard">
                    <Button size="lg">
                      View Full Dashboard
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Join the AI Revolution?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Start your journey with IAMAI DAO today and be part of the decentralized AI future.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/token-sale">
              <Button variant="secondary" size="lg" className="px-8 py-4 text-lg">
                Buy Tokens Now
              </Button>
            </Link>
            <Link href="/governance">
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg border-white text-white hover:bg-white hover:text-purple-600">
                Join Governance
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IA</span>
              </div>
              <span className="text-xl font-bold text-white">IAMAI DAO</span>
            </div>
            <p className="text-gray-400 mb-4">
              Decentralized AI Development Platform
            </p>
            <div className="flex justify-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Documentation
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Whitepaper
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Community
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
