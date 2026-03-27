"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { GraduationCap, ArrowRight, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"

const studentSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  rollNumber: z.string().min(2, "Roll number is required"),
  email: z.string().email("Valid college email required"),
  branch: z.string().min(2, "Branch/Department is required"),
})

type StudentFormValues = z.infer<typeof studentSchema>

export default function StudentOnboarding() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  
  const [step, setStep] = useState<1 | 2>(1)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [otp, setOtp] = useState("")
  
  // Store form data between steps
  const [savedData, setSavedData] = useState<StudentFormValues | null>(null)

  const { register, handleSubmit, formState: { errors }, watch, setError } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
  })

  const onSendOtp = async (data: StudentFormValues) => {
    if (!isConnected || !address) {
      toast.error("Wallet disconnected. Please connect your wallet first.")
      return
    }

    try {
      setIsSending(true)
      const res = await fetch("/api/onboard/student/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        if (res.status === 403) {
          setError("email", { type: "manual", message: errorData.error })
          return // Stop execution, don't toast
        }
        throw new Error(errorData.error || "Failed to send OTP")
      }

      setSavedData(data)
      setStep(2)
      toast.success("OTP sent to your college email!")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSending(false)
    }
  }

  const onVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!savedData) return
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP")
      return
    }

    try {
      setIsVerifying(true)
      const res = await fetch("/api/onboard/student/verify-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          ...savedData,
          otp,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to verify OTP")
      }

      toast.success("Student profile created!")
      router.push("/dashboard/student")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-xl relative z-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-500 border border-blue-500/20">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Student Registration</h1>
          <p className="mt-2 text-muted-foreground">Link your identity to claim verifiable academic credentials.</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          
          {/* Step 1: Form */}
          <div className={`transition-all duration-500 ${step === 1 ? 'opacity-100 translate-x-0 relative' : 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none'}`}>
            <form onSubmit={handleSubmit(onSendOtp)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Full Name</label>
                  <input 
                    {...register("name")}
                    className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                    placeholder="John Doe"
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Roll Number / ID</label>
                  <input 
                    {...register("rollNumber")}
                    className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                    placeholder="2461012"
                  />
                  {errors.rollNumber && <p className="text-xs text-red-500">{errors.rollNumber.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">College Email</label>
                  <input 
                    {...register("email")}
                    className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                    placeholder="student@heritageit.edu.in"
                    type="email"
                  />
                  <p className="text-[10px] text-muted-foreground">We will verify your domain against registered institutions.</p>
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Branch / Department</label>
                  <select
                    {...register("branch")}
                    className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all appearance-none"
                  >
                    <option value="" disabled>Select your branch</option>
                    <option value="AIML">Artificial Intelligence & Machine Learning (AIML)</option>
                    <option value="CSE">Computer Science & Engineering (CSE)</option>
                    <option value="DS">Data Science (DS)</option>
                    <option value="EE">Electrical Engineering (EE)</option>
                    <option value="ECE">Electronics (ECE)</option>
                    <option value="ME">Mechanical Engineering (ME)</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {errors.branch && <p className="text-xs text-red-500">{errors.branch.message}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <Link href="/role-select" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </Link>
                <Button type="submit" size="lg" disabled={isSending} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Verify Email <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Step 2: OTP Verification */}
          <div className={`transition-all duration-500 ${step === 2 ? 'opacity-100 translate-x-0 relative' : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'}`}>
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 text-purple-500 mb-4">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium">Check your email</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit code to <span className="text-foreground font-medium">{savedData?.email}</span>
                </p>
              </div>

              <form onSubmit={onVerifySubmit} className="space-y-6 mt-8">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Verification Code</label>
                  <input 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={6}
                    className="flex h-14 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-center text-2xl tracking-[0.5em] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all font-mono"
                    placeholder="------"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-border/50">
                  <Button type="submit" size="lg" disabled={isVerifying || otp.length !== 6} className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Complete Registration"
                    )}
                  </Button>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    Change Email Address
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

