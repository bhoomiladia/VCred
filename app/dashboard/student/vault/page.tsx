"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FileCheck, CheckCircle2, Download, Share2, ExternalLink, Eye, Shield, GraduationCap } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

interface Credential {
  _id: string
  name: string
  rollNumber: string
  degreeTitle: string
  branch: string
  cgpa: number
  issuedAt: string
  credentialHash: string
  merkleRoot: string
  batchId: string
  status: string
  templateId?: string
  layoutConfig?: any
  revoked?: boolean
}

export default function VaultPage() {
  const router = useRouter()
  const { address } = useAccount()
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    if (address) {
      fetch(`/api/student/credentials?address=${address}`)
        .then(res => res.json())
        .then(data => {
            if (data.credentials) setCredentials(data.credentials)
        })
        .catch(() => toast.error("Failed to sync vault"))
        .finally(() => setIsLoading(false))
    }
  }, [address])

  return (
    <>
      <DashboardHeader 
        title="My Vault" 
        description="Your verified academic credentials"
        userName="AJ"
      />

      <div className="p-6">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>{credentials.length} verified credentials</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              List
            </Button>
          </div>
        </div>

        {/* Credentials Grid */}
        {viewMode === "grid" ? (
          <div className="grid gap-6 md:grid-cols-2">
            {credentials.map((cred, i) => (
              <motion.div
                key={cred._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Certificate Preview */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-secondary via-secondary/80 to-secondary/50 p-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.1),transparent)]" />
                  
                  <div className="relative h-full flex flex-col">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </div>
                    </div>

                    <div className="mt-auto">
                      <p className="text-lg font-semibold">{cred.degreeTitle}</p>
                      <p className="text-sm text-muted-foreground">{cred.branch}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cred.revoked ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}>
                            {cred.revoked ? "Revoked" : "Verified on Hub-Engine"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">ID: {cred.batchId}</span>
                        </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <code className="font-mono text-xs text-muted-foreground">{cred.rollNumber}</code>
                      <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cred.revoked ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}>
                            {cred.revoked ? "Revoked" : "Verified Record"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{new Date(cred.issuedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => setSelectedCredential(cred)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2" 
                        disabled={cred.revoked}
                        onClick={() => router.push(`/dashboard/student/share?id=${cred._id}`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Share
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
            <div className="divide-y divide-border/50">
              {credentials.map((cred, i) => (
                <motion.div
                  key={cred._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-6 hover:bg-secondary/20"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <FileCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{cred.degreeTitle}</p>
                      <p className="text-sm text-muted-foreground">{cred.branch}</p>
                      <p className="text-xs text-muted-foreground">Decentralized Institute</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        Verified
                      </div>
                      <code className="font-mono text-xs text-muted-foreground">{cred.rollNumber}</code>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => setSelectedCredential(cred)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Credential Detail Modal */}
      <Dialog open={!!selectedCredential} onOpenChange={() => setSelectedCredential(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Credential Details</DialogTitle>
          </DialogHeader>
          
          {selectedCredential && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{selectedCredential.degreeTitle}</p>
                    <p className="text-sm text-muted-foreground">{selectedCredential.branch}</p>
                    <p className="text-sm text-muted-foreground">Decentralized Institute</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Roll Number</p>
                  <code className="font-mono text-sm">{selectedCredential.rollNumber}</code>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Batch ID</p>
                  <p className="text-sm font-medium">{selectedCredential.batchId}</p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">CGPA</p>
                  <p className="text-sm font-medium">{selectedCredential.cgpa.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Issued</p>
                  <p className="text-sm font-medium">{new Date(selectedCredential.issuedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Merkle Root</p>
                <code className="mt-1 block truncate font-mono text-xs">{selectedCredential.merkleRoot}</code>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button className="flex-1 gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
