"use client"

import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { useUser } from "@/lib/user-context"

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useUser()

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar 
        role="student"
        userName={user?.name || "Student User"}
        userEmail={user?.email || "student@example.com"}
      />
      <main className="md:pl-64">
        {children}
      </main>
    </div>
  )
}
