"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Shield, CheckCircle2, Search, ArrowRight, GraduationCap, Building2, Zap, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { VerificationModal } from "@/components/verification-modal"
import { useUser } from "@/lib/user-context"
// Assuming the component was added here. Adjust the path if shadcn placed it elsewhere (e.g., "@/components/ui/silk")
import Silk from "@/components/Silk"

// ── Animated Counter ───────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const numericPart = parseInt(target.replace(/[^0-9]/g, "")) || 0

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    const duration = 2000
    const steps = 60
    const increment = numericPart / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= numericPart) {
        setCount(numericPart)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [started, numericPart])

  const prefix = target.startsWith("<") ? "<" : ""
  return (
    <div ref={ref}>
      <span>{prefix}{count}{suffix}</span>
    </div>
  )
}

// ── Certificate Hero Section (Professional with Realistic Stamp) ───────────────
function CertificateHero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  const certY = useTransform(scrollYProgress, [0, 1], [0, -100])
  const certScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])
  const certOpacity = useTransform(scrollYProgress, [0.85, 1], [1, 0])

  // Stamp Animation: Scales down, fades in, and rotates into place for a realistic hit
  const stampOpacity = useTransform(scrollYProgress, [0.12, 0.2], [0, 0.9])
  const stampScale = useTransform(scrollYProgress, [0.12, 0.22], [3, 1])
  const stampRotate = useTransform(scrollYProgress, [0.12, 0.22], [-35, -12])

  const textY = useTransform(scrollYProgress, [0, 0.3], [0, -20])
  const detailsOpacity = useTransform(scrollYProgress, [0.35, 0.5], [0, 1])

  return (
    <div ref={containerRef} className="relative h-[200vh] w-full pt-32">
      <div className="sticky top-10 flex flex-col items-center justify-center overflow-hidden px-4 py-20 min-h-screen">

        <motion.div
          style={{ y: certY, scale: certScale, opacity: certOpacity }}
          className="relative w-full max-w-6xl aspect-[1.4/1] bg-zinc-950/20 rounded-3xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] p-16 md:p-24 flex flex-col items-center justify-between text-center overflow-hidden z-10 backdrop-blur-2xl group"
        >
          {/* Subtle Background Elements - Reduced opacities for better transparency */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none opacity-50" />
          <div className="absolute inset-6 border border-white/5 rounded-2xl pointer-events-none" />

          {/* Large Faint Watermark Logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none translate-y-4">
            <Shield className="w-[700px] h-[700px] text-emerald-400" />
          </div>

          <div className="relative z-10 w-full space-y-12 transition-all duration-700">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative group/icon">
                <div className="absolute inset-0 blur-3xl bg-emerald-500/20 group-hover/icon:bg-emerald-500/30 transition-colors" />
                <Shield className="w-20 h-20 text-emerald-400 relative z-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              </div>
              <h2 className="text-[10px] md:text-sm font-black tracking-[0.6em] text-emerald-400 uppercase italic">VCRED Decentralized Registry</h2>
            </div>

            <motion.div style={{ y: textY }} className="space-y-8">
              <p className="text-zinc-500 italic font-serif text-xl md:text-2xl">Authenticated Proof of Digital Integrity</p>
              <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white uppercase italic leading-none bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-600">
                Absolute Truth
              </h1>
              <div className="h-1 w-48 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent mx-auto rounded-full" />
              <p className="text-zinc-500 italic font-serif max-w-3xl mx-auto leading-relaxed text-sm md:text-xl px-8 opacity-80">
                This certificate witnesses that the associated metadata has been successfully anchored to the 
                blockchain, verified by the Merkle Genesis Protocol B16.
              </p>
            </motion.div>

            <div className="pt-16 flex justify-between items-end px-10 md:px-20">
              <div className="text-left space-y-3">
                <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.3em]">Network Authority</p>
                <div className="w-40 h-px bg-zinc-800" />
                <p className="text-sm md:text-lg font-black text-zinc-400 italic tracking-tight">ACCRED MAINNET v3.0</p>
              </div>
              <div className="text-right space-y-3">
                <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.3em]">Registry Identity</p>
                <div className="w-40 h-px bg-zinc-800" />
                <p className="text-[10px] font-mono text-emerald-500/50 uppercase tracking-tighter">BLOCK_CHAIN_ROOT_0xAE45</p>
              </div>
            </div>
          </div>

          <motion.div
            style={{
              opacity: stampOpacity,
              scale: stampScale,
              rotate: stampRotate
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            {/* Realistic Tilted Stamp */}
            <div className="relative px-10 py-5 border-[6px] border-blue-600/80 rounded-lg text-blue-500 font-black text-5xl md:text-7xl tracking-tighter uppercase mix-blend-screen shadow-[inset_0_0_20px_rgba(59,130,246,0.2)]">
              <span className="opacity-90">Verified</span>
              {/* Subtle texture overlay for realism */}
              <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ opacity: detailsOpacity }}
          className="mt-20 text-center space-y-6 max-w-3xl px-8 relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-semibold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            Zero-Knowledge Consensus Active
          </div>
          <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            Integrity is now automated.
          </h3>
          <p className="text-zinc-400 leading-relaxed text-lg md:text-xl">
            VCRED secures academic achievements with cryptographic precision,
            transforming standard credentials into immutable digital assets.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link href="/role-select">
              <Button size="lg" className="rounded-full px-8 h-14 text-base font-semibold bg-blue-600 hover:bg-blue-500 transition-colors">
                Join Network
              </Button>
            </Link>
            <Link href="/verify">
              <Button variant="outline" size="lg" className="rounded-full px-8 h-14 text-base font-semibold bg-zinc-900/50 border-white/20 hover:bg-zinc-800 text-white transition-colors backdrop-blur-md">
                Verify Credential
              </Button>
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [verificationResult, setVerificationResult] = useState<"verified" | "not-found" | null>(null)

  const { user } = useUser()

  const handleVerification = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const isVerified = searchQuery.toLowerCase().includes("valid") || searchQuery.length > 10
      setVerificationResult(isVerified ? "verified" : "not-found")
      setShowVerificationModal(true)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-blue-500/30 relative">

      {/* Background Silk Canvas - Positioned at bottom layer */}
      <div className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
        <Silk color="#1c0f28ff" />
      </div>

      {/* Subtle Ambient Background Gradient to blend with Silk */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] border-b border-white/5 bg-transparent backdrop-blur-md">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-8">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 group-hover:bg-emerald-500 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white uppercase italic">VCRED</span>
          </Link>

          <nav className="hidden items-center gap-12 md:flex">
            <Link href="/verify-cert" className="text-xs font-bold text-zinc-400 transition-colors hover:text-white uppercase tracking-[0.3em]">
              Verify
            </Link>
            {user && (
              <Link href={`/dashboard/${user.role}`} className="text-xs font-bold text-zinc-400 transition-colors hover:text-white uppercase tracking-[0.3em]">
                Dashboard
              </Link>
            )}
            <Link href="/role-select">
              <Button variant="outline" className="rounded-full border-white/10 hover:bg-white/10 bg-zinc-950/20 text-zinc-100 backdrop-blur-md px-8 h-12 text-xs font-bold uppercase tracking-widest">
                Sign In
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative z-20">

        {/* Scroll-animated Certificate Section */}
        <section className="relative">
          <CertificateHero />
        </section>

        {/* Following Sections with semi-transparent backgrounds to let the Silk peek through slightly */}
        <div className="relative border-t border-white/5 bg-zinc-950/90 backdrop-blur-3xl">
          {/* Feature Cards Grid */}
          <section className="relative mx-auto max-w-7xl px-8 py-32 md:py-48">
            <div className="text-center mb-24">
              <h2 className="text-5xl font-black tracking-tighter text-white mb-6 uppercase italic">Protocol Features</h2>
              <div className="h-1.5 w-24 bg-emerald-600 mx-auto rounded-full" />
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: FileCheck,
                  title: "Immutable Issuance",
                  description: "Leverage Merkle Trees to batch-mint certificates with cryptographic signatures."
                },
                {
                  icon: Shield,
                  title: "On-Chain Registry",
                  description: "Every credential is a witness to the blockchain, ensuring zero tampering risk."
                },
                {
                  icon: Zap,
                  title: "Consensus Verification",
                  description: "Verify any physical or digital credential in milliseconds via public explorers."
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="group relative rounded-3xl border border-white/5 bg-zinc-900/40 p-12 transition-all hover:bg-zinc-900/60 hover:border-emerald-500/30 backdrop-blur-xl"
                >
                  <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-950 text-emerald-500 transition-all group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white shadow-xl">
                    <feature.icon className="h-8 w-8" />
                  </div>
                  <h3 className="mb-4 text-2xl font-black text-white tracking-tight uppercase italic">{feature.title}</h3>
                  <p className="text-zinc-500 leading-relaxed font-medium">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Paths Section */}
          <section className="relative py-32 bg-zinc-950/50 border-t border-white/5 overflow-hidden">
            <div className="mx-auto max-w-7xl px-8">
              <div className="text-center mb-20">
                <h2 className="text-5xl font-black tracking-tighter text-white mb-6 uppercase italic">Identity Nodes</h2>
                <div className="h-1.5 w-24 bg-emerald-600 mx-auto rounded-full" />
              </div>

              <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
                <Link href="/role-select?role=student" className="group block">
                  <div className="relative h-full rounded-3xl border border-white/5 bg-zinc-900/40 p-12 transition-all hover:border-emerald-500/30 hover:bg-zinc-900/60 backdrop-blur-xl">
                    <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-950 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-2xl">
                      <GraduationCap className="h-10 w-10" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-4 uppercase italic">Student Node</h3>
                    <p className="text-zinc-500 leading-relaxed mb-8 font-medium text-lg">Access your digital vault, share verifiable proofs, and own your academic legacy forever.</p>
                    <div className="flex items-center gap-3 text-emerald-500 font-black uppercase tracking-widest text-sm group-hover:translate-x-2 transition-transform">
                      Initialize Vault <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>

                <Link href="/role-select?role=institution" className="group block">
                  <div className="relative h-full rounded-3xl border border-white/5 bg-zinc-900/40 p-12 transition-all hover:border-emerald-500/30 hover:bg-zinc-900/60 backdrop-blur-xl">
                    <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-950 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-2xl">
                      <Building2 className="h-10 w-10" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-4 uppercase italic">Authority Node</h3>
                    <p className="text-zinc-500 leading-relaxed mb-8 font-medium text-lg">Issue bulk credentials, manage registry records, and eliminate verification overhead instantly.</p>
                    <div className="flex items-center gap-3 text-emerald-500 font-black uppercase tracking-widest text-sm group-hover:translate-x-2 transition-transform">
                      Open Console <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* Stats Bar */}
          <section className="py-24 border-y border-white/5 bg-black">
            <div className="mx-auto max-w-7xl px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                {[
                  { value: "100", suffix: "K+", label: "Anchored Seals" },
                  { value: "450", suffix: "+", label: "Protocol Admins" },
                  { value: "99", suffix: ".99%", label: "Consensus Uptime" },
                  { value: "<10", suffix: "ms", label: "Verify Latency" }
                ].map((stat, i) => (
                  <div key={i} className="space-y-4">
                    <div className="text-5xl md:text-6xl font-black text-white tracking-tighter italic">
                      <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.4em]">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-24 bg-black relative z-20">
        <div className="mx-auto max-w-7xl px-8 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4">
            <Shield className="h-10 w-10 text-emerald-600" />
            <span className="text-3xl font-black tracking-tighter text-white uppercase italic">VCRED</span>
          </div>
          <p className="text-zinc-600 text-sm font-medium tracking-tight">Decentralized Trust Network © 2026. All proofs recorded on-chain via Merkle Genesis.</p>
        </div>
      </footer>

      {/* Verification Modal */}
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => {
          setShowVerificationModal(false)
          setVerificationResult(null)
        }}
        result={verificationResult}
        credentialId={searchQuery}
      />
    </div>
  )
}