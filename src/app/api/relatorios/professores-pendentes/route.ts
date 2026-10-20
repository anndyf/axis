import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const GET = rotaDoModulo('IND', 'leitura', async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.escolaId || !can(session.user, 'indicador.ler')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unidade = searchParams.get('unidade') || 'II'; // Padrão: II

    // Buscar todos os professores (pessoas que já enviaram alguma questão para o sistema)
    const users = await prisma.user.findMany({
      where: {
        escolaId: session.user.escolaId,
        questoes: {
          some: {} // ter alguma questão criada valida que é professor
        }
      },
      include: {
        questoes: {
          select: {
            unidade: true
          }
        }
      }
    });

    // Filtrar aqueles que não enviaram questões na unidade específica
    const pendentes = users.filter(u => {
      return !u.questoes.some(q => 
        q.unidade?.toUpperCase() === unidade.toUpperCase() || 
        q.unidade === unidade
      );
    });

    const relatorio = pendentes.map(p => ({
      nome: p.name || 'Sem Nome',
      email: p.email,
      total_questoes_geral: p.questoes.length
    }));

    return NextResponse.json({
      unidade,
      total_professores_geral: users.length,
      total_pendentes: pendentes.length,
      professores_pendentes: relatorio
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
})
