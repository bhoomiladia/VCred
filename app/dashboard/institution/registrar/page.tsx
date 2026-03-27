"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload, CheckCircle2, AlertTriangle, ScanLine, Loader2,
  ArrowRight, ArrowLeft, RefreshCw, Download, Shield, Eye,
  FileImage, Zap, AlertCircle, X
} from "lucide-react"
import { useDropzone } from "react-dropzone"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useUser } from "@/lib/user-context"

// ── Types ─────────────────────────────────────────────────────────────────────

interface OcrRowResult {
  filename: string
  name: string
  rollNumber: string
  cgpa: number
  confidence: number
  filterUsed: string
  needsReview: boolean
  attempts: number
  dbMatch?: {
    found: boolean
    matchesName?: boolean
    matchesCgpa?: boolean
    existingRecord?: {
      name: string
      rollNumber: string
      cgpa: number
      batchId: string
    }
  }
}

interface GeneratedCertificate {
  name: string
  rollNumber: string
  certificateBase64: string
  credentialHash: string
}

type Step = "upload" | "ocr" | "validate" | "generate" | "mint"

// ── Component ─────────────────────────────────────────────────────────────────

export default function RegistrarPage() {
  const { user } = useUser()
  const [step, setStep] = useState<Step>("upload")
  const [files, setFiles] = useState<File[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [ocrResults, setOcrResults] = useState<OcrRowResult[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [certificates, setCertificates] = useState<GeneratedCertificate[]>([])
  const [isMinting, setIsMinting] = useState(false)
  const [mintResult, setMintResult] = useState<{ merkleRoot: string; studentCount: number } | null>(null)
  const [batchId, setBatchId] = useState("")
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // ── Step 1: File Upload ───────────────────────────────────────────────────

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(f =>
      f.type.startsWith("image/") || f.type === "application/pdf"
    )
    if (imageFiles.length === 0) {
      toast.error("Please upload image files (PNG, JPG, TIFF) or PDFs")
      return
    }
    setFiles(prev => [...prev, ...imageFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"],
      "application/pdf": [".pdf"],
    },
    multiple: true,
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // ── Step 2: Run OCR ───────────────────────────────────────────────────────

  const handleRunOcr = async () => {
    if (files.length === 0) return
    setIsScanning(true)

    try {
      const formData = new FormData()
      files.forEach(f => formData.append("files", f))
      formData.append("crossReference", "true")

      const res = await fetch("/api/institution/ocr-scan", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setOcrResults(data.results)
      setStep("ocr")
      toast.success(data.message)
    } catch (err: any) {
      toast.error(err.message || "OCR scan failed")
    } finally {
      setIsScanning(false)
    }
  }

  // ── Step 2b: Retry single file ────────────────────────────────────────────

  const handleRetryOcr = async (index: number) => {
    const file = files[index]
    if (!file) return

    const formData = new FormData()
    formData.append("files", file)
    formData.append("crossReference", "true")

    try {
      const res = await fetch("/api/institution/ocr-scan", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setOcrResults(prev => {
        const updated = [...prev]
        updated[index] = data.results[0]
        return updated
      })
      toast.success(`Re-scanned ${file.name}`)
    } catch (err: any) {
      toast.error(err.message || "Retry failed")
    }
  }

  // ── Step 4: Generate Certificates ─────────────────────────────────────────

  const handleGenerateCertificates = async () => {
    const validResults = ocrResults.filter(r => !r.needsReview && r.name && r.rollNumber)
    if (validResults.length === 0) {
      toast.error("No valid OCR results to generate certificates for")
      return
    }
    setIsGenerating(true)

    try {
      const res = await fetch("/api/institution/generate-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: validResults.map(r => ({
            name: r.name,
            rollNumber: r.rollNumber,
            degreeTitle: "B.Tech",
            branch: "Computer Science",
            cgpa: r.cgpa,
            institutionName: user?.institutionName || "Heritage Institute of Technology",
            batchId: batchId || "2026-CSE-01",
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setCertificates(data.certificates)
      setStep("generate")
      toast.success(data.message)
    } catch (err: any) {
      toast.error(err.message || "Certificate generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Step 5: Batch Mint ────────────────────────────────────────────────────

  const handleMintBatch = async () => {
    const effectiveBatchId = batchId || "2026-CSE-01"
    setIsMinting(true)

    try {
      // First, save students to DB via issue-bulk
      const validResults = ocrResults.filter(r => !r.needsReview && r.name && r.rollNumber)
      const issueRes = await fetch("/api/institution/issue-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: validResults.map(r => ({
            name: r.name,
            rollNumber: r.rollNumber,
            degreeTitle: "B.Tech",
            branch: "Computer Science",
            cgpa: r.cgpa,
            email: "",
            batchId: effectiveBatchId,
            institutionName: user?.institutionName || "Heritage Institute of Technology",
          })),
          institutionId: user?.walletAddress
        }),
      })
      const issueData = await issueRes.json()
      if (!issueRes.ok) throw new Error(issueData.error)

      // Then mint-batch to generate Merkle tree
      const mintRes = await fetch("/api/institution/mint-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: effectiveBatchId }),
      })
      const mintData = await mintRes.json()
      if (!mintRes.ok) throw new Error(mintData.error)

      setMintResult({
        merkleRoot: mintData.merkleRoot,
        studentCount: mintData.studentCount,
      })
      setStep("mint")
      toast.success("Merkle Tree generated! Ready for on-chain submission.")
    } catch (err: any) {
      toast.error(err.message || "Minting failed")
    } finally {
      setIsMinting(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const highConfCount = ocrResults.filter(r => !r.needsReview).length
  const reviewCount = ocrResults.filter(r => r.needsReview).length
  const dbMatchCount = ocrResults.filter(r => r.dbMatch?.found).length

  const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: "upload",   label: "Upload Scans",    icon: <Upload className="h-4 w-4" /> },
    { id: "ocr",      label: "OCR Results",      icon: <ScanLine className="h-4 w-4" /> },
    { id: "validate", label: "Validate",         icon: <Shield className="h-4 w-4" /> },
    { id: "generate", label: "Generate Certs",   icon: <FileImage className="h-4 w-4" /> },
    { id: "mint",     label: "Batch Mint",       icon: <Zap className="h-4 w-4" /> },
  ]

  const stepIndex = STEPS.findIndex(s => s.id === step)

  return (
    <>
      <DashboardHeader
        title="Registrar Automation"
        description="Upload scans → OCR extract → Validate → Generate Certificates → Mint on-chain"
        userName="Admin"
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* ── Progress Stepper ────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`
                flex items-center justify-center h-9 w-9 rounded-full text-sm font-bold transition-all
                ${i < stepIndex ? "bg-purple-500 text-white" : ""}
                ${i === stepIndex ? "bg-primary text-white ring-4 ring-primary/20" : ""}
                ${i > stepIndex ? "bg-muted text-muted-foreground" : ""}
              `}>
                {i < stepIndex ? <CheckCircle2 className="h-5 w-5" /> : s.icon}
              </div>
              <span className={`text-xs font-medium hidden md:inline ${i === stepIndex ? "text-primary" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded ${i < stepIndex ? "bg-purple-500" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Certificate Preview Modal ───────────────────────────────── */}
        <AnimatePresence>
          {previewImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8"
              onClick={() => setPreviewImage(null)}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                className="relative max-w-3xl max-h-[90vh] bg-card rounded-2xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setPreviewImage(null)}
                  className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 z-10"
                >
                  <X className="h-5 w-5" />
                </button>
                <img
                  src={`data:image/png;base64,${previewImage}`}
                  alt="Certificate Preview"
                  className="w-full h-auto"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP 1: Upload Scans ────────────────────────────────────── */}
        {step === "upload" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Batch ID input */}
            <div className="bg-card border border-border/50 rounded-2xl p-6">
              <label className="text-sm font-medium text-foreground block mb-2">Batch ID (optional)</label>
              <input
                type="text"
                value={batchId}
                onChange={e => setBatchId(e.target.value)}
                placeholder="e.g. 2026-CSE-01"
                className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Drop zone */}
            <div
              {...(getRootProps() as any)}
              className={`
                relative overflow-hidden rounded-2xl border-2 border-dashed p-12
                transition-colors cursor-pointer text-center
                ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"}
              `}
            >
              <input {...getInputProps()} />
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
                <ScanLine className={`h-10 w-10 ${isDragActive ? "text-primary animate-bounce" : "text-muted-foreground"}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {isDragActive ? "Drop your scans here" : "Drag & drop certificate scans or PDFs"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Upload raw transcripts, marksheets, or certificates. The AI agent will automatically extract Name, Roll No, and GPA.
              </p>
              <Button variant="secondary" className="pointer-events-none">Select Files</Button>
            </div>

            {/* Selected files list */}
            {files.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  {files.length} file(s) selected
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-card border rounded-xl p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <FileImage className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <Button size="lg" className="gap-2 group" onClick={handleRunOcr} disabled={isScanning}>
                    {isScanning ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Running Vision AI...
                      </>
                    ) : (
                      <>
                        <ScanLine className="h-5 w-5" />
                        Run OCR Scan ({files.length} files)
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── STEP 2: OCR Results ─────────────────────────────────────── */}
        {(step === "ocr" || step === "validate") && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-xl p-4 bg-purple-500/5 border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-purple-500 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> High Confidence
                  </span>
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-500">{highConfCount}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Successfully extracted with 80%+ confidence</p>
              </div>

              <div className="border rounded-xl p-4 bg-amber-500/5 border-amber-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-amber-500 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Needs Review
                  </span>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500">{reviewCount}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Low confidence or missing fields — retry available</p>
              </div>

              <div className="border rounded-xl p-4 bg-blue-500/5 border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-500 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> DB Matches
                  </span>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500">{dbMatchCount}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Cross-referenced with university database</p>
              </div>
            </div>

            {/* Results table */}
            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left relative">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">File</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Roll No</th>
                      <th className="px-4 py-3">CGPA</th>
                      <th className="px-4 py-3">Confidence</th>
                      <th className="px-4 py-3">Filter</th>
                      <th className="px-4 py-3">DB Match</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {ocrResults.map((row, i) => (
                      <tr key={i} className={`
                        ${!row.needsReview ? "hover:bg-secondary/20" : "bg-amber-500/5"}
                      `}>
                        <td className="px-4 py-3">
                          {row.needsReview
                            ? <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Review</Badge>
                            : <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">OK</Badge>
                          }
                        </td>
                        <td className="px-4 py-3 font-mono text-xs truncate max-w-[120px]">{row.filename}</td>
                        <td className="px-4 py-3 font-medium">{row.name || "—"}</td>
                        <td className="px-4 py-3 font-mono">{row.rollNumber || "—"}</td>
                        <td className="px-4 py-3 font-mono font-bold">{row.cgpa || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${row.confidence >= 80 ? "bg-purple-500" : row.confidence >= 60 ? "bg-amber-500" : "bg-destructive"}`}
                                style={{ width: `${Math.min(row.confidence, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{row.confidence.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">{row.filterUsed}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {row.dbMatch?.found
                            ? <Badge variant="outline" className={`text-xs ${row.dbMatch.matchesName && row.dbMatch.matchesCgpa ? "bg-purple-500/10 text-purple-500" : "bg-amber-500/10 text-amber-500"}`}>
                                {row.dbMatch.matchesName && row.dbMatch.matchesCgpa ? "✓ Match" : "⚠ Mismatch"}
                              </Badge>
                            : <span className="text-xs text-muted-foreground">Not found</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRetryOcr(i)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Retry OCR"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <div className="flex gap-3">
                {step === "ocr" && (
                  <Button variant="secondary" onClick={() => setStep("validate")} className="gap-2">
                    <Shield className="h-4 w-4" /> View Validation
                  </Button>
                )}
                <Button
                  size="lg"
                  className="gap-2 group"
                  onClick={handleGenerateCertificates}
                  disabled={isGenerating || highConfCount === 0}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileImage className="h-5 w-5" />
                      Generate {highConfCount} Certificate(s)
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: Generated Certificates ──────────────────────────── */}
        {step === "generate" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            <div className="bg-card border border-border/50 rounded-2xl p-6">
              <h3 className="font-semibold text-lg mb-1">
                {certificates.length} Certificate(s) Generated
              </h3>
              <p className="text-sm text-muted-foreground">
                Each certificate has the extracted student data burned onto the master template.
                Click "Preview" to view full resolution.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map((cert, i) => (
                <div key={i} className="border rounded-xl bg-card overflow-hidden hover:border-primary/50 transition-colors">
                  <div className="aspect-[3/4] relative bg-muted/50 overflow-hidden">
                    <img
                      src={`data:image/png;base64,${cert.certificateBase64}`}
                      alt={`Certificate for ${cert.name}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="font-semibold">{cert.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{cert.rollNumber}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      Hash: {cert.credentialHash.substring(0, 18)}...
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => setPreviewImage(cert.certificateBase64)}
                      >
                        <Eye className="h-3 w-3" /> Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => {
                          const link = document.createElement("a")
                          link.href = `data:image/png;base64,${cert.certificateBase64}`
                          link.download = `cert-${cert.rollNumber}.png`
                          link.click()
                        }}
                      >
                        <Download className="h-3 w-3" /> Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("ocr")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to OCR
              </Button>
              <Button size="lg" className="gap-2 group" onClick={handleMintBatch} disabled={isMinting}>
                {isMinting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Building Merkle Tree...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Build Merkle Tree & Mint Batch
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 5: Mint Complete ───────────────────────────────────── */}
        {step === "mint" && mintResult && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className="bg-card border border-purple-500/30 rounded-2xl p-8 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/10">
                <CheckCircle2 className="h-10 w-10 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold">Batch Minted Successfully!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                All {mintResult.studentCount} certificates have been hashed into a Merkle Tree
                and saved to the database. The root is ready for on-chain submission.
              </p>

              <div className="bg-secondary/50 rounded-xl p-4 mt-6 max-w-lg mx-auto text-left space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Merkle Root</p>
                  <p className="font-mono text-sm break-all select-all">{mintResult.merkleRoot}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Students</p>
                    <p className="font-bold text-lg">{mintResult.studentCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Batch</p>
                    <p className="font-bold text-lg">{batchId || "2026-CSE-01"}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <Button variant="outline" onClick={() => {
                  setStep("upload")
                  setFiles([])
                  setOcrResults([])
                  setCertificates([])
                  setMintResult(null)
                }} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Process Another Batch
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(mintResult.merkleRoot)
                    toast.success("Merkle Root copied to clipboard!")
                  }}
                >
                  Copy Merkle Root
                </Button>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </>
  )
}

