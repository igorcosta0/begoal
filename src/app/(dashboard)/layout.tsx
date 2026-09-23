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

  // Pente fino (23/09/2026): antes pegava `.limit(1)` sem filtrar empresa —
  // quem tem papel em mais de uma empresa via o menu (Administração/Importar/
  // Cargos) de acordo com uma empresa qualquer. A empresa selecionada só
  // existe no navegador (useEmpresaStore), então o layout manda o papel de
  // TODAS e a Topbar escolhe o da empresa ativa.
  const [{ data: rolesData }, { data: perfilPublico }] = await Promise.all([
    supabase
      .from('user_company_roles')
      .select('client_id, permission_level')
      .eq('user_id', user.id),
    supabase
      .from('funcionarios_perfil_publico')
      .select('foto_url')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const papeisPorEmpresa: Record<string, string> = {}
  for (const r of (rolesData ?? []) as { client_id: string; permission_level: string }[]) {
    papeisPorEmpresa[r.client_id] = r.permission_level
  }

  return (
    <div className="min-h-screen bg-background">
      <Topbar papeisPorEmpresa={papeisPorEmpresa} userEmail={user.email} fotoUrl={perfilPublico?.foto_url ?? null} />
      <main className="max-w-[1440px] mx-auto px-4 md:px-6 py-6">
        {children}
      </main>
      <TourOverlay />
    </div>
  )
}
