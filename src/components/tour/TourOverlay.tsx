'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTourStore, TOUR_PASSOS } from '@/store/useTourStore'
import { X, ArrowLeft, ArrowRight, MapPin } from 'lucide-react'

const POPUP_LARGURA = 320
const MARGEM = 12

interface Retangulo {
  top: number
  left: number
  width: number
  height: number
}

function medir(el: Element): Retangulo {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export default function TourOverlay() {
  const { ativo, passoIndex, proximo, voltar, sair } = useTourStore()
  const pathname = usePathname()
  const router = useRouter()

  const passo = TOUR_PASSOS[passoIndex]
  const [rect, setRect] = useState<Retangulo | null>(null)
  const alvoRef = useRef<Element | null>(null)

  // Navega até a página do passo atual, se ainda não estiver nela.
  useEffect(() => {
    if (!ativo || !passo) return
    if (pathname !== passo.pagina) {
      router.push(passo.pagina)
    }
  }, [ativo, passo, pathname, router])

  // Procura o elemento-alvo do passo assim que a página certa carrega; tenta por
  // alguns segundos porque o conteúdo real (dados do Supabase) demora a chegar.
  useEffect(() => {
    if (!ativo || !passo) {
      setRect(null)
      alvoRef.current = null
      return
    }
    if (pathname !== passo.pagina) return

    if (!passo.alvo) {
      setRect(null)
      alvoRef.current = null
      return
    }

    let tentativas = 0
    let cancelado = false
    setRect(null)

    const intervalo = setInterval(() => {
      if (cancelado) return
      const el = document.querySelector(`[data-tour="${passo.alvo}"]`)
      tentativas++
      if (el) {
        clearInterval(intervalo)
        alvoRef.current = el
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => {
          if (!cancelado) setRect(medir(el))
        }, 350)
      } else if (tentativas > 30) {
        clearInterval(intervalo)
        alvoRef.current = null
        setRect(null)
      }
    }, 120)

    return () => {
      cancelado = true
      clearInterval(intervalo)
    }
  }, [ativo, passo, pathname])

  // Reposiciona ao rolar/redimensionar enquanto o alvo estiver com destaque.
  useEffect(() => {
    if (!alvoRef.current) return
    function atualizar() {
      if (alvoRef.current) setRect(medir(alvoRef.current))
    }
    window.addEventListener('scroll', atualizar, true)
    window.addEventListener('resize', atualizar)
    return () => {
      window.removeEventListener('scroll', atualizar, true)
      window.removeEventListener('resize', atualizar)
    }
  }, [rect !== null])

  const handleSair = useCallback(() => sair(), [sair])

  useEffect(() => {
    if (!ativo) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleSair()
      if (e.key === 'ArrowRight') proximo()
      if (e.key === 'ArrowLeft') voltar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ativo, proximo, voltar, handleSair])

  if (!ativo || !passo || pathname !== passo.pagina) return null

  const primeiro = passoIndex === 0
  const ultimo = passoIndex === TOUR_PASSOS.length - 1

  const popupStyle = calcularPosicaoPopup(rect, passo.posicao)

  return (
    <>
      {/* Backdrop com "buraco" no elemento em destaque (técnica do box-shadow gigante) */}
      <div
        className="fixed z-[200] transition-all duration-300 ease-out"
        style={
          rect
            ? {
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12,
                borderRadius: 14,
                boxShadow: '0 0 0 9999px rgba(15,15,23,0.62)',
                border: '2px solid rgba(96,165,250,0.9)',
              }
            : {
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(15,15,23,0.62)',
              }
        }
      />

      {/* Popup */}
      <div
        className="fixed z-[210] w-80 bg-card border border-border rounded-2xl shadow-2xl p-4 transition-all duration-300 ease-out"
        style={popupStyle}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            <MapPin className="w-3 h-3" /> Passo {passoIndex + 1} de {TOUR_PASSOS.length}
          </div>
          <button onClick={handleSair} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Sair do tour">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm font-bold text-foreground leading-snug">{passo.titulo}</p>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{passo.texto}</p>

        <div className="flex items-center gap-1.5 mt-4">
          {TOUR_PASSOS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1 rounded-full transition-all ${idx === passoIndex ? 'w-4 bg-primary' : 'w-1 bg-border'}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 mt-4">
          <button
            onClick={voltar}
            disabled={primeiro}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </button>
          <button
            onClick={proximo}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            {ultimo ? 'Concluir' : 'Próximo'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  )
}

function calcularPosicaoPopup(rect: Retangulo | null, posicao?: 'top' | 'bottom' | 'left' | 'right'): React.CSSProperties {
  if (typeof window === 'undefined') return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  if (!rect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  const clampLeft = (left: number) => Math.min(Math.max(MARGEM, left), vw - POPUP_LARGURA - MARGEM)

  switch (posicao) {
    case 'right':
      return {
        top: Math.min(Math.max(MARGEM, rect.top), vh - MARGEM - 200),
        left: Math.min(rect.left + rect.width + MARGEM, vw - POPUP_LARGURA - MARGEM),
      }
    case 'left':
      return {
        top: Math.min(Math.max(MARGEM, rect.top), vh - MARGEM - 200),
        left: Math.max(MARGEM, rect.left - POPUP_LARGURA - MARGEM),
      }
    case 'top':
      return {
        left: clampLeft(rect.left + rect.width / 2 - POPUP_LARGURA / 2),
        bottom: Math.max(MARGEM, vh - rect.top + MARGEM),
      }
    case 'bottom':
    default:
      return {
        left: clampLeft(rect.left + rect.width / 2 - POPUP_LARGURA / 2),
        top: Math.min(rect.top + rect.height + MARGEM, vh - MARGEM - 160),
      }
  }
}
