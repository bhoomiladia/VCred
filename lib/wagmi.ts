/**
 * lib/wagmi.ts
 * Wagmi v2 configuration for VCred
 * - Sepolia testnet only
 * - SSR: true for Next.js (wallet persists across page refreshes)
 * - Supports injected (MetaMask), Coinbase Wallet, and WalletConnect
 */

import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors';

// Get project ID from env — create a free one at https://cloud.walletconnect.com
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'vcred-dev-placeholder';

export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
  ssr: true,
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'VCred' }),
    walletConnect({ projectId: walletConnectProjectId }),
  ],
});
