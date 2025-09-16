import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState, useEffect } from 'react';

export function useWallet() {
  const { publicKey, connected, wallet, signTransaction } = useSolanaWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Fetch SOL balance
  const fetchBalance = async () => {
    if (!publicKey) return;
    
    try {
      setLoading(true);
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    } else {
      setBalance(0);
    }
  }, [connected, publicKey]);

  return {
    publicKey,
    connected,
    wallet,
    balance,
    loading,
    signTransaction,
    fetchBalance,
  };
}
