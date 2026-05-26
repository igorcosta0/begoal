import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

// Formata valor de acordo com o tipo:
// Percentual: 0.8079 → "80,8%"
// Moeda:      121827.81 → "R$ 121.827,81"
// Numero:     42 → "42"
export function formatValor(value: number, tipoValor?: string): string {
  if (!tipoValor) return formatNumber(value)
  switch (tipoValor) {
    case 'Percentual':
      return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(value)
    case 'Moeda':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value)
    default:
      return formatNumber(value)
  }
}

export function getProgressColor(progress: number) {
  if (progress >= 70) return 'bg-green-500'
  if (progress >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function getProgressStatus(progress: number) {
  if (progress >= 70) return 'No prazo'
  if (progress >= 40) return 'Em risco'
  return 'Atrasado'
}