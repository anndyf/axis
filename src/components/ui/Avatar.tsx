import { cn } from './cn'

function iniciais(nome?: string | null) {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  return ((partes[0][0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

const TONS = {
  neutro: 'bg-subtle text-fg-muted ring-1 ring-line',
  destaque: 'bg-accent text-on-accent',
  menu: 'bg-sidebar-active text-sidebar-fg ring-1 ring-sidebar-line',
} as const

/** Avatar com iniciais (ou imagem). Tamanhos: sm 24px, md 32px, lg 40px. Tom: neutro, destaque (azul) ou menu (sobre o menu lateral). */
export function Avatar({ nome, src, size = 'md', tom = 'neutro', className }: { nome?: string | null; src?: string | null; size?: 'sm' | 'md' | 'lg'; tom?: keyof typeof TONS; className?: string }) {
  const tamanho = size === 'sm' ? 'size-6 text-[10px]' : size === 'lg' ? 'size-10 text-sm' : 'size-8 text-xs'
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn('shrink-0 rounded-full object-cover', tamanho, className)} />
  }
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-medium', TONS[tom], tamanho, className)}>
      {iniciais(nome)}
    </span>
  )
}
