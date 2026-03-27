"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@/lib/user-context"
import { useAccount } from "wagmi"
import { motion } from "framer-motion"
import { 
  Shield, 
  LayoutDashboard, 
  Building2, 
  Users, 
  LogOut,
  GraduationCap,
  FileCheck,
  Share2,
  Search,
  ShieldAlert,
  Upload,
  Palette,
  ScanLine,
  Menu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { VCubeLogo } from "@/components/v-cube-logo"
import { AnimatedVCred } from "@/components/animated-vcred"

interface SidebarProps {
  role: "hq" | "institution" | "student"
  userName?: string
  userEmail?: string
  institutionName?: string
  isVerified?: boolean
}

export function DashboardSidebar({ 
  role, 
  userName = "User",
  userEmail = "",
  institutionName,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useUser()
  const { address } = useAccount()

  const displayUserName = user?.name || user?.institutionName || userName;
  const displayUserEmail = user?.email || userEmail;
  const displayInstitutionName = user?.institutionName || institutionName;
  const verificationStatus = user?.verificationStatus ?? 'PENDING';
  const isVerified = user?.subRole === 'worker' ? true : verificationStatus === 'VERIFIED';

  // Show ADMIN button ONLY if this wallet is the master admin
  const masterAddress = process.env.NEXT_PUBLIC_MASTER_ADMIN_ADDRESS;
  const isMasterAdmin = !!(masterAddress && address && address.toLowerCase() === masterAddress.toLowerCase());

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const getNavItems = () => {
    switch (role) {
      case 'hq':
        return [
          { href: "/dashboard/hq", label: "Overview", icon: LayoutDashboard },
          { href: "/dashboard/hq/institutions", label: "Institutions", icon: Building2 },
          { href: "/dashboard/hq/users", label: "Users", icon: Users },
        ]
      case 'institution':
        const items = [
          { href: "/dashboard/institution", label: "Overview", icon: LayoutDashboard },
          { href: "/dashboard/institution/upload", label: "Bulk Upload", icon: Upload },
          { href: "/dashboard/institution/registrar", label: "Registrar", icon: ScanLine },
          { href: "/dashboard/institution/select-template", label: "Templates", icon: Palette },
          { href: "/dashboard/institution/students", label: "Student Records", icon: GraduationCap },
        ]
        if (user?.subRole === 'admin') {
          items.push({ href: "/dashboard/institution/staff", label: "Staff Management", icon: Users })
        }
        return items
      case 'student':
        return [
          { href: "/dashboard/student", label: "Overview", icon: LayoutDashboard },
          { href: "/dashboard/student/vault", label: "My Vault", icon: FileCheck },
          { href: "/dashboard/student/share", label: "Share", icon: Share2 },
        ]
      default:
        return []
    }
  }

  const items = getNavItems()

  const SidebarContent = () => (
    <>
      {/* Search */}
      <div className="border-b border-border/50 p-4">
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "text-sidebar-primary-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-primary"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className={cn("relative h-4 w-4", isActive && "text-sidebar-primary-foreground")} />
              <span className="relative">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Institution Verification Status - only show for institution role, reflects real status */}
      {role === "institution" && (
        <div className="px-4 pb-2">
          <div className={cn(
            "rounded-lg p-3",
            isVerified ? "bg-emerald-500/10 ring-1 ring-emerald-500/20" : "bg-amber-500/10 ring-1 ring-amber-500/20"
          )}>
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isVerified ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              )} />
              <span className={cn("text-xs font-medium", isVerified ? "text-emerald-500" : "text-amber-500")}>
                {isVerified ? "Verified Institution" : "Pending HQ Approval"}
              </span>
            </div>
            {displayInstitutionName && (
              <p className="mt-1 text-xs text-muted-foreground truncate">{displayInstitutionName}</p>
            )}
          </div>
        </div>
      )}

      {/* GOD MODE: Red Admin Button — only visible to the master admin wallet */}
      {isMasterAdmin && role === "institution" && (
        <div className="px-4 pb-3">
          <Link href="/dashboard/hq">
            <Button
              className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg shadow-red-600/20 transition-all hover:shadow-red-600/40"
              size="sm"
            >
              <ShieldAlert className="h-4 w-4" />
              HQ Admin Portal
            </Button>
          </Link>
        </div>
      )}

      {/* User Profile */}
      <div className="border-t border-border/50 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {displayUserName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium truncate">{displayUserName}</p>
            <p className="text-xs text-muted-foreground truncate">{displayUserEmail}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleLogout}
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  )

  const LogoHeader = () => (
    <div className="flex shrink-0 h-16 items-center gap-3 border-b border-border/50 px-6">
      <VCubeLogo className="h-8 w-8 drop-shadow-md" />
      <AnimatedVCred className="text-xl font-black tracking-tighter uppercase italic text-foreground" />
      <span className="ml-auto rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">
        {role}
      </span>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col border-r border-border/50 bg-sidebar">
        <LogoHeader />
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Floating Button + Sheet) */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" className="h-14 w-14 rounded-full shadow-2xl shadow-indigo-500/40 bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 transition-all">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-r-border/50 flex flex-col">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">Dashboard Navigation Links</SheetDescription>
            <LogoHeader />
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
