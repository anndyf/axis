import PaginaInstitucional from "@/components/PaginaInstitucional"

export const metadata = { title: "Áxis - Privacidade" }

export default function PrivacidadePage() {
  return (
    <PaginaInstitucional titulo="Política de privacidade" provisorio>
      <p>Esta política explica como o Áxis trata os dados pessoais registrados pela escola, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
      <h2>1. Dados tratados</h2>
      <ul>
        <li>Da equipe: nome, e-mail, usuário, papéis e registros de acesso.</li>
        <li>Dos estudantes: nome, matrícula, turma, notas, frequência, ocorrências e, quando houver, ficha de atendimento educacional especializado.</li>
      </ul>
      <h2>2. Finalidade</h2>
      <p>Os dados são usados somente para a gestão pedagógica e administrativa da escola. Cada escola vê apenas os próprios dados.</p>
      <h2>3. Acesso e segurança</h2>
      <p>O acesso é controlado por papéis definidos pela escola. As alterações relevantes ficam registradas na auditoria do sistema. Dados sensíveis, como a ficha AEE, só são vistos por quem tem permissão para isso.</p>
      <h2>4. Direitos do titular</h2>
      <p>Pedidos de acesso, correção ou exclusão de dados devem ser feitos à secretaria da escola, que é a controladora dos dados.</p>
    </PaginaInstitucional>
  )
}
