
/**
 * Lógica de Predição de Risco (IA Simples)
 * Baseada no acúmulo de pontos necessários para atingir a meta de aprovação
 * (notaMinimaAprovacao * numUnidades), conforme o esquema de avaliação da
 * turma - generalizado a partir do hardcode original (média 5.0 * 3
 * unidades fixas), que dava resultado errado pra turmas semestrais.
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NONE';

export interface RiskAnalysis {
  level: RiskLevel;
  pointsNeeded: number;
  message: string;
  color: string;
}

export function analyzeRisk(
  notas: Array<number | null>,
  numUnidades: number = 3,
  notaMinimaAprovacao: number = 5
): RiskAnalysis {
  const GOAL = notaMinimaAprovacao * numUnidades;
  let currentTotal = 0;
  let unitsCount = 0;

  for (const nota of notas.slice(0, numUnidades)) {
    if (nota !== null) { currentTotal += nota; unitsCount++; }
  }

  // Se não tem nenhuma nota, não há risco calculado
  if (unitsCount === 0) {
    return { level: 'NONE', pointsNeeded: GOAL, message: 'Sem dados', color: 'text-fg-subtle' };
  }

  const remainingPoints = GOAL - currentTotal;
  const remainingUnits = numUnidades - unitsCount;

  // Se já atingiu a meta
  if (remainingPoints <= 0) {
    return { level: 'LOW', pointsNeeded: 0, message: 'Aprovado', color: 'text-success-fg' };
  }

  // Se não restam mais unidades e não atingiu a meta
  if (remainingUnits === 0) {
    return { level: 'CRITICAL', pointsNeeded: remainingPoints, message: 'Reprovado', color: 'text-danger-fg' };
  }

  const averageNeededPerUnit = remainingPoints / remainingUnits;

  // Classificação de Risco
  if (averageNeededPerUnit > 9.0) {
    return { 
      level: 'CRITICAL', 
      pointsNeeded: remainingPoints, 
      message: `Crítico (Precisa de ${averageNeededPerUnit.toFixed(1)}/und)`, 
      color: 'text-danger-fg' 
    };
  } else if (averageNeededPerUnit > 7.0) {
    return { 
      level: 'HIGH', 
      pointsNeeded: remainingPoints, 
      message: `Alto Risco (Precisa de ${averageNeededPerUnit.toFixed(1)}/und)`, 
      color: 'text-warning-fg' 
    };
  } else if (averageNeededPerUnit > 5.0) {
    return { 
      level: 'MEDIUM', 
      pointsNeeded: remainingPoints, 
      message: `Atenção (Precisa de ${averageNeededPerUnit.toFixed(1)}/und)`, 
      color: 'text-warning-fg' 
    };
  } else {
    return { 
      level: 'LOW', 
      pointsNeeded: remainingPoints, 
      message: `Estável (Precisa de ${averageNeededPerUnit.toFixed(1)}/und)`, 
      color: 'text-success-fg' 
    };
  }
}

/**
 * Risco por faltas (plano-avaliacao-frequencia.md, 3.4). Usa a frequência
 * atual e a projeção até o fim do período (services/frequencia.ts,
 * projetarFrequencia). Aqui `pointsNeeded` = faltas que o aluno ainda pode
 * ter sem cair abaixo do mínimo (0 se já não pode faltar mais).
 */
export function analyzeAttendanceRisk(params: {
  percentual: number | null
  minimo: number
  maximaPossivel?: number | null
  faltasRestantesPermitidas?: number | null
}): RiskAnalysis {
  const { percentual, minimo, maximaPossivel = null, faltasRestantesPermitidas = null } = params
  if (percentual === null) {
    return { level: 'NONE', pointsNeeded: 0, message: 'Sem chamada', color: 'text-fg-subtle' }
  }
  const restantes = faltasRestantesPermitidas ?? 0

  // Mesmo sem faltar mais nenhuma aula, não chega ao mínimo
  if (maximaPossivel !== null && maximaPossivel < minimo) {
    return { level: 'CRITICAL', pointsNeeded: 0, message: 'Não alcança mais a frequência mínima', color: 'text-danger-fg' }
  }
  if (percentual < minimo) {
    return { level: 'HIGH', pointsNeeded: Math.max(0, restantes), message: 'Abaixo da frequência mínima', color: 'text-warning-fg' }
  }
  // poucas faltas ainda permitidas só pesa para quem já faltou alguma vez
  if (percentual < minimo + 10 || (faltasRestantesPermitidas !== null && restantes <= 3 && percentual < 100)) {
    const msg = faltasRestantesPermitidas !== null
      ? `Atenção (pode faltar mais ${Math.max(0, restantes)} ${restantes === 1 ? 'aula' : 'aulas'})`
      : 'Atenção (perto do mínimo)'
    return { level: 'MEDIUM', pointsNeeded: Math.max(0, restantes), message: msg, color: 'text-warning-fg' }
  }
  return { level: 'LOW', pointsNeeded: Math.max(0, restantes), message: 'Frequência regular', color: 'text-success-fg' }
}
