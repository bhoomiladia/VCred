"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Layout, Palette, CheckCircle2, ArrowRight, MousePointer2, Loader2, Type } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CertificatePreview } from "@/components/CertificatePreview"
import { toast } from "sonner"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/lib/user-context"

const PRESETS = [
  { id: 'professional', name: 'Professional Classic', icon: Palette, description: 'Traditional serif design with ornate borders' },
  { id: 'minimal', name: 'Minimalist Tech', icon: Layout, description: 'Clean, Swiss-style typography with bold accents' },
  { id: 'modern', name: 'Modern Corporate', icon: CheckCircle2, description: 'Sleek blocks and high-contrast professional layout' },
  { id: 'elegant', name: 'Elegant Script', icon: Type, description: 'Script typography with gold and dark accents' },
  { id: 'vibrant', name: 'Vibrant Dynamic', icon: Palette, description: 'Colorful modern gradients and abstract shapes' },
  { id: 'academic', name: 'Academic Scroll', icon: Layout, description: 'Traditional parchment style with deep crimson borders' },
]

export default function SelectTemplatePage() {
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const batchId = searchParams.get('batchId')

  const [selectedPreset, setSelectedPreset] = useState('professional')
  const [isSaving, setIsSaving] = useState(false)

  const [sampleStudent, setSampleStudent] = useState<any>(null)
  const [isLoadingStudent, setIsLoadingStudent] = useState(true)

  useEffect(() => {
    if (!batchId || !user?.walletAddress) {
      // Don't auto-redirect, let the UI show the empty state
      return
    }
    fetchFirstStudent()
  }, [batchId, user?.walletAddress])

  const fetchFirstStudent = async () => {
    if (!user?.walletAddress) return;
    try {
      const res = await fetch(`/api/institution/students?batch=${batchId}&walletAddress=${user.walletAddress}`)
      if (res.ok) {
        const data = await res.json()
        if (data.records && data.records.length > 0) {
          setSampleStudent(data.records[0])
        }
      }
    } catch (err) {
      console.error("Failed to fetch sample student:", err)
    } finally {
      setIsLoadingStudent(false)
    }
  }

  const handleSaveTemplate = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/institution/save-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          templateId: selectedPreset,
          layoutConfig: null
        })
      })

      if (res.ok) {
        toast.success("Template settings saved! Proceeding to Minting...")
        router.push(`/dashboard/institution?tab=mint&batch=${batchId}`)
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to save template")
      }
    } catch (err) {
      toast.error("Connection error")
    } finally {
      setIsSaving(false)
    }
  }

    return (
        <>
            <DashboardHeader 
                title="Certificate Designer" 
                description={batchId ? `Configure branding and layout for Batch ${batchId}` : "Select a batch to begin designing"}
                userName="Admin"
            />

            <div className="px-6 py-2">
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/institution')} className="gap-2 text-muted-foreground hover:text-white">
                <ArrowRight className="h-4 w-4 rotate-180" />
                Back to Dashboard
                </Button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1600px] mx-auto">
                <div className="lg:col-span-4 space-y-6">
                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        Select Design Strategy
                    </h3>

                    <div className="space-y-4">
                        {PRESETS.map((p) => (
                        <div 
                            key={p.id}
                            onClick={() => setSelectedPreset(p.id)}
                            className={`
                                p-4 rounded-xl border-2 transition-all cursor-pointer group
                                ${selectedPreset === p.id ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${selectedPreset === p.id ? 'bg-primary text-white' : 'bg-muted'}`}>
                                    <p.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm tracking-tight">{p.name}</p>
                                    <p className="text-xs text-muted-foreground">{p.description}</p>
                                </div>
                            </div>
                        </div>
                        ))}
                    </div>
                </Card>

                <Button 
                    className="w-full h-14 text-lg font-bold gap-2 shadow-xl shadow-primary/20" 
                    onClick={handleSaveTemplate}
                    disabled={isSaving}
                >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    Confirm & Proceed to IPFS
                    <ArrowRight className="ml-auto h-5 w-5" />
                </Button>

                <Card className="p-4 border-amber-500/20 bg-amber-500/5 text-amber-500">
                    <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <MousePointer2 className="h-3 w-3" /> Note
                    </p>
                    <p className="mt-2 text-xs leading-relaxed">
                        IPFS metadata pinning will begin automatically after this step. Ensure the layout is perfect as CIDs are immutable.
                    </p>
                </Card>
                </div>

                {/* Right Panel: Live Preview */}
                <div className="lg:col-span-8 bg-zinc-900/50 rounded-2xl border border-border/50 p-6 flex flex-col items-center overflow-auto custom-scrollbar sticky top-6 h-[calc(100vh-140px)]">
                    <div className="mb-4 self-start border-l-4 border-primary pl-4">
                        <h4 className="font-bold text-white uppercase tracking-widest text-[10px]">Live Canvas Verification</h4>
                        <p className="text-zinc-500 text-[9px] mt-0.5 italic">Rendering sample student data at adjusted scale</p>
                    </div>
                    
                    <div className="flex-1 w-full flex justify-center pt-8 pb-32">
                        {isLoadingStudent ? (
                            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                <Loader2 className="h-10 w-10 animate-spin" />
                                <p className="text-xs uppercase tracking-widest font-bold">Synchronizing Batch Data...</p>
                            </div>
                        ) : sampleStudent ? (
                            <div className="origin-top scale-[0.4] sm:scale-[0.5] md:scale-[0.6] lg:scale-[0.6] xl:scale-[0.7] transition-all duration-500 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] bg-white">
                                <CertificatePreview 
                                    templateId={selectedPreset}
                                    studentData={sampleStudent}
                                />
                            </div>
                        ) : !batchId ? (
                            <div className="text-center text-muted-foreground p-12 max-w-md">
                                <Palette className="mx-auto h-12 w-12 mb-4 text-primary/20" />
                                <h3 className="text-xl font-bold text-white mb-2">No Batch Specified</h3>
                                <p className="text-sm mb-6">You must select a batch from the dashboard to start designing certificates.</p>
                                <Button onClick={() => router.push('/dashboard/institution')}>
                                    Go to Dashboard
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground p-12">
                                <p className="text-xl font-bold text-white mb-2">No certificates to be edited.</p>
                                <p className="text-sm">Please ensure you have uploaded student data for this batch first.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </>
    )
}
