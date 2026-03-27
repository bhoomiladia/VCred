import { DashboardSidebar } from "@/components/dashboard-sidebar"

export default function HQDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar 
        role="hq"
        userName="System Admin"
        userEmail="admin@vcred.io"
      />
      <main className="md:pl-64">
        {children}
      </main>
    </div>
  )
}
