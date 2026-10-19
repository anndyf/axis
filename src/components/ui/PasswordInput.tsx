'use client'

import { forwardRef, useState, type InputHTMLAttributes, type KeyboardEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './Field'
import { cn } from './cn'
import { forcaSenha } from '@/lib/services/forca-senha'

/** Campo de senha com mostrar/ocultar e aviso de Caps Lock. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>>(function PasswordInput({ className, onKeyUp, onKeyDown, onBlur, ...props }, ref) {
  const [visivel, setVisivel] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const verificar = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          ref={ref}
          type={visivel ? 'text' : 'password'}
          className={cn('pr-10', className)}
          onKeyUp={(e) => { verificar(e); onKeyUp?.(e) }}
          onKeyDown={(e) => { verificar(e); onKeyDown?.(e) }}
          onBlur={(e) => { setCapsLock(false); onBlur?.(e) }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visivel}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-fg-subtle transition-colors duration-150 hover:text-fg"
        >
          {visivel ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
        </button>
      </div>
      {capsLock && <p role="status" className="text-xs text-warning-fg">Caps Lock está ativado.</p>}
    </div>
  )
})

const CORES = ['', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success']

/** Indicador de força da senha (o mínimo de 8 é o que o servidor exige). */
export function ForcaDaSenha({ senha }: { senha: string }) {
  const { nivel, rotulo } = forcaSenha(senha)
  if (nivel === 0) return <p className="text-xs text-fg-subtle">Use pelo menos 8 caracteres. Misture letras, números e símbolos.</p>
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-150', i <= nivel ? CORES[nivel] : 'bg-subtle')} />
        ))}
      </div>
      <p className={cn('text-xs', nivel === 1 ? 'text-danger-fg' : 'text-fg-muted')}>Força: {rotulo}</p>
    </div>
  )
}
