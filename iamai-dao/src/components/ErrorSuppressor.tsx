'use client';

import { useEffect } from 'react';
import { setupErrorHandling } from '@/lib/errorHandler';

export const ErrorSuppressor: React.FC = () => {
  useEffect(() => {
    // Ensure error handling is set up on client side
    setupErrorHandling();
  }, []);

  return null;
};
