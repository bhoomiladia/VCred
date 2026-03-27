"use client"

import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { useState } from "react"
import { useUser } from "@/lib/user-context"

export default function InstitutionDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useUser()
  // Mock institution verification status - in production this would come from API/context
  const [isVerified] = useState(user?.isVerified ?? true)

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar 
        role="institution"
        userName={user?.name || "Admin User"}
        userEmail={user?.email || "admin@example.com"}
        institutionName={user?.institutionName || "Demo Institution"}
        isVerified={isVerified}
      />
      <main className="md:pl-64">
        {children}
      </main>
    </div>
  )
}
