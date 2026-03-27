"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, Menu, X } from "lucide-react"
import { useState } from "react"

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">VCRED</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/verify"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Verify Credential
          </Link>
          <Link
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="#institutions"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            For Institutions
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" asChild>
            <Link href="/role-select">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/role-select">Get Started</Link>
          </Button>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border/40 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            <Link
              href="/verify"
              className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Verify Credential
            </Link>
            <Link
              href="#features"
              className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="#institutions"
              className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              For Institutions
            </Link>
            <div className="mt-4 flex flex-col gap-2 border-t border-border/40 pt-4">
              <Button variant="ghost" asChild className="justify-start">
                <Link href="/role-select">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/role-select">Get Started</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
