"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Shield, CheckCircle2, XCircle, Building2, MapPin, Link as LinkIcon, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"

interface PendingInstitution {
  _id: string;
  institutionName: string;
  officialEmailDomain: string;
  location: string;
  website: string;
  isGovtRegistered: boolean;
  walletAddress: string;
}

export default function HQDashboardPage() {
  const [institutions, setInstitutions] = useState<PendingInstitution[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPendingInstitutions()
  }, [])

  const fetchPendingInstitutions = async () => {
    try {
      const res = await fetch("/api/admin/pending-institutions")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setInstitutions(data.institutions)
    } catch (error) {
      toast.error("Error loading pending verifications")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerification = async (userId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch("/api/admin/verify-institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action })
      })

      if (!res.ok) throw new Error("Failed to update status")

      toast.success(`Institution successfully ${action.toLowerCase()}d!`)
      // Refresh list
      setInstitutions(prev => prev.filter(inst => inst._id !== userId))
    } catch (error) {
      toast.error("Action failed. Please try again.")
    }
  }

  return (
    <>
      <DashboardHeader 
        title="HQ Control Center" 
        description="Master oversight and registry verification portal"
        userName="HQ"
      />

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Pending Verifications
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Review and authenticate new institutions applying for registry access.</p>
          </div>
          <div className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary shadow-sm">
            {institutions.length} Pending
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : institutions.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card/50 p-12 text-center backdrop-blur">
            <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">All caught up!</h3>
            <p className="text-sm text-muted-foreground mt-1">There are no institutions pending verification at this time.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {institutions.map((inst, i) => (
              <motion.div
                key={inst._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-xl border border-border/50 bg-card p-6 shadow-sm transition-all hover:border-primary/50"
              >
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{inst.institutionName}</h3>
                      {inst.isGovtRegistered && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
                          Govt Registered
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {inst.officialEmailDomain}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {inst.location || "No location provided"}
                    </span>
                    {inst.website && (
                      <a href={inst.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                        <LinkIcon className="h-4 w-4" />
                        {inst.website}
                      </a>
                    )}
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <AlertCircle className="h-4 w-4" />
                      {inst.walletAddress}
                    </span>
                  </div>
                </div>

                <div className="flex w-full md:w-auto items-center gap-3 border-t md:border-t-0 border-border/50 pt-4 md:pt-0">
                  <Button 
                    variant="outline" 
                    className="flex-1 md:flex-none gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                    onClick={() => handleVerification(inst._id, 'REJECT')}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button 
                    className="flex-1 md:flex-none gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                    onClick={() => handleVerification(inst._id, 'APPROVE')}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
