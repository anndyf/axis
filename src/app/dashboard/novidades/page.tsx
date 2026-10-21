import { CabecalhoPagina, Painel } from "@/components/ui"
import { NOVIDADES } from "@/lib/produto/novidades"
import pacote from "../../../../package.json"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: "Áxis - Novidades" }

/** Novidades por versão (o número da versão vem do package.json). */
export default async function NovidadesPage() {
  await paginaDoModulo('NUC')
  return (
    <div className="max-w-leitura">
      <CabecalhoPagina titulo="Novidades" descricao="O que mudou no sistema, por versão." dados={[{ rotulo: "Versão instalada", valor: pacote.version }]} />
      <div className="space-y-4">
        {NOVIDADES.map((v) => (
          <Painel key={v.versao} titulo={`Versão ${v.versao}`} descricao={v.rotulo}>
            <div className="space-y-4">
              {v.entregas.map((e) => (
                <section key={e.titulo}>
                  <h3 className="text-sm font-semibold text-fg">{e.titulo}</h3>
                  <ul className="mt-1.5 space-y-1 text-sm text-fg-muted">
                    {e.itens.map((i) => <li key={i} className="ml-5 list-disc">{i}</li>)}
                  </ul>
                </section>
              ))}
            </div>
          </Painel>
        ))}
      </div>
    </div>
  )
}
