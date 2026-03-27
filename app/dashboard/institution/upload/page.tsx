"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, AlertCircle, Loader2, ArrowRight } from "lucide-react"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useUser } from "@/lib/user-context"
import { useRouter } from "next/navigation"

interface CsvRow {
  name: string
  rollNumber: string
  degreeTitle: string
  branch: string
  cgpa: number
  email: string
  batchId: string
}

interface ValidatedRow extends CsvRow {
  _status: "valid" | "invalid_cgpa" | "missing_fields"
}

export default function BulkUploadPage() {
  const router = useRouter()
  const { user } = useUser()
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<ValidatedRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadMode, setUploadMode] = useState<"targeted" | "auto">("targeted")
  const [batchYear, setBatchYear] = useState("2026")
  const [branch, setBranch] = useState("CSE")
  const [batchGroup, setBatchGroup] = useState("01")
  const computedBatchId = `${batchYear}-${branch}-${batchGroup}`

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    if (!selectedFile) return
    
    const validExtensions = [".csv", ".xlsx", ".xls"]
    const hasValidExtension = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext))

    if (!hasValidExtension) {
      toast.error("Please upload a valid CSV or Excel file")
      return
    }

    setFile(selectedFile)
    setIsProcessing(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        const parsed = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[]
        const validated: ValidatedRow[] = parsed.map(row => {
          const rowBatchId = row.batchId || row.BatchID || row.Batch || ""
          const mapped: CsvRow = {
            name: row.name || row.Name || "",
            rollNumber: row.rollNumber || row.RollNumber || row.Roll || "",
            degreeTitle: row.degreeTitle || row.Degree || "B.Tech",
            branch: row.branch || row.Branch || branch,
            cgpa: parseFloat(row.cgpa || row.CGPA || "0"),
            email: row.email || row.Email || "",
            batchId: uploadMode === "targeted" ? computedBatchId : rowBatchId
          }

          let status: ValidatedRow["_status"] = "valid"
          
          if (!mapped.name || !mapped.rollNumber || !mapped.degreeTitle || !mapped.batchId) {
            status = "missing_fields"
          } else if (mapped.cgpa < 6.0) {
            status = "invalid_cgpa"
          }

          return { ...mapped, _status: status }
        })

        setData(validated)
        setIsProcessing(false)
      } catch (error: any) {
        toast.error("Failed to parse file: " + error.message)
        setIsProcessing(false)
      }
    }
    reader.onerror = () => {
      toast.error("Failed to read file")
      setIsProcessing(false)
    }
    
    reader.readAsBinaryString(selectedFile)
  }, [uploadMode, computedBatchId, branch])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"]
    },
    maxFiles: 1
  })

  const validCount = data.filter(r => r._status === "valid").length
  const invalidCgpaCount = data.filter(r => r._status === "invalid_cgpa").length
  const missingCount = data.filter(r => r._status === "missing_fields").length

  const handleIssueBatch = async () => {
    const payload = data.filter(r => r._status !== "missing_fields").map(({ _status, ...rest }) => rest)
    if (payload.length === 0) {
      toast.error("No valid students found in the file.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/institution/issue-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          students: payload.map(s => ({ ...s, institutionName: user?.institutionName || "Verified Institution" })),
          institutionId: user?.walletAddress
        })
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error)

      toast.success(result.message)
      
      // Intelligent Redirect
      const uniqueBatches = Array.from(new Set(payload.map(s => s.batchId)))
      
      if (uniqueBatches.length > 1) {
        // Many batches: Go to dashboard to see the list
        router.push(`/dashboard/institution?tab=mint`)
      } else {
        // Single batch: Go straight to design
        router.push(`/dashboard/institution/select-template?batchId=${uniqueBatches[0]}`)
      }
      
    } catch (error: any) {
      toast.error(error.message || "Failed to process batches")
      setIsSubmitting(false)
    }
  }

  const resetUpload = () => {
    setFile(null)
    setData([])
  }

  return (
    <>
      <DashboardHeader 
        title="Smart Issuance Bulk Upload" 
        description="Upload student data, auto-batch by year, and generate Merkle Trees securely."
        userName="Admin"
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        
        {/* Mode Selection */}
        {!file && (
          <div className="flex justify-center mb-8">
            <div className="flex bg-muted p-1 rounded-xl border border-border/50">
              <button 
                onClick={() => setUploadMode("targeted")}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${uploadMode === "targeted" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
              >
                Individual Batch
              </button>
              <button 
                onClick={() => setUploadMode("auto")}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${uploadMode === "auto" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
              >
                Full Master CSV
              </button>
            </div>
          </div>
        )}

        {/* Upload Config */}
        {!file && uploadMode === "targeted" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-card border border-border/50 rounded-2xl p-6 mt-8 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Admission Year</label>
              <Input className="bg-background" value={batchYear} onChange={(e: any) => setBatchYear(e.target.value)} placeholder="e.g. 2026" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Branch</label>
              <select 
                value={branch} 
                onChange={(e: any) => setBranch(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="CSE">Computer Science (CSE)</option>
                <option value="IT">Information Tech (IT)</option>
                <option value="ECE">Electronics (ECE)</option>
                <option value="AIML">AI & ML (AIML)</option>
                <option value="MECH">Mechanical (MECH)</option>
                <option value="CIVIL">Civil Engineering</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Batch Group / Section</label>
              <Input className="bg-background" value={batchGroup} onChange={(e: any) => setBatchGroup(e.target.value)} placeholder="e.g. 01, A" />
            </div>
          </div>
        )}

        {/* Upload Zone */}
        {!file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            {...(getRootProps() as any)}
            className={`
              relative overflow-hidden rounded-2xl border-2 border-dashed p-12
              transition-colors duration-200 ease-in-out cursor-pointer text-center
              ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"}
            `}
          >
            <input {...getInputProps()} />
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
              <Upload className={`h-10 w-10 ${isDragActive ? "text-primary animate-bounce" : "text-muted-foreground"}`} />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {isDragActive ? "Drop your file here" : "Drag & drop your student data file (.csv, .xlsx)"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Ensure your file has the following columns: name, rollNumber, degreeTitle, branch, cgpa, email, batchId
            </p>
            <Button variant="secondary" className="pointer-events-none">Select File</Button>
          </motion.div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="font-medium">Synthesizing data blocks...</p>
          </div>
        )}

        {/* Results Preview */}
        {!isProcessing && file && data.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <FileSpreadsheet className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold">{file.name}</h3>
                  <p className="text-sm text-muted-foreground">{data.length} total rows parsed</p>
                </div>
              </div>
              <Button variant="outline" onClick={resetUpload} disabled={isSubmitting}>Change File</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-xl p-4 bg-emerald-500/5 border-emerald-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-emerald-500 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Ready for Issuance
                  </span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">{validCount}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Students meeting the 6.0 CGPA requirement.</p>
              </div>
              
              <div className="border rounded-xl p-4 bg-amber-500/5 border-amber-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-amber-500 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Failed Criteria
                  </span>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500">{invalidCgpaCount}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Students with CGPA below 6.0. Will be skipped.</p>
              </div>

              <div className="border rounded-xl p-4 bg-destructive/5 border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Corrupted Data
                  </span>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive">{missingCount}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Missing critical fields (Name, Roll, Batch).</p>
              </div>
            </div>

            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm text-left relative">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Roll Number</th>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Batch</th>
                      <th className="px-6 py-3">CGPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.slice(0, 100).map((row, i) => (
                      <tr key={i} className={`
                        ${row._status === 'valid' ? 'hover:bg-secondary/20' : ''}
                        ${row._status === 'invalid_cgpa' ? 'bg-amber-500/5 text-amber-500/90' : ''}
                        ${row._status === 'missing_fields' ? 'bg-destructive/5 text-destructive/90' : ''}
                      `}>
                        <td className="px-6 py-3">
                          {row._status === 'valid' && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Valid</Badge>}
                          {row._status === 'invalid_cgpa' && <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Low CGPA</Badge>}
                          {row._status === 'missing_fields' && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Missing Data</Badge>}
                        </td>
                        <td className="px-6 py-3 font-mono">{row.rollNumber || "—"}</td>
                        <td className="px-6 py-3 font-medium">{row.name || "—"}</td>
                        <td className="px-6 py-3"><Badge variant="secondary">{row.batchId || "—"}</Badge></td>
                        <td className="px-6 py-3 font-mono font-bold">{row.cgpa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.length > 100 && (
                <div className="p-3 text-center text-xs text-muted-foreground bg-secondary/20 border-t border-border/50">
                  Showing first 100 rows. {data.length - 100} more rows not displayed.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button size="lg" className="w-full sm:w-auto gap-2 group" onClick={handleIssueBatch} disabled={isSubmitting || (validCount + invalidCgpaCount) === 0}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading Records...
                  </>
                ) : (
                  <>
                    Upload {validCount + invalidCgpaCount} Student Records into Database
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>

          </motion.div>
        )}
      </div>
    </>
  )
}
