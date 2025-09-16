// Global error handler to suppress empty error objects
let errorHandlerSetup = false;

export const setupErrorHandling = () => {
  // Prevent multiple setups
  if (errorHandlerSetup) return;
  errorHandlerSetup = true;

  // Override console.error to filter out empty objects
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    // Filter out empty objects and meaningless errors
    const filteredArgs = args.filter(arg => {
      if (typeof arg === 'object' && arg !== null) {
        // Check if object is empty or has no meaningful properties
        const keys = Object.keys(arg);
        if (keys.length === 0) return false;
        
        // Check if all values are empty/undefined
        const hasContent = keys.some(key => {
          const value = arg[key];
          return value !== undefined && value !== null && value !== '';
        });
        
        return hasContent;
      }
      return true;
    });
    
    // Only log if there are meaningful arguments
    if (filteredArgs.length > 0) {
      originalConsoleError.apply(console, filteredArgs);
    }
  };

  // Override console.warn as well since some empty objects might come through as warnings
  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    const filteredArgs = args.filter(arg => {
      if (typeof arg === 'object' && arg !== null) {
        const keys = Object.keys(arg);
        if (keys.length === 0) return false;
        
        const hasContent = keys.some(key => {
          const value = arg[key];
          return value !== undefined && value !== null && value !== '';
        });
        
        return hasContent;
      }
      return true;
    });
    
    if (filteredArgs.length > 0) {
      originalConsoleWarn.apply(console, filteredArgs);
    }
  };

  // Handle unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      // Suppress empty error objects
      if (event.reason && typeof event.reason === 'object') {
        const keys = Object.keys(event.reason);
        if (keys.length === 0) {
          event.preventDefault();
          return;
        }
      }
    });

    // Also handle regular error events
    window.addEventListener('error', (event) => {
      if (event.error && typeof event.error === 'object') {
        const keys = Object.keys(event.error);
        if (keys.length === 0) {
          event.preventDefault();
          return;
        }
      }
    });
  }
};

export default setupErrorHandling;
