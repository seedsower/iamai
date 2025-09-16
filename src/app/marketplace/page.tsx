'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navigation } from '@/components/Navigation';
import { 
  Search, 
  Filter, 
  Star, 
  Download, 
  Eye, 
  ShoppingCart, 
  Tag,
  Brain,
  Image,
  MessageSquare,
  BarChart3,
  Wallet,
  TrendingUp,
  Users
} from 'lucide-react';

interface AIModel {
  id: number;
  name: string;
  description: string;
  category: 'nlp' | 'computer-vision' | 'audio' | 'data-analysis';
  price: number;
  rating: number;
  downloads: number;
  creator: string;
  tags: string[];
  featured: boolean;
  imageUrl: string;
}

const Marketplace: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'price-low' | 'price-high'>('popular');

  const aiModels: AIModel[] = [
    {
      id: 1,
      name: 'GPT-4 Fine-tuned Assistant',
      description: 'Advanced language model fine-tuned for customer service and technical support applications.',
      category: 'nlp',
      price: 50,
      rating: 4.8,
      downloads: 1250,
      creator: 'AI Labs Inc.',
      tags: ['GPT-4', 'Customer Service', 'Fine-tuned'],
      featured: true,
      imageUrl: '/api/placeholder/300/200'
    },
    {
      id: 2,
      name: 'Real-time Object Detection',
      description: 'High-performance YOLO-based model for real-time object detection in video streams.',
      category: 'computer-vision',
      price: 75,
      rating: 4.6,
      downloads: 890,
      creator: 'Vision Tech',
      tags: ['YOLO', 'Real-time', 'Object Detection'],
      featured: true,
      imageUrl: '/api/placeholder/300/200'
    },
    {
      id: 3,
      name: 'Sentiment Analysis Pro',
      description: 'Advanced sentiment analysis model trained on social media and review data.',
      category: 'nlp',
      price: 30,
      rating: 4.5,
      downloads: 2100,
      creator: 'DataMind AI',
      tags: ['Sentiment', 'Social Media', 'Reviews'],
      featured: false,
      imageUrl: '/api/placeholder/300/200'
    },
    {
      id: 4,
      name: 'Medical Image Classifier',
      description: 'Specialized model for medical image classification with high accuracy on X-rays and MRIs.',
      category: 'computer-vision',
      price: 120,
      rating: 4.9,
      downloads: 450,
      creator: 'MedAI Solutions',
      tags: ['Medical', 'X-ray', 'MRI', 'Healthcare'],
      featured: false,
      imageUrl: '/api/placeholder/300/200'
    },
    {
      id: 5,
      name: 'Financial Forecasting Model',
      description: 'Time series analysis model for stock price prediction and financial forecasting.',
      category: 'data-analysis',
      price: 95,
      rating: 4.3,
      downloads: 670,
      creator: 'FinTech AI',
      tags: ['Finance', 'Forecasting', 'Time Series'],
      featured: false,
      imageUrl: '/api/placeholder/300/200'
    },
    {
      id: 6,
      name: 'Voice Recognition Engine',
      description: 'Multi-language voice recognition model with noise cancellation capabilities.',
      category: 'audio',
      price: 65,
      rating: 4.7,
      downloads: 1100,
      creator: 'AudioAI Corp',
      tags: ['Voice', 'Multi-language', 'Noise Cancellation'],
      featured: true,
      imageUrl: '/api/placeholder/300/200'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Models', icon: Brain, count: aiModels.length },
    { id: 'nlp', name: 'Natural Language', icon: MessageSquare, count: aiModels.filter(m => m.category === 'nlp').length },
    { id: 'computer-vision', name: 'Computer Vision', icon: Eye, count: aiModels.filter(m => m.category === 'computer-vision').length },
    { id: 'audio', name: 'Audio Processing', icon: Download, count: aiModels.filter(m => m.category === 'audio').length },
    { id: 'data-analysis', name: 'Data Analysis', icon: BarChart3, count: aiModels.filter(m => m.category === 'data-analysis').length }
  ];

  const filteredModels = aiModels
    .filter(model => selectedCategory === 'all' || model.category === selectedCategory)
    .filter(model => 
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular': return b.downloads - a.downloads;
        case 'newest': return b.id - a.id;
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        default: return 0;
      }
    });

  const handlePurchase = (modelId: number) => {
    if (!connected) return;
    // Implementation would interact with marketplace smart contract
    console.log(`Purchasing model ${modelId}`);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'nlp': return MessageSquare;
      case 'computer-vision': return Eye;
      case 'audio': return Download;
      case 'data-analysis': return BarChart3;
      default: return Brain;
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
            <p className="text-gray-400">Please connect your wallet to access the AI marketplace</p>
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
          <h1 className="text-3xl font-bold text-white mb-2">AI Model Marketplace</h1>
          <p className="text-gray-400 mb-6">
            Discover, purchase, and deploy cutting-edge AI models for your applications.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <Brain className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-sm text-gray-400">Total Models</p>
                  <p className="text-xl font-bold text-white">{aiModels.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-400">Active Creators</p>
                  <p className="text-xl font-bold text-white">24</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <Download className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">Total Downloads</p>
                  <p className="text-xl font-bold text-white">6.5K</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">Avg Rating</p>
                  <p className="text-xl font-bold text-white">4.6</p>
                </div>
              </div>
            </div>
          </div>
        </div>

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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600"
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
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">
                        {category.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Sort By</h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
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
            {/* Featured Models */}
            {selectedCategory === 'all' && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Featured Models</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {aiModels.filter(model => model.featured).map((model) => {
                    const CategoryIcon = getCategoryIcon(model.category);
                    return (
                      <div key={model.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-colors">
                        <div className="h-48 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                          <CategoryIcon className="w-16 h-16 text-white" />
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-white text-lg">{model.name}</h3>
                            <span className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">
                              FEATURED
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{model.description}</p>
                          <div className="flex items-center space-x-4 mb-3">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm text-gray-300">{model.rating}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Download className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-300">{model.downloads}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-white">{model.price} IAMAI</span>
                            <button
                              onClick={() => handlePurchase(model.id)}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              Purchase
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Models */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {selectedCategory === 'all' ? 'All Models' : categories.find(c => c.id === selectedCategory)?.name}
                <span className="text-gray-400 text-lg ml-2">({filteredModels.length})</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredModels.map((model) => {
                  const CategoryIcon = getCategoryIcon(model.category);
                  return (
                    <div key={model.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-colors">
                      <div className="h-48 bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center">
                        <CategoryIcon className="w-16 h-16 text-gray-400" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-white text-lg mb-2">{model.name}</h3>
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{model.description}</p>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {model.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm text-gray-300">{model.rating}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Download className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-300">{model.downloads}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-white">{model.price} IAMAI</span>
                          <button
                            onClick={() => handlePurchase(model.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            Purchase
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
