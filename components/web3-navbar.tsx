'use client';

/**
 * components/web3-navbar.tsx
 * Global Navbar for VCred — displays branding, nav links, and auth info.
 * 
 * - Institution users (Privy): shows Google user info + logout
 * - Student / HQ users (wagmi): shows RainbowKit ConnectButton
 */

import Link from 'next/link';
import { AnimatedVCred } from '@/components/animated-vcred';
import { Shield, ExternalLink, LogOut, User } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { usePrivy } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import { useRouter } from 'next/navigation';

export function Web3Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated: privyAuthenticated, user: privyUser, logout: privyLogout } = usePrivy();
  const { user, logout } = useUser();
  
  const isInstitutionPath = pathname.includes('/dashboard/institution') || pathname.includes('/onboard/institution');

  const handleInstitutionLogout = async () => {
    logout();
    await privyLogout();
    router.push('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ── Brand ─────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-900/40 transition-transform group-hover:scale-105">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <AnimatedVCred className="text-xl font-bold tracking-tight text-white" />
        </Link>

        {/* ── Nav Links ─────────────────────────────────────── */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/verify"
            className="text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            Verify
          </Link>
          <Link
            href="#features"
            className="text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            Features
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            href="https://sepolia.etherscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-violet-400 transition-colors hover:text-violet-300"
          >
            Sepolia <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </nav>

        {/* ── Auth Section ────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {isInstitutionPath && privyAuthenticated ? (
            // Institution: show Privy Google user info
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                <User className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-sm text-white/80 max-w-[150px] truncate">
                  {privyUser?.google?.name || privyUser?.google?.email || user?.name || 'Institution'}
                </span>
              </div>
              <button
                onClick={handleInstitutionLogout}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            // Student / HQ: show RainbowKit ConnectButton
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          )}
        </div>
      </div>
    </header>
  );
}
