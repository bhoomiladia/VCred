"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, CheckCircle2, XCircle, Clock, Search, ShieldCheck, Mail, IdCard, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Worker {
  _id: string
  name: string
  email: string
  rollNumber?: string
  branch?: string
  workerStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
  createdAt: string
}

export default function StaffManagement() {
  const { address } = useAccount()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (address) {
      fetchWorkers()
    }
  }, [address])

  const fetchWorkers = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/institution/workers?adminAddress=${address}`)
      const data = await res.json()
      if (data.workers) {
        setWorkers(data.workers)
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to load staff records")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (workerId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      setUpdatingId(workerId)
      const res = await fetch('/api/institution/workers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId, status, adminAddress: address })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Staff member ${status === 'VERIFIED' ? 'approved' : 'rejected'} successfully`)
        setWorkers(workers.map(w => w._id === workerId ? { ...w, workerStatus: status } : w))
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to update status")
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    w.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingCount = workers.filter(w => w.workerStatus === 'PENDING').length

  return (
    <div className="space-y-8 p-6 lg:p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage and verify access for your institution's workforce.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-500 border border-amber-500/20">
            {pendingCount} Pending Approvals
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50"
            />
          </div>
          <Button variant="outline" onClick={fetchWorkers} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-secondary/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Staff Member</th>
                  <th className="px-6 py-4">Employee ID</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading staff records...
                      </div>
                    </td>
                  </tr>
                ) : filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No staff records found.
                    </td>
                  </tr>
                ) : filteredWorkers.map((worker) => (
                  <tr key={worker._id} className="group hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {worker.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{worker.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {worker.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {worker.rollNumber || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{worker.branch || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
                        worker.workerStatus === 'VERIFIED' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        worker.workerStatus === 'REJECTED' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                        "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      )}>
                        {worker.workerStatus === 'VERIFIED' ? <CheckCircle2 className="h-3 w-3" /> :
                         worker.workerStatus === 'REJECTED' ? <XCircle className="h-3 w-3" /> :
                         <Clock className="h-3 w-3" />}
                        {worker.workerStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {worker.workerStatus === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 border-red-500/20 text-red-500 hover:bg-red-500/10"
                            onClick={() => handleUpdateStatus(worker._id, 'REJECTED')}
                            disabled={updatingId === worker._id}
                          >
                            Reject
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleUpdateStatus(worker._id, 'VERIFIED')}
                            disabled={updatingId === worker._id}
                          >
                            Approve
                          </Button>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground capitalize">
                          Processed
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg">Trusted Domain</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Staff members registering with your institution's email domain are automatically flagged for review. Ensure their Employee ID matches your internal records.
          </p>
        </div>
        
        <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
              <IdCard className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg">Access Levels</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Approved staff can issue credentials and process transcripts on behalf of the institution. Administrators retain exclusive rights to manage staff and settings.
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Building className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg">Institutional HQ</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Once your institution is VERIFIED by the HQ team, all your approved staff members will be granted full access to blockchain minting tools.
          </p>
        </div>
      </div>
    </div>
  )
}
