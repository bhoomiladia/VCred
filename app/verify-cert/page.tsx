"use client"

import { useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shield, Upload, FileText, CheckCircle2, XCircle, Loader2, ArrowLeft,
  Search, AlertTriangle, QrCode, Camera, Info, RefreshCcw, Fingerprint
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import jsQR from "jsqr"

export default function VerifyCertPage() {
  const [file, setFile] = useState<File | null>(null)
  const [hash, setHash] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrScanning, setQrScanning] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) processFile(droppedFile)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) processFile(selectedFile)
  }

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setResult(null)
    setError(null)

    // Try to extract QR code if it's an image
    if (selectedFile.type.startsWith("image/")) {
      setQrScanning(true)
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
            const extractedHash = extractHashFromUrl(code.data)
            setHash(extractedHash)
          }
          setQrScanning(false)
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const extractHashFromUrl = (data: string) => {
    const urlParts = data.split("/")
    const lastPart = urlParts[urlParts.length - 1]
    return lastPart.startsWith("0x") ? lastPart : data
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !hash) return

    setIsVerifying(true)
    setResult(null)
    setError(null)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("hash", hash)

    try {
      const res = await fetch("/api/verify/compare", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Verification failed")
      }
      
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsVerifying(false)
    }
  }

  const reset = () => {
    setFile(null)
    setHash("")
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-zinc-800">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      <header className="border-b border-zinc-900/80 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/verify" className="text-zinc-500 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-4 w-[1px] bg-zinc-800" />
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-emerald-500" />
              <span className="font-bold tracking-widest text-lg">VCRED COMPARE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 relative">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
            Certificate Authenticator
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Upload a physical scan or digital certificate to compare it against the immutable blockchain registry.
          </p>
        </div>

        {!result ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* File Upload */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 p-12 text-center group ${
                isDragging ? "border-emerald-500 bg-emerald-500/5 scale-[1.01]" : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
              }`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileInput} className="absolute inset-0 cursor-pointer opacity-0" accept="image/*,.pdf" />
              
              <div className="mb-6 mx-auto w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                {file ? <FileText className="h-10 w-10 text-emerald-500" /> : <Upload className="h-10 w-10 text-zinc-500" />}
              </div>
              
              {file ? (
                <div>
                  <h3 className="text-xl font-bold mb-1">{file.name}</h3>
                  <p className="text-zinc-500 text-sm">{(file.size / 1024).toFixed(2)} KB • {file.type || 'Binary'}</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold mb-2">Drop Certificate File</h3>
                  <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                    Drag and drop your certificate image (PNG, JPG) or PDF file here.
                  </p>
                </div>
              )}
            </div>

            {/* Reference Input */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Fingerprint className="h-5 w-5 text-emerald-500" />
                </div>
                <h2 className="font-bold text-zinc-200">Reference Source</h2>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Enter Credential Hash or Paste Verification Link"
                    value={hash}
                    onChange={(e) => setHash(e.target.value)}
                    className="bg-black border-zinc-800 h-14 pl-12 rounded-2xl focus-visible:ring-emerald-500/50 transition-all font-mono text-sm"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    {qrScanning ? <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" /> : <QrCode className="h-5 w-5 text-zinc-600" />}
                  </div>
                </div>
                {qrScanning && <p className="text-[10px] text-emerald-500 font-mono animate-pulse">Scanning image for QR code...</p>}
                {!hash && file && file.type.startsWith("image/") && !qrScanning && (
                  <p className="text-[10px] text-zinc-500 font-mono">No QR code auto-detected. Please enter the hash manually.</p>
                )}
              </div>
            </div>

            <Button
              onClick={handleVerify}
              disabled={!file || isVerifying}
              className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-lg font-bold shadow-xl shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isVerifying ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Analyzing Certificate Data...</span>
                </div>
              ) : (
                "Verify Authenticity"
              )}
            </Button>
            
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3">
                <XCircle className="h-5 w-5" />
                {error}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
            {/* Status Header */}
            <div className={`rounded-3xl p-10 border-2 overflow-hidden relative ${
              result.status === 'verified' ? "bg-emerald-500/5 border-emerald-500/20" : 
              result.status === 'tampered' ? "bg-red-500/10 border-red-500/20 animate-pulse" :
              "bg-amber-500/5 border-amber-500/20"
            }`}>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className={`p-6 rounded-3xl ${
                  result.status === 'verified' ? "bg-emerald-500/20 text-emerald-500" :
                  result.status === 'tampered' ? "bg-red-500/20 text-red-500" :
                  "bg-amber-500/20 text-amber-500"
                }`}>
                  {result.status === 'verified' ? <CheckCircle2 className="h-16 w-16" /> : 
                   result.status === 'tampered' ? <AlertTriangle className="h-16 w-16" /> :
                   <XCircle className="h-16 w-16" />}
                </div>
                
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">
                    {result.status === 'verified' ? "Document Verified" : 
                     result.status === 'tampered' ? "Tamper Detected" :
                     "Data Mismatch Found"}
                  </h2>
                  <p className="text-zinc-400 text-lg leading-relaxed">
                    {result.status === 'verified' ? "The certificate data matches the official record." :
                     result.status === 'tampered' ? "The official record itself indicates tampering or revocation." :
                     "One or more fields do not match the official reference."}
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DataCard title="Student Name" extracted={result.ocrResult.name} expected={result.officialRecord.name} mismatch={result.mismatches.some((m: any) => m.field === 'Student Name')} />
              <DataCard title="Roll Number" extracted={result.ocrResult.rollNumber} expected={result.officialRecord.rollNumber} mismatch={result.mismatches.some((m: any) => m.field === 'Roll Number')} />
              <DataCard title="CGPA" extracted={result.ocrResult.cgpa} expected={result.officialRecord.cgpa} mismatch={result.mismatches.some((m: any) => m.field === 'CGPA')} />
            </div>

            {/* Details Table */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-8">
              <h3 className="text-sm font-black tracking-widest text-zinc-500 uppercase mb-8 flex items-center gap-3">
                <Info className="h-4 w-4" /> Certificate Integrity Parameters
              </h3>
              
              <div className="space-y-6">
                <DetailRow label="Institution" value={result.officialRecord.institutionName} />
                <DetailRow label="Degree Title" value={result.officialRecord.degreeTitle} />
                <DetailRow label="Issuance Proof" value={result.officialRecord.credentialHash} mono />
                <DetailRow label="OCR Confidence" value={`${(result.ocrResult.confidence).toFixed(2)}%`} />
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={reset} variant="outline" className="flex-1 h-16 rounded-2xl border-zinc-800 hover:bg-zinc-900">
                <RefreshCcw className="mr-2 h-5 w-5" /> Verify Another
              </Button>
              <Link href={`/verify/${result.officialRecord.credentialHash}`} className="flex-1">
                <Button className="w-full h-16 rounded-2xl bg-zinc-100 hover:bg-white text-black font-bold">
                  View Public Record
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}

function DataCard({ title, extracted, expected, mismatch }: any) {
  return (
    <div className={`p-6 rounded-3xl border ${mismatch ? "bg-red-500/5 border-red-500/30" : "bg-emerald-500/5 border-emerald-500/30"}`}>
      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">{title}</p>
      <div className="space-y-4">
        <div>
          <p className="text-[10px] text-zinc-600 mb-1">Extracted</p>
          <p className={`font-bold text-lg ${mismatch ? "text-red-400" : "text-emerald-400"}`}>{extracted || "—"}</p>
        </div>
        <div className="pt-4 border-t border-zinc-800/50">
          <p className="text-[10px] text-zinc-600 mb-1">Expected</p>
          <p className="font-bold text-lg text-zinc-300">{expected}</p>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono }: any) {
  return (
    <div className="flex justify-between items-center gap-8 py-4 border-b border-zinc-800/50 last:border-0">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-sm text-zinc-300 text-right truncate ${mono ? "font-mono text-[10px]" : "font-medium"}`}>{value}</span>
    </div>
  )
}
