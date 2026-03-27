"use client"

import { motion } from "framer-motion"
import { FileCheck, Users, TrendingUp, Clock, GraduationCap, ArrowRight, Activity, ShieldAlert } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useUser } from "@/lib/user-context"
import { useState, useEffect } from "react"
import { useReadContracts } from "wagmi"
import { VCredRegistryABI } from "@/lib/abi"
import { toast } from "sonner"
import { Server, CheckCircle2, Factory, Palette, BarChart3, PieChart as PieIcon, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"

export default function InstitutionDashboardPage() {
  const router = useRouter()
  const { user } = useUser()
  const [batches, setBatches] = useState<any[]>([])
  const [isLoadingBatches, setIsLoadingBatches] = useState(true)
  const [publishingBatchId, setPublishingBatchId] = useState<string | null>(null)
  const [mintingBatchId, setMintingBatchId] = useState<string | null>(null)
  const [publishedBatches, setPublishedBatches] = useState<Set<string>>(new Set())

  const [recentCredentials, setRecentCredentials] = useState<any[]>([])
  const [isLoadingRecent, setIsLoadingRecent] = useState(true)

  const pendingBatches = batches.filter(b => b.status === "PENDING")
  const mintedBatches = batches.filter(b => b.status === "MINTED")

  // Derive dynamic stats
  const totalCredentials = batches.reduce((acc, b) => b.status === "MINTED" ? acc + b.studentCount : acc, 0)
  const activeStudents = batches.reduce((acc, b) => acc + b.studentCount, 0)
  const pendingMints = pendingBatches.length
  
  const stats = [
    { 
      label: "Total Credentials", 
      value: totalCredentials.toLocaleString(), 
      change: totalCredentials > 0 ? `${mintedBatches.length} Batches Issued` : "No credentials issued yet", 
      icon: FileCheck,
    },
    { 
      label: "Active Students", 
      value: activeStudents.toLocaleString(), 
      change: activeStudents > 0 ? "Records tracked" : "Awaiting student registrations", 
      icon: Users,
    },
    { 
      label: "Verification Rate", 
      value: "0%", 
      change: "0 verifications tracked", 
      icon: TrendingUp,
    },
    { 
      label: "Pending Mints", 
      value: pendingMints.toString(), 
      change: pendingMints > 0 ? `${pendingMints} Batches Ready` : "Queue is empty", 
      icon: Clock,
    },
  ]

  const isAdmin = user?.walletAddress?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

  const quickActions = [
    { 
      title: "Create Credential", 
      description: "Issue new credentials with AI processing", 
      href: "/dashboard/institution/upload",
      icon: FileCheck
    },
    { 
      title: "Student Records", 
      description: "Browse and manage student database", 
      href: "/dashboard/institution/students",
      icon: GraduationCap
    },
    ...(isAdmin ? [{
      title: "HQ Admin Portal", 
      description: "Manage institutions & platform overview", 
      href: "/dashboard/hq",
      icon: ShieldAlert
    }] : [])
  ]

  // Prepare chart data from batches
  const activityData = mintedBatches.slice(0, 6).reverse().map(b => ({
    name: new Date(b.issuedAt).toLocaleDateString(undefined, { month: 'short' }),
    count: b.studentCount
  }))

  const totalBatches = batches.length
  const healthData = [
    { name: 'Minted', value: totalBatches > 0 ? Math.round((mintedBatches.length / totalBatches) * 100) : 0, color: '#10b981' },
    { name: 'Pending', value: totalBatches > 0 ? Math.round((pendingBatches.length / totalBatches) * 100) : 0, color: '#f59e0b' },
  ]

  // Check the blockchain for published roots (read-only — no wallet needed)
  const { data: batchRootsData, refetch: refetchRoots } = useReadContracts({
    contracts: mintedBatches.map(b => ({
      address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
      abi: VCredRegistryABI,
      functionName: 'processedBatches',
      args: [b.merkleRoot as `0x${string}`]
    }))
  })

  useEffect(() => {
    if (user?.walletAddress) {
      fetchBatches()
      fetchRecent()
    }
  }, [user?.walletAddress])

  const fetchRecent = async () => {
    if (!user?.walletAddress) return;
    try {
      const res = await fetch(`/api/institution/students?walletAddress=${user.walletAddress}`)
      if (res.ok) {
        const data = await res.json()
        setRecentCredentials(data.records.slice(0, 5))
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingRecent(false)
    }
  }

  const syncPublishStatus = async (batchId: string, hash: string) => {
    try {
      await fetch("/api/institution/mark-published", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, txHash: hash, institutionId: user?.walletAddress })
      })
      fetchBatches() // refresh local data
    } catch (error) {
      console.error("Failed to sync publish status:", error)
    }
  }

  const fetchBatches = async () => {
    if (!user?.walletAddress) return;
    try {
      const res = await fetch(`/api/institution/batches?walletAddress=${user.walletAddress}`)
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingBatches(false)
    }
  }

  const handleMintBatch = async (batchId: string) => {
    // Check if template is set for this batch
    const batch = batches.find(b => b.batchId === batchId)
    if (!batch?.templateId) {
      toast.warning("Please configure the certificate design before minting.")
      router.push(`/dashboard/institution/select-template?batchId=${batchId}`)
      return
    }

    setMintingBatchId(batchId)
    try {
      const res = await fetch('/api/institution/mint-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        fetchBatches() // refresh to move to published
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Failed to mint batch')
    } finally {
      setMintingBatchId(null)
    }
  }

  /**
   * Publish batch to blockchain via server-side API.
   * No MetaMask or wallet needed — the server signs with the deployer key.
   */
  const handlePublishBatch = async (batchId: string, root: string) => {
    if (publishingBatchId) {
      toast.warning("Please wait for the current transaction to complete before publishing another batch.")
      return
    }

    setPublishingBatchId(batchId)
    toast.info(`Publishing "${batchId}" to Ethereum... This may take a moment.`)

    try {
      const res = await fetch('/api/institution/publish-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, merkleRoot: root })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success(`Batch "${batchId}" successfully anchored to Ethereum!`)
        setPublishedBatches(prev => new Set([...prev, batchId]))
        syncPublishStatus(batchId, data.txHash)
        refetchRoots()
      } else {
        toast.error(data.error || 'Failed to publish batch')
      }
    } catch (error: any) {
      toast.error('Failed to publish batch: ' + (error.message || 'Unknown error'))
    } finally {
      setPublishingBatchId(null)
    }
  }

  if (user?.subRole === 'admin' && user?.verificationStatus === 'PENDING') {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="mb-6 rounded-3xl bg-amber-500/10 p-8 text-amber-500 ring-1 ring-amber-500/20 shadow-[0_0_40px_-10px_rgba(245,158,11,0.2)]">
          <ShieldAlert className="h-16 w-16" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Pending HQ Approval</h2>
        <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
          Your institution profile is securely logged and currently under review by VCred HQ.
          <br/><br/>
          Full issuance capabilities will unlock automatically once your official domain is verified.
        </p>
      </div>
    )
  }

  return (
    <>
      <DashboardHeader 
        title="Institution Dashboard" 
        description={user?.institutionName || "Verified Institution"}
        userName={user?.institutionName?.substring(0, 2).toUpperCase() || "IN"}
      />

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
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
                <p className="mt-1 text-xs text-primary">{stat.change}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Link href={action.href} className="group block">
                <div className="rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur transition-all hover:border-primary/50 hover:bg-card/80">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{action.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Recent Credentials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 rounded-xl border border-border/50 bg-card/50 backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-border/50 p-6">
            <div>
              <h2 className="font-semibold">Recent Credentials</h2>
              <p className="text-sm text-muted-foreground">Latest issued certificates</p>
            </div>
            <Link href="/dashboard/institution/students">
              <Button variant="outline" size="sm" className="gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="divide-y divide-border/50">
            {recentCredentials.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No credentials have been issued yet.
              </div>
            ) : (
              recentCredentials.map((cred) => (
                <div key={cred._id} className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{cred.name}</p>
                      <p className="text-xs text-muted-foreground tracking-tight">{cred.degreeTitle}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                       <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        cred.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        cred.status === 'MINTED' ? 'bg-primary/10 text-primary border-primary/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                       )}>
                        {cred.status}
                       </span>
                       <p className="font-mono text-xs text-muted-foreground">{cred.rollNumber}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">{new Date(cred.issuedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Pending Mints */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.65 }}
           className="mt-8 rounded-xl border border-border/50 bg-card/50 backdrop-blur"
         >
           <div className="flex items-center justify-between border-b border-border/50 p-6">
             <div className="flex items-center gap-3">
               <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
                 <Factory className="h-5 w-5" />
               </div>
               <div>
                 <h3 className="font-semibold">Pending Mints (Ready to Generate)</h3>
                 <p className="text-sm text-muted-foreground">Compute Merkle Trees for newly uploaded records</p>
               </div>
             </div>
           </div>
           <div className="p-6">
             {isLoadingBatches ? (
               <div className="flex justify-center p-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"/></div>
             ) : pendingBatches.length === 0 ? (
               <div className="text-center text-sm text-muted-foreground">No pending batches ready to mint.</div>
             ) : (
               <div className="space-y-4">
                 {pendingBatches.map((batch) => (
                   <div key={batch.batchId} className="flex flex-col md:flex-row items-center justify-between rounded-lg border border-border/50 p-4 gap-4">
                     <div>
                       <p className="font-mono font-medium text-sm">{batch.batchId}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">{batch.studentCount} Students</span>
                          <span className="text-xs text-muted-foreground">Uploaded: {new Date(batch.issuedAt).toLocaleDateString()}</span>
                          {!batch.templateId && <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">Design Required</Badge>}
                        </div>
                     </div>
                     <Button 
                       onClick={() => handleMintBatch(batch.batchId)}
                       disabled={!!mintingBatchId}
                       className="w-full md:w-auto gap-2 disabled:opacity-50"
                     >
                        {mintingBatchId === batch.batchId ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : !batch.templateId ? (
                          <Palette className="h-4 w-4" />
                        ) : (
                          <FileCheck className="h-4 w-4" />
                        )}
                        {mintingBatchId === batch.batchId ? "Minting..." : !batch.templateId ? "Configure Design" : "Mint Certificates"}
                     </Button>
                   </div>
                 ))}
               </div>
             )}
           </div>
         </motion.div>

        {/* Blockchain Publishing Console */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 rounded-xl border border-border/50 bg-card/50 backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-border/50 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Generated Batches (Blockchain Publishing)</h3>
                <p className="text-sm text-muted-foreground">Anchor cryptographic Merkle roots to Sepolia — gas is sponsored automatically</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {isLoadingBatches ? (
              <div className="flex justify-center p-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"/></div>
            ) : mintedBatches.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground">No minted batches available. Mint a pending batch first.</div>
            ) : (
              <div className="space-y-4">
                {mintedBatches.map((batch, index) => {
                  const isPublishedOnChain = Boolean(batchRootsData?.[index]?.result);
                  const isPublished = batch.isPublished || isPublishedOnChain || publishedBatches.has(batch.batchId);

                  return (
                    <div key={batch.batchId} className="flex flex-col md:flex-row items-center justify-between rounded-lg border border-border/50 p-4 gap-4">
                      <div>
                        <p className="font-mono font-medium text-sm">{batch.batchId}</p>
                        <p className="text-xs text-muted-foreground mt-1 break-all">Root: {batch.merkleRoot}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">{batch.studentCount} Students</span>
                          <span className="text-xs text-muted-foreground">{new Date(batch.issuedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {isPublished ? (
                        <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium bg-emerald-500/10 px-4 py-2 rounded-lg">
                          <CheckCircle2 className="h-4 w-4" />
                          Published on Ethereum
                        </div>
                      ) : (
                        <Button 
                          onClick={() => handlePublishBatch(batch.batchId, batch.merkleRoot)}
                          disabled={!!publishingBatchId}
                          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-2 disabled:opacity-50"
                        >
                          {publishingBatchId === batch.batchId ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          {publishingBatchId === batch.batchId 
                            ? "Publishing..." 
                            : "Publish to Blockchain"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}
