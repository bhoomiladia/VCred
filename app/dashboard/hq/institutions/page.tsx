"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, Search, Filter, CheckCircle2, XCircle, Clock, ExternalLink, MoreHorizontal, Shield } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type InstitutionStatus = "pending" | "verified" | "rejected"

interface Institution {
  id: number
  name: string
  type: string
  email: string
  submittedAt: string
  status: InstitutionStatus
  accreditationId?: string
  credentialsIssued?: number
}

const institutions: Institution[] = [
  {
    id: 1,
    name: "Harvard University",
    type: "University",
    email: "admin@harvard.edu",
    submittedAt: "2 hours ago",
    status: "pending"
  },
  {
    id: 2,
    name: "MIT",
    type: "University",
    email: "credentials@mit.edu",
    submittedAt: "5 hours ago",
    status: "pending"
  },
  {
    id: 3,
    name: "Stanford University",
    type: "University",
    email: "admin@stanford.edu",
    submittedAt: "2 days ago",
    status: "verified",
    accreditationId: "ACC-2024-001",
    credentialsIssued: 4521
  },
  {
    id: 4,
    name: "Yale University",
    type: "University",
    email: "credentials@yale.edu",
    submittedAt: "3 days ago",
    status: "verified",
    accreditationId: "ACC-2024-002",
    credentialsIssued: 3892
  },
  {
    id: 5,
    name: "Columbia University",
    type: "University",
    email: "admin@columbia.edu",
    submittedAt: "5 days ago",
    status: "verified",
    accreditationId: "ACC-2024-003",
    credentialsIssued: 2145
  },
  {
    id: 6,
    name: "Unknown Institute",
    type: "Vocational",
    email: "admin@unknown.edu",
    submittedAt: "1 week ago",
    status: "rejected"
  },
]

export default function InstitutionsPage() {
  const [filter, setFilter] = useState<"all" | InstitutionStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [institutionList, setInstitutionList] = useState(institutions)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const filteredInstitutions = institutionList.filter(inst => {
    const matchesFilter = filter === "all" || inst.status === filter
    const matchesSearch = inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         inst.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleApprove = async (id: number) => {
    setProcessingId(id)
    // Simulate on-chain verification
    await new Promise(resolve => setTimeout(resolve, 1500))
    setInstitutionList(prev => 
      prev.map(inst => 
        inst.id === id 
          ? { ...inst, status: "verified" as InstitutionStatus, accreditationId: `ACC-2024-${String(id).padStart(3, "0")}` }
          : inst
      )
    )
    setProcessingId(null)
  }

  const handleReject = async (id: number) => {
    setProcessingId(id)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setInstitutionList(prev => 
      prev.map(inst => 
        inst.id === id 
          ? { ...inst, status: "rejected" as InstitutionStatus }
          : inst
      )
    )
    setProcessingId(null)
  }

  const statusConfig = {
    pending: { label: "Pending", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
    verified: { label: "Verified", icon: CheckCircle2, className: "bg-primary/10 text-primary border-primary/20" },
    rejected: { label: "Rejected", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" }
  }

  const pendingCount = institutionList.filter(i => i.status === "pending").length
  const verifiedCount = institutionList.filter(i => i.status === "verified").length

  return (
    <>
      <DashboardHeader 
        title="Institution Management" 
        description="Review and verify institution applications"
        userName="SA"
      />

      <div className="p-6">
        {/* Stats Row */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-sm text-muted-foreground">Total Institutions</p>
            <p className="text-2xl font-bold">{institutionList.length}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-sm text-muted-foreground">Pending Review</p>
            <p className="text-2xl font-bold text-warning">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-sm text-muted-foreground">Verified</p>
            <p className="text-2xl font-bold text-primary">{verifiedCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search institutions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card/50 pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            {(["all", "pending", "verified", "rejected"] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {/* Institution List */}
        <motion.div 
          className="rounded-xl border border-border/50 bg-card/50 backdrop-blur overflow-hidden"
          layout
        >
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-border/50 bg-secondary/30 px-6 py-3 text-sm font-medium text-muted-foreground">
            <span>Institution</span>
            <span>Status</span>
            <span>Credentials</span>
            <span>Actions</span>
          </div>

          <AnimatePresence mode="popLayout">
            {filteredInstitutions.map((inst) => {
              const StatusIcon = statusConfig[inst.status].icon
              const isProcessing = processingId === inst.id

              return (
                <motion.div
                  key={inst.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border/50 px-6 py-4 last:border-0"
                >
                  {/* Institution Info */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{inst.name}</p>
                      <p className="text-sm text-muted-foreground">{inst.email}</p>
                      <p className="text-xs text-muted-foreground">{inst.type} • {inst.submittedAt}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <Badge variant="outline" className={statusConfig[inst.status].className}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusConfig[inst.status].label}
                    </Badge>
                    {inst.accreditationId && (
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{inst.accreditationId}</p>
                    )}
                  </div>

                  {/* Credentials */}
                  <div className="text-right">
                    {inst.credentialsIssued !== undefined ? (
                      <p className="font-medium">{inst.credentialsIssued.toLocaleString()}</p>
                    ) : (
                      <p className="text-muted-foreground">-</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {inst.status === "pending" && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReject(inst.id)}
                          disabled={isProcessing}
                        >
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleApprove(inst.id)}
                          disabled={isProcessing}
                          className="gap-2"
                        >
                          {isProcessing ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <Shield className="h-3 w-3" />
                              Approve
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    {inst.status === "verified" && (
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    {inst.status === "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => handleApprove(inst.id)} disabled={isProcessing}>
                        Reconsider
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {filteredInstitutions.length === 0 && (
            <div className="p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No institutions found</p>
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}
