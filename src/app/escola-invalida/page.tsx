export const metadata = {
  title: 'Áxis - Escola não encontrada'
}

export default async function EscolaInvalidaPage({
  searchParams
}: {
  searchParams: Promise<{ motivo?: string }>
}) {
  const { motivo } = await searchParams

  const mensagens: Record<string, string> = {
    nao_encontrada: 'Não encontramos nenhuma escola cadastrada para este endereço.',
    suspensa: 'O acesso desta escola está temporariamente suspenso. Entre em contato com o suporte.',
    cancelada: 'O acesso desta escola foi encerrado.',
  }

  const mensagem = mensagens[motivo || ''] || 'Não foi possível identificar a escola pelo endereço acessado.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-3">Escola não encontrada</h1>
        <p className="text-slate-600 text-sm leading-relaxed">{mensagem}</p>
        <p className="text-slate-400 text-xs mt-6">
          Verifique o endereço usado para acessar o sistema, ou entre em contato com a administração da sua escola.
        </p>
      </div>
    </div>
  )
}
