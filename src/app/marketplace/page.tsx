'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navigation } from '@/components/Navigation';
import { useMarketplaceData } from '@/hooks/useMarketplaceData';
import { 
  Search, 
  Filter, 
  Star, 
  Download, 
  ShoppingCart, 
  Eye,
  TrendingUp,
  Award,
  Users,
  Zap,
  BarChart3,
  Wallet,
  Brain,
  MessageSquare
} from 'lucide-react';

const Marketplace: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'price-low' | 'price-high'>('popular');
  const { models, loading, purchaseModel } = useMarketplaceData();

  const categories = [
    { id: 'all', name: 'All Models', icon: Brain, count: models.length },
    { id: 'nlp', name: 'Natural Language', icon: MessageSquare, count: models.filter(m => m.category === 'nlp').length },
    { id: 'computer-vision', name: 'Computer Vision', icon: Eye, count: models.filter(m => m.category === 'computer-vision').length },
    { id: 'audio', name: 'Audio Processing', icon: Download, count: models.filter(m => m.category === 'audio').length },
    { id: 'data-analysis', name: 'Data Analysis', icon: BarChart3, count: models.filter(m => m.category === 'data-analysis').length }
  ];

  const handlePurchase = async (modelId: number) => {
    try {
      await purchaseModel(modelId);
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  const filteredModels = models
    .filter(model => {
      const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           model.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || model.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular': return b.downloads - a.downloads;
        case 'newest': return b.id - a.id;
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        default: return 0;
      }
    });

  const featuredModels = models.filter(model => model.featured);

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
              <p className="text-gray-400">Please connect your Solana wallet to access the AI model marketplace.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">AI Model Marketplace</h1>
          <p className="text-gray-400">Discover, purchase, and deploy cutting-edge AI models on the blockchain</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Total Models</p>
                <p className="text-xl font-bold text-white">{models.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Active Creators</p>
                <p className="text-xl font-bold text-white">{new Set(models.map(m => m.creator)).size}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3">
              <Download className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Total Downloads</p>
                <p className="text-xl font-bold text-white">{models.reduce((sum, m) => sum + m.downloads, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3">
              <Award className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-sm text-gray-400">Featured Models</p>
                <p className="text-xl font-bold text-white">{featuredModels.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Models */}
        {featuredModels.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Featured Models</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredModels.slice(0, 3).map((model) => (
                <div key={model.id} className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg p-6 border border-purple-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">Featured</span>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-300">{model.rating}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{model.name}</h3>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">{model.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-purple-400 font-bold">{model.price} IAMAI</span>
                    <div className="flex items-center space-x-1 text-gray-400 text-sm">
                      <Download className="w-4 h-4" />
                      <span>{model.downloads.toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePurchase(model.id)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Purchase</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search models..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">{category.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Sort By</h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="popular">Most Popular</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading models...</p>
                </div>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No models found</h3>
                <p className="text-gray-400">Try adjusting your search or category filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredModels.map((model) => (
                  <div key={model.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs font-medium rounded-full capitalize">
                        {model.category.replace('-', ' ')}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-300">{model.rating}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-2">{model.name}</h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-3">{model.description}</p>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {model.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-purple-400 font-bold text-lg">{model.price} IAMAI</span>
                      <div className="flex items-center space-x-4 text-gray-400 text-sm">
                        <div className="flex items-center space-x-1">
                          <Download className="w-4 h-4" />
                          <span>{model.downloads.toLocaleString()}</span>
                        </div>
                        <span className="text-xs">by {model.creator}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePurchase(model.id)}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Purchase</span>
                      </button>
                      <button className="px-4 py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
