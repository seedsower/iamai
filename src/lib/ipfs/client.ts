import { create, IPFSHTTPClient } from 'ipfs-http-client';

export interface IPFSFile {
  path: string;
  content: Uint8Array | string;
}

export interface IPFSUploadResult {
  hash: string;
  path: string;
  size: number;
}

export interface IPFSMetadata {
  name: string;
  description: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
  animation_url?: string;
  [key: string]: any;
}

class IPFSClient {
  private client: IPFSHTTPClient;
  private gatewayUrl: string;

  constructor() {
    // Use Infura IPFS node or local node
    const projectId = process.env.NEXT_PUBLIC_INFURA_PROJECT_ID;
    const projectSecret = process.env.NEXT_PUBLIC_INFURA_PROJECT_SECRET;
    
    if (projectId && projectSecret) {
      const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
      this.client = create({
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
          authorization: auth,
        },
      });
      this.gatewayUrl = 'https://iamai.infura-ipfs.io/ipfs/';
    } else {
      // Fallback to local IPFS node
      this.client = create({
        host: 'localhost',
        port: 5001,
        protocol: 'http',
      });
      this.gatewayUrl = 'http://localhost:8080/ipfs/';
    }
  }

  /**
   * Upload a single file to IPFS
   */
  async uploadFile(file: File | Blob, filename?: string): Promise<IPFSUploadResult> {
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const result = await this.client.add({
        path: filename || 'file',
        content: buffer,
      });

      return {
        hash: result.cid.toString(),
        path: result.path,
        size: result.size,
      };
    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  /**
   * Upload multiple files to IPFS
   */
  async uploadFiles(files: IPFSFile[]): Promise<IPFSUploadResult[]> {
    try {
      const results: IPFSUploadResult[] = [];
      
      for await (const result of this.client.addAll(files)) {
        results.push({
          hash: result.cid.toString(),
          path: result.path,
          size: result.size,
        });
      }

      return results;
    } catch (error) {
      console.error('IPFS batch upload failed:', error);
      throw new Error('Failed to upload files to IPFS');
    }
  }

  /**
   * Upload JSON metadata to IPFS
   */
  async uploadMetadata(metadata: IPFSMetadata): Promise<IPFSUploadResult> {
    try {
      const jsonString = JSON.stringify(metadata, null, 2);
      const buffer = new TextEncoder().encode(jsonString);
      
      const result = await this.client.add({
        path: 'metadata.json',
        content: buffer,
      });

      return {
        hash: result.cid.toString(),
        path: result.path,
        size: result.size,
      };
    } catch (error) {
      console.error('IPFS metadata upload failed:', error);
      throw new Error('Failed to upload metadata to IPFS');
    }
  }

  /**
   * Pin content to ensure it stays available
   */
  async pinContent(hash: string): Promise<void> {
    try {
      await this.client.pin.add(hash);
    } catch (error) {
      console.error('IPFS pinning failed:', error);
      throw new Error('Failed to pin content to IPFS');
    }
  }

  /**
   * Unpin content to allow garbage collection
   */
  async unpinContent(hash: string): Promise<void> {
    try {
      await this.client.pin.rm(hash);
    } catch (error) {
      console.error('IPFS unpinning failed:', error);
      throw new Error('Failed to unpin content from IPFS');
    }
  }

  /**
   * Get content from IPFS
   */
  async getContent(hash: string): Promise<Uint8Array> {
    try {
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of this.client.cat(hash)) {
        chunks.push(chunk);
      }

      // Combine all chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    } catch (error) {
      console.error('IPFS content retrieval failed:', error);
      throw new Error('Failed to retrieve content from IPFS');
    }
  }

  /**
   * Get JSON metadata from IPFS
   */
  async getMetadata(hash: string): Promise<IPFSMetadata> {
    try {
      const content = await this.getContent(hash);
      const jsonString = new TextDecoder().decode(content);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('IPFS metadata retrieval failed:', error);
      throw new Error('Failed to retrieve metadata from IPFS');
    }
  }

  /**
   * Get the gateway URL for a hash
   */
  getGatewayUrl(hash: string): string {
    return `${this.gatewayUrl}${hash}`;
  }

  /**
   * Check if IPFS node is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.id();
      return true;
    } catch (error) {
      console.error('IPFS node not available:', error);
      return false;
    }
  }

  /**
   * Get IPFS node information
   */
  async getNodeInfo() {
    try {
      return await this.client.id();
    } catch (error) {
      console.error('Failed to get IPFS node info:', error);
      throw new Error('Failed to get IPFS node information');
    }
  }
}

// Export singleton instance
export const ipfsClient = new IPFSClient();
export default ipfsClient;
