'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Download, X } from 'lucide-react'

// QR Code do link aberto (guia do Miro, etapa 3, F29), para imprimir ou pôr
// em apresentação. Gerado no navegador (biblioteca qrcode, carregada só aqui).

export default function ModalQrCode({ titulo, link, onClose }: { titulo: string; link: string; onClose: () => void }) {
  const [imagem, setImagem] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let ativo = true
    import('qrcode').then((QR) => QR.toDataURL(link, { width: 720, margin: 2, errorCorrectionLevel: 'M' })).then((url) => {
      if (ativo) setImagem(url)
    })
    return () => { ativo = false }
  }, [link])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      window.prompt('Copie o link:', link)
    }
  }

  const nomeArquivo = `qrcode-${titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'pesquisa'}.png`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">QR Code</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{titulo}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-secondary" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4 mx-auto w-60 h-60 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden">
          {imagem
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={imagem} alt={`QR Code da pesquisa ${titulo}`} className="w-full h-full" />
            : <div className="w-full h-full bg-secondary animate-pulse" />}
        </div>
        <p className="text-[11px] font-mono text-muted-foreground text-center mt-3 break-all">{link}</p>
        <div className="flex gap-2 mt-4">
          <a
            href={imagem ?? undefined}
            download={nomeArquivo}
            aria-disabled={!imagem}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 aria-disabled:opacity-50 aria-disabled:pointer-events-none"
          >
            <Download className="w-3.5 h-3.5" /> Baixar imagem
          </a>
          <button
            onClick={copiar}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border text-foreground hover:bg-secondary"
          >
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiado ? 'Copiado' : 'Copiar link'}
          </button>
        </div>
      </div>
    </div>
  )
}
