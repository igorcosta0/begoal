import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administração</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie empresas, setores e usuários da plataforma
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-6 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Empresas</h2>
          <p className="text-xs text-muted-foreground">
            Cadastre e gerencie empresas clientes
          </p>
          <div className="pt-2">
            <span className="text-xs text-muted-foreground">Em desenvolvimento</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Setores</h2>
          <p className="text-xs text-muted-foreground">
            Gerencie os setores de cada empresa
          </p>
          <div className="pt-2">
            <span className="text-xs text-muted-foreground">Em desenvolvimento</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Usuários</h2>
          <p className="text-xs text-muted-foreground">
            Crie e gerencie usuários da plataforma
          </p>
          <div className="pt-2">
            <span className="text-xs text-muted-foreground">Em desenvolvimento</span>
          </div>
        </div>
      </div>
    </div>
  )
}