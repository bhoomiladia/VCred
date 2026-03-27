"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Shield,
  MoreVertical,
  Download,
  Share2,
  ExternalLink,
  Copy,
  GraduationCap,
  Award,
  FileText,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CredentialCardProps {
  credential: {
    id: string
    title: string
    type: "degree" | "certificate" | "badge" | "transcript"
    institution: string
    issueDate: string
    status: "verified" | "pending" | "expired"
    hash?: string
  }
  variant?: "default" | "compact"
  showActions?: boolean
  onShare?: () => void
  onDownload?: () => void
  onView?: () => void
}

const typeIcons = {
  degree: GraduationCap,
  certificate: Award,
  badge: Shield,
  transcript: FileText,
}

const typeColors = {
  degree: "from-emerald-500/20 to-emerald-600/5",
  certificate: "from-blue-500/20 to-blue-600/5",
  badge: "from-amber-500/20 to-amber-600/5",
  transcript: "from-purple-500/20 to-purple-600/5",
}

const statusConfig = {
  verified: {
    label: "Verified",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  expired: {
    label: "Expired",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
}

export function CredentialCard({
  credential,
  variant = "default",
  showActions = true,
  onShare,
  onDownload,
  onView,
}: CredentialCardProps) {
  const Icon = typeIcons[credential.type]
  const statusStyle = statusConfig[credential.status]

  if (variant === "compact") {
    return (
      <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br", typeColors[credential.type])}>
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-medium text-foreground">{credential.title}</h4>
              <p className="truncate text-xs text-muted-foreground">{credential.institution}</p>
            </div>
            <Badge variant="outline" className={cn("shrink-0", statusStyle.className)}>
              {statusStyle.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/80">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", typeColors[credential.type])} />
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn("flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br", typeColors[credential.type])}>
              <Icon className="h-7 w-7 text-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">{credential.title}</h3>
              <p className="text-sm text-muted-foreground">{credential.institution}</p>
              <div className="flex items-center gap-3 pt-1">
                <Badge variant="outline" className={cn(statusStyle.className)}>
                  {credential.status === "verified" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                  {statusStyle.label}
                </Badge>
                <span className="text-xs text-muted-foreground">Issued {credential.issueDate}</span>
              </div>
            </div>
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onView}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (credential.hash) {
                      navigator.clipboard.writeText(credential.hash)
                    }
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Hash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {credential.hash && (
          <div className="mt-4 rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Blockchain Hash</p>
            <p className="mt-1 truncate font-mono text-xs text-foreground">{credential.hash}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
