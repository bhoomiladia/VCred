"use client"

import { useState, useCallback, useRef, Fragment } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shield, Upload, FileText, CheckCircle2, XCircle, Loader2, ArrowLeft,
  Search, FileSpreadsheet, AlertTriangle, Download, RotateCcw, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import jsQR from "jsqr"
import { Html5QrcodeScanner } from "html5-qrcode"
import { QrCode, Scan, Camera, FileUp } from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────
type VerifyMode = "single" | "batch"

interface CsvEntry {
  credentialHash?: string
  rollNumber?: string
  name?: string
  degreeTitle?: string
  cgpa?: number
  [key: string]: string | number | undefined
}

interface VerificationResult {
  row: number
  input: CsvEntry
  status: "verified" | "not-found" | "tampered" | "mismatched" | "error"
  found: boolean
  credential?: {
    name: string
    rollNumber: string
    degreeTitle: string
    branch: string
    cgpa: number
    email: string
    credentialHash: string
    merkleRoot: string
    issuedAt: string
    institutionName: string
    revoked: boolean
    status: string
  }
  mismatches?: { field: string; provided: string; expected: string }[]
  dbTampered?: boolean
  error?: string
}

interface BatchResponse {
  results: VerificationResult[]
  summary: {
    total: number
    verified: number
    notFound: number
    tampered: number
    mismatched: number
    errors: number
  }
}

// ── Header Normalizer ──────────────────────────────────────────────────────
const HEADER_MAP: Record<string, string> = {
  name: "name", studentname: "name", student_name: "name", "student name": "name", fullname: "name", full_name: "name", "full name": "name",
  rollnumber: "rollNumber", roll_number: "rollNumber", "roll number": "rollNumber", rollno: "rollNumber", roll_no: "rollNumber", "roll no": "rollNumber", roll: "rollNumber",
  degreetitle: "degreeTitle", degree_title: "degreeTitle", "degree title": "degreeTitle", degree: "degreeTitle", program: "degreeTitle", programme: "degreeTitle", course: "degreeTitle",
  cgpa: "cgpa", gpa: "cgpa", grade: "cgpa",
  credentialhash: "credentialHash", credential_hash: "credentialHash", "credential hash": "credentialHash", hash: "credentialHash",
  branch: "branch", department: "branch", dept: "branch",
  email: "email", emailid: "email", email_id: "email", "email id": "email",
}

function normalizeHeader(raw: string): string {
  const cleaned = raw.trim().replace(/^"|"$/g, "").toLowerCase().replace(/[\s_-]+/g, "")
  return HEADER_MAP[cleaned] || raw.trim().replace(/^"|"$/g, "")
}

// ── CSV Parser ─────────────────────────────────────────────────────────────
function parseCsv(text: string): CsvEntry[] {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return []
  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
  const headers = rawHeaders.map(normalizeHeader)
  const entries: CsvEntry[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values: string[] = []
    let current = ""
    let inQuotes = false
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes
      else if (char === "," && !inQuotes) { values.push(current.trim()); current = "" }
      else current += char
    }
    values.push(current.trim())
    const entry: CsvEntry = {}
    headers.forEach((header, idx) => {
      const val = values[idx] || ""
      entry[header] = header === "cgpa" ? (parseFloat(val) || 0) : val
    })
    if (Object.values(entry).some((v) => v !== "" && v !== 0 && v !== undefined)) entries.push(entry)
  }
  return entries
}

// ── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config = {
    verified: { icon: CheckCircle2, label: "Verified", className: "bg-primary/10 text-primary border-primary/20" },
    "not-found": { icon: XCircle, label: "Not Found", className: "bg-destructive/10 text-destructive border-destructive/20" },
    tampered: { icon: AlertTriangle, label: "Tampered", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    mismatched: { icon: AlertTriangle, label: "Mismatched", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
    error: { icon: XCircle, label: "Error", className: "bg-destructive/10 text-destructive border-destructive/20" },
  }[status] || { icon: Info, label: status, className: "bg-secondary text-muted-foreground border-border" }
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function VerifyPage() {
  const [mode, setMode] = useState<VerifyMode>("single")

  // Single verification state
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "verified" | "not-found" | "tampered">("idle")
  const [searchQuery, setSearchQuery] = useState("")
  const [singleCredential, setSingleCredential] = useState<any>(null)
  const [singleError, setSingleError] = useState<string | null>(null)

  // Batch verification state
  const [batchFiles, setBatchFiles] = useState<File[]>([])
  const [parsedEntries, setParsedEntries] = useState<CsvEntry[]>([])
  const [batchResults, setBatchResults] = useState<BatchResponse | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [batchError, setBatchError] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [batchDragging, setBatchDragging] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanType, setScanType] = useState<"qr" | "ocr" | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const batchFileRef = useRef<HTMLInputElement>(null)
  const qrFileRef = useRef<HTMLInputElement>(null)
  const certFileRef = useRef<HTMLInputElement>(null)

  // Single verify: search by query
  const handleSearchVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    setVerificationStatus("verifying")
    setSingleCredential(null)
    setSingleError(null)
    setFile(null)
    try {
      const res = await fetch(`/api/verify/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) {
        setVerificationStatus("not-found")
        setSingleError(data.error || "Credential not found")
        return
      }
      const cred = data.credential
      setSingleCredential(cred)
      setVerificationStatus(cred.dbTampered ? "tampered" : "verified")
    } catch {
      setVerificationStatus("not-found")
      setSingleError("Failed to verify. Please try again.")
    }
  }

  // Single verify: file upload
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileVerification(droppedFile)
  }, [])
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) handleFileVerification(selectedFile)
  }
  const handleFileVerification = async (selectedFile: File) => {
    setFile(selectedFile)
    setVerificationStatus("verifying")
    setSingleCredential(null)
    setSingleError(null)

    try {
      // Read file content and try to extract a hash or credential ID
      const text = await selectedFile.text()
      let queryValue = ""

      // Try JSON with credentialHash
      try {
        const json = JSON.parse(text)
        queryValue = json.credentialHash || json.hash || json.credential_hash || json.id || ""
      } catch {
        // Not JSON — try to find a hash pattern in text
        const hashMatch = text.match(/0x[a-fA-F0-9]{40,}/)?.[0]
        if (hashMatch) queryValue = hashMatch
        else queryValue = text.trim().split("\n")[0].trim() // Use first line
      }

      if (!queryValue) {
        setVerificationStatus("not-found")
        setSingleError("Could not extract a credential identifier from this file.")
        return
      }

      const res = await fetch(`/api/verify/search?q=${encodeURIComponent(queryValue)}`)
      const data = await res.json()
      if (!res.ok) {
        setVerificationStatus("not-found")
        setSingleError(data.error || "Credential not found")
        return
      }
      const cred = data.credential
      setSingleCredential(cred)
      setVerificationStatus(cred.dbTampered ? "tampered" : "verified")
    } catch {
      setVerificationStatus("not-found")
      setSingleError("Failed to process file. Please try again.")
    }
  }

  // QR Code Upload
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setVerificationStatus("verifying")
    setSingleError(null)

    const reader = new FileReader()
    reader.onload = async (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code) {
          const hash = extractHashFromUrl(code.data)
          setSearchQuery(hash)
          handleHashVerification(hash)
        } else {
          setVerificationStatus("not-found")
          setSingleError("No QR code found in the image.")
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const extractHashFromUrl = (data: string) => {
    // If it's a URL like vcred.io/verify/0xabc -> return 0xabc
    const urlParts = data.split("/")
    const lastPart = urlParts[urlParts.length - 1]
    return lastPart.startsWith("0x") ? lastPart : data
  }

  const handleHashVerification = async (hash: string) => {
    setVerificationStatus("verifying")
    try {
      const res = await fetch(`/api/verify/search?q=${encodeURIComponent(hash)}`)
      const data = await res.json()
      if (!res.ok) {
        setVerificationStatus("not-found")
        setSingleError(data.error || "Credential not found")
        return
      }
      setSingleCredential(data.credential)
      setVerificationStatus(data.credential.dbTampered ? "tampered" : "verified")
    } catch {
      setVerificationStatus("not-found")
      setSingleError("Verification failed.")
    }
  }

  // Certificate Auto-Scan (OCR)
  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setVerificationStatus("verifying")
    setSingleError(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/verify/ocr", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setVerificationStatus("not-found")
        setSingleError(data.error || "Failed to scan certificate.")
        return
      }
      // OCR might find a hash or student details
      if (data.credentialHash) {
        handleHashVerification(data.credentialHash)
      } else if (data.credential) {
        setSingleCredential(data.credential)
        setVerificationStatus(data.credential.dbTampered ? "tampered" : "verified")
      } else {
        setVerificationStatus("not-found")
        setSingleError("Could not identify the certificate.")
      }
    } catch {
      setVerificationStatus("not-found")
      setSingleError("OCR scan failed.")
    }
  }

  // Live QR Scan
  const startLiveScan = () => {
    setShowScanner(true)
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )
      scanner.render((decodedText) => {
        scanner.clear()
        setShowScanner(false)
        const hash = extractHashFromUrl(decodedText)
        setSearchQuery(hash)
        handleHashVerification(hash)
      }, (error) => {
        // Optional error handling
      })
      scannerRef.current = scanner
    }, 100)
  }

  const closeLiveScan = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
    }
    setShowScanner(false)
  }

  const resetVerification = () => {
    setFile(null)
    setVerificationStatus("idle")
    setSingleCredential(null)
    setSingleError(null)
    setSearchQuery("")
  }

  // Batch verify handlers
  const handleBatchDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setBatchDragging(true) }, [])
  const handleBatchDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setBatchDragging(false) }, [])
  const handleBatchDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setBatchDragging(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".csv"))
    if (files.length > 0) processBatchFiles(files)
  }, [])
  const handleBatchFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) processBatchFiles(files)
  }

  const processBatchFiles = async (newFiles: File[]) => {
    setBatchError(null); setBatchResults(null); setBatchFiles(newFiles)
    const allEntries: CsvEntry[] = []
    for (const f of newFiles) { allEntries.push(...parseCsv(await f.text())) }
    if (allEntries.length === 0) { setBatchError("No valid entries found. Check the CSV format below."); return }
    if (allEntries.length > 500) { setBatchError("Maximum 500 entries per batch."); return }
    setParsedEntries(allEntries)
  }

  const runBatchVerification = async () => {
    if (parsedEntries.length === 0) return
    setIsVerifying(true); setProgress(0); setBatchError(null)
    const progressInterval = setInterval(() => setProgress((p) => Math.min(p + Math.random() * 15, 90)), 300)
    try {
      const res = await fetch("/api/verify/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: parsedEntries }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Verification failed") }
      const data: BatchResponse = await res.json()
      setProgress(100)
      setTimeout(() => setBatchResults(data), 300)
    } catch (err: any) { setBatchError(err.message || "Failed to verify batch") }
    finally { clearInterval(progressInterval); setIsVerifying(false) }
  }

  const exportResultsCsv = () => {
    if (!batchResults) return
    const headers = ["Row","Status","Input Hash","Input Roll No","Input Name","Verified Name","Verified Roll","Verified Degree","Verified CGPA","Institution","Credential Hash","Merkle Root"]
    const rows = batchResults.results.map((r) => [r.row,r.status,r.input.credentialHash||"",r.input.rollNumber||"",r.input.name||"",r.credential?.name||"",r.credential?.rollNumber||"",r.credential?.degreeTitle||"",r.credential?.cgpa||"",r.credential?.institutionName||"",r.credential?.credentialHash||"",r.credential?.merkleRoot||""])
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `verification-results-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const resetBatch = () => {
    setBatchFiles([]); setParsedEntries([]); setBatchResults(null)
    setIsVerifying(false); setProgress(0); setBatchError(null); setExpandedRow(null)
    if (batchFileRef.current) batchFileRef.current.value = ""
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">VCRED</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {batchResults && mode === "batch" && (
              <Button variant="outline" size="sm" className="gap-2" onClick={exportResultsCsv}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Verification Portal</h1>
          <p className="mt-2 text-muted-foreground">
            Verify academic credentials against our Merkle Root registry
          </p>
        </motion.div>

        {/* Mode Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-8 flex justify-center"
        >
          <div className="inline-flex items-center rounded-xl border border-border/50 bg-card/50 p-1 backdrop-blur">
            <button
              onClick={() => setMode("single")}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
                mode === "single"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="h-4 w-4" />
              Single Verify
            </button>
            <button
              onClick={() => setMode("batch")}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
                mode === "batch"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Batch CSV
            </button>
          </div>
        </motion.div>

        {/* ─── SINGLE MODE ─────────────────────────────────────────────────── */}
        {mode === "single" && (
          <motion.div
            key="single"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Search Bar */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleSearchVerification}
              className="mt-10"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-xl" />
                <div className="relative flex items-center gap-2 rounded-xl border border-border/50 bg-card/80 p-2 backdrop-blur-xl">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter Credential Hash (0x...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button type="submit" disabled={verificationStatus === "verifying"} className="shrink-0">
                    {verificationStatus === "verifying" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                  </Button>
                </div>
              </div>
            </motion.form>

            <div className="my-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="flex items-center gap-2 h-20 rounded-2xl border-dashed hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => certFileRef.current?.click()}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <Scan className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Scan Certificate</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Auto-detect details</p>
                </div>
                <input
                  type="file"
                  ref={certFileRef}
                  onChange={handleCertUpload}
                  className="hidden"
                  accept=".pdf,image/*"
                />
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-2 h-20 rounded-2xl border-dashed hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => qrFileRef.current?.click()}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <QrCode className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Upload QR</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">From Image</p>
                </div>
                <input
                  type="file"
                  ref={qrFileRef}
                  onChange={handleQrUpload}
                  className="hidden"
                  accept="image/*"
                />
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-2 h-20 rounded-2xl border-dashed hover:border-primary hover:bg-primary/5 transition-all"
                onClick={startLiveScan}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Live QR Scan</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Use Camera</p>
                </div>
              </Button>
            </div>

            {showScanner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6"
              >
                <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Live QR Scanner</h3>
                    <Button variant="ghost" size="icon" onClick={closeLiveScan}>
                      <XCircle className="h-6 w-6" />
                    </Button>
                  </div>
                  <div id="qr-reader" className="overflow-hidden rounded-2xl border border-border"></div>
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Position the QR code within the frame to scan.
                  </p>
                </div>
              </motion.div>
            )}

            <div className="my-10 flex items-center gap-4">
              <div className="h-px flex-1 bg-border/50" />
              <span className="text-sm text-muted-foreground">or drop a JSON proof</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>

            {/* File Drop Zone — only when idle */}
            {verificationStatus === "idle" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative rounded-2xl border-2 border-dashed p-16 text-center transition-all ${
                    isDragging ? "border-primary bg-primary/5" : "border-border/50 bg-card/30 hover:border-border hover:bg-card/50"
                  }`}
                >
                  <input type="file" onChange={handleFileInput} className="absolute inset-0 cursor-pointer opacity-0" accept=".pdf,.json,.txt" />
                  <div className="pointer-events-none">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                      <Upload className={`h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <h3 className="text-lg font-medium">Drop your credential file here</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Supports JSON proof files or text files with credential hashes</p>
                    <Button variant="outline" className="mt-6 pointer-events-none">Browse Files</Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Verifying State */}
            {verificationStatus === "verifying" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/50 bg-card/50 p-8">
                {file && (
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary">
                      <FileText className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Verifying against Merkle Root registry...</span>
                  <span className="text-primary">Processing</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2 }} className="h-full bg-primary" />
                </div>
              </motion.div>
            )}

            {/* Result: Verified / Not Found / Tampered */}
            {(verificationStatus === "verified" || verificationStatus === "not-found" || verificationStatus === "tampered") && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {file && (
                  <div className="flex items-center gap-4 mb-6 rounded-xl border border-border/50 bg-card/50 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    {verificationStatus === "verified" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    {verificationStatus === "tampered" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                    {verificationStatus === "not-found" && <XCircle className="h-5 w-5 text-destructive" />}
                  </div>
                )}

                {/* Status Banner */}
                <div className={`rounded-xl p-6 ${
                  verificationStatus === "verified" ? "bg-primary/10 border border-primary/20"
                    : verificationStatus === "tampered" ? "bg-amber-500/10 border border-amber-500/20"
                    : "bg-destructive/10 border border-destructive/20"
                }`}>
                  <div className="flex items-start gap-4">
                    {verificationStatus === "verified" && <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />}
                    {verificationStatus === "tampered" && <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />}
                    {verificationStatus === "not-found" && <XCircle className="h-6 w-6 shrink-0 text-destructive" />}
                    <div>
                      <h3 className="font-semibold">
                        {verificationStatus === "verified" ? "Credential Verified ✓" : verificationStatus === "tampered" ? "Tamper Detected ⚠" : "Verification Failed"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {verificationStatus === "verified"
                          ? "This credential is authentic and matches our on-chain Merkle Root."
                          : verificationStatus === "tampered"
                          ? "This credential exists but its data has been tampered with."
                          : singleError || "This credential could not be found in our registry."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Credential Details */}
                {singleCredential && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 rounded-xl border border-border/50 bg-card/50 overflow-hidden"
                  >
                    <div className="border-b border-border/50 bg-card/80 px-6 py-3">
                      <p className="text-sm font-medium text-muted-foreground">Credential Details</p>
                    </div>
                    <div className="p-6">
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="mt-1 font-medium">{singleCredential.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Roll Number</p>
                          <p className="mt-1 font-mono font-medium">{singleCredential.rollNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Degree</p>
                          <p className="mt-1 font-medium">{singleCredential.degreeTitle}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Branch</p>
                          <p className="mt-1 font-medium">{singleCredential.branch || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">CGPA</p>
                          <p className="mt-1 font-mono font-medium">{singleCredential.cgpa}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Institution</p>
                          <p className="mt-1 font-medium">{singleCredential.institutionName || "—"}</p>
                        </div>
                        {singleCredential.email && (
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="mt-1 font-medium">{singleCredential.email}</p>
                          </div>
                        )}
                        {singleCredential.issuedAt && (
                          <div>
                            <p className="text-xs text-muted-foreground">Issued</p>
                            <p className="mt-1 font-medium">{new Date(singleCredential.issuedAt).toLocaleDateString()}</p>
                          </div>
                        )}
                        <div>
                          <p className="mt-1">
                            <StatusBadge status={(singleCredential.revoked || singleCredential.dbTampered) ? "tampered" : (singleCredential.status === "MINTED" || singleCredential.isPublished) ? "verified" : "not-found"} />
                          </p>
                        </div>
                      </div>
                      {singleCredential.credentialHash && (
                        <div className="mt-5">
                          <p className="text-xs text-muted-foreground">Credential Hash</p>
                          <code className="mt-1 block truncate rounded-lg bg-background/50 px-3 py-2 font-mono text-xs">{singleCredential.credentialHash}</code>
                        </div>
                      )}
                      {singleCredential.merkleRoot && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground">Merkle Root</p>
                          <code className="mt-1 block truncate rounded-lg bg-background/50 px-3 py-2 font-mono text-xs">{singleCredential.merkleRoot}</code>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                <div className="mt-6 flex gap-3">
                  <Button variant="outline" onClick={resetVerification} className="flex-1">Verify Another</Button>
                  {singleCredential?.credentialHash && (
                    <Link href={`/verify/${singleCredential.credentialHash}`} className="flex-1">
                      <Button className="w-full">View Full Details</Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            )}

            {/* Info Cards */}
            {verificationStatus === "idle" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-16 grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-card/30 p-6">
                  <h3 className="font-medium">What is Merkle Verification?</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Merkle trees allow us to efficiently verify that a credential belongs to a batch of issued certificates without exposing other records.
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/30 p-6">
                  <h3 className="font-medium">Privacy Protected</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your verification queries are not logged. Only the cryptographic proof is checked against our on-chain registry.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── BATCH MODE ──────────────────────────────────────────────────── */}
        {mode === "batch" && (
          <motion.div
            key="batch"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Error Banner */}
            <AnimatePresence>
              {batchError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mx-auto mt-6 max-w-2xl rounded-xl border border-destructive/20 bg-destructive/10 p-4"
                >
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                    <p className="text-sm font-medium text-destructive">{batchError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload Zone */}
            {!batchResults && parsedEntries.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-10">
                <div
                  onDragOver={handleBatchDragOver}
                  onDragLeave={handleBatchDragLeave}
                  onDrop={handleBatchDrop}
                  className={`relative rounded-2xl border-2 border-dashed p-16 text-center transition-all ${
                    batchDragging ? "border-primary bg-primary/5" : "border-border/50 bg-card/30 hover:border-border hover:bg-card/50"
                  }`}
                >
                  <input ref={batchFileRef} type="file" onChange={handleBatchFileInput} className="absolute inset-0 cursor-pointer opacity-0" accept=".csv" multiple />
                  <div className="pointer-events-none">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                      <Upload className={`h-8 w-8 ${batchDragging ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <h3 className="text-lg font-medium">Drop your CSV file here</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Upload one or more CSV files with credential hashes or student details</p>
                    <Button variant="outline" className="pointer-events-none mt-6">Browse Files</Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Parsed Preview */}
            {parsedEntries.length > 0 && !batchResults && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10 space-y-6">
                <div className="rounded-xl border border-border/50 bg-card/50 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{batchFiles.map((f) => f.name).join(", ")}</p>
                        <p className="text-sm text-muted-foreground">{parsedEntries.length} entries parsed</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={resetBatch}>
                        <RotateCcw className="mr-2 h-4 w-4" />Reset
                      </Button>
                      <Button onClick={runBatchVerification} disabled={isVerifying} className="gap-2">
                        {isVerifying ? (<><Loader2 className="h-4 w-4 animate-spin" />Verifying...</>) : (<><Search className="h-4 w-4" />Verify All ({parsedEntries.length})</>)}
                      </Button>
                    </div>
                  </div>
                  {isVerifying && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Verifying against Merkle Root registry...</span>
                        <span className="text-primary">{Math.round(progress)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-primary transition-all" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                  <div className="border-b border-border/50 bg-card/50 px-6 py-3">
                    <p className="text-sm font-medium text-muted-foreground">Preview (first 10 rows)</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">#</th>
                          {Object.keys(parsedEntries[0] || {}).map((key) => (
                            <th key={key} className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedEntries.slice(0, 10).map((entry, i) => (
                          <tr key={i} className="border-b border-border/30 transition-colors hover:bg-card/50">
                            <td className="whitespace-nowrap px-6 py-3 text-sm text-muted-foreground">{i + 1}</td>
                            {Object.values(entry).map((val, j) => (
                              <td key={j} className="max-w-[200px] truncate whitespace-nowrap px-6 py-3 font-mono text-sm">{String(val || "—")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedEntries.length > 10 && (
                    <div className="border-t border-border/50 px-6 py-3 text-center text-sm text-muted-foreground">
                      ... and {parsedEntries.length - 10} more entries
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Results */}
            {batchResults && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10 space-y-6">
                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { label: "Total", value: batchResults.summary.total, icon: FileSpreadsheet, cls: "border-border/50 bg-card/50" },
                    { label: "Verified", value: batchResults.summary.verified, icon: CheckCircle2, cls: "border-primary/20 bg-primary/5", tc: "text-primary" },
                    { label: "Mismatched", value: batchResults.summary.mismatched, icon: AlertTriangle, cls: "border-orange-500/20 bg-orange-500/5", tc: "text-orange-500" },
                    { label: "Not Found", value: batchResults.summary.notFound, icon: XCircle, cls: "border-destructive/20 bg-destructive/5", tc: "text-destructive" },
                    { label: "Tampered", value: batchResults.summary.tampered, icon: AlertTriangle, cls: "border-amber-500/20 bg-amber-500/5", tc: "text-amber-500" },
                  ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`rounded-xl border p-5 ${stat.cls}`}>
                      <div className="flex items-center justify-between">
                        <stat.icon className={`h-5 w-5 ${stat.tc || "text-muted-foreground"}`} />
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                      </div>
                      <p className={`mt-3 text-3xl font-bold ${stat.tc || ""}`}>{stat.value}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={resetBatch} className="gap-2"><RotateCcw className="h-4 w-4" />New Batch</Button>
                  <Button onClick={exportResultsCsv} className="gap-2"><Download className="h-4 w-4" />Export Results</Button>
                </div>

                {/* Results Table */}
                <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-card/50">
                          {["#","Status","Input","Name","Roll No","Degree","CGPA"].map((h) => (
                            <th key={h} className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.results.map((result) => (
                          <Fragment key={result.row}>
                            <tr
                              onClick={() => setExpandedRow(expandedRow === result.row ? null : result.row)}
                              className="cursor-pointer border-b border-border/30 transition-colors hover:bg-card/50"
                            >
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">{result.row}</td>
                              <td className="whitespace-nowrap px-6 py-4"><StatusBadge status={result.status} /></td>
                              <td className="max-w-[180px] truncate whitespace-nowrap px-6 py-4 font-mono text-xs text-muted-foreground">{result.input.credentialHash || result.input.rollNumber || result.input.name || "—"}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm">{result.credential?.name || "—"}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-mono text-sm">{result.credential?.rollNumber || "—"}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm">{result.credential?.degreeTitle || "—"}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-mono text-sm">{result.credential?.cgpa || "—"}</td>
                            </tr>
                            <AnimatePresence>
                              {expandedRow === result.row && result.credential && (
                                <tr key={`${result.row}-details`}>
                                  <td colSpan={7} className="px-6 py-0">
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                      <div className="rounded-xl border border-border/50 bg-card/50 p-6 my-3">
                                        {/* Mismatch Details */}
                                        {result.mismatches && result.mismatches.length > 0 && (
                                          <div className="mb-5">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Field Mismatches</p>
                                            <div className="space-y-2">
                                              {result.mismatches.map((m, mi) => (
                                                <div key={mi} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                                                  <p className="text-xs font-medium text-orange-500 capitalize">{m.field}</p>
                                                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                                                    <div>
                                                      <p className="text-[10px] text-muted-foreground">Provided</p>
                                                      <p className="text-sm font-mono text-destructive">{m.provided}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-[10px] text-muted-foreground">Expected (DB)</p>
                                                      <p className="text-sm font-mono text-primary">{m.expected}</p>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        <div className="grid gap-4 sm:grid-cols-3">
                                          <div>
                                            <p className="text-xs text-muted-foreground">Institution</p>
                                            <p className="mt-1 text-sm font-medium">{result.credential.institutionName || "—"}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-muted-foreground">Branch</p>
                                            <p className="mt-1 text-sm font-medium">{result.credential.branch}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-muted-foreground">Issued</p>
                                            <p className="mt-1 text-sm font-medium">{result.credential.issuedAt ? new Date(result.credential.issuedAt).toLocaleDateString() : "—"}</p>
                                          </div>
                                          <div className="sm:col-span-3">
                                            <p className="text-xs text-muted-foreground">Credential Hash</p>
                                            <code className="mt-1 block truncate rounded-lg bg-background/50 px-3 py-2 font-mono text-xs">{result.credential.credentialHash}</code>
                                          </div>
                                          {result.credential.merkleRoot && (
                                            <div className="sm:col-span-3">
                                              <p className="text-xs text-muted-foreground">Merkle Root</p>
                                              <code className="mt-1 block truncate rounded-lg bg-background/50 px-3 py-2 font-mono text-xs">{result.credential.merkleRoot}</code>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  </td>
                                </tr>
                              )}
                            </AnimatePresence>
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CSV Format Guide */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-16 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border/50 bg-card/30 p-6">
                <h3 className="mb-3 font-medium flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />CSV Format — By Hash
                </h3>
                <p className="text-sm text-muted-foreground mb-4">Provide the credential hash directly.</p>
                <div className="rounded-lg bg-background/50 p-4 font-mono text-xs text-muted-foreground">
                  <p className="text-primary">credentialHash</p>
                  <p>0x7f83b...9069</p>
                  <p>0xa4c2d...3fe1</p>
                </div>
              </div>
              <div className="rounded-xl border border-border/50 bg-card/30 p-6">
                <h3 className="mb-3 font-medium flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />CSV Format — By Details
                </h3>
                <p className="text-sm text-muted-foreground mb-4">Provide student details — system computes the hash.</p>
                <div className="rounded-lg bg-background/50 p-4 font-mono text-xs text-muted-foreground">
                  <p className="text-primary">name,rollNumber,degreeTitle,cgpa</p>
                  <p>Alex Johnson,CS2024001,B.Tech,8.5</p>
                  <p>Sarah Chen,EC2024015,M.Tech,9.1</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>

    </div>
  )
}
