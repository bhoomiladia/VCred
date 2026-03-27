'use client';

/**
 * lib/web3-providers.tsx
 * Client-side Web3 provider wrapper for VCred.
 *
 * Wraps the entire app with:
 *  0. PrivyWrapper        — Privy auth for institutions (Google login + embedded wallet)
 *  1. WagmiProvider       — wallet connection state (students / HQ)
 *  2. QueryClientProvider — TanStack Query (required by Wagmi v2)
 *  3. RainbowKitProvider  — beautiful wallet UX, dark theme, Sepolia forced
 */

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from '@/lib/wagmi';
import { PrivyWrapper } from '@/lib/privy-provider';

// Create a stable QueryClient instance
const queryClient = new QueryClient();

interface Web3ProvidersProps {
  children: React.ReactNode;
}

export function Web3Providers({ children }: Web3ProvidersProps) {
  return (
    <PrivyWrapper>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: '#7c3aed',          // violet accent to match VCred brand
              accentColorForeground: 'white',
              borderRadius: 'medium',
              fontStack: 'system',
              overlayBlur: 'small',
            })}
            appInfo={{
              appName: 'VCred',
              learnMoreUrl: 'https://vcred.vercel.app',
            }}
          >
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyWrapper>
  );
}
