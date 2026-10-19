import React from 'react';

interface QuestaoGabarito {
  numero: number;
  correta: string;
}

interface GabaritoProfessorProps {
  titulo: string;
  questoes: QuestaoGabarito[];
  maxNota?: number;
  nomeEscola?: string;
}

export default function GabaritoProfessor({ titulo, questoes, maxNota = 4.0, nomeEscola = 'Áxis' }: GabaritoProfessorProps) {
  const options = ['A', 'B', 'C', 'D', 'E'];
  const totalQuestoes = questoes.length || 1;
  const valorPorQuestao = maxNota / totalQuestoes;
  
  // Divide as questões em duas colunas para o layout
  const mid = Math.ceil(totalQuestoes / 2);
  const col1 = questoes.slice(0, mid);
  const col2 = questoes.slice(mid);

  // Calcula a tabela de pontuação
  const tabelaPontuacaoCol1 = [];
  const tabelaPontuacaoCol2 = [];
  for (let i = 1; i <= totalQuestoes; i++) {
    const pontuacao = (i * valorPorQuestao).toFixed(2).replace('.', ',');
    const item = { acertos: i.toString().padStart(2, '0'), nota: pontuacao };
    if (i <= mid) {
      tabelaPontuacaoCol1.push(item);
    } else {
      tabelaPontuacaoCol2.push(item);
    }
  }

  return (
    <div className="bg-surface p-8 max-w-4xl mx-auto shadow-sm border border-line mt-6 mb-8 text-fg" style={{ fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header */}
      <div className="text-center border-b-[3px] border-black pb-4 mb-6">
        <h1 className="text-xl font-bold m-0">Centro Territorial de Educação Profissional</h1>
        <h2 className="text-sm text-fg-muted mt-1 m-0">{nomeEscola}</h2>
      </div>

      {/* Titulo */}
      <div className="text-center mb-8">
        <h3 className="text-lg font-bold mb-4">{titulo}</h3>
        <h4 className="text-base font-bold border-b-2 border-black inline-block px-12 pb-1">Gabarito do Professor</h4>
      </div>

      {/* Tabelas do Gabarito */}
      <div className="flex justify-center gap-12 mb-10">
        
        {/* Coluna 1 */}
        <div className="border-2 border-black rounded-lg overflow-hidden w-64">
          <div className="bg-subtle-hover text-center py-2 font-bold text-xs border-b-2 border-black">
            Questão / Resposta
          </div>
          <div className="p-2 space-y-1">
            {col1.map((q, idx) => (
              <div key={q.numero} className={`flex items-center justify-between p-2 rounded ${idx % 2 !== 0 ? 'bg-accent-subtle' : 'bg-surface'}`}>
                <span className="font-bold text-sm w-6">{q.numero.toString().padStart(2, '0')}</span>
                <div className="flex gap-2">
                  {options.map((opt) => (
                    <div 
                      key={opt}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-zinc-400 ${
                        q.correta === opt 
                          ? 'bg-accent-subtle text-accent-fg border-accent' 
                          : 'bg-surface text-fg-subtle'
                      }`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 2 */}
        {col2.length > 0 && (
          <div className="border-2 border-black rounded-lg overflow-hidden w-64">
            <div className="bg-subtle-hover text-center py-2 font-bold text-xs border-b-2 border-black">
              Questão / Resposta
            </div>
            <div className="p-2 space-y-1">
              {col2.map((q, idx) => (
                <div key={q.numero} className={`flex items-center justify-between p-2 rounded ${idx % 2 !== 0 ? 'bg-accent-subtle' : 'bg-surface'}`}>
                  <span className="font-bold text-sm w-6">{q.numero.toString().padStart(2, '0')}</span>
                  <div className="flex gap-2">
                    {options.map((opt) => (
                      <div 
                        key={opt}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-zinc-400 ${
                          q.correta === opt 
                            ? 'bg-accent-subtle text-accent-fg border-accent' 
                            : 'bg-surface text-fg-subtle'
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Tabelas de Pontuação */}
      <div className="text-center mb-6">
        <h4 className="text-base font-bold border-b-2 border-black inline-block px-12 pb-1 mb-6">Tabela de Pontuação</h4>
        
        <div className="flex justify-center gap-12">
          
          {/* Pontuacao Col 1 */}
          <div className="border-2 border-black rounded-lg overflow-hidden w-64">
            <div className="flex bg-subtle-hover font-bold text-xs border-b-2 border-black">
              <div className="flex-1 py-2 text-center border-r-2 border-black">Acertos</div>
              <div className="flex-1 py-2 text-center">Nota</div>
            </div>
            <div>
              {tabelaPontuacaoCol1.map((item, idx) => (
                <div key={item.acertos} className={`flex font-bold text-sm ${idx % 2 !== 0 ? 'bg-accent-subtle' : 'bg-surface'}`}>
                  <div className="flex-1 py-2 text-center border-r-2 border-black">{item.acertos}</div>
                  <div className="flex-1 py-2 text-center text-accent-fg">{item.nota}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pontuacao Col 2 */}
          {tabelaPontuacaoCol2.length > 0 && (
            <div className="border-2 border-black rounded-lg overflow-hidden w-64">
              <div className="flex bg-subtle-hover font-bold text-xs border-b-2 border-black">
                <div className="flex-1 py-2 text-center border-r-2 border-black">Acertos</div>
                <div className="flex-1 py-2 text-center">Nota</div>
              </div>
              <div>
                {tabelaPontuacaoCol2.map((item, idx) => (
                  <div key={item.acertos} className={`flex font-bold text-sm ${idx % 2 !== 0 ? 'bg-accent-subtle' : 'bg-surface'}`}>
                    <div className="flex-1 py-2 text-center border-r-2 border-black">{item.acertos}</div>
                    <div className="flex-1 py-2 text-center text-accent-fg">{item.nota}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer Calculation */}
      <div className="text-center mt-8 font-bold text-sm">
        Cálculo: {maxNota} pontos / {totalQuestoes} questões = {valorPorQuestao.toFixed(3).replace('.', ',')} por questão.
      </div>
      
    </div>
  );
}
