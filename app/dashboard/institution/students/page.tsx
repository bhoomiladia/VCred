"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Search, GraduationCap, FileCheck, ExternalLink, Filter, Download, CheckCircle2, XCircle, RefreshCw, Plus } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CertificateTemplate } from "@/components/CertificateTemplate"
import { useReactToPrint } from "react-to-print"
import * as htmlToImage from "html-to-image"
import { useRef } from "react"
import { useUser } from "@/lib/user-context"

interface DegreeRecord {
  _id: string
  name: string
  rollNumber: string
  degreeTitle: string
  branch: string
  cgpa: number
  email: string
  batchId: string
  credentialHash?: string
  merkleRoot?: string
  institutionName?: string
  issuedAt: string
  revoked?: boolean
  status: "PENDING" | "MINTED"
}

export default function StudentRecordsPage() {
  const { user } = useUser()
  const [records, setRecords] = useState<DegreeRecord[]>([])
  const [batches, setBatches] = useState<string[]>([])
  const [branches, setBranches] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBatch, setFilterBatch] = useState("all")
  const [filterBranch, setFilterBranch] = useState("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "revoked" | "pending">("all")
  const [revoking, setRevoking] = useState<string | null>(null)
  const [previewRecord, setPreviewRecord] = useState<DegreeRecord | null>(null)
  const [printRecord, setPrintRecord] = useState<DegreeRecord | null>(null)

  const printRef = useRef<HTMLDivElement>(null)
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printRecord ? `${printRecord.rollNumber}_Certificate` : "VCred_Certificate",
  })

  const handleDownloadPdf = (record: DegreeRecord) => {
    setPrintRecord(record)
    setTimeout(() => {
      handlePrint()
    }, 100)
  }

  const handleDownloadJson = (record: DegreeRecord) => {
    const metadata = {
      name: record.name,
      rollNumber: record.rollNumber,
      degree: record.degreeTitle,
      branch: record.branch,
      cgpa: record.cgpa,
      credentialHash: record.credentialHash,
      issueDate: record.issuedAt,
      status: record.status,
      institutionName: record.institutionName
    };
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.credentialHash}-metadata.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleDownloadImage = (record: DegreeRecord) => {
    setPrintRecord(record);
    toast.info("Generating certificate image...");
    setTimeout(async () => {
      if (printRef.current) {
        try {
          const dataUrl = await htmlToImage.toPng(printRef.current, { quality: 0.95, pixelRatio: 2 });
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${record.credentialHash}-certificate.png`;
          a.click();
          toast.success("Image downloaded successfully!");
        } catch (err) {
          toast.error("Failed to generate image. Please try downloading PDF instead.");
        }
      }
    }, 500); // Wait 500ms for state and font rendering
  }

  // Single Add State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newStudent, setNewStudent] = useState({
    name: "", rollNumber: "", degreeTitle: "", branch: "", cgpa: "", email: "", batchId: ""
  })

  const fetchRecords = useCallback(async () => {
    if (!user?.walletAddress) return;
    setIsLoading(true)
    try {
      const res = await fetch(`/api/institution/students?walletAddress=${user.walletAddress}`)
      const data = await res.json()
      const recs = data.records || []
      setRecords(recs)
      setBatches(Array.from(new Set(recs.map((r: any) => r.batchId))).sort() as string[])
      setBranches(Array.from(new Set(recs.map((r: any) => r.branch))).sort() as string[])
    } catch (error) {
      toast.error("Failed to load student records")
    } finally {
      setIsLoading(false)
    }
  }, [user?.walletAddress])

  useEffect(() => { 
    if (user?.walletAddress) {
      fetchRecords() 
    }
  }, [fetchRecords, user?.walletAddress])

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.walletAddress) return
    setIsSubmitting(true)
    try {
      const payload = {
        students: [{
          ...newStudent,
          cgpa: parseFloat(newStudent.cgpa)
        }],
        institutionId: user.walletAddress
      }
      const res = await fetch('/api/institution/issue-bulk', { // Reusing bulk API for single insertion
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Failed to add student")
      }
      toast.success("Student added successfully!")
      setIsAddModalOpen(false)
      setNewStudent({ name: "", rollNumber: "", degreeTitle: "", branch: "", cgpa: "", email: "", batchId: "" })
      fetchRecords()
    } catch (error: any) {
      toast.error(error.message || "Failed to add student. Check your inputs.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevoke = async (record: DegreeRecord) => {
    const action = record.revoked ? 'activate' : 'revoke'
    setRevoking(record.credentialHash || null)
    try {
      const res = await fetch('/api/institution/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialHash: record.credentialHash, action })
      })
      if (!res.ok) throw new Error()
      toast.success(`Credential ${action === 'revoke' ? 'revoked' : 'reactivated'} successfully`)
      setRecords(prev => prev.map(r => 
        r.credentialHash === record.credentialHash ? { ...r, revoked: action === 'revoke' } : r
      ))
    } catch {
      toast.error("Action failed. Please try again.")
    } finally {
      setRevoking(null)
    }
  }

  const exportToCSV = () => {
    const filtered = getFilteredRecords()
    const headers = ["Name", "Roll Number", "Degree", "Branch", "CGPA", "Email", "Batch", "Credential Hash", "Status", "Issued At"]
    const rows = filtered.map(r => [
      r.name, r.rollNumber, r.degreeTitle, r.branch, r.cgpa.toString(),
      r.email, r.batchId, r.credentialHash || "Not Minted",
      r.status === "PENDING" ? "Pending" : (r.revoked ? "Revoked" : "Active"),
      new Date(r.issuedAt).toLocaleDateString()
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `student-records-${filterBatch === "all" ? "all-batches" : filterBatch}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Records exported as CSV!")
  }


  const getFilteredRecords = () => {
    return records.filter(r => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.branch.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesBatch = filterBatch === "all" || r.batchId === filterBatch
      const matchesBranch = filterBranch === "all" || r.branch === filterBranch
      const matchesStatus =
        filterStatus === "all" || 
        (filterStatus === "pending" ? r.status === "PENDING" : 
         (filterStatus === "active" ? r.status === "MINTED" && !r.revoked : 
          (filterStatus === "revoked" ? r.revoked : false)))
      return matchesSearch && matchesBatch && matchesBranch && matchesStatus
    })
  }

  const filteredRecords = getFilteredRecords()
  const pendingCount = records.filter(r => r.status === "PENDING").length
  const activeCount = records.filter(r => r.status === "MINTED" && !r.revoked).length
  const revokedCount = records.filter(r => r.revoked).length

  return (
    <>
      <DashboardHeader 
        title="Student Records" 
        description="Live database of issued credentials from all batches"
        userName="SR"
      />

      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-sm text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold">{records.length}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-sm text-muted-foreground">Pending Minting</p>
            <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-sm text-muted-foreground">Active Credentials</p>
            <p className="text-2xl font-bold text-purple-500">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-sm text-muted-foreground">Revoked</p>
            <p className="text-2xl font-bold text-destructive">{revokedCount}</p>
          </div>
        </div>

        {/* Filters Row 1 */}
        {(batches.length > 0 || branches.length > 0) && (
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mr-2">Batch:</span>
              <Button
                variant={filterBatch === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterBatch("all")}
              >All Batches</Button>
              {batches.map(batch => (
                <Button
                  key={`batch-${batch}`}
                  variant={filterBatch === batch ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterBatch(batch)}
                >{batch}</Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground opacity-0" />
              <span className="text-sm text-muted-foreground mr-2">Branch:</span>
              <Button
                variant={filterBranch === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterBranch("all")}
              >All Branches</Button>
              {branches.map(br => (
                <Button
                  key={`br-${br}`}
                  variant={filterBranch === br ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterBranch(br)}
                >{br}</Button>
              ))}
            </div>
          </div>
        )}

        {/* Search and Action Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, roll number, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-card/50 pl-10"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant={filterStatus === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("all")}>All Status</Button>
            <Button variant={filterStatus === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("pending")}>Pending</Button>
            <Button variant={filterStatus === "active" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("active")}>Active</Button>
            <Button variant={filterStatus === "revoked" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("revoked")}>Revoked</Button>
            
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-4 w-4" /> Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Single Student Record</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddStudent} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input required value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Roll Number</label>
                      <Input required value={newStudent.rollNumber} onChange={e => setNewStudent({...newStudent, rollNumber: e.target.value})} placeholder="CS2024-001" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input required type="email" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} placeholder="student@university.edu" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Degree</label>
                      <Input required value={newStudent.degreeTitle} onChange={e => setNewStudent({...newStudent, degreeTitle: e.target.value})} placeholder="B.Tech" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Branch</label>
                      <Input required value={newStudent.branch} onChange={e => setNewStudent({...newStudent, branch: e.target.value})} placeholder="Computer Science" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CGPA</label>
                      <Input required type="number" step="0.01" value={newStudent.cgpa} onChange={e => setNewStudent({...newStudent, cgpa: e.target.value})} placeholder="9.5" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Batch ID</label>
                      <Input required value={newStudent.batchId} onChange={e => setNewStudent({...newStudent, batchId: e.target.value})} placeholder="BATCH-2024" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
                    {isSubmitting ? "Adding..." : "Add Record"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" className="gap-2" onClick={exportToCSV}>
              <Download className="h-4 w-4" /> CSV
            </Button>

            <Button variant="ghost" size="sm" onClick={() => fetchRecords()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Records Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 bg-card/50 overflow-hidden"
        >
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/30">
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Degree / Branch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">CGPA</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Batch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Credential Hash</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredRecords.map(record => (
                    <tr key={record._id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                            {record.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{record.name}</p>
                            <p className="text-xs text-muted-foreground">{record.rollNumber}</p>
                            <p className="text-xs text-muted-foreground">{record.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium">{record.degreeTitle}</p>
                        <p className="text-xs text-muted-foreground">{record.branch}</p>
                        <p className="text-xs text-muted-foreground">{new Date(record.issuedAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold font-mono ${record.cgpa >= 8.5 ? 'text-purple-500' : record.cgpa >= 7 ? 'text-primary' : 'text-amber-500'}`}>
                          {record.cgpa}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">{record.batchId}</span>
                      </td>
                      <td className="px-6 py-4">
                        {record.status === "PENDING" ? (
                          <span className="text-xs text-muted-foreground italic">Not Minted</span>
                        ) : (
                          <code className="font-mono text-xs text-muted-foreground">
                            {record.credentialHash?.substring(0, 10)}...{record.credentialHash?.substring(record.credentialHash.length - 6)}
                          </code>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {record.status === "PENDING" ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className={record.revoked
                              ? "bg-destructive/10 text-destructive border-destructive/20" 
                              : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                            }
                          >
                            {record.revoked ? "Revoked" : "Active"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {record.status === "MINTED" && (
                            <>
                              {/* Revoke / Activate */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className={record.revoked ? "text-purple-500 hover:text-purple-600" : "text-destructive hover:text-destructive/80"}
                                disabled={revoking === record.credentialHash}
                                onClick={() => handleRevoke(record)}
                                title={record.revoked ? "Reactivate" : "Revoke"}
                              >
                                {revoking === record.credentialHash ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : record.revoked ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </Button>
                              <Button size="sm" variant="ghost" title="View Certificate Design" onClick={() => setPreviewRecord(record)}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" title="Download Export">
                                    <Download className="h-4 w-4 text-emerald-500" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleDownloadPdf(record)}>Download PDF</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadJson(record)}>Download JSON (Metadata)</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadImage(record)}>Download Certificate Image</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              
                              <Link href={`/verify/${record.credentialHash}`} target="_blank">
                                <Button size="sm" variant="ghost" title="Verify on Blockchain">
                                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                                </Button>
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!isLoading && filteredRecords.length === 0 && (
            <div className="p-12 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {records.length === 0 
                  ? "No records found. Run the Smart Issuance Engine to generate records." 
                  : "No records match your current filters."}
              </p>
            </div>
          )}
        </motion.div>

        <Dialog open={!!previewRecord} onOpenChange={(open) => !open && setPreviewRecord(null)}>
          <DialogContent className="max-w-[95vw] lg:max-w-[1000px] h-[90vh] p-0 border-none bg-zinc-950/90 backdrop-blur-xl overflow-hidden flex flex-col items-center">
            <DialogTitle className="sr-only">Certificate Preview</DialogTitle>
            <div className="w-full flex justify-between items-center p-4 border-b border-border/20 bg-card">
              <h3 className="font-semibold text-sm">Certificate Design Preview</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">A4 Official Format</p>
            </div>
            <div className="flex-1 w-full overflow-auto p-4 md:p-12 flex justify-center bg-zinc-950/50">
              {previewRecord && (
                <div className="shadow-2xl h-fit border border-zinc-800">
                  <CertificateTemplate
                    studentName={previewRecord.name}
                    rollNumber={previewRecord.rollNumber}
                    degreeTitle={previewRecord.degreeTitle}
                    branch={previewRecord.branch}
                    cgpa={previewRecord.cgpa}
                    issueDate={previewRecord.issuedAt}
                    credentialHash={previewRecord.credentialHash || ""}
                    merkleRoot={previewRecord.merkleRoot || ""}
                    institutionName={previewRecord.institutionName}
                    showHashes={false}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Off-screen render for ReactToPrint and htmlToImage */}
        <div className="absolute top-[-9999px] left-[-9999px]">
          <div ref={printRef}>
            {printRecord && (
              <CertificateTemplate
                studentName={printRecord.name}
                rollNumber={printRecord.rollNumber}
                degreeTitle={printRecord.degreeTitle}
                branch={printRecord.branch}
                cgpa={printRecord.cgpa}
                issueDate={printRecord.issuedAt}
                credentialHash={printRecord.credentialHash || ""}
                merkleRoot={printRecord.merkleRoot || ""}
                institutionName={printRecord.institutionName}
                showHashes={false}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

