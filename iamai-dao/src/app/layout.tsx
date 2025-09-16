import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@solana/wallet-adapter-react-ui/styles.css';
import { WalletContextProvider } from "@/components/wallet/WalletProvider";
import { Toaster } from "react-hot-toast";
import { ErrorSuppressor } from "@/components/ErrorSuppressor";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "IAMAI DAO - Decentralized AI Development Platform",
  description: "Join the future of AI development with IAMAI DAO. Stake tokens, participate in governance, and access cutting-edge AI models on Solana blockchain.",
  keywords: "AI, DAO, Solana, Web3, Governance, Staking, Blockchain, Decentralized",
  authors: [{ name: "IAMAI DAO Team" }],
  openGraph: {
    title: "IAMAI DAO - Decentralized AI Development Platform",
    description: "Join the future of AI development with IAMAI DAO",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-900 text-white`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Setup error handling immediately
              (function() {
                let errorHandlerSetup = false;
                if (errorHandlerSetup) return;
                errorHandlerSetup = true;

                const originalConsoleError = console.error;
                console.error = function(...args) {
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
                    originalConsoleError.apply(console, filteredArgs);
                  }
                };

                const originalConsoleWarn = console.warn;
                console.warn = function(...args) {
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
              })();
            `,
          }}
        />
        <WalletContextProvider>
          <ErrorSuppressor />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #374151',
              },
            }}
          />
        </WalletContextProvider>
      </body>
    </html>
  );
}
