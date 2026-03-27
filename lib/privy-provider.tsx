'use client';

/**
 * lib/privy-provider.tsx
 * Privy auth provider for institution wallet-less onboarding.
 *
 * - Google-only login (no email/SMS/external wallet options)
 * - Embedded wallet created on login (Alchemy LightAccount)
 * - Alchemy Gas Manager sponsors all gas on Sepolia
 */

import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { sepolia } from 'viem/chains';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;

interface PrivyWrapperProps {
  children: React.ReactNode;
}

export function PrivyWrapper({ children }: PrivyWrapperProps) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['google'],
        appearance: {
          theme: 'dark',
          accentColor: '#7c3aed', // match VCred violet brand
          logo: undefined,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'all-users',
          },
        },
        defaultChain: sepolia,
        supportedChains: [sepolia],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
