'use client'

import { useState } from 'react'

interface ModalConfirmarExclusaoProps {
  open: boolean
  titulo: string
  descricao?: string
  loading?: boolean
  onConfirmar: () => void
  onClose: () => void
}

export default function ModalConfirmarExclusao({
  open,
  titulo,
  descricao,
  loading,
  onConfirmar,
  onClose,
}: ModalConfirmarExclusaoProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">

        <div className="text-center mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">🗑️</span>
          </div>
          <h2 className="text-base font-semibold text-foreground">
            {titulo}
          </h2>
          {descricao && (
            <p className="text-xs text-muted-foreground mt-1">
              {descricao}
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4 text-center">
          ⚠️ Esta ação não pode ser desfeita.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 px-4 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={loading}
            className="flex-1 py-2 px-4 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}