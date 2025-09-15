'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Check } from 'lucide-react';
import { useIPFS } from '@/hooks/useIPFS';
import { Button } from '@/components/ui/Button';

interface FileUploadProps {
  onUpload: (result: { hash: string; url: string; filename: string }) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  multiple?: boolean;
  className?: string;
  label?: string;
  description?: string;
}

export function FileUpload({
  onUpload,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/*': ['.pdf', '.json'],
    'text/*': ['.txt', '.md']
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
  className = '',
  label = 'Upload File',
  description = 'Drag and drop files here, or click to select'
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    file: File;
    hash?: string;
    url?: string;
    uploading: boolean;
    error?: string;
  }>>([]);

  const { uploadFile, uploading, getGatewayUrl } = useIPFS();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      uploading: true
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload files to IPFS
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const fileIndex = uploadedFiles.length + i;

      try {
        const result = await uploadFile(file, file.name);
        
        if (result) {
          const url = getGatewayUrl(result.hash);
          
          setUploadedFiles(prev => prev.map((f, index) => 
            index === fileIndex 
              ? { ...f, hash: result.hash, url, uploading: false }
              : f
          ));

          onUpload({
            hash: result.hash,
            url,
            filename: file.name
          });
        } else {
          setUploadedFiles(prev => prev.map((f, index) => 
            index === fileIndex 
              ? { ...f, uploading: false, error: 'Upload failed' }
              : f
          ));
        }
      } catch (error) {
        setUploadedFiles(prev => prev.map((f, index) => 
          index === fileIndex 
            ? { ...f, uploading: false, error: 'Upload failed' }
            : f
        ));
      }
    }
  }, [uploadFile, getGatewayUrl, onUpload, uploadedFiles.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
          }
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-2">
          <Upload className="w-8 h-8 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Max size: {formatFileSize(maxSize)}
          </p>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Uploaded Files
          </h4>
          
          {uploadedFiles.map((fileData, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <File className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {fileData.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(fileData.file.size)}
                  </p>
                  {fileData.hash && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      IPFS: {fileData.hash.slice(0, 20)}...
                    </p>
                  )}
                  {fileData.error && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {fileData.error}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {fileData.uploading && (
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                )}
                
                {fileData.hash && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                
                {fileData.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(fileData.url, '_blank')}
                  >
                    View
                  </Button>
                )}
                
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
