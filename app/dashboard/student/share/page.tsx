"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Link as LinkIcon, 
  Copy, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Eye, 
  Clock, 
  Shield,
  ExternalLink,
  QrCode,
  FileCheck
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccount } from "wagmi"
import { toast } from "sonner"

interface Credential {
  _id: string
  degreeTitle: string
  branch: string
  credentialHash: string
  merkleRoot: string
  issuedAt: string
}

interface ShareLink {
  id: string
  credentialId: string
  credentialName: string
  url: string
  createdAt: string
  expiresAt: string | null
  views: number
  isActive: boolean
}

export default function SharePage() {
  const { address } = useAccount()
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState("")
  const [expiration, setExpiration] = useState("30")

  useEffect(() => {
    if (address) {
      fetch(`/api/student/credentials?address=${address}`)
        .then(res => res.json())
        .then(data => {
          if (data.credentials) {
            setCredentials(data.credentials)
            // Generate initial share links from credentials
            const links: ShareLink[] = data.credentials.map((c: Credential, idx: number) => ({
              id: `LINK-${String(idx + 1).padStart(3, "0")}`,
              credentialId: c._id,
              credentialName: `${c.degreeTitle} - ${c.branch}`,
              url: `${window.location.origin}/verify/${c.credentialHash}`,
              createdAt: new Date(c.issuedAt).toLocaleDateString(),
              expiresAt: null,
              views: 0,
              isActive: !!c.credentialHash
            }))
            setShareLinks(links)
          }
        })
        .catch(() => toast.error("Failed to sync credentials"))
    }
  }, [address])

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCreateLink = () => {
    if (!selectedCredential) return

    const credential = credentials.find(c => c._id === selectedCredential)
    const newLink: ShareLink = {
      id: `LINK-${String(shareLinks.length + 1).padStart(3, "0")}`,
      credentialId: selectedCredential,
      credentialName: credential ? `${credential.degreeTitle} - ${credential.branch}` : "",
      url: `${window.location.origin}/verify/${credential?.credentialHash || ""}`,
      createdAt: "Just now",
      expiresAt: expiration === "never" ? null : `${expiration} days`,
      views: 0,
      isActive: true
    }

    setShareLinks([newLink, ...shareLinks])
    setIsCreateOpen(false)
    setSelectedCredential("")
    setExpiration("30")
  }

  const handleDelete = (id: string) => {
    setShareLinks(shareLinks.filter(link => link.id !== id))
  }

  return (
    <>
      <DashboardHeader 
        title="Share Credentials" 
        description="Generate and manage public proof links"
        userName="AJ"
      />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>{shareLinks.filter(l => l.isActive).length} active share links</span>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Share Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Share Link</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Select Credential</Label>
                  <Select value={selectedCredential} onValueChange={setSelectedCredential}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a credential..." />
                    </SelectTrigger>
                    <SelectContent>
                      {credentials.map((cred) => (
                        <SelectItem key={cred._id} value={cred._id}>
                          {cred.degreeTitle} - {cred.branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Link Expiration</Label>
                  <Select value={expiration} onValueChange={setExpiration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="never">Never expire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground">
                    Anyone with this link can verify the authenticity of your credential. 
                    They will only see the credential details you choose to share.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateLink} disabled={!selectedCredential} className="flex-1">
                    Generate Link
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Share Links */}
        <div className="space-y-4">
          {shareLinks.map((link, i) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl border bg-card/50 p-6 ${
                link.isActive ? "border-border/50" : "border-destructive/20 bg-destructive/5"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    link.isActive ? "bg-primary/10" : "bg-destructive/10"
                  }`}>
                    <LinkIcon className={`h-5 w-5 ${link.isActive ? "text-primary" : "text-destructive"}`} />
                  </div>
                  <div>
                    <p className="font-medium">{link.credentialName}</p>
                    <code className="text-sm text-muted-foreground">{link.url}</code>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created {link.createdAt}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {link.views} views
                      </span>
                      {link.expiresAt && (
                        <span className={link.expiresAt === "Expired" ? "text-destructive" : ""}>
                          {link.expiresAt === "Expired" ? "Expired" : `Expires in ${link.expiresAt}`}
                        </span>
                      )}
                      {!link.expiresAt && (
                        <span className="text-primary">Never expires</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {link.isActive && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleCopy(link.id, link.url)}
                      >
                        {copiedId === link.id ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="icon">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}

          {shareLinks.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/50 p-12 text-center">
              <FileCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 font-medium">No share links yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a share link to let employers and others verify your credentials.
              </p>
              <Button className="mt-6" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Link
              </Button>
            </div>
          )}
        </div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 rounded-xl border border-border/50 bg-card/50 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Privacy & Security</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Share links provide cryptographic proof of your credentials without exposing sensitive personal data.
                You control who can verify your credentials and for how long.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}
