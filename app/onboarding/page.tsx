"use client"

import { useState, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, ArrowRight, ArrowLeft, User, Mail, Building2, GraduationCap, FileText, CheckCircle2, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useUser } from "@/lib/user-context"
import { cn } from "@/lib/utils"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import { VCubeLogo } from "@/components/v-cube-logo"
import { AnimatedVCred } from "@/components/animated-vcred"

interface FormData {
  name: string
  email: string
  // Institution specific
  institutionName?: string
  institutionType?: string
  accreditationId?: string
  location?: string
  govRegistered?: string
  linkedin?: string
  website?: string
  // Student specific
  studentId?: string
  university?: string
  roll?: string
  gpa?: string
  dept?: string
}

function OnboardingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const role = searchParams.get("role") as "student" | "institution" | null
  const { updateUser } = useUser()
  
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    institutionName: "",
    institutionType: "",
    accreditationId: "",
    location: "",
    govRegistered: "",
    linkedin: "",
    website: "",
    studentId: "",
    university: "",
    roll: "",
    gpa: "",
    dept: ""
  })

  const totalSteps = role === "institution" ? 3 : 3

  const [institutionExists, setInstitutionExists] = useState(false)
  const [checkingInstitution, setCheckingInstitution] = useState(false)
  const [institutionId, setInstitutionId] = useState<string | null>(null)

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Check for institution existence as user types
    if (field === "institutionName" && value.length > 3) {
      checkInstitution(value)
    }
  }

  const checkInstitution = async (name: string) => {
    setCheckingInstitution(true)
    try {
      const res = await fetch(`/api/institution/check-exists?name=${encodeURIComponent(name)}`)
      const data = await res.json()
      if (data.exists) {
        setInstitutionExists(true)
        setInstitutionId(data.institutionId)
      } else {
        setInstitutionExists(false)
        setInstitutionId(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCheckingInstitution(false)
    }
  }

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const { address } = useAccount()

  const handleSubmit = async () => {
    if (!address) {
      toast.error("Please connect your wallet")
      return
    }
    setIsSubmitting(true)
    
    const subRole = role === 'institution' ? (institutionExists ? 'worker' : 'admin') : undefined
    const workerStatus = subRole === 'worker' ? 'PENDING' : undefined

    const payload = {
      walletAddress: address, // This will be handled by the API using session/params if needed, but for now we pass it
      ...formData,
      role,
      subRole,
      workerStatus,
      institutionId
    }

    try {
      const res = await fetch(`/api/onboard/${role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await res.json()
      
      if (result.success) {
        updateUser(result.user)
        router.push(`/dashboard/${role}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.trim() !== "" && formData.email.trim() !== ""
      case 2:
        if (role === "institution") {
          if (institutionExists) {
            return formData.institutionName?.trim() !== "" && formData.roll?.trim() !== "" && formData.dept?.trim() !== ""
          }
          return formData.institutionName?.trim() !== "" && formData.institutionType?.trim() !== "" && formData.location?.trim() !== "" && formData.govRegistered?.trim() !== ""
        }
        return formData.studentId?.trim() !== "" && formData.university?.trim() !== "" && formData.roll?.trim() !== "" && formData.gpa?.trim() !== "" && formData.dept?.trim() !== ""
      case 3:
        return true
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 right-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/role-select" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <Link href="/" className="flex items-center gap-3">
              <VCubeLogo className="h-8 w-8 drop-shadow-md" />
              <AnimatedVCred className="text-xl font-black tracking-tighter uppercase italic text-foreground" />
            </Link>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Step {step} of {totalSteps}</span>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    i + 1 <= step ? "bg-primary" : "bg-secondary"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-xl px-6 py-16">
        {/* Role Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex justify-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 text-sm backdrop-blur">
            {role === "institution" ? (
              <Building2 className="h-3.5 w-3.5 text-primary" />
            ) : (
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
            )}
            <span className="text-muted-foreground capitalize">{role} Onboarding</span>
          </div>
        </motion.div>

        {/* Form Container */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-8 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Personal Information</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Let&apos;s start with your basic details
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => updateFormData("name", e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => updateFormData("email", e.target.value)}
                        className="bg-secondary/50 pl-10"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Role-specific Info */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    {role === "institution" ? (
                      <Building2 className="h-7 w-7 text-primary" />
                    ) : (
                      <GraduationCap className="h-7 w-7 text-primary" />
                    )}
                  </div>
                  <h2 className="text-xl font-semibold">
                    {role === "institution" ? "Institution Details" : "Academic Details"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {role === "institution"
                      ? "Tell us about your institution"
                      : "Provide your academic information"}
                  </p>
                </div>

                {role === "institution" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="institutionName">Institution Name</Label>
                      <div className="relative">
                        <Input
                          id="institutionName"
                          placeholder="e.g., Stanford University"
                          value={formData.institutionName}
                          onChange={(e) => updateFormData("institutionName", e.target.value)}
                          className={cn("bg-secondary/50", institutionExists && "border-primary/50 bg-primary/5")}
                        />
                        {checkingInstitution && (
                          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      {institutionExists && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-primary font-medium flex items-center gap-1.5 mt-1.5"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Institution found! You are registering as a Staff / Worker.
                        </motion.p>
                      )}
                    </div>

                    {institutionExists ? (
                      // Worker View
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-4 pt-2"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="roll">Employee ID / ID Number</Label>
                          <Input
                            id="roll"
                            placeholder="e.g., EMP-2024-001"
                            value={formData.roll}
                            onChange={(e) => updateFormData("roll", e.target.value)}
                            className="bg-secondary/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dept">Department</Label>
                          <Input
                            id="dept"
                            placeholder="e.g., Registrar's Office"
                            value={formData.dept}
                            onChange={(e) => updateFormData("dept", e.target.value)}
                            className="bg-secondary/50"
                          />
                        </div>
                      </motion.div>
                    ) : (
                      // Admin View
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4 border-t border-border/50 pt-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="institutionType">Institution Type</Label>
                          <select
                            id="institutionType"
                            value={formData.institutionType}
                            onChange={(e) => updateFormData("institutionType", e.target.value)}
                            className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">Select type...</option>
                            <option value="university">University</option>
                            <option value="college">College</option>
                            <option value="vocational">Vocational School</option>
                            <option value="certification">Certification Body</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                              id="location"
                              placeholder="e.g., California, USA"
                              value={formData.location}
                              onChange={(e) => updateFormData("location", e.target.value)}
                              className="bg-secondary/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="govRegistered">Gov. Registered?</Label>
                            <select
                              id="govRegistered"
                              value={formData.govRegistered}
                              onChange={(e) => updateFormData("govRegistered", e.target.value)}
                              className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <option value="">Select...</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website">Domain / Website (for HQ Verification)</Label>
                          <Input
                            id="website"
                            type="url"
                            placeholder="https://university.edu"
                            value={formData.website}
                            onChange={(e) => updateFormData("website", e.target.value)}
                            className="bg-secondary/50"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Student ID</Label>
                      <Input
                        id="studentId"
                        placeholder="e.g., STU-2024-001"
                        value={formData.studentId}
                        onChange={(e) => updateFormData("studentId", e.target.value)}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="university">University / Institution</Label>
                      <Input
                        id="university"
                        placeholder="e.g., Stanford University"
                        value={formData.university}
                        onChange={(e) => updateFormData("university", e.target.value)}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roll">Roll Number</Label>
                      <Input
                        id="roll"
                        placeholder="e.g., CS-2024-05"
                        value={formData.roll}
                        onChange={(e) => updateFormData("roll", e.target.value)}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gpa">GPA</Label>
                      <Input
                        id="gpa"
                        placeholder="e.g., 3.8"
                        value={formData.gpa}
                        onChange={(e) => updateFormData("gpa", e.target.value)}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dept">Department</Label>
                      <Input
                        id="dept"
                        placeholder="e.g., Computer Science"
                        value={formData.dept}
                        onChange={(e) => updateFormData("dept", e.target.value)}
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <FileText className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Review & Confirm</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Please review your information before submitting
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
                    <h4 className="text-xs font-medium uppercase text-muted-foreground">Personal Info</h4>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Name</span>
                        <span className="text-sm font-medium">{formData.name || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Email</span>
                        <span className="text-sm font-medium">{formData.email || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
                    <h4 className="text-xs font-medium uppercase text-muted-foreground">
                      {role === "institution" ? "Institution Info" : "Academic Info"}
                    </h4>
                    <div className="mt-3 space-y-2">
                      {role === "institution" ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Institution</span>
                            <span className="text-sm font-medium">{formData.institutionName || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Type</span>
                            <span className="text-sm font-medium capitalize">{formData.institutionType || "-"}</span>
                          </div>
                          {formData.accreditationId && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Accreditation ID</span>
                              <span className="text-sm font-medium">{formData.accreditationId}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Location</span>
                            <span className="text-sm font-medium">{formData.location || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Gov. Registered</span>
                            <span className="text-sm font-medium">{formData.govRegistered || "-"}</span>
                          </div>
                          {formData.linkedin && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">LinkedIn</span>
                              <span className="text-sm font-medium truncate max-w-[150px]">{formData.linkedin}</span>
                            </div>
                          )}
                          {formData.website && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Website</span>
                              <span className="text-sm font-medium truncate max-w-[150px]">{formData.website}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Student ID</span>
                            <span className="text-sm font-medium">{formData.studentId || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">University</span>
                            <span className="text-sm font-medium">{formData.university || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Roll Number</span>
                            <span className="text-sm font-medium">{formData.roll || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">GPA</span>
                            <span className="text-sm font-medium">{formData.gpa || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Department</span>
                            <span className="text-sm font-medium">{formData.dept || "-"}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {role === "institution" && (
                    <div className="rounded-xl border border-border/50 bg-primary/5 p-4">
                      <div className="flex items-start gap-3">
                        <Lock className="mt-0.5 h-5 w-5 text-primary" />
                        <div>
                          <h4 className="text-sm font-medium">Verification Required</h4>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Your institution will need to be verified by our HQ team before you can issue credentials. This typically takes 24-48 hours.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1 gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            {step < totalSteps ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="flex-1 gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
