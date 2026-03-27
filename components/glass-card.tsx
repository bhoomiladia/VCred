import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
}

export function GlassCard({ children, className, hover = false, glow = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl",
        hover && "transition-all duration-300 hover:border-primary/40 hover:bg-card/50",
        glow && "shadow-[0_0_50px_-12px] shadow-primary/20",
        className
      )}
    >
      {children}
    </div>
  )
}

interface GlassCardHeaderProps {
  children: ReactNode
  className?: string
}

export function GlassCardHeader({ children, className }: GlassCardHeaderProps) {
  return (
    <div className={cn("border-b border-border/30 p-6", className)}>
      {children}
    </div>
  )
}

interface GlassCardContentProps {
  children: ReactNode
  className?: string
}

export function GlassCardContent({ children, className }: GlassCardContentProps) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  )
}

interface GlassCardFooterProps {
  children: ReactNode
  className?: string
}

export function GlassCardFooter({ children, className }: GlassCardFooterProps) {
  return (
    <div className={cn("border-t border-border/30 p-6", className)}>
      {children}
    </div>
  )
}
