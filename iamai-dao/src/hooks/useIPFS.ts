import { useState, useCallback } from 'react';
import { ipfsClient, IPFSUploadResult, IPFSMetadata } from '@/lib/ipfs/client';
import { toast } from 'react-hot-toast';

export interface UseIPFSReturn {
  uploading: boolean;
  uploadFile: (file: File, filename?: string) => Promise<IPFSUploadResult | null>;
  uploadMetadata: (metadata: IPFSMetadata) => Promise<IPFSUploadResult | null>;
  uploadModelFiles: (modelFile: File, metadataFile?: File) => Promise<{ model: IPFSUploadResult; metadata?: IPFSUploadResult } | null>;
  getContent: (hash: string) => Promise<Uint8Array | null>;
  getMetadata: (hash: string) => Promise<IPFSMetadata | null>;
  getGatewayUrl: (hash: string) => string;
  isAvailable: () => Promise<boolean>;
}

export function useIPFS(): UseIPFSReturn {
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(async (file: File, filename?: string): Promise<IPFSUploadResult | null> => {
    setUploading(true);
    try {
      const result = await ipfsClient.uploadFile(file, filename);
      
      // Pin the content to ensure availability
      await ipfsClient.pinContent(result.hash);
      
      toast.success('File uploaded to IPFS successfully!');
      return result;
    } catch (error) {
      console.error('File upload failed:', error);
      toast.error('Failed to upload file to IPFS');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadMetadata = useCallback(async (metadata: IPFSMetadata): Promise<IPFSUploadResult | null> => {
    setUploading(true);
    try {
      const result = await ipfsClient.uploadMetadata(metadata);
      
      // Pin the metadata
      await ipfsClient.pinContent(result.hash);
      
      return result;
    } catch (error) {
      console.error('Metadata upload failed:', error);
      toast.error('Failed to upload metadata to IPFS');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadModelFiles = useCallback(async (
    modelFile: File, 
    metadataFile?: File
  ): Promise<{ model: IPFSUploadResult; metadata?: IPFSUploadResult } | null> => {
    setUploading(true);
    try {
      // Upload model file
      const modelResult = await ipfsClient.uploadFile(modelFile, modelFile.name);
      await ipfsClient.pinContent(modelResult.hash);

      let metadataResult: IPFSUploadResult | undefined;
      
      // Upload metadata file if provided
      if (metadataFile) {
        metadataResult = await ipfsClient.uploadFile(metadataFile, 'metadata.json');
        await ipfsClient.pinContent(metadataResult.hash);
      }

      toast.success('AI model files uploaded successfully!');
      return {
        model: modelResult,
        metadata: metadataResult
      };
    } catch (error) {
      console.error('Model files upload failed:', error);
      toast.error('Failed to upload model files to IPFS');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const getContent = useCallback(async (hash: string): Promise<Uint8Array | null> => {
    try {
      return await ipfsClient.getContent(hash);
    } catch (error) {
      console.error('Content retrieval failed:', error);
      toast.error('Failed to retrieve content from IPFS');
      return null;
    }
  }, []);

  const getMetadata = useCallback(async (hash: string): Promise<IPFSMetadata | null> => {
    try {
      return await ipfsClient.getMetadata(hash);
    } catch (error) {
      console.error('Metadata retrieval failed:', error);
      toast.error('Failed to retrieve metadata from IPFS');
      return null;
    }
  }, []);

  const getGatewayUrl = useCallback((hash: string): string => {
    return ipfsClient.getGatewayUrl(hash);
  }, []);

  const isAvailable = useCallback(async (): Promise<boolean> => {
    return await ipfsClient.isAvailable();
  }, []);

  return {
    uploading,
    uploadFile,
    uploadMetadata,
    uploadModelFiles,
    getContent,
    getMetadata,
    getGatewayUrl,
    isAvailable
  };
}
