import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';

export interface AuthChallenge {
  challenge: string;
  timestamp: number;
  nonce: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  walletAddress?: string;
  expiresIn?: string;
  error?: string;
}

export interface UserProfile {
  walletAddress: string;
  username?: string;
  createdAt: string;
  lastLogin: string;
}

class AuthClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    this.token = this.getStoredToken();
  }

  /**
   * Get stored token from localStorage
   */
  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('iamai_auth_token');
  }

  /**
   * Store token in localStorage
   */
  private storeToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('iamai_auth_token', token);
    this.token = token;
  }

  /**
   * Remove token from localStorage
   */
  private removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('iamai_auth_token');
    this.token = null;
  }

  /**
   * Get authentication challenge for wallet
   */
  async getChallenge(walletAddress: string): Promise<AuthChallenge | null> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get challenge');
      }

      return {
        challenge: data.challenge,
        timestamp: data.timestamp,
        nonce: data.nonce,
      };
    } catch (error) {
      console.error('Challenge request failed:', error);
      toast.error('Failed to get authentication challenge');
      return null;
    }
  }

  /**
   * Authenticate with wallet signature
   */
  async authenticate(
    walletAddress: string,
    signature: string,
    message: string,
    timestamp: number
  ): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          signature,
          message,
          timestamp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Authentication failed',
        };
      }

      // Store token
      if (data.token) {
        this.storeToken(data.token);
      }

      return {
        success: true,
        token: data.token,
        walletAddress: data.walletAddress,
        expiresIn: data.expiresIn,
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      return {
        success: false,
        error: 'Network error during authentication',
      };
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.token) {
        return {
          success: false,
          error: 'No token to refresh',
        };
      }

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: this.token }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.removeToken();
        return {
          success: false,
          error: data.error || 'Token refresh failed',
        };
      }

      // Store new token
      if (data.token) {
        this.storeToken(data.token);
      }

      return {
        success: true,
        token: data.token,
        walletAddress: data.walletAddress,
        expiresIn: data.expiresIn,
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.removeToken();
      return {
        success: false,
        error: 'Network error during token refresh',
      };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      if (this.token) {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      this.removeToken();
    }
  }

  /**
   * Verify current token
   */
  async verifyToken(): Promise<{ valid: boolean; user?: UserProfile }> {
    try {
      if (!this.token) {
        return { valid: false };
      }

      const response = await fetch(`${this.baseUrl}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.removeToken();
        return { valid: false };
      }

      return {
        valid: data.valid,
        user: data.user,
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      this.removeToken();
      return { valid: false };
    }
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * Get authorization headers
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Make authenticated API request
   */
  async authenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // If token expired, try to refresh
    if (response.status === 401 && this.token) {
      const refreshResult = await this.refreshToken();
      if (refreshResult.success) {
        // Retry with new token
        const newHeaders = {
          ...this.getAuthHeaders(),
          ...options.headers,
        };

        return fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: newHeaders,
        });
      }
    }

    return response;
  }
}

// Export singleton instance
export const authClient = new AuthClient();
export default authClient;
