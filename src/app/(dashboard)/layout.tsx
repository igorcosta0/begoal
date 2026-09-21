import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import TourOverlay from '@/components/tour/TourOverlay'

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

  const [{ data: roleData }, { data: perfilPublico }] = await Promise.all([
    supabase
      .from('user_company_roles')
      .select('permission_level')
      .eq('user_id', user.id)
      .limit(1)
      .single(),
    supabase
      .from('funcionarios_perfil_publico')
      .select('foto_url')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const permissionLevel = roleData?.permission_level ?? 'visualizador'

  return (
    <div className="min-h-screen bg-background">
      <Topbar permissionLevel={permissionLevel} userEmail={user.email} fotoUrl={perfilPublico?.foto_url ?? null} />
      <main className="max-w-[1440px] mx-auto px-4 md:px-6 py-6">
        {children}
      </main>
      <TourOverlay />
    </div>
  )
}
