'use client';

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, LogOut } from 'lucide-react';

export const WalletButton: React.FC = () => {
  const { wallet, publicKey, disconnect } = useWallet();

  const handleDisconnect = () => {
    disconnect();
  };

  if (publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
          <Wallet className="w-4 h-4" />
          <span className="text-sm font-medium">
            {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !font-medium !transition-colors" />
  );
};
