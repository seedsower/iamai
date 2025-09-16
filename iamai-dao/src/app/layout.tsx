import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@solana/wallet-adapter-react-ui/styles.css';
import { WalletContextProvider } from "@/components/wallet/WalletProvider";
import { Toaster } from "react-hot-toast";
import { setupErrorHandling } from "@/lib/errorHandler";

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
  // Setup error handling on client side
  if (typeof window !== 'undefined') {
    setupErrorHandling();
  }

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-900 text-white`}>
        <WalletContextProvider>
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
