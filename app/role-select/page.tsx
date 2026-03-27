"use client"

import { motion } from "framer-motion"
import { GraduationCap, Building2, Shield, ArrowRight, ArrowLeft, Users, FileCheck, Wallet, Lock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { VCubeLogo } from "@/components/v-cube-logo"
import { AnimatedVCred } from "@/components/animated-vcred"
import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect, Suspense, useCallback } from "react"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { usePrivy } from "@privy-io/react-auth"
import { toast } from "sonner"

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

function RoleSelectContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Wagmi (for students)
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  
  // Privy (for institutions)
  const { login: privyLogin, authenticated: privyAuthenticated, user: privyUser, ready: privyReady } = usePrivy()
  
  const [selectedRole, setSelectedRole] = useState<"student" | "institution" | "hq" | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // HQ Admin: environmental wallet check
  const isHQAdmin = wagmiConnected && wagmiAddress?.toLowerCase() === process.env.NEXT_PUBLIC_MASTER_ADMIN_ADDRESS?.toLowerCase()

  useEffect(() => {
    const role = searchParams.get("role")
    if (role === "student" || role === "institution" || role === "hq") {
      setSelectedRole(role)
    }
  }, [searchParams])

  const roles = [
    {
      id: "student" as const,
      title: "Student",
      description: "Access your credential vault, view your verified certificates, and generate shareable proof links.",
      icon: GraduationCap,
      features: [
        "View all your credentials",
        "Generate public proof links",
        "Download verified certificates",
        "Track verification history"
      ],
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    {
      id: "institution" as const,
      title: "Institution",
      description: "Issue bulk credentials, process transcripts with AI, and manage your student records.",
      icon: Building2,
      features: [
        "AI-powered transcript processing",
        "Bulk credential minting",
        "Student records management",
        "Analytics dashboard"
      ],
      gradient: "from-primary/20 to-emerald-500/20"
    }
  ]

  // Institution: after Privy login, auto-navigate
  const handlePrivySuccess = useCallback(async () => {
    if (!privyAuthenticated || !privyUser || !privyReady) return;
    
    const walletAddress = getPrivyWalletAddress(privyUser);
    if (!walletAddress) {
      // Wallet might not be ready yet; wait for it
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/user/status?address=${walletAddress}`);
      const data = await res.json();

      if (data.exists && data.isProfileComplete) {
        if (data.role && data.role !== 'institution') {
          toast.error(`This account is already registered as a ${data.role}.`);
          return;
        }
        router.push(`/dashboard/institution`);
      } else {
        router.push(`/onboard/institution`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to check user status');
    } finally {
      setIsLoading(false);
    }
  }, [privyAuthenticated, privyUser, privyReady, router]);

  useEffect(() => {
    if (selectedRole === 'institution' && privyAuthenticated && privyUser) {
      handlePrivySuccess();
    }
  }, [selectedRole, privyAuthenticated, privyUser, handlePrivySuccess]);

  const handleContinue = async () => {
    if (!selectedRole) return;

    // ── HQ Admin: uses MetaMask, routes straight to /dashboard/hq ──
    if (selectedRole === 'hq') {
      if (!wagmiConnected || !wagmiAddress) {
        toast.error('Please connect your wallet first');
        return;
      }
      router.push('/dashboard/hq');
      return;
    }

    // ── Student: uses MetaMask / RainbowKit ──
    if (selectedRole === 'student') {
      if (!wagmiConnected || !wagmiAddress) {
        toast.error('Please connect your wallet first');
        return;
      }

      try {
        setIsLoading(true);
        const res = await fetch(`/api/user/status?address=${wagmiAddress}`);
        const data = await res.json();

        if (data.exists && data.isProfileComplete) {
          if (data.role && data.role !== selectedRole) {
            toast.error(`This wallet is already registered as a ${data.role}. Please use a different wallet or select the correct role.`);
            return;
          }
          router.push(`/dashboard/${data.role}`);
        } else {
          router.push(`/onboard/${selectedRole}`);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to check user status');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ── Institution: uses Privy Google Auth ──
    if (selectedRole === 'institution') {
      if (privyAuthenticated && privyUser) {
        // Already logged in via Privy — navigate directly
        handlePrivySuccess();
      } else {
        // Trigger Privy Google login
        privyLogin();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-20 right-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <Link href="/" className="flex items-center gap-3">
              <VCubeLogo className="h-8 w-8 drop-shadow-md" />
              <AnimatedVCred className="text-xl font-black tracking-tighter uppercase italic text-foreground" />
            </Link>
          </div>

          {/* Show ConnectButton for students and HQ */}
          {(selectedRole === 'student' || selectedRole === 'hq') && <ConnectButton />}
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-6 py-16 lg:py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 text-sm backdrop-blur">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Select Your Role</span>
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            How will you use VCRED?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Choose your role to get started. You can always switch roles later from your dashboard settings.
          </p>
        </motion.div>

        {/* Role Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-12 grid gap-6 md:grid-cols-2"
        >
          {roles.map((role, i) => (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              onClick={() => setSelectedRole(role.id)}
              className={`group relative text-left rounded-2xl border p-8 transition-all ${
                selectedRole === role.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border/50 bg-card/50 hover:border-border hover:bg-card/80"
              }`}
            >
              {/* Gradient Glow */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${role.gradient} opacity-0 transition-opacity group-hover:opacity-100 ${selectedRole === role.id ? "opacity-100" : ""}`} />
              
              <div className="relative">
                {/* Icon */}
                <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
                  selectedRole === role.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}>
                  <role.icon className="h-7 w-7" />
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-semibold">{role.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{role.description}</p>

                {/* Features */}
                <ul className="mt-6 space-y-2">
                  {role.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileCheck className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Selection Indicator */}
                <div className={`mt-8 flex items-center gap-2 text-sm transition-colors ${
                  selectedRole === role.id ? "text-primary" : "text-muted-foreground"
                }`}>
                  {selectedRole === role.id ? "Selected" : "Select this role"}
                  <ArrowRight className={`h-4 w-4 transition-transform ${
                    selectedRole === role.id ? "translate-x-1" : "group-hover:translate-x-1"
                  }`} />
                </div>
              </div>
            </motion.button>
          ))}

          {/* HQ Admin Card — only visible to master admin wallet */}
          {isHQAdmin && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => setSelectedRole("hq")}
              className={`group relative text-left rounded-2xl border p-8 transition-all md:col-span-2 ${
                selectedRole === "hq"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border/50 bg-card/50 hover:border-border hover:bg-card/80"
              }`}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 opacity-0 transition-opacity group-hover:opacity-100 ${selectedRole === "hq" ? "opacity-100" : ""}`} />
              <div className="relative">
                <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
                  selectedRole === "hq"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}>
                  <Shield className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold">HQ Admin</h3>
                <p className="mt-2 text-sm text-muted-foreground">Master oversight, institution verification, and registry control.</p>
                <ul className="mt-6 space-y-2">
                  {["Approve/reject institutions", "System-wide analytics", "Registry oversight", "Master admin controls"].map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileCheck className="h-4 w-4 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className={`mt-8 flex items-center gap-2 text-sm transition-colors ${
                  selectedRole === "hq" ? "text-primary" : "text-muted-foreground"
                }`}>
                  {selectedRole === "hq" ? "Selected" : "Select this role"}
                  <ArrowRight className={`h-4 w-4 transition-transform ${
                    selectedRole === "hq" ? "translate-x-1" : "group-hover:translate-x-1"
                  }`} />
                </div>
              </div>
            </motion.button>
          )}
        </motion.div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Button
            size="lg"
            disabled={!selectedRole || isLoading}
            onClick={handleContinue}
            className="gap-2 px-8 w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking Status...
              </>
            ) : selectedRole === 'institution' ? (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Sign in with Google
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="mt-6 text-xs text-muted-foreground">
            <Lock className="mr-1 inline h-3.5 w-3.5" />
            {selectedRole === 'institution' 
              ? "Sign in with Google — no wallet or gas fees required" 
              : selectedRole === 'hq'
              ? "Access restricted to master admin wallet"
              : "Your data is encrypted and secured on-chain"}
          </p>
        </motion.div>
      </main>
    </div>
  )
}

export default function RoleSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <RoleSelectContent />
    </Suspense>
  )
}
