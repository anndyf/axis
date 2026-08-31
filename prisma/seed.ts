import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando o preenchimento do banco para demonstração...')

  const hashedPassword = await bcrypt.hash('admin123', 10)

  // 0. Escola de demonstração (mesmo padrão do backfill-escola-cetep.ts)
  const escola = await prisma.escola.upsert({
    where: { slug: 'cetep' },
    update: {},
    create: {
      nome: 'CETEP/LNAB',
      slug: 'cetep',
      plano: 'ENTERPRISE',
      status: 'ATIVA',
    },
  })
  const escolaId = escola.id

  // 1. Criar Áreas de Conhecimento Padrão
  console.log('🌱 Criando áreas de conhecimento...')
  const areasPadrao = [
    "Ciências da Natureza e suas Tecnologias",
    "Ciências Humanas e Articuladoras",
    "Formação Técnica e Profissional",
    "Linguagens, Códigos e suas Tecnologias",
    "Matemática e suas Tecnologias"
  ]

  for (const nome of areasPadrao) {
    await prisma.areaConhecimento.upsert({
      where: { escolaId_nome: { escolaId, nome } },
      update: {},
      create: { nome, escolaId }
    })
  }

  // 1. Criar ou Atualizar Admin
  const admin = await prisma.user.upsert({
    where: { escolaId_username: { escolaId, username: 'admin' } },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@axis.com',
      password: hashedPassword,
      name: 'Administrador Global',
      isSuperuser: true,
      isStaff: true,
      isActive: true,
      isApproved: true,
      isDirecao: true,
      escolaId
    }
  })

  // 2. Criar Professores
  console.log('👨‍🏫 Criando professores...')
  const professoresData = [
    { name: 'Ricardo Santos', username: 'ricardo.prof', email: 'ricardo@axis.com' },
    { name: 'Ana Oliveira', username: 'ana.prof', email: 'ana@axis.com' },
    { name: 'Carlos Ferreira', username: 'carlos.prof', email: 'carlos@axis.com' },
    { name: 'Mariana Lima', username: 'mariana.prof', email: 'mariana@axis.com' },
    { name: 'Roberto Souza', username: 'roberto.prof', email: 'roberto@axis.com' }
  ]

  const professores = []
  for (const p of professoresData) {
    const user = await prisma.user.upsert({
      where: { escolaId_username: { escolaId, username: p.username } },
      update: {},
      create: {
        ...p,
        password: hashedPassword,
        isStaff: true,
        isActive: true,
        isApproved: true,
        escolaId
      }
    })
    professores.push(user)
  }

  // 3. Criar Cursos
  console.log('📚 Criando cursos...')
  const cursosData = [
    { nome: 'Técnico em Informática', sigla: 'I', modalidade: 'EPI', turnos: ['MATUTINO', 'VESPERTINO'] },
    { nome: 'Técnico em Enfermagem', sigla: 'E', modalidade: 'EPI', turnos: ['MATUTINO'] },
    { nome: 'Técnico em Administração', sigla: 'A', modalidade: 'PROEJA', turnos: ['NOTURNO'] }
  ]

  const cursos = []
  for (const c of cursosData) {
    const curso = await prisma.curso.upsert({
      where: { escolaId_sigla: { escolaId, sigla: c.sigla } }, // Usar sigla como chave única para evitar conflito
      update: { nome: c.nome, modalidade: c.modalidade, turnos: c.turnos },
      create: { ...c, escolaId }
    })
    cursos.push(curso)
  }

  // 4. Criar Turmas
  console.log('🏫 Criando turmas...')
  const turmas = []
  for (const curso of cursos) {
    const siglaCurso = curso.sigla // I, E ou A
    
    for (const serie of ['1', '2', '3']) {
      const turnoChar = curso.turnos[0].charAt(0) // M, V ou N
      const nomeTurma = `${serie}T${siglaCurso}${turnoChar}1` // Ex: 1TIM1, 1TEM1, 1TAN1
      
      let turma = await prisma.turma.findFirst({ where: { nome: nomeTurma, escolaId } })

      if (!turma) {
        turma = await prisma.turma.create({
          data: {
            nome: nomeTurma,
            cursoId: curso.id,
            serie: serie,
            turno: curso.turnos[0],
            anoLetivo: 2026,
            curso: curso.nome,
            escolaId
          }
        })
      }
      turmas.push(turma)
    }
  }

  // 5. Criar Disciplinas e vincular professores
  console.log('📖 Criando disciplinas...')
  const disciplinasNomes = ['Matemática', 'Português', 'História', 'Geografia', 'Física', 'Biologia', 'Química', 'Educação Física']
  
  for (const turma of turmas) {
    for (let i = 0; i < 5; i++) {
        const nomeIdx = (turma.id.length + i) % disciplinasNomes.length
        const nomeDisc = disciplinasNomes[nomeIdx]
        const profIdx = (turma.id.length + i) % professores.length
        const prof = professores[profIdx]
        
        let disc = await prisma.disciplina.findFirst({ 
            where: { nome: nomeDisc, turmaId: turma.id } 
        })

        if (!disc) {
            disc = await prisma.disciplina.create({
                data: {
                    nome: nomeDisc,
                    turmaId: turma.id,
                    usuariosPermitidos: {
                        connect: [{ id: prof.id }]
                    }
                }
            })
        }

        // 6. Criar Plano de Ensino para esta disciplina/professor/turma
        const planoExistente = await prisma.planoEnsino.findFirst({
            where: { 
                disciplinaNome: disc.nome,
                professorId: prof.id,
                turmas: { some: { id: turma.id } }
            }
        })

        if (!planoExistente) {
            await prisma.planoEnsino.create({
                data: {
                    disciplinaNome: disc.nome,
                    professorId: prof.id,
                    periodoInicio: new Date('2026-03-01'),
                    periodoFim: new Date('2026-03-15'),
                    indicadores: 'Desenvolver raciocínio lógico e interpretação de dados.',
                    conteudos: 'Introdução aos conceitos básicos e aplicações práticas.',
                    metodologias: 'Aulas expositivas e resolução de problemas em grupo.',
                    recursos: 'Quadro branco, projetor e material impresso.',
                    avaliacao: 'Participação em aula e atividade prática individual.',
                    turmas: {
                        connect: [{ id: turma.id }]
                    }
                }
            })
        }
    }
  }

  // 7. Criar Estudantes e Notas
  console.log('🎓 Criando estudantes e lançando notas...')
  const sobrenomes = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes']
  const nomesMasculinos = ['Gabriel', 'Lucas', 'Matheus', 'Pedro', 'João', 'Enzo', 'Guilherme', 'Nicolas', 'Felipe', 'Samuel']
  const nomesFemininos = ['Julia', 'Sofia', 'Alice', 'Manuela', 'Isabella', 'Laura', 'Maria', 'Beatriz', 'Bárbara', 'Camila']

  for (const turma of turmas) {
    const turmaDisciplinas = await prisma.disciplina.findMany({ where: { turmaId: turma.id } })
    
    for (let i = 1; i <= 10; i++) { // Reduzi para 10 por turma para ser mais rápido
      const isMasculino = Math.random() > 0.5
      const nomeBase = isMasculino ? nomesMasculinos[Math.floor(Math.random() * 10)] : nomesFemininos[Math.floor(Math.random() * 10)]
      const sobrenome = sobrenomes[Math.floor(Math.random() * 10)]
      const nomeCompleto = `${nomeBase} ${sobrenome} ${i}`
      const matricula = `${turma.nome.split(' ').join('')}-${i.toString().padStart(3, '0')}`

      const estudante = await prisma.estudante.upsert({
        where: { escolaId_matricula: { escolaId, matricula } },
        update: { nome: nomeCompleto, turmaId: turma.id },
        create: {
          matricula,
          nome: nomeCompleto,
          turmaId: turma.id,
          escolaId
        }
      })

      // Lançar Notas para cada disciplina
      for (const disc of turmaDisciplinas) {
        const notaRand = Math.random() * 10
        const status = notaRand >= 6 ? 'APROVADO' : (notaRand >= 3 ? 'RECUPERACAO' : 'DESISTENTE')

        await prisma.notaFinal.upsert({
          where: {
            estudanteId_disciplinaId: {
                estudanteId: estudante.id,
                disciplinaId: disc.id
            }
          },
          update: {}, // Não sobrescrever notas existentes se houver
          create: {
            estudanteId: estudante.id,
            disciplinaId: disc.id,
            nota: parseFloat(notaRand.toFixed(1)),
            nota1: parseFloat((notaRand * 0.5 + Math.random() * 3).toFixed(1)),
            nota2: parseFloat((notaRand * 0.7 + Math.random() * 2).toFixed(1)),
            nota3: parseFloat(notaRand.toFixed(1)),
            status: status as any,
            modifiedById: admin.id
          }
        })
      }
    }
  }

  console.log('✨ Banco de dados populado com sucesso!')
  console.log('🔑 Credenciais para teste: user: admin / pass: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
