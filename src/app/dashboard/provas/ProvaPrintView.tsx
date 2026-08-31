import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ProvaPrintViewProps {
  prova: any;
  options: {
    layout?: 1 | 2;
    ampliada?: boolean;
    apenasGabarito?: boolean;
    comGabarito?: boolean;
  }
  nomeEscola?: string;
  logoUrl?: string | null;
}

export default function ProvaPrintView({ prova, options, nomeEscola = 'Áxis', logoUrl }: ProvaPrintViewProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (prova) {
      // Atualiza o título do documento para que o cabeçalho padrão do navegador
      // mostre o título da prova no topo de todas as folhas impressas.
      const prevTitle = document.title;
      const prefix = options.apenasGabarito ? 'GABARITO - ' : '';
      document.title = `${prefix}${prova.titulo}${prova.codigo ? ` • CÓDIGO: #${prova.codigo}` : ''}`;
      return () => {
        document.title = prevTitle;
      }
    }
  }, [prova, options.apenasGabarito])

  if (!prova || !mounted) return null

  const { titulo, turma, questoes } = prova
  const { layout = 1, ampliada = false, apenasGabarito = false, comGabarito = true } = options

  const fontSizeClass = ampliada ? 'text-[14pt]' : 'text-[12pt]'
  const titleSizeClass = ampliada ? 'text-[16pt]' : 'text-[14pt]'
  const headerSizeClass = ampliada ? 'text-[12pt]' : 'text-[10pt]'

  const letras = ['A', 'B', 'C', 'D', 'E']

  // Calcula contagem de questões para o gabarito
  const totalQuestoes = questoes?.length || 0

  const content = (
    <div className="print-container bg-white text-black font-serif print:p-0 print:m-0" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
      
      {/* Estilos para impressão */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 20mm 15mm 15mm 15mm !important; /* Margem de 2cm no topo e 1.5cm nas laterais/baixo */
          }
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Esconde tudo no body, exceto o container de impressão */
          body > *:not(.print-container) {
            display: none !important;
          }
          .print-container {
            width: 100%;
            background: white;
            color: black;
            position: relative;
          }
          /* Força as regras corretas de hifenização e permite quebra de palavras gigantes (URLs) */
          .print-container .prose, 
          .print-container .prose * {
            word-break: normal !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
            -webkit-hyphens: auto !important;
            hyphens: auto !important;
          }
          .page-break-before {
            page-break-before: always;
          }
          .avoid-break, .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-header {
            border-bottom: 1.5px solid black;
          }
        }
      `}} />

      {/* INÍCIO DO CONTEÚDO */}
      <div className="prova-pages w-full">
                  {/* Cabeçalho principal da primeira página */}
                  <div className="print-header flex items-center justify-between pb-3 mb-4 mt-2 border-b-2 border-black">
                    <img src={logoUrl || "/images/logo_axis.png"} alt={`${nomeEscola} Logo`} className="w-16 h-16 object-contain" />
                    <div className="flex flex-col items-center flex-1">
                      <h1 className="font-bold text-[15pt] leading-tight text-center" style={{ fontFamily: 'Arial, sans-serif' }}>CENTRO TERRITORIAL DE EDUCAÇÃO PROFISSIONAL</h1>
                      <h2 className="text-[12pt] tracking-wide mt-1 text-center" style={{ fontFamily: 'Arial, sans-serif' }}>{nomeEscola.toUpperCase()}</h2>
                    </div>
                    <div className="w-16"></div> {/* Spacer */}
                  </div>

                  <h2 className="font-bold text-[14pt] text-center mb-4 uppercase" style={{ fontFamily: 'Arial, sans-serif' }}>{titulo}</h2>

                  {!apenasGabarito && (
                    <>
                      <div className="w-full flex justify-between items-start mb-4 text-[10pt]" style={{ fontFamily: 'Arial, sans-serif' }}>
                        <div className="flex flex-col gap-3 w-[85%] pr-8">
                          <div className="flex gap-2 items-end">
                            <span className="font-bold whitespace-nowrap text-[10pt]">ESTUDANTE:</span>
                            <span className="border-b border-black flex-1 mb-1"></span>
                          </div>
                          <div className="flex justify-between items-end">
                            <div className="flex gap-2 items-end">
                              <span className="font-bold text-[10pt]">CURSO:</span>
                              <span className="uppercase text-[9pt]">{turma?.curso || '___________________________'}</span>
                            </div>
                            <div className="font-bold text-[10pt] tracking-widest">{turma?.nome}</div>
                            <div className="flex gap-1 items-end">
                              <span className="font-bold text-[10pt]">DATA:</span>
                              <span className="font-bold text-[10pt]">___/___/2026</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col border border-black w-24 shrink-0 h-16">
                          <div className="border-b border-black text-center font-bold text-[9px] py-1">NOTA</div>
                          <div className="flex-1"></div>
                        </div>
                      </div>

                      <div className="w-full mb-3 text-[10pt]" style={{ fontFamily: 'Arial, sans-serif' }}>
                        <h3 className="font-bold mb-1 text-[11pt]">Orientações para os alunos:</h3>
                        <ul className="list-none pl-2 space-y-1.5 text-[9.5pt]">
                          {(() => {
                            const isDependencia = prova.titulo?.toUpperCase().includes('DEPENDÊNCIA') || prova.titulo?.toUpperCase().includes('DEPENDENCIA');
                            const maxPoints = isDependencia ? 10 : 4;
                            const pValue = (maxPoints / totalQuestoes).toFixed(3).replace('.', ',');
                            return (
                              <li>• Esta avaliação tem o valor total de <strong>{maxPoints} pontos</strong>, sendo <strong>{pValue} pontos</strong> por questão.</li>
                            )
                          })()}
                          <li>• Leia a avaliação com atenção e revise-a ao finalizar.</li>
                          <li>• Todas as questões objetivas têm apenas uma resposta correta.</li>
                          <li>• Preencha o cartão de resposta com caneta preta ou azul. Não utilize lápis ou corretivo. Rasuras invalidam a questão.</li>
                          <li>• É estritamente proibida a consulta a materiais não autorizados ou a comunicação entre alunos.</li>
                          <li>• O uso de dispositivos eletrônicos (como celular, calculadoras ou smartwatches) resultará na anulação da prova.</li>
                          <li>• A avaliação terá duração de 1 hora e 30 minutos.</li>
                          <li>• Tempo mínimo de permanência em sala: 30 minutos.</li>
                        </ul>
                      </div>
                    </>
                  )}

                  {/* GABARITO (Estilo ENEM Vertical) na Primeira Página */}
                  <div className="w-full mt-4 mb-8 avoid-break font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
                    <h3 className="font-bold text-[12pt] mb-4 text-center uppercase border-b-2 border-black pb-1 tracking-widest">
                      {apenasGabarito ? 'GABARITO DO PROFESSOR' : 'CARTÃO DE RESPOSTA'}
                    </h3>
                    
                    {(() => {
                      const getGabaritoLayout = (total: number) => {
                        if (total <= 20) return { cols: 2, rows: Math.ceil(total / 2) };
                        if (total <= 40) return { cols: 3, rows: Math.ceil(total / 3) };
                        if (total <= 60) return { cols: 4, rows: Math.ceil(total / 4) };
                        return { cols: 5, rows: Math.ceil(total / 5) };
                      }
                      const layoutInfo = getGabaritoLayout(totalQuestoes);
                      
                      return (
                        <div className="flex justify-center gap-4 w-full">
                          {Array.from({ length: layoutInfo.cols }).map((_, colIndex) => {
                            const startIndex = colIndex * layoutInfo.rows;
                            if (startIndex >= totalQuestoes) return null;
                            
                            return (
                              <div key={colIndex} className="flex-1 border-2 border-black rounded-sm overflow-hidden max-w-[220px]">
                                <div className="bg-gray-200 text-center font-bold text-[9px] py-1.5 border-b-2 border-black tracking-wider print:bg-gray-200">
                                  QUESTÃO / RESPOSTA
                                </div>
                                <div className="flex flex-col">
                                  {Array.from({ length: layoutInfo.rows }).map((_, rIdx) => {
                                    const qNum = startIndex + rIdx + 1;
                                    const isPink = rIdx % 2 !== 0;
                                    // Alterna a cor das linhas (branco e um rosa/cinza bem claro)
                                    const rowClass = isPink ? 'bg-pink-100 print:bg-pink-100' : 'bg-white print:bg-white';
                                    
                                    return (
                                      <div key={rIdx} className={`flex items-center px-3 py-1.5 ${rowClass}`}>
                                        {qNum <= totalQuestoes ? (
                                          <>
                                            <span className="font-bold text-[11px] w-6 text-black">{String(qNum).padStart(2, '0')}</span>
                                            <div className="flex gap-2 ml-4">
                                              {letras.map(l => {
                                                const isCorrect = apenasGabarito && l === questoes[qNum - 1]?.correta;
                                                const bubbleClass = isCorrect 
                                                  ? "bg-black text-white font-bold border-black print:bg-black print:text-white print:border-black print:color-adjust-exact" 
                                                  : "bg-white text-gray-500 border-gray-500 print:bg-white";
                                                return (
                                                  <div key={l} className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] ${bubbleClass}`}>
                                                    {l}
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          </>
                                        ) : (
                                          <div className="h-5"></div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>

                  {/* TABELA DE PONTUAÇÃO (Apenas no Gabarito do Professor) */}
                  {apenasGabarito && (
                    <div className="w-full mt-8 mb-8 avoid-break font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
                      <h3 className="font-bold text-[12pt] mb-4 text-center uppercase border-b-2 border-black pb-1 tracking-widest">
                        TABELA DE PONTUAÇÃO
                      </h3>
                      
                      {(() => {
                        const isDependencia = prova.titulo?.toUpperCase().includes('DEPENDÊNCIA') || prova.titulo?.toUpperCase().includes('DEPENDENCIA');
                        const maxPoints = isDependencia ? 10 : 4;
                        const pointsPerQuestion = maxPoints / totalQuestoes;
                        
                        const getPontuacaoLayout = (total: number) => {
                          if (total <= 20) return { cols: 2, rows: Math.ceil(total / 2) };
                          if (total <= 40) return { cols: 3, rows: Math.ceil(total / 3) };
                          if (total <= 60) return { cols: 4, rows: Math.ceil(total / 4) };
                          return { cols: 5, rows: Math.ceil(total / 5) };
                        }
                        const layoutInfo = getPontuacaoLayout(totalQuestoes);
                        
                        return (
                          <>
                          <div className="flex justify-center gap-4 w-full">
                            {Array.from({ length: layoutInfo.cols }).map((_, colIndex) => {
                              const startIndex = colIndex * layoutInfo.rows;
                              if (startIndex >= totalQuestoes) return null;
                              
                              return (
                                <div key={colIndex} className="flex-1 border-2 border-black rounded-sm overflow-hidden max-w-[220px]">
                                  <div className="bg-gray-200 text-center font-bold text-[9px] py-1.5 border-b-2 border-black tracking-wider flex justify-between px-4 print:bg-gray-200">
                                    <span>ACERTOS</span>
                                    <span>NOTA</span>
                                  </div>
                                  <div className="flex flex-col">
                                    {Array.from({ length: layoutInfo.rows }).map((_, rIdx) => {
                                      const acertos = startIndex + rIdx + 1;
                                      const isPink = rIdx % 2 !== 0;
                                      const rowClass = isPink ? 'bg-pink-100 print:bg-pink-100' : 'bg-white print:bg-white';
                                      
                                      if (acertos > totalQuestoes) {
                                        return <div key={rIdx} className={`flex items-center px-4 py-1.5 ${rowClass} h-[28px]`}></div>;
                                      }
                                      
                                      const notaStr = (acertos * pointsPerQuestion).toFixed(2).replace('.', ',');
                                      
                                      return (
                                        <div key={rIdx} className={`flex items-center justify-between px-4 py-1.5 ${rowClass}`}>
                                          <span className="font-bold text-[11px] text-black">{String(acertos).padStart(2, '0')}</span>
                                          <span className="font-bold text-[11px] text-blue-800">{notaStr}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="mt-4 text-center text-[10pt] font-bold text-gray-700">
                            Cálculo: {maxPoints} pontos / {totalQuestoes} questões = {(maxPoints / totalQuestoes).toFixed(3).replace('.', ',')} por questão.
                          </div>
                        </>
                        )
                      })()}
                    </div>
                  )}

                  {!apenasGabarito && (
                    <>
                      <div className="page-break-before"></div>

                      {/* QUESTÕES */}
                      <div className={`prova-body ${layout === 2 ? 'columns-2 gap-8' : 'flex flex-col gap-6'} w-full block`} style={{ columnFill: 'auto' }}>
                    {questoes?.map((q: any, idx: number) => {
                      const currentDisc = q.disciplinas?.[0]?.nome || q.disciplina?.nome || 'Conhecimentos Gerais';
                      const prevDisc = idx > 0 ? (questoes[idx - 1].disciplinas?.[0]?.nome || questoes[idx - 1].disciplina?.nome || 'Conhecimentos Gerais') : null;
                      const isNewDisc = currentDisc !== prevDisc;
                      
                      // Identifica se é inglês para aplicar o dicionário de hifenização correto
                      const isEnglish = currentDisc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("ingles");
                      const questionLang = isEnglish ? "en" : "pt-BR";

                      // Remove non-breaking spaces que impedem a quebra natural de linha (efeito "super-palavra")
                      const cleanHtml = (html: string) => {
                        if (!html) return '';
                        return html.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');
                      };

                      return (
                      <React.Fragment key={idx}>
                        {isNewDisc && (
                          <div className="w-full mb-6 mt-4 border-b-2 border-black pb-1 break-inside-avoid" style={{ columnSpan: 'all', WebkitColumnSpan: 'all' }}>
                            <h4 className="font-bold text-center uppercase tracking-widest text-[12pt]">{currentDisc}</h4>
                          </div>
                        )}
                        <div className="mb-6 w-full">
                          <div className="flex gap-2">
                          <span className={`font-bold ${fontSizeClass}`}>{idx + 1}.</span>
                          <div className="w-full min-w-0">
                            <div 
                              lang={questionLang}
                              className={`prose prose-sm max-w-none text-black overflow-hidden w-full ${fontSizeClass} text-justify hyphens-auto`}
                              style={{ fontFamily: 'inherit', wordBreak: 'normal', overflowWrap: 'break-word', wordWrap: 'break-word', lineHeight: '1.5' }}
                              dangerouslySetInnerHTML={{ __html: cleanHtml(q.enunciado) }}
                            />
                            {q.imagemUrl && (
                              <div className="my-4 text-center break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                <img 
                                  src={q.imagemUrl} 
                                  alt="Imagem da questão" 
                                  className="max-h-[250px] object-contain mx-auto border border-gray-200 break-inside-avoid"
                                  style={{ pageBreakInside: 'avoid' }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={`pl-6 mt-3 space-y-2 ${fontSizeClass}`}>
                          {letras.map((letter) => (
                            <div key={letter} className="flex gap-3 relative">
                              <span className="font-bold shrink-0">{letter.toLowerCase()})</span>
                              <div 
                                lang={questionLang}
                                className="prose prose-sm max-w-none text-black overflow-hidden w-full text-justify hyphens-auto"
                                style={{ fontFamily: 'inherit', wordBreak: 'normal', overflowWrap: 'break-word', wordWrap: 'break-word', lineHeight: '1.4', marginTop: '-2px' }}
                                dangerouslySetInnerHTML={{ __html: cleanHtml(q[`alternativa${letter}`]) }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      </React.Fragment>
                    )})}
                  </div>
                    </>
                  )}
        </div>
      {/* FIM DO CONTEÚDO */}
    </div>
  )

  return createPortal(content, document.body)
}
