import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';

// Solana network configuration
export const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl(NETWORK as any);

// Create connection instance
export const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// Program IDs (updated with generated program IDs)
export const PROGRAM_IDS = {
  token: new PublicKey('F2iupsNmgY69NwD6a1ZETMhPPET8WLojYKDBbVCw72z2'),
  staking: new PublicKey('HwSjU2QuDJjU7oLwrzue5RZ5Zcs1HHJPYbZFXGPTWfHg'),
  governance: new PublicKey('HDLPuNmVXrVYCihhBqMshnQEfxXwugY6WCo9rWDWY4iH'),
  marketplace: new PublicKey('3ASqWgGno8sQsmkihwkocjAk8gnscGoHzhLozZouPJEU'),
};

// Token configuration
export const IAMAI_TOKEN_CONFIG = {
  mintAddress: process.env.NEXT_PUBLIC_IAMAI_MINT_ADDRESS || 'AjqyWaLD1PNh9SfsF5RbsYbvSWdLBxYV7zBT2PWSJHJN',
  decimals: 9,
  symbol: 'IAMAI',
  name: 'IAMAI Token'
};

// Staking configuration
export const STAKING_CONFIG = {
  tiers: [
    { duration: 30, apy: 5 },
    { duration: 60, apy: 8 },
    { duration: 90, apy: 12 },
    { duration: 180, apy: 20 },
  ],
  earlyUnstakePenalty: 0.1, // 10%
};

// Governance configuration
export const GOVERNANCE_CONFIG = {
  minTokensForProposal: 10_000,
  quorumPercentage: 10,
  executionDelay: 48 * 60 * 60 * 1000, // 48 hours in milliseconds
};

// Marketplace configuration
export const MARKETPLACE_CONFIG = {
  royaltyPercentage: 5, // 5% to original creator
  transferFeePercentage: 0.1, // 0.1% to treasury
};
