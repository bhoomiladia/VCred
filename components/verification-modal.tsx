"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, X, Shield, ExternalLink, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface VerificationModalProps {
  isOpen: boolean
  onClose: () => void
  result: "verified" | "not-found" | null
  credentialId: string
}

export function VerificationModal({ isOpen, onClose, result, credentialId }: VerificationModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(credentialId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Mock data for verified credentials
  const mockCredential = {
    studentName: "Alex Johnson",
    degree: "Bachelor of Science in Computer Science",
    institution: "Stanford University",
    issuedDate: "May 15, 2024",
    merkleRoot: "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    blockNumber: "18,234,567"
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
              {/* Header Glow */}
              <div className={`absolute inset-x-0 top-0 h-40 ${result === "verified" ? "bg-gradient-to-b from-primary/20 to-transparent" : "bg-gradient-to-b from-destructive/20 to-transparent"}`} />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative p-8">
                {/* Status Icon */}
                <div className="mb-6 flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2, duration: 0.5 }}
                  >
                    {result === "verified" ? (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
                        <CheckCircle2 className="h-10 w-10 text-primary" />
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 ring-4 ring-destructive/20">
                        <XCircle className="h-10 w-10 text-destructive" />
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Status Text */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-2xl font-bold">
                    {result === "verified" ? "Credential Verified" : "Credential Not Found"}
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    {result === "verified"
                      ? "This credential is authentic and recorded on-chain."
                      : "This credential could not be found in our records."}
                  </p>
                </motion.div>

                {/* Credential Details (if verified) */}
                {result === "verified" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8 space-y-4"
                  >
                    <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
                      <div className="grid gap-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Student Name</p>
                            <p className="font-medium">{mockCredential.studentName}</p>
                          </div>
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Degree</p>
                          <p className="font-medium">{mockCredential.degree}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Institution</p>
                            <p className="text-sm font-medium">{mockCredential.institution}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Issued Date</p>
                            <p className="text-sm font-medium">{mockCredential.issuedDate}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* On-chain Proof */}
                    <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Merkle Root</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded-lg bg-background px-3 py-2 font-mono text-xs">
                          {mockCredential.merkleRoot}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={handleCopy}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      {copied && (
                        <p className="mt-2 text-xs text-primary">Copied to clipboard!</p>
                      )}
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Block #{mockCredential.blockNumber}</span>
                        <button className="flex items-center gap-1 text-primary hover:underline">
                          View on Explorer
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 flex gap-3"
                >
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Close
                  </Button>
                  {result === "verified" && (
                    <Button className="flex-1 gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Full Details
                    </Button>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
