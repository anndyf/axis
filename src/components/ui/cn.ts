/** Junta classes ignorando valores falsos (sem dependência externa). */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Ícones lucide-react com tamanho e traço uniformes: <Icone {...ICONE} />. */
export const ICONE = { size: 16, strokeWidth: 1.75 } as const
