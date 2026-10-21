import PaginaInstitucional from "@/components/PaginaInstitucional"

export const metadata = { title: "Áxis - Termos de uso" }

export default function TermosPage() {
  return (
    <PaginaInstitucional titulo="Termos de uso" provisorio>
      <p>O Áxis é um sistema de gestão escolar oferecido à escola contratante para uso da equipe escolar, dos estudantes e dos responsáveis.</p>
      <h2>1. Acesso</h2>
      <p>Cada pessoa usa a própria conta, criada ou aprovada pela escola. A senha é pessoal e não deve ser compartilhada. A escola define os papéis de cada conta e pode suspender o acesso a qualquer momento.</p>
      <h2>2. Uso adequado</h2>
      <ul>
        <li>Registrar apenas informações verdadeiras e necessárias à vida escolar.</li>
        <li>Não tentar acessar dados de outras escolas, turmas ou estudantes sem autorização.</li>
        <li>Comunicar à escola qualquer suspeita de uso indevido da conta.</li>
      </ul>
      <h2>3. Responsabilidades</h2>
      <p>A escola é responsável pelo conteúdo que registra (notas, frequência, ocorrências e fichas). O Áxis mantém o sistema disponível e os registros de auditoria das alterações.</p>
      <h2>4. Alterações destes termos</h2>
      <p>Estes termos podem ser atualizados; a data da última atualização fica no topo desta página.</p>
    </PaginaInstitucional>
  )
}
