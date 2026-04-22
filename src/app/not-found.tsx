import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-xl font-semibold text-foreground">
          Página não encontrada
        </h2>
        <p className="text-sm text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link
          href="/okr"
          className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Voltar para o início
        </Link>
      </div>
    </div>
  )
}