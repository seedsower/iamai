import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount
} from '@solana/spl-token';
import { IAMAI_TOKEN_CONFIG } from '@/lib/solana/connection';

export function useToken() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Fetch IAMAI token balance
  const fetchTokenBalance = useCallback(async () => {
    if (!publicKey || !IAMAI_TOKEN_CONFIG.mintAddress) return;

    try {
      setLoading(true);
      const mintPublicKey = new PublicKey(IAMAI_TOKEN_CONFIG.mintAddress);
      const tokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        publicKey
      );

      const accountInfo = await getAccount(connection, tokenAccount);
      const balance = Number(accountInfo.amount) / Math.pow(10, IAMAI_TOKEN_CONFIG.decimals);
      setTokenBalance(balance);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setTokenBalance(0);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  // Purchase tokens with SOL
  const purchaseTokens = useCallback(async (solAmount: number) => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      
      // This would typically call your backend API to handle the purchase
      const response = await fetch('/api/token/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          solAmount,
        }),
      });

      if (!response.ok) {
        throw new Error('Purchase failed');
      }

      const result = await response.json();
      await fetchTokenBalance(); // Refresh balance
      return result;
    } catch (error) {
      console.error('Purchase error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, fetchTokenBalance]);

  // Transfer tokens
  const transferTokens = useCallback(async (to: PublicKey, amount: number) => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      const mintPublicKey = new PublicKey(IAMAI_TOKEN_CONFIG.mintAddress);
      
      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        publicKey
      );
      
      const toTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        to
      );

      const transaction = new Transaction();
      
      // Add create associated token account instruction if needed
      try {
        await getAccount(connection, toTokenAccount);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            toTokenAccount,
            to,
            mintPublicKey
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          publicKey,
          amount * Math.pow(10, IAMAI_TOKEN_CONFIG.decimals)
        )
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      await connection.confirmTransaction(signature);
      await fetchTokenBalance(); // Refresh balance
      
      return signature;
    } catch (error) {
      console.error('Transfer error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, connection, fetchTokenBalance]);

  useEffect(() => {
    if (publicKey) {
      fetchTokenBalance();
    } else {
      setTokenBalance(0);
    }
  }, [publicKey, fetchTokenBalance]);

  return {
    tokenBalance,
    loading,
    purchaseTokens,
    transferTokens,
    fetchTokenBalance,
  };
}
