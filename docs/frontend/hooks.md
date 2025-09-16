# Frontend Hooks Documentation

## Overview

This document provides comprehensive documentation for all React hooks used in the IAMAI DAO frontend application.

## Hook Categories

### Authentication Hooks
- `useAuth` - Authentication state management
- `useWallet` - Wallet connection management

### Token Hooks
- `useToken` - Token operations and balance
- `useTokenPrice` - Token price data
- `useTokenBalance` - Token balance queries

### Staking Hooks
- `useStaking` - Staking operations
- `useStakingPositions` - Staking position management
- `useStakingRewards` - Reward calculations

### Governance Hooks
- `useGovernance` - Governance operations
- `useProposals` - Proposal management
- `useVoting` - Voting functionality

### Marketplace Hooks
- `useMarketplace` - Marketplace operations
- `useModels` - AI model management
- `useIPFS` - IPFS file operations

## Authentication Hooks

### useAuth
Manages user authentication state and operations.

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const { publicKey, signMessage } = useWallet();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null
  });

  const login = useCallback(async () => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get challenge from backend
      const challengeResponse = await authClient.getChallenge(publicKey.toString());
      
      // Sign challenge with wallet
      const message = new TextEncoder().encode(challengeResponse.challenge);
      const signature = await signMessage(message);
      
      // Authenticate with backend
      const authResponse = await authClient.authenticate({
        walletAddress: publicKey.toString(),
        signature: Array.from(signature),
        message: challengeResponse.challenge,
        timestamp: challengeResponse.timestamp
      });
      
      // Store token and update state
      localStorage.setItem('auth_token', authResponse.token);
      setState(prev => ({
        ...prev,
        user: authResponse.user,
        isAuthenticated: true,
        loading: false
      }));
      
      toast.success('Successfully authenticated!');
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.message,
        loading: false
      }));
      toast.error('Authentication failed');
    }
  }, [publicKey, signMessage]);

  const logout = useCallback(async () => {
    try {
      await authClient.logout();
      localStorage.removeItem('auth_token');
      setState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null
      });
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const response = await authClient.refreshToken();
      localStorage.setItem('auth_token', response.token);
      return response.token;
    } catch (error) {
      await logout();
      throw error;
    }
  }, [logout]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!state.user) throw new Error('Not authenticated');
    
    setState(prev => ({ ...prev, loading: true }));
    try {
      const updatedUser = await authClient.updateProfile(state.user.walletAddress, data);
      setState(prev => ({
        ...prev,
        user: updatedUser,
        loading: false
      }));
      toast.success('Profile updated successfully');
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      toast.error('Failed to update profile');
    }
  }, [state.user]);

  // Auto-login on wallet connection
  useEffect(() => {
    if (publicKey && !state.isAuthenticated) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Verify existing token
        authClient.verifyToken()
          .then(response => {
            setState(prev => ({
              ...prev,
              user: response.user,
              isAuthenticated: true
            }));
          })
          .catch(() => {
            localStorage.removeItem('auth_token');
          });
      }
    }
  }, [publicKey, state.isAuthenticated]);

  return {
    ...state,
    login,
    logout,
    refreshToken,
    updateProfile
  };
}
```

## Token Hooks

### useToken
Manages token operations and state.

```typescript
interface TokenState {
  balance: number;
  loading: boolean;
  error: string | null;
  transactions: Transaction[];
}

interface TokenActions {
  purchase: (amount: number, solAmount: number) => Promise<string>;
  transfer: (recipient: string, amount: number) => Promise<string>;
  refreshBalance: () => Promise<void>;
  getTransactionHistory: () => Promise<void>;
}

export function useToken(): TokenState & TokenActions {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [state, setState] = useState<TokenState>({
    balance: 0,
    loading: false,
    error: null,
    transactions: []
  });

  const purchase = useCallback(async (amount: number, solAmount: number) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Create purchase transaction
      const transaction = new Transaction();
      
      // Add token purchase instruction
      const instruction = await createTokenPurchaseInstruction({
        buyer: publicKey,
        amount: amount * Math.pow(10, 9),
        solAmount: solAmount * LAMPORTS_PER_SOL
      });
      
      transaction.add(instruction);
      
      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature);
      
      // Record purchase in backend
      await fetch('/api/token/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          amount: amount * Math.pow(10, 9),
          solAmount,
          transactionHash: signature
        })
      });
      
      await refreshBalance();
      toast.success('Token purchase successful!');
      return signature;
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      toast.error('Purchase failed');
      throw error;
    }
  }, [publicKey, sendTransaction, connection]);

  const transfer = useCallback(async (recipient: string, amount: number) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const recipientPubkey = new PublicKey(recipient);
      const transaction = new Transaction();
      
      // Get or create token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT,
        publicKey
      );
      
      const toTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT,
        recipientPubkey
      );
      
      // Create recipient token account if it doesn't exist
      const toAccountInfo = await connection.getAccountInfo(toTokenAccount);
      if (!toAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            toTokenAccount,
            recipientPubkey,
            TOKEN_MINT
          )
        );
      }
      
      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          publicKey,
          amount * Math.pow(10, 9)
        )
      );
      
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature);
      
      await refreshBalance();
      toast.success('Transfer successful!');
      return signature;
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      toast.error('Transfer failed');
      throw error;
    }
  }, [publicKey, sendTransaction, connection]);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: TOKEN_MINT }
      );

      let balance = 0;
      if (tokenAccounts.value.length > 0) {
        balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      }

      setState(prev => ({ ...prev, balance, loading: false }));
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
    }
  }, [publicKey, connection]);

  const getTransactionHistory = useCallback(async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(`/api/token/transactions/${publicKey.toString()}`);
      const data = await response.json();
      setState(prev => ({ ...prev, transactions: data.transactions }));
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
    }
  }, [publicKey]);

  // Auto-refresh balance when wallet connects
  useEffect(() => {
    if (publicKey) {
      refreshBalance();
      getTransactionHistory();
    }
  }, [publicKey, refreshBalance, getTransactionHistory]);

  return {
    ...state,
    purchase,
    transfer,
    refreshBalance,
    getTransactionHistory
  };
}
```

### useTokenPrice
Fetches and manages token price data.

```typescript
interface TokenPriceState {
  price: number;
  change24h: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useTokenPrice(): TokenPriceState {
  const [state, setState] = useState<TokenPriceState>({
    price: 0,
    change24h: 0,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const fetchPrice = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/token/price');
      const data = await response.json();
      
      setState({
        price: data.price,
        change24h: data.change24h,
        loading: false,
        error: null,
        lastUpdated: new Date(data.lastUpdated)
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.message,
        loading: false
      }));
    }
  }, []);

  // Fetch price on mount and set up polling
  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return state;
}
```

## Staking Hooks

### useStaking
Manages staking operations and positions.

```typescript
interface StakingState {
  positions: StakingPosition[];
  totalStaked: number;
  totalRewards: number;
  loading: boolean;
  error: string | null;
}

interface StakingActions {
  stake: (amount: number, duration: number) => Promise<string>;
  unstake: (positionId: number) => Promise<string>;
  claimRewards: (positionId: number) => Promise<string>;
  refreshPositions: () => Promise<void>;
}

export function useStaking(): StakingState & StakingActions {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [state, setState] = useState<StakingState>({
    positions: [],
    totalStaked: 0,
    totalRewards: 0,
    loading: false,
    error: null
  });

  const stake = useCallback(async (amount: number, duration: number) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const program = getStakingProgram(connection, publicKey);
      
      // Create staking position
      const [positionPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("staking_position"),
          publicKey.toBuffer(),
          Buffer.from(Date.now().toString())
        ],
        program.programId
      );

      const tx = await program.methods
        .stakeTokens(
          new anchor.BN(amount * Math.pow(10, 9)),
          new anchor.BN(duration * 24 * 60 * 60)
        )
        .accounts({
          position: positionPda,
          user: publicKey,
          // ... other accounts
        })
        .rpc();

      // Record in backend
      await fetch('/api/staking/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          amount: amount * Math.pow(10, 9),
          lockDuration: duration,
          transactionHash: tx
        })
      });

      await refreshPositions();
      toast.success('Staking successful!');
      return tx;
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      toast.error('Staking failed');
      throw error;
    }
  }, [publicKey, sendTransaction, connection]);

  const unstake = useCallback(async (positionId: number) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const program = getStakingProgram(connection, publicKey);
      const position = state.positions.find(p => p.id === positionId);
      if (!position) throw new Error('Position not found');

      const tx = await program.methods
        .unstakeTokens()
        .accounts({
          position: new PublicKey(position.address),
          user: publicKey,
          // ... other accounts
        })
        .rpc();

      // Record in backend
      await fetch('/api/staking/unstake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          positionId,
          transactionHash: tx
        })
      });

      await refreshPositions();
      toast.success('Unstaking successful!');
      return tx;
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      toast.error('Unstaking failed');
      throw error;
    }
  }, [publicKey, connection, state.positions]);

  const claimRewards = useCallback(async (positionId: number) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const program = getStakingProgram(connection, publicKey);
      const position = state.positions.find(p => p.id === positionId);
      if (!position) throw new Error('Position not found');

      const tx = await program.methods
        .claimRewards()
        .accounts({
          position: new PublicKey(position.address),
          user: publicKey,
          // ... other accounts
        })
        .rpc();

      await refreshPositions();
      toast.success('Rewards claimed!');
      return tx;
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      toast.error('Claim failed');
      throw error;
    }
  }, [publicKey, connection, state.positions]);

  const refreshPositions = useCallback(async () => {
    if (!publicKey) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch(`/api/staking/positions/${publicKey.toString()}`);
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        positions: data.positions,
        totalStaked: data.totalStaked,
        totalRewards: data.totalRewards,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
    }
  }, [publicKey]);

  // Auto-refresh positions when wallet connects
  useEffect(() => {
    if (publicKey) {
      refreshPositions();
    }
  }, [publicKey, refreshPositions]);

  return {
    ...state,
    stake,
    unstake,
    claimRewards,
    refreshPositions
  };
}
```

## Governance Hooks

### useGovernance
Manages governance operations and voting.

```typescript
interface GovernanceState {
  proposals: Proposal[];
  userVotes: Vote[];
  votingPower: number;
  loading: boolean;
  error: string | null;
}

interface GovernanceActions {
  createProposal: (proposal: CreateProposalData) => Promise<string>;
  vote: (proposalId: number, support: boolean) => Promise<string>;
  executeProposal: (proposalId: number) => Promise<string>;
  refreshProposals: () => Promise<void>;
  refreshVotingPower: () => Promise<void>;
}

export function useGovernance(): GovernanceState & GovernanceActions {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [state, setState] = useState<GovernanceState>({
    proposals: [],
    userVotes: [],
    votingPower: 0,
    loading: false,
    error: null
  });

  const createProposal = useCallback(async (proposalData: CreateProposalData) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const program = getGovernanceProgram(connection, publicKey);
      
      const [proposalPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("proposal"),
          publicKey.toBuffer(),
          Buffer.from(Date.now().toString())
        ],
        program.programId
      );

      const tx = await program.methods
        .createProposal(
          proposalData.title,
          proposalData.description,
          proposalData.proposalType,
          new anchor.BN(proposalData.votingDuration * 24 * 60 * 60)
        )
        .accounts({
          proposal: proposalPda,
          proposer: publicKey,
          // ... other accounts
        })
        .rpc();

      // Record in backend
      await fetch('/api/governance/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...proposalData,
          proposerAddress: publicKey.toString(),
          transactionHash: tx
        })
      });

      await refreshProposals();
      toast.success('Proposal created successfully!');
      return tx;
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      toast.error('Failed to create proposal');
      throw error;
    }
  }, [publicKey, connection]);

  const vote = useCallback(async (proposalId: number, support: boolean) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const program = getGovernanceProgram(connection, publicKey);
      const proposal = state.proposals.find(p => p.id === proposalId);
      if (!proposal) throw new Error('Proposal not found');

      const tx = await program.methods
        .vote(support)
        .accounts({
          proposal: new PublicKey(proposal.address),
          voter: publicKey,
          // ... other accounts
        })
        .rpc();

      // Record in backend
      await fetch('/api/governance/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          support,
          votingPower: state.votingPower,
          transactionHash: tx
        })
      });

      await refreshProposals();
      toast.success('Vote cast successfully!');
      return tx;
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      toast.error('Failed to cast vote');
      throw error;
    }
  }, [publicKey, connection, state.proposals, state.votingPower]);

  const refreshProposals = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch('/api/governance/proposals');
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        proposals: data.proposals,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
    }
  }, []);

  const refreshVotingPower = useCallback(async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(`/api/governance/voting-power/${publicKey.toString()}`);
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        votingPower: data.votingPower
      }));
    } catch (error) {
      console.error('Failed to fetch voting power:', error);
    }
  }, [publicKey]);

  // Auto-refresh data when wallet connects
  useEffect(() => {
    refreshProposals();
    if (publicKey) {
      refreshVotingPower();
    }
  }, [publicKey, refreshProposals, refreshVotingPower]);

  return {
    ...state,
    createProposal,
    vote,
    executeProposal: async () => '', // TODO: Implement
    refreshProposals,
    refreshVotingPower
  };
}
```

## IPFS Hooks

### useIPFS
Manages IPFS file operations.

```typescript
interface IPFSState {
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
}

interface IPFSActions {
  uploadFile: (file: File) => Promise<string>;
  uploadMetadata: (metadata: object) => Promise<string>;
  getContent: (hash: string) => Promise<any>;
  pinFile: (hash: string) => Promise<void>;
  unpinFile: (hash: string) => Promise<void>;
}

export function useIPFS(): IPFSState & IPFSActions {
  const [state, setState] = useState<IPFSState>({
    uploading: false,
    uploadProgress: 0,
    error: null
  });

  const uploadFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, uploading: true, uploadProgress: 0, error: null }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ipfs/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        uploading: false,
        uploadProgress: 100
      }));

      toast.success('File uploaded to IPFS successfully!');
      return data.hash;
    } catch (error) {
      setState(prev => ({
        ...prev,
        uploading: false,
        error: error.message
      }));
      toast.error('Failed to upload file');
      throw error;
    }
  }, []);

  const uploadMetadata = useCallback(async (metadata: object) => {
    setState(prev => ({ ...prev, uploading: true, error: null }));

    try {
      const response = await fetch('/api/ipfs/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        throw new Error('Metadata upload failed');
      }

      const data = await response.json();
      
      setState(prev => ({ ...prev, uploading: false }));
      return data.hash;
    } catch (error) {
      setState(prev => ({
        ...prev,
        uploading: false,
        error: error.message
      }));
      throw error;
    }
  }, []);

  const getContent = useCallback(async (hash: string) => {
    try {
      const response = await fetch(`/api/ipfs/file/${hash}`);
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get IPFS content:', error);
      throw error;
    }
  }, []);

  const pinFile = useCallback(async (hash: string) => {
    try {
      await fetch(`/api/ipfs/pin/${hash}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      toast.success('File pinned successfully');
    } catch (error) {
      toast.error('Failed to pin file');
      throw error;
    }
  }, []);

  const unpinFile = useCallback(async (hash: string) => {
    try {
      await fetch(`/api/ipfs/unpin/${hash}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      toast.success('File unpinned successfully');
    } catch (error) {
      toast.error('Failed to unpin file');
      throw error;
    }
  }, []);

  return {
    ...state,
    uploadFile,
    uploadMetadata,
    getContent,
    pinFile,
    unpinFile
  };
}
```

## Custom Hook Testing

### Hook Testing Utilities
```typescript
// hook-test-utils.tsx
import { renderHook, RenderHookOptions } from '@testing-library/react';
import { WalletProvider } from '@solana/wallet-adapter-react';
import { ConnectionProvider } from '@solana/wallet-adapter-react';

const createWrapper = ({ children }: { children: React.ReactNode }) => (
  <ConnectionProvider endpoint="http://localhost:8899">
    <WalletProvider wallets={[]} autoConnect={false}>
      {children}
    </WalletProvider>
  </ConnectionProvider>
);

export const renderHookWithProviders = <TProps, TResult>(
  hook: (props: TProps) => TResult,
  options?: RenderHookOptions<TProps>
) => {
  return renderHook(hook, {
    wrapper: createWrapper,
    ...options
  });
};
```

### Hook Tests
```typescript
// useToken.test.ts
import { renderHookWithProviders } from './hook-test-utils';
import { useToken } from '../useToken';

describe('useToken', () => {
  it('should initialize with default state', () => {
    const { result } = renderHookWithProviders(() => useToken());
    
    expect(result.current.balance).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });
  
  it('should handle token purchase', async () => {
    const { result } = renderHookWithProviders(() => useToken());
    
    // Mock wallet and connection
    // Test purchase functionality
  });
});
```

---

For more information, see the [components documentation](./components.md) or [API documentation](../API.md).
