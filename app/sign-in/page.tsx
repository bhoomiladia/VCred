"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, ArrowRight, ArrowLeft, Building2, GraduationCap, Mail, Lock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser } from "@/lib/user-context"

export default function SignInPage() {
  const router = useRouter()
  const { updateUser } = useUser()
  const [role, setRole] = useState<"student" | "institution">("student")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call for authentication
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)

    // Save mock user name and the entered email to context
    updateUser({
      name: email.split('@')[0], // simple mock name from email prefix
      email: email,
      role: role,
      ...(role === "institution" ? { institutionName: "Demo Institution", isVerified: true } : {})
    })
    
    // Redirect to appropriate dashboard
    if (role === "institution") {
      router.push("/dashboard/institution")
    } else {
      router.push("/dashboard/student")
    }
  }

  const canProceed = email.trim() !== "" && password.trim() !== ""

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/3 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 left-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-border/50 bg-background/80 backdrop-blur-xl">
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
        </div>
      </header>

      <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center px-6 py-16">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="text-balance text-3xl font-bold tracking-tight">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to manage your decentralized credentials
            </p>
          </motion.div>

          {/* Form Container */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/50 bg-card/50 p-8 backdrop-blur-xl"
          >
            {/* Role Toggle Tabs */}
            <div className="mb-8 flex rounded-xl border border-border/50 bg-secondary/30 p-1">
              <button
                onClick={() => setRole("student")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  role === "student"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Student
              </button>
              <button
                onClick={() => setRole("institution")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  role === "institution"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="h-4 w-4" />
                Institution
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-secondary/50 pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="#" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-secondary/50 pl-10"
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full gap-2" 
                disabled={!canProceed || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In as {role === "student" ? "Student" : "Institution"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/role-select" className="text-primary hover:underline font-medium">
                Sign Up
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
