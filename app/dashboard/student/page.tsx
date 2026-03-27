"use client"

import { motion } from "framer-motion"
import { FileCheck, Eye, Share2, Shield, ArrowRight, Clock, CheckCircle2, XCircle } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useUser } from "@/lib/user-context"
import { useAccount } from "wagmi"
import { useRef, useState, useEffect } from "react"
import { useReactToPrint } from "react-to-print"
import { CertificatePreview } from "@/components/CertificatePreview"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"

const VerificationBadge = ({ cred }: { cred: any }) => {
  if (cred.revoked) {
    return (
      <div className="flex items-center gap-1 text-sm text-red-500 font-medium bg-red-500/10 px-2 py-1 rounded-md">
        <XCircle className="h-4 w-4" />
        Officially Revoked
      </div>
    )
  }

  if (cred.isClaimed) {
    return (
      <div className="flex items-center gap-1 text-sm text-emerald-500 font-medium bg-emerald-500/10 px-2 py-1 rounded-md">
        <CheckCircle2 className="h-4 w-4" />
        Soulbound on Ethereum
      </div>
    )
  }

  if (cred.isPublished || cred.status === "MINTED") {
    return (
      <div className="flex items-center gap-1 text-sm text-emerald-500 font-medium bg-emerald-500/10 px-2 py-1 rounded-md">
        <CheckCircle2 className="h-4 w-4" />
        Verified on Chain
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-sm text-amber-500 font-medium bg-amber-500/10 px-2 py-1 rounded-md">
      <Clock className="h-4 w-4" />
      Pending Publish
    </div>
  );
}

const stats = [
  { 
    label: "Total Credentials", 
    value: "0", 
    icon: FileCheck,
  },
  { 
    label: "Verification Views", 
    value: "0", 
    icon: Eye,
  },
  { 
    label: "Active Shares", 
    value: "0", 
    icon: Share2,
  },
]

const credentials: any[] = []

const recentActivity: any[] = []

export default function StudentDashboardPage() {
  const { user } = useUser()
  const { address } = useAccount()
  const [credentials, setCredentials] = useState<any[]>([])
  const [isLoadingCreds, setIsLoadingCreds] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const printRef = useRef<HTMLDivElement>(null)
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "VCred_Certificate",
  })

  const fetchCredentials = () => {
    if (address) {
      fetch(`/api/student/credentials?address=${address}`)
        .then(res => res.json())
        .then(data => setCredentials(data.credentials || []))
        .catch(err => console.error(err))
        .finally(() => setIsLoadingCreds(false))
    }
  }

  useEffect(() => {
    fetchCredentials()
  }, [address])

  const handleClaimNft = async (degreeId: string) => {
    if (!address) return toast.error("Connect wallet to claim");
    setClaimingId(degreeId)
    const toastId = toast.loading("Minting NFT to your wallet... Please wait.")
    try {
      const res = await fetch('/api/student/claim-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ degreeId, address })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("NFT Successfully claimed!", { id: toastId })
        fetchCredentials() // refresh to show claimed status
      } else {
        toast.error(data.error || "Failed to claim NFT", { id: toastId })
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to claim NFT", { id: toastId })
    } finally {
      setClaimingId(null)
    }
  }

  // Check if a credential is ready for NFT claim
  const canClaimNft = (cred: any) => {
    return cred.isPublished || cred.status === "MINTED";
  }

  // Update dynamic stats
  const dynamicStats = [
    { label: "Total Credentials", value: credentials.length.toString(), icon: FileCheck },
    ...stats.slice(1)
  ]

  return (
    <>
      <DashboardHeader 
        title="My Dashboard" 
        description="Manage your academic credentials"
        userName={user?.name?.substring(0, 2).toUpperCase() || "ST"}
      />

      <div className="p-6">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">Welcome back, {user?.name?.split(" ")[0] || "Student"}!</h2>
              <p className="mt-1 text-muted-foreground">
                Your credentials are secure and verified on-chain.
              </p>
            </div>
            <div className="rounded-xl bg-primary/20 p-3">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Link href="/dashboard/student/vault">
              <Button size="sm">View My Vault</Button>
            </Link>
            <Link href="/dashboard/student/share">
              <Button size="sm" variant="outline">Share Credentials</Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {dynamicStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-primary/10 p-2">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Credentials Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50 backdrop-blur"
          >
            <div className="flex items-center justify-between border-b border-border/50 p-6">
              <div>
                <h2 className="font-semibold">My Credentials</h2>
                <p className="text-sm text-muted-foreground">Your verified academic records</p>
              </div>
              <Link href="/dashboard/student/vault">
                <Button variant="outline" size="sm" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="divide-y divide-border/50">
              {isLoadingCreds ? (
                <div className="flex justify-center p-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"/></div>
              ) : credentials.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No credentials available yet.
                </div>
              ) : (
                credentials.map((cred) => (
                <div key={cred._id} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-6 gap-4 ${cred.revoked ? 'opacity-60 saturate-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <FileCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{cred.degreeTitle}</p>
                      <p className="text-sm text-muted-foreground">{cred.branch}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">ID: {cred.credentialHash?.substring(0, 10)}...</p>
                    </div>
                  </div>
                  <div className="text-left md:text-right flex flex-col md:items-end gap-2">
                    <VerificationBadge cred={cred} />
                    <p className="text-xs text-muted-foreground mb-2">Issued: {new Date(cred.issuedAt).toLocaleDateString()}</p>
                    
                    <div className="flex flex-col md:flex-row gap-2 w-full">
                      {cred.isClaimed ? (
                        <div className="flex flex-col gap-1 w-full md:w-auto">
                          <Button size="sm" variant="secondary" className="w-full text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-none border border-emerald-500/20" disabled>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Claimed to Wallet
                          </Button>
                          <a 
                            href={`https://sepolia.etherscan.io/tx/${cred.mintTxHash}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] text-muted-foreground hover:text-primary text-right md:text-center underline"
                          >
                            View on Etherscan
                          </a>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleClaimNft(cred._id)} 
                          disabled={claimingId === cred._id || !canClaimNft(cred)}
                          className="w-full md:w-auto gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                        >
                          {claimingId === cred._id ? (
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent"/> 
                              Minting...
                            </div>
                          ) : (
                            "Claim NFT to Wallet"
                          )}
                        </Button>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="w-full md:w-auto">View Details</Button>
                        </DialogTrigger>
                      <DialogContent className="max-w-[90vw] md:max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900/40 backdrop-blur-xl border-border/50">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold">Digital Academic Credential</DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-between items-center mb-6">
                          <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Verified on VCred</p>
                          <Button onClick={() => handlePrint()} className="gap-2 shadow-lg shadow-primary/20">
                            Download Official PDF
                          </Button>
                        </div>
                        {/* Wrapper for the certificate itself, ref attached for printing */}
                        <div className="flex justify-center items-start overflow-auto p-4 md:p-8 bg-zinc-950/50 rounded-2xl border border-white/5">
                          <div className="origin-top scale-[0.45] sm:scale-[0.55] md:scale-[0.75] transition-all duration-500 shadow-2xl">
                            <CertificatePreview
                              ref={printRef}
                              templateId={cred.templateId || 'modern'}
                              studentData={{
                                ...cred,
                                issuedAt: cred.issuedAt
                              }}
                              layoutConfig={cred.layoutConfig}
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border border-border/50 bg-card/50 backdrop-blur"
          >
            <div className="border-b border-border/50 p-6">
              <h2 className="font-semibold">Recent Activity</h2>
              <p className="text-sm text-muted-foreground">Verification and sharing events</p>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {recentActivity.length === 0 ? (
                  <div className="text-sm text-center text-muted-foreground">
                    No recent activity.
                  </div>
                ) : (
                  recentActivity.map((activity, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      {i < recentActivity.length - 1 && (
                        <div className="mt-1 h-full w-px bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm">{activity.action}</p>
                      <p className="text-sm font-medium text-primary">
                        {activity.by || activity.for}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  )
}
