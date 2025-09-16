import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { authClient, AuthResult, UserProfile } from '@/lib/auth/client';
import { toast } from 'react-hot-toast';
import bs58 from 'bs58';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthProvider() {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check auth when wallet connection changes
  useEffect(() => {
    if (!connected) {
      setIsAuthenticated(false);
      setUser(null);
      authClient.logout();
    } else if (publicKey) {
      checkAuthStatus();
    }
  }, [connected, publicKey]);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const verification = await authClient.verifyToken();
      
      if (verification.valid && verification.user) {
        setIsAuthenticated(true);
        setUser(verification.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (): Promise<boolean> => {
    try {
      if (!publicKey || !signMessage) {
        toast.error('Wallet not connected');
        return false;
      }

      setLoading(true);

      // Get authentication challenge
      const challenge = await authClient.getChallenge(publicKey.toString());
      if (!challenge) {
        toast.error('Failed to get authentication challenge');
        return false;
      }

      // Sign the challenge message
      const messageBytes = new TextEncoder().encode(challenge.challenge);
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      // Authenticate with the signature
      const result: AuthResult = await authClient.authenticate(
        publicKey.toString(),
        signatureBase58,
        challenge.challenge,
        challenge.timestamp
      );

      if (result.success) {
        setIsAuthenticated(true);
        
        // Fetch user profile
        await checkAuthStatus();
        
        toast.success('Successfully authenticated!');
        return true;
      } else {
        toast.error(result.error || 'Authentication failed');
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signMessage]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      await authClient.logout();
      setIsAuthenticated(false);
      setUser(null);
      
      // Disconnect wallet
      if (connected) {
        await disconnect();
      }
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed');
    } finally {
      setLoading(false);
    }
  }, [connected, disconnect]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const result = await authClient.refreshToken();
      
      if (result.success) {
        await checkAuthStatus();
        return true;
      } else {
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }
  }, []);

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    refreshToken,
  };
}

export { AuthContext };
