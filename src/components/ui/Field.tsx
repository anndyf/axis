import { forwardRef, useId, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from './cn'

const CONTROLE = cn(
  'w-full rounded-control border border-line bg-surface px-3 text-sm text-fg',
  'placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-150',
  'hover:border-line-strong focus:outline-none focus:border-accent focus:ring-3 focus:ring-ring/40',
  'disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-disabled',
  // Somente leitura (ex.: gestão vendo notas): parece texto, não campo
  'read-only:border-line-subtle read-only:bg-subtle read-only:hover:border-line-subtle read-only:focus:border-line read-only:focus:ring-0',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/25',
  // Celular: campo preenchido em cinza claro (padrão de app) e texto de 16px,
  // que evita o zoom automático do iOS ao focar
  'max-md:border-transparent max-md:bg-subtle max-md:shadow-none max-md:text-base max-md:focus:bg-surface'
)

export function Label({ className, children, opcional, obrigatorio, ...props }: LabelHTMLAttributes<HTMLLabelElement> & { opcional?: boolean; obrigatorio?: boolean }) {
  return (
    <label className={cn('block text-13 font-medium text-fg', className)} {...props}>
      {children}
      {obrigatorio && <span aria-hidden className="ml-0.5 text-danger-fg">*</span>}
      {obrigatorio && <span className="sr-only"> (obrigatório)</span>}
      {opcional && <span className="ml-1 font-normal text-fg-subtle">(opcional)</span>}
    </label>
  )
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null
  return <p id={id} role="alert" className="text-xs text-danger-fg">{children}</p>
}

export function FieldHint({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null
  return <p id={id} className="text-xs text-fg-subtle">{children}</p>
}

/**
 * Rótulo + controle + ajuda + erro, com ids ligados (aria-describedby).
 * O filho recebe id/aria via render prop.
 */
export function Field({ label, hint, error, opcional, obrigatorio, className, children }: {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  opcional?: boolean
  obrigatorio?: boolean
  className?: string
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
}) {
  const id = useId()
  const descricao = [hint ? `${id}-ajuda` : '', error ? `${id}-erro` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} opcional={opcional} obrigatorio={obrigatorio}>{label}</Label>
      {children({ id, 'aria-describedby': descricao, 'aria-invalid': error ? true : undefined })}
      <FieldHint id={`${id}-ajuda`}>{hint}</FieldHint>
      <FieldError id={`${id}-erro`}>{error}</FieldError>
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(CONTROLE, 'h-9', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(CONTROLE, 'py-2 leading-relaxed resize-y', className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(CONTROLE, 'h-9 appearance-none pr-8', className)} {...props}>
        {children}
      </select>
      <ChevronDown size={16} strokeWidth={1.75} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
    </div>
  )
})

export const Checkbox = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: ReactNode }>(function Checkbox({ className, label, id, ...props }, ref) {
  const auto = useId()
  const cid = id ?? auto
  const caixa = (
    <input
      ref={ref}
      id={cid}
      type="checkbox"
      className={cn('size-4 shrink-0 rounded border-line-strong accent-[var(--accent)] cursor-pointer disabled:cursor-not-allowed', className)}
      {...props}
    />
  )
  if (!label) return caixa
  return (
    <label htmlFor={cid} className="inline-flex items-center gap-2 text-sm text-fg cursor-pointer">
      {caixa}
      {label}
    </label>
  )
})

/** Interruptor liga/desliga (role="switch"). */
export function Switch({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean; id?: string }) {
  const auto = useId()
  const sid = id ?? auto
  return (
    <span className="inline-flex items-center gap-2">
      <button
        id={sid}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 disabled:opacity-50',
          checked ? 'bg-accent' : 'bg-line-strong'
        )}
      >
        <span className={cn('inline-block size-4 rounded-full bg-white shadow-card transition-transform duration-150', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
      </button>
      {label && <label htmlFor={sid} className="text-sm text-fg cursor-pointer">{label}</label>}
    </span>
  )
}
