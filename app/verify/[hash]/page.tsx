"use client"

import { use, useEffect, useState, useRef } from "react"
import { useReadContract } from "wagmi"
import { VCredRegistryABI } from "@/lib/abi"
import { Shield, CheckCircle2, XCircle, FileCheck, Loader2, Building2, Download } from "lucide-react"
import { useReactToPrint } from "react-to-print"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CertificatePreview } from "@/components/CertificatePreview"
import { useSearchParams } from "next/navigation"
import { VCubeLogo } from "@/components/v-cube-logo"
import { AnimatedVCred } from "@/components/animated-vcred"

// Next.js 15: params is a Promise, must be unwrapped with React.use()
export default function VerifyPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = use(params)
  const [credential, setCredential] = useState<any>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!hash) return;
    fetch(`/api/verify/${hash}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setCredential(data.credential)
      })
      .catch(() => setError("Failed to fetch credential details"))
      .finally(() => setIsLoading(false))
  }, [hash])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin h-12 w-12 text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Querying Registry...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-destructive/10 p-6 text-destructive mb-6">
          <XCircle className="h-16 w-16" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Verification Failed</h1>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <p className="text-xs text-muted-foreground mt-2 font-mono break-all max-w-md">Hash: {hash}</p>
        <Link href="/">
          <Button variant="outline" className="mt-8">Return Home</Button>
        </Link>
      </div>
    )
  }
  
  if (!credential) return null;
  return <VerificationResult credential={credential} />
}

const VerificationResult = ({ credential }: { credential: any }) => {
  const searchParams = useSearchParams()
  const certificateRef = useRef<HTMLDivElement>(null)
  
  const handlePrint = useReactToPrint({
    contentRef: certificateRef,
    documentTitle: `${credential.name} - VCred Certificate`,
  });

  const qrName = searchParams.get('name')
  const qrRoll = searchParams.get('roll')
  const qrCgpa = searchParams.get('cgpa')

  const isTampered = (
    credential.dbTampered ||
    (qrName && qrName !== credential.name) ||
    (qrRoll && qrRoll !== credential.rollNumber) ||
    (qrCgpa && parseFloat(qrCgpa) !== credential.cgpa)
  )

  const leaf = credential.credentialHash?.startsWith('0x') ? credential.credentialHash : `0x${credential.credentialHash}`;
  const proof = (credential.merkleProof || []).map((p: string) => p.startsWith('0x') ? p : `0x${p}`);
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  const { data: rawIsVerified, isLoading: isContractLoading } = useReadContract(
    contractAddress ? {
      address: contractAddress as `0x${string}`,
      abi: VCredRegistryABI,
      functionName: 'verifyCredential',
      args: [credential.batchId, leaf as `0x${string}`, proof as `0x${string}[]`],
    } : undefined as any
  )
  
  const isVerified = Boolean(rawIsVerified)

  return (
    <div className="min-h-screen bg-black text-zinc-50 font-sans selection:bg-zinc-800">
      
      {/* Hidden printable certificate container */}
      <div style={{ position: "absolute", top: "-9999px", left: "-9999px", width: "100%", height: 0, overflow: "hidden" }}>
        <div ref={certificateRef}>
          <CertificatePreview
            templateId={credential.templateId || 'professional'}
            studentData={{
                name: credential.name,
                rollNumber: credential.rollNumber,
                degreeTitle: credential.degreeTitle,
                branch: credential.branch,
                cgpa: credential.cgpa,
                institutionName: credential.institutionName || "Registered Tech University",
                issuedAt: credential.issuedAt,
                credentialHash: credential.credentialHash
            }}
            layoutConfig={credential.layoutConfig}
          />
        </div>
      </div>

      {/* Header */}
      <header className="p-6 border-b border-zinc-900/80 flex justify-between items-center sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <VCubeLogo className="h-6 w-6 drop-shadow-md" />
          <AnimatedVCred className="text-xl font-black tracking-tighter uppercase italic" />
        </div>
        <div className="flex gap-4">
           <Button 
             onClick={() => handlePrint()} 
             className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium tracking-wide shadow-lg shadow-indigo-500/20 border-none transition-all duration-200 active:scale-95"
           >
             <Download className="mr-2 h-4 w-4" /> Download Original PDF
           </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-12 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Top Status Banner */}
        <div className="mb-8">
          {isContractLoading ? (
            <div className="flex items-center gap-3 text-amber-500 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-semibold tracking-wide">Syncing with Ethereum...</span>
            </div>
          ) : credential.revoked ? (
            <div className="flex flex-col gap-2 text-red-500 bg-red-500/10 border border-red-500/20 p-6 rounded-xl animate-in fade-in zoom-in duration-500">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8" />
                <span className="font-black tracking-widest text-2xl uppercase">OFFICIALLY REVOKED</span>
              </div>
              <p className="text-red-400 font-medium ml-11">
                This credential has been officially revoked by the issuing institution. 
                It is no longer valid for any purpose, regardless of its blockchain signature.
              </p>
            </div>
          ) : isTampered ? (
            <div className="flex flex-col gap-2 text-destructive bg-destructive/10 border border-destructive/20 p-6 rounded-xl animate-pulse">
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6" />
                <span className="font-black tracking-widest text-lg uppercase">Data Mismatch: Tampered Document</span>
              </div>
              <p className="text-destructive/80 font-medium ml-9">
                The data scanned from the physical QR code does not match the immutable record stored on the blockchain. 
                This physical document is invalid or forged.
              </p>
            </div>
          ) : isVerified ? (
            <div className="flex items-center gap-3 text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold tracking-wide">Verified & Anchored on Ethereum</span>
            </div>
          ) : credential.status === 'MINTED' ? (
            <div className="flex items-center gap-3 text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
              <Shield className="h-5 w-5" />
              <span className="font-semibold tracking-wide">Verified by Institution</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-amber-500 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
              <Shield className="h-5 w-5" />
              <span className="font-semibold tracking-wide">Pending Institutional Signature</span>
            </div>
          )}
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${isTampered || credential.revoked ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
          
          {/* Left Column (Verified Attributes) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#09090b] rounded-2xl border border-zinc-800/80 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-10">
                <FileCheck className="h-5 w-5 text-zinc-400" />
                <h2 className="text-xl font-bold tracking-tight text-zinc-100">Verified Attributes</h2>
                <div className="ml-auto rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-zinc-500">LIVE</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Student Name</p>
                  <p className="font-semibold text-lg text-zinc-200">{credential.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Roll Number</p>
                  <p className="font-semibold text-lg font-mono text-zinc-200">{credential.rollNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Degree & Branch</p>
                  <p className="font-semibold text-lg text-zinc-200">{credential.degreeTitle} in {credential.branch}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Actual CGPA</p>
                  <p className="font-semibold text-lg font-mono text-zinc-200">{credential.cgpa}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Institution</p>
                  <p className="font-semibold text-lg text-zinc-200">{credential.institutionName || "Registered Tech University"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Issuance Date</p>
                  <p className="font-semibold text-lg text-zinc-200">{new Date(credential.issuedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Threshold Block */}
              <div className="mt-12 rounded-2xl bg-[#022c22]/10 border border-emerald-900/30 p-8 shadow-inner relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                 <div className="flex items-center gap-2 mb-6">
                   <div className="rounded-full bg-emerald-500/20 p-1">
                     <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                   </div>
                   <span className="text-sm font-black text-emerald-400 tracking-widest uppercase">GPA Threshold Verified</span>
                 </div>
                 <div className="bg-black/40 border border-[#064e3b]/30 rounded-xl p-5 inline-block">
                   <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Verified Condition</p>
                   <p className="text-3xl font-black text-emerald-400 font-mono tracking-wide">CGPA ≥ 6.0</p>
                 </div>
                 <p className="mt-5 text-[11px] text-emerald-500/60 flex items-center gap-2 font-medium">
                   <Shield className="h-3 w-3 shrink-0" />
                   The student successfully meets the institution's minimum verification standard.
                 </p>
              </div>

              {/* Disclosure */}
              <div className="mt-10 border-t border-zinc-800/80 pt-8">
                 <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-3 flex items-center gap-2">
                   Disclosure Type
                 </p>
                 <div className="rounded-lg bg-[#050505] border border-zinc-800/80 px-4 py-3.5 text-xs text-zinc-400 font-mono flex items-center justify-between">
                   <span>Cryptographic Blockchain Entry</span>
                   <span className="text-zinc-600">ID: {credential.batchId}</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Right Column (Integrity) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#09090b] rounded-2xl border border-zinc-800/80 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8 border-b border-zinc-800/80 pb-6">
                <div className="p-2 bg-zinc-800/50 rounded-lg">
                  <Shield className="h-4 w-4 text-zinc-300" />
                </div>
                <h2 className="text-sm font-bold tracking-widest text-zinc-300 uppercase">Cryptographic Integrity</h2>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Merkle Root (On-Chain)</p>
                  <div className="rounded-xl bg-[#050505] border border-zinc-800/80 p-4 text-[11px] font-mono text-zinc-500 break-all leading-loose shadow-inner relative group cursor-default">
                    {String(credential.merkleRoot)}
                    {isVerified && <div className="absolute inset-0 bg-emerald-500/5 rounded-xl transition-opacity opacity-0 group-hover:opacity-100" />}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Proof Hash (Document Leaf)</p>
                  <div className="rounded-xl bg-[#050505] border border-emerald-900/30 p-4 text-[11px] font-mono text-emerald-400/80 break-all leading-loose shadow-inner">
                    {String(credential.credentialHash)}
                  </div>
                </div>

                {isVerified && (
                  <div className="rounded-xl bg-[#022c22]/10 border border-emerald-900/40 p-6 mt-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />
                    <div className="flex gap-4">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-400/90 leading-relaxed font-medium">
                        This digital record has been cryptographically verified against the on-chain Merkle root. The attributes shown above are 100% authentic.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#09090b] rounded-2xl border border-zinc-800/80 p-8 shadow-2xl">
              <h3 className="text-[11px] font-black tracking-widest uppercase text-zinc-500 mb-4">Blockchain Security Protocol</h3>
              <p className="text-xs text-zinc-400/80 leading-loose">
                This verification queries the Sepolia Ethereum blockchain to verify specific individual attributes by resolving the cryptographic hash pathway. The underlying sensitive institutional database remains private and off-chain.
              </p>
            </div>

            <div className="bg-[#09090b] rounded-xl border border-zinc-800/80 px-8 py-5 flex items-center justify-between shadow-sm">
               <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Verification Status</p>
                 <p className={`text-xs font-mono font-bold flex items-center gap-2 ${credential.revoked ? 'text-red-500' : (isVerified || credential.status === 'MINTED') ? 'text-emerald-500' : 'text-amber-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${credential.revoked ? 'bg-red-500' : (isVerified || credential.status === 'MINTED') ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {credential.revoked ? 'REVOKED' : isVerified ? 'VERIFIED (SECURE)' : credential.status === 'MINTED' ? 'VERIFIED' : 'PENDING SIGNATURE'}
                </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
