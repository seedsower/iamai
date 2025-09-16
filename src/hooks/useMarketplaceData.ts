'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_IDS } from '@/lib/solana/connection';

export interface AIModel {
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
  onChainId?: PublicKey;
  owner?: PublicKey;
}

export const useMarketplaceData = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [userModels, setUserModels] = useState<AIModel[]>([]);

  const fetchMarketplaceData = useCallback(async () => {
    if (!connection) return;

    setLoading(true);
    try {
      // Get all marketplace accounts from the program
      const accounts = await connection.getProgramAccounts(PROGRAM_IDS.marketplace);
      
      const marketplaceModels: AIModel[] = [];
      
      for (const account of accounts) {
        try {
          const accountInfo = account.account;
          
          if (accountInfo.data.length > 0) {
            // Parse account data (simplified - would use actual program structure)
            const model: AIModel = {
              id: marketplaceModels.length + 1,
              name: `AI Model ${account.pubkey.toString().slice(0, 8)}`,
              description: `On-chain AI model stored at ${account.pubkey.toString()}`,
              category: ['nlp', 'computer-vision', 'audio', 'data-analysis'][Math.floor(Math.random() * 4)] as any,
              price: Math.floor(Math.random() * 100) + 25,
              rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
              downloads: Math.floor(Math.random() * 2000) + 100,
              creator: account.pubkey.toString().slice(0, 8) + '...',
              tags: ['On-chain', 'Verified', 'Solana'],
              featured: Math.random() > 0.7,
              imageUrl: '/api/placeholder/300/200',
              onChainId: account.pubkey,
              owner: new PublicKey(account.pubkey) // Simplified
            };

            marketplaceModels.push(model);
          }
        } catch (error) {
          console.warn('Failed to parse marketplace account:', error);
        }
      }

      // If no on-chain models found, show some default ones
      if (marketplaceModels.length === 0) {
        marketplaceModels.push({
          id: 1,
          name: 'IAMAI Genesis Model',
          description: 'The first AI model deployed on the IAMAI DAO marketplace.',
          category: 'nlp',
          price: 50,
          rating: 4.8,
          downloads: 0,
          creator: 'IAMAI Team',
          tags: ['Genesis', 'NLP', 'Foundation'],
          featured: true,
          imageUrl: '/api/placeholder/300/200'
        });
      }

      setModels(marketplaceModels);

      // Filter user's models if wallet is connected
      if (publicKey) {
        const userOwnedModels = marketplaceModels.filter(model => 
          model.owner?.equals(publicKey)
        );
        setUserModels(userOwnedModels);
      }
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  const purchaseModel = useCallback(async (modelId: number) => {
    if (!connection || !publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const model = models.find(m => m.id === modelId);
      if (!model) {
        throw new Error('Model not found');
      }

      console.log(`Purchasing model ${modelId} for ${model.price} IAMAI tokens`);
      
      // In a real implementation, this would create and send a purchase transaction
      // Update downloads count optimistically
      setModels(prev => prev.map(m => 
        m.id === modelId 
          ? { ...m, downloads: m.downloads + 1 }
          : m
      ));

      return 'mock-purchase-transaction-signature';
    } catch (error) {
      console.error('Error purchasing model:', error);
      throw error;
    }
  }, [connection, publicKey, models]);

  const listModel = useCallback(async (modelData: Omit<AIModel, 'id' | 'downloads' | 'rating' | 'onChainId' | 'owner'>) => {
    if (!connection || !publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('Listing new AI model:', modelData);
      
      // In a real implementation, this would create and send a listing transaction
      const newModel: AIModel = {
        ...modelData,
        id: models.length + 1,
        downloads: 0,
        rating: 0,
        owner: publicKey,
        creator: publicKey.toString().slice(0, 8) + '...'
      };

      setModels(prev => [...prev, newModel]);
      setUserModels(prev => [...prev, newModel]);

      return 'mock-listing-transaction-signature';
    } catch (error) {
      console.error('Error listing model:', error);
      throw error;
    }
  }, [connection, publicKey, models]);

  const updateModel = useCallback(async (modelId: number, updates: Partial<AIModel>) => {
    if (!connection || !publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`Updating model ${modelId}:`, updates);
      
      setModels(prev => prev.map(m => 
        m.id === modelId 
          ? { ...m, ...updates }
          : m
      ));

      setUserModels(prev => prev.map(m => 
        m.id === modelId 
          ? { ...m, ...updates }
          : m
      ));

      return 'mock-update-transaction-signature';
    } catch (error) {
      console.error('Error updating model:', error);
      throw error;
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchMarketplaceData();
  }, [fetchMarketplaceData]);

  return {
    models,
    userModels,
    loading,
    purchaseModel,
    listModel,
    updateModel,
    refetch: fetchMarketplaceData
  };
};
