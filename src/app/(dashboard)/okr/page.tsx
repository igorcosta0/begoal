import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function OkrPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OKRs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seus Key Results e acompanhe o progresso
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
          + Novo KR
        </button>
      </div>

      {/* Placeholder — será substituído pelos componentes de KR */}
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Os KRs aparecerão aqui. Módulo em desenvolvimento.
        </p>
      </div>
    </div>
  )
}