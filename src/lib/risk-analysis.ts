
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
    return { level: 'NONE', pointsNeeded: GOAL, message: 'Sem dados', color: 'text-slate-400' };
  }

  const remainingPoints = GOAL - currentTotal;
  const remainingUnits = numUnidades - unitsCount;

  // Se já atingiu a meta
  if (remainingPoints <= 0) {
    return { level: 'LOW', pointsNeeded: 0, message: 'Aprovado', color: 'text-emerald-500' };
  }

  // Se não restam mais unidades e não atingiu a meta
  if (remainingUnits === 0) {
    return { level: 'CRITICAL', pointsNeeded: remainingPoints, message: 'Reprovado', color: 'text-rose-600' };
  }

  const averageNeededPerUnit = remainingPoints / remainingUnits;

  // Classificação de Risco
  if (averageNeededPerUnit > 9.0) {
    return { 
      level: 'CRITICAL', 
      pointsNeeded: remainingPoints, 
      message: `Crítico (Precisa de ${averageNeededPerUnit.toFixed(1)}/und)`, 
      color: 'text-rose-600' 
    };
  } else if (averageNeededPerUnit > 7.0) {
    return { 
      level: 'HIGH', 
      pointsNeeded: remainingPoints, 
      message: `Alto Risco (Precisa de ${averageNeededPerUnit.toFixed(1)}/und)`, 
      color: 'text-orange-600' 
    };
  } else if (averageNeededPerUnit > 5.0) {
    return { 
      level: 'MEDIUM', 
      pointsNeeded: remainingPoints, 
      message: `Atenção (Precisa de ${averageNeededPerUnit.toFixed(1)}/und)`, 
      color: 'text-amber-500' 
    };
  } else {
    return { 
      level: 'LOW', 
      pointsNeeded: remainingPoints, 
      message: `Estável (Precisa de ${averageNeededPerUnit.toFixed(1)}/und)`, 
      color: 'text-emerald-500' 
    };
  }
}
