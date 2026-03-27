"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/lib/user-context"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { Building2, ArrowRight, ShieldCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"

/**
 * Helper: get the Privy embedded wallet address from the user object.
 */
function getPrivyWalletAddress(privyUser: any): string | null {
  if (!privyUser?.linkedAccounts) return null;
  const embeddedWallet = privyUser.linkedAccounts.find(
    (a: any) => a.type === 'wallet' && a.walletClientType === 'privy'
  );
  return embeddedWallet?.address || null;
}

const institutionSchema = z.object({
  institutionName: z.string().min(2, "Institution name is required"),
  officialEmailDomain: z.string().optional().or(z.literal('')),
  institutionLogo: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  adminEmail: z.string().email("Valid email required"),
  name: z.string().min(2, "Full name is required"),
  location: z.string().min(2, "Location is required").optional().or(z.literal('')),
  website: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  isGovtRegistered: z.boolean().default(false).optional(),
  roll: z.string().optional(),
  dept: z.string().optional(),
})

type InstitutionFormValues = z.infer<typeof institutionSchema>

export default function InstitutionOnboarding() {
  const router = useRouter()
  
  // Use Privy instead of wagmi for institution auth
  const { authenticated: privyAuthenticated, user: privyUser, ready: privyReady } = usePrivy()
  const privyWalletAddress = privyUser ? getPrivyWalletAddress(privyUser) : null;
  
  const { updateUser } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [institutionExists, setInstitutionExists] = useState(false)
  const [checkingInstitution, setCheckingInstitution] = useState(false)
  const [institutionId, setInstitutionId] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<InstitutionFormValues>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      isGovtRegistered: false,
    }
  })

  // Pre-fill email from Google auth
  useEffect(() => {
    if (privyUser?.google?.email) {
      setValue('adminEmail', privyUser.google.email);
    }
    if (privyUser?.google?.name) {
      setValue('name', privyUser.google.name);
    }
  }, [privyUser, setValue])

  const watchName = watch("institutionName")

  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchName && watchName.length > 3) {
        checkInstitution(watchName)
      } else {
        setInstitutionExists(false)
        setInstitutionId(null)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [watchName])

  // Redirect if not authenticated via Privy
  useEffect(() => {
    if (privyReady && !privyAuthenticated) {
      router.replace('/role-select?role=institution');
    }
  }, [privyReady, privyAuthenticated, router])

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

  const onSubmit = async (data: InstitutionFormValues) => {
    if (!privyAuthenticated || !privyWalletAddress) {
      toast.error("Not authenticated. Please sign in with Google first.")
      return
    }

    // Validation for Worker
    if (institutionExists) {
      if (!data.roll || !data.dept) {
        toast.error("Employee ID and Department are required for staff registration.")
        return
      }
    } else {
      // Validation for Admin
      if (!data.officialEmailDomain || !data.website || !data.location) {
        toast.error("Please fill in all institution details for registration.")
        return
      }
    }

    try {
      setIsSubmitting(true)
      const subRole = institutionExists ? 'worker' : 'admin'
      const workerStatus = subRole === 'worker' ? 'PENDING' : undefined

      const res = await fetch("/api/onboard/institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: privyWalletAddress,
          ...data,
          subRole,
          workerStatus,
          institutionId
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to complete onboarding")
      }

      const result = await res.json()
      toast.success(institutionExists ? "Staff registration pending admin approval!" : "Institution profile created!")
      updateUser(result.user)
      router.push("/dashboard/institution")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while Privy initializes
  if (!privyReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-500 border border-purple-500/20">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Institution {institutionExists ? "Staff Join" : "Setup"}</h1>
          <p className="mt-2 text-muted-foreground">
            {institutionExists 
              ? `Join ${watchName} as a verified staff member.` 
              : "Register your institution to start issuing verifiable credentials."}
          </p>
          {privyUser?.google?.email && (
            <p className="mt-1 text-xs text-primary">
              Signed in as {privyUser.google.email}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 p-8 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Institution Name</label>
              <div className="relative">
                <input 
                  {...register("institutionName")}
                  className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                  placeholder="Heritage Institute of Technology"
                />
                {checkingInstitution && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {institutionExists && (
                <p className="text-xs text-purple-500 font-medium flex items-center gap-1 mt-1">
                  <ShieldCheck className="h-3 w-3" /> Institution found! You are joining as Staff.
                </p>
              )}
              {errors.institutionName && <p className="text-xs text-red-500">{errors.institutionName.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                <label className="text-sm font-medium text-foreground">Contact Email</label>
                <input 
                  {...register("adminEmail")}
                  className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                  placeholder="john@example.com"
                  type="email"
                />
                {errors.adminEmail && <p className="text-xs text-red-500">{errors.adminEmail.message}</p>}
              </div>

              {institutionExists ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Employee ID</label>
                    <input 
                      {...register("roll")}
                      className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                      placeholder="EMP-123"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Department</label>
                    <input 
                      {...register("dept")}
                      className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                      placeholder="CS / Administration"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Official Email Domain</label>
                    <input 
                      {...register("officialEmailDomain")}
                      className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                      placeholder="heritageit.edu.in"
                    />
                    {errors.officialEmailDomain && <p className="text-xs text-red-500">{errors.officialEmailDomain.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Website Link</label>
                    <input 
                      {...register("website")}
                      className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                      placeholder="https://heritageit.edu.in"
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Location</label>
                    <input 
                      {...register("location")}
                      className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                      placeholder="Kolkata, India"
                    />
                  </div>

                  <div className="flex items-center space-x-3 rounded-lg border border-border/50 bg-background/30 p-4 col-span-full">
                    <input 
                      type="checkbox" 
                      id="isGovtRegistered" 
                      {...register("isGovtRegistered")} 
                      className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-600 bg-transparent"
                    />
                    <div className="space-y-1 leading-none">
                      <label htmlFor="isGovtRegistered" className="text-sm w-full cursor-pointer font-medium leading-none flex items-center gap-2">
                        Government Registered <ShieldCheck className="w-4 h-4 text-purple-500" />
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
              <Link href="/role-select" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </Link>
              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {institutionExists ? "Sending Request..." : "Saving Profile..."}
                  </>
                ) : (
                  <>
                    {institutionExists ? "Join Institution" : "Complete Registration"} <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

