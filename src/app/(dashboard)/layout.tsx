import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: roleData } = await supabase
    .from('user_company_roles')
    .select('permission_level')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const permissionLevel = roleData?.permission_level ?? 'visualizador'

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar permissionLevel={permissionLevel} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}