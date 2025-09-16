// Global error handler to suppress empty error objects
export const setupErrorHandling = () => {
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
  }
};

export default setupErrorHandling;
