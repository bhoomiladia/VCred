"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { usePrivy } from "@privy-io/react-auth"
import { Web3Navbar } from "@/components/web3-navbar"
import { useUser } from "@/lib/user-context"
import { toast } from "sonner"
import { LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Helper: get the Privy embedded wallet address from the user object.
 */
function getPrivyWalletAddress(privyUser: any): string | null {
  if (!privyUser?.linkedAccounts) return null;
  const embeddedWallet = privyUser.linkedAccounts.find(
    (a: any) => a.type === 'wallet' && a.walletClientType === 'privy'
  );
  return embeddedWallet?.address || null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Wagmi (students / HQ)
  const { address: wagmiAddress, isConnected: wagmiConnected, status: wagmiStatus } = useAccount()
  
  // Privy (institutions)
  const { authenticated: privyAuthenticated, user: privyUser, ready: privyReady, logout: privyLogout } = usePrivy()
  
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const { user, setUser, isLoaded: isUserLoaded, logout } = useUser()
  const authorizedAddress = useRef<string | null>(null)

  // Determine dashboard role from path
  const pathParts = pathname.split('/');
  const roleInPath = pathParts[2]; // /dashboard/[role]
  const isInstitutionPath = roleInPath === 'institution';

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      if (!isMounted) return;

      // ── Institution path: use Privy auth ──
      if (isInstitutionPath) {
        if (!privyReady || !isUserLoaded) return;

        if (!privyAuthenticated) {
          if (active) {
            setIsAuthorized(false)
            router.replace("/role-select?role=institution")
          }
          return;
        }

        const walletAddress = getPrivyWalletAddress(privyUser);
        if (!walletAddress) return; // Still loading embedded wallet

        // Already authorized this session
        if (authorizedAddress.current === walletAddress.toLowerCase()) {
          if (isAuthorized !== true) setIsAuthorized(true)
          return;
        }

        try {
          const res = await fetch(`/api/user/status?address=${walletAddress}`)
          const data = await res.json()
          if (!active) return;

          if (!data.exists || !data.isProfileComplete) {
            setIsAuthorized(false)
            router.replace("/onboard/institution")
            return
          }

          if (data.user) setUser(data.user)
          authorizedAddress.current = walletAddress.toLowerCase()
          setIsAuthorized(true)
        } catch (error) {
          console.error("Dashboard auth check failed", error)
          if (active) {
            setIsAuthorized(false)
            router.replace("/")
          }
        }
        return;
      }

      // ── Student / HQ path: use wagmi (MetaMask) auth ──
      if (wagmiStatus === 'connecting' || wagmiStatus === 'reconnecting' || !isUserLoaded) return;
      if (wagmiStatus === 'connected' && !wagmiAddress) return;

      if (wagmiStatus === 'disconnected' || !wagmiAddress) {
        if (active) {
          setIsAuthorized(false)
          router.replace("/")
        }
        return
      }

      if (authorizedAddress.current === wagmiAddress.toLowerCase()) {
        if (isAuthorized !== true) setIsAuthorized(true)
        return
      }

      // MASTER ADMIN "GOD MODE" CHECK
      const masterAddress = process.env.NEXT_PUBLIC_MASTER_ADMIN_ADDRESS;
      const isMasterAdmin = !!(masterAddress && wagmiAddress.toLowerCase() === masterAddress.toLowerCase());

      if (isMasterAdmin) {
        if (roleInPath === 'hq' || !roleInPath) {
          authorizedAddress.current = wagmiAddress.toLowerCase()
          setIsAuthorized(true)
          return
        }
      }

      // Normal User DB Check
      try {
        const res = await fetch(`/api/user/status?address=${wagmiAddress}`)
        const data = await res.json()

        if (!active) return;

        if (!data.exists || !data.isProfileComplete) {
          if (isMasterAdmin && roleInPath === 'hq') {
            authorizedAddress.current = wagmiAddress.toLowerCase()
            setIsAuthorized(true)
            return
          }
          setIsAuthorized(false)
          router.replace("/role-select")
          return
        }

        // Role Mismatch Check
        if (roleInPath && data.role && data.role !== roleInPath) {
          if (!isMasterAdmin) {
            router.replace(`/dashboard/${data.role}`)
            return
          }
        }

        if (data.user) {
          setUser(data.user)
        }
        authorizedAddress.current = wagmiAddress.toLowerCase()
        setIsAuthorized(true)

      } catch (error) {
        console.error("Dashboard auth check failed", error)
        if (active) {
          setIsAuthorized(false)
          router.replace("/")
        }
      }
    }

    checkAuth()

    return () => {
      active = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wagmiStatus, wagmiAddress, isUserLoaded, isMounted, privyReady, privyAuthenticated, privyUser])

  // Show loader while we're checking the wallet
  if (!isMounted || isAuthorized === null || (isInstitutionPath ? (privyAuthenticated && !isAuthorized) : (wagmiConnected && !isAuthorized))) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Verifying Identity...</p>
      </div>
    )
  }

  if (!isAuthorized) return null

  // Worker Approval Logic
  if (user?.role === 'institution' && user?.subRole === 'worker' && user?.workerStatus !== 'VERIFIED') {
    return (
      <div className="min-h-screen bg-background pt-16">
        <Web3Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 ring-8 ring-amber-500/5">
              <div className="h-10 w-10 animate-pulse text-amber-500">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Waiting for Admin Approval</h1>
            <p className="text-muted-foreground text-lg">
              Your account for <span className="text-foreground font-semibold">{user.institutionName}</span> is currently pending approval from your institution's administrator.
            </p>
            <div className="p-4 rounded-xl border border-border/50 bg-card/50 text-sm italic">
              "Once approved, you will have access to all institution tools and records."
            </div>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator if this is taking longer than expected.
            </p>
            <div className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  logout()
                  if (isInstitutionPath) {
                    privyLogout()
                  }
                  router.push("/")
                }}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* ── Dashboard Top Navbar ── */}
      <Web3Navbar />
      
      {/* ── Dashboard Nested Content ── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  )
}
