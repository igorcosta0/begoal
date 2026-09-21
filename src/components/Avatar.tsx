interface AvatarProps {
  nome: string
  fotoUrl?: string | null
  sizeClassName?: string
  corClassName?: string
}

/** Círculo de identidade de uma pessoa — foto quando ela tem uma cadastrada
 *  (funcionarios_perfil_publico.foto_url), senão a inicial do nome, mesmo
 *  padrão visual que já existia em cada lugar (sizeClassName/corClassName
 *  controlam tamanho e cor de fundo pra manter o estilo de cada tela). */
export default function Avatar({
  nome,
  fotoUrl,
  sizeClassName = 'w-10 h-10 text-sm',
  corClassName = 'bg-primary/10 text-primary',
}: AvatarProps) {
  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={nome}
        className={`${sizeClassName} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (
    <div className={`${sizeClassName} rounded-full flex items-center justify-center shrink-0 font-semibold ${corClassName}`}>
      {(nome || 'U').charAt(0).toUpperCase()}
    </div>
  )
}
