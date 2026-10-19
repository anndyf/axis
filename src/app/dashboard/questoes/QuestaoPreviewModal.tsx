"use client"

import { X } from "lucide-react"

interface QuestaoPreviewModalProps {
  questao: any
  onClose: () => void
  nomeEscola?: string
}

export default function QuestaoPreviewModal({ questao, onClose, nomeEscola = 'Áxis' }: QuestaoPreviewModalProps) {
  if (!questao) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-lg shadow-overlay w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <div>
            <h2 className="text-lg font-bold text-fg">Visualização da Questão</h2>
            <p className="text-xs text-fg-subtle font-medium">Assim que a questão aparecerá na prova impressa</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-200 text-fg-muted hover:bg-danger-subtle hover:text-danger-fg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto bg-white" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
          {/* Estilos para garantir quebras de linha e espaçamento de parágrafos */}
          <style dangerouslySetInnerHTML={{ __html: `
            .preview-content p { margin-bottom: 0.75em; }
            .preview-content p:last-child { margin-bottom: 0; }
            .preview-content ul { list-style-type: disc; margin-left: 1.5em; margin-bottom: 0.75em; }
            .preview-content ol { list-style-type: decimal; margin-left: 1.5em; margin-bottom: 0.75em; }
            .preview-content { white-space: pre-wrap; }
          `}} />

          {/* Cabeçalho Fictício da Prova */}
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <h3 className="font-bold text-lg">{nomeEscola} - Avaliação</h3>
            <p className="text-sm">Professor: {questao.professor?.name || '____________________'}</p>
          </div>

          <div className="space-y-6 text-base text-black leading-relaxed">
            {/* Numeração e Enunciado */}
            <div className="flex gap-2">
              <span className="font-bold">1.</span>
              <div className="w-full min-w-0">
                <div 
                  className="preview-content text-black break-words overflow-hidden w-full"
                  style={{ fontFamily: 'inherit', fontSize: '11pt', wordWrap: 'break-word', overflowWrap: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: questao.enunciado }}
                />

                {questao.imagemUrl && (
                  <div className="my-6 text-center">
                    <img 
                      src={questao.imagemUrl} 
                      alt="Imagem da questão" 
                      className="max-h-80 object-contain mx-auto border border-zinc-200 p-1 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Alternativas */}
            <div className="pl-6 space-y-3 mt-4" style={{ fontSize: '11pt' }}>
              {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                <div key={letter} className={`flex gap-3 relative ${questao.correta === letter ? 'bg-success-subtle px-4 py-2 rounded-lg border border-success-line text-success-fg' : 'py-2'}`}>
                  {/* Highlight para a resposta correta no preview */}
                  {questao.correta === letter && (
                    <div className="absolute -left-6 top-1 w-3 h-3 bg-zinc-300 rounded-full" title="Gabarito" />
                  )}
                  <span className="font-bold shrink-0">{letter.toLowerCase()})</span>
                  <div 
                    className="w-full min-w-0 preview-content"
                    style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                    dangerouslySetInnerHTML={{ __html: questao[`alternativa${letter}`] }} 
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-zinc-200 text-fg-muted text-xs font-bold rounded">
              {questao.tipo === 'RECUPERACAO' ? 'Segunda Chamada' : 'Normal'}
            </span>
            <span className="px-2 py-1 bg-zinc-200 text-fg-muted text-xs font-bold rounded">
              {questao.unidade}ª Unidade
            </span>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-surface border border-line text-fg text-sm font-bold rounded-xl hover:bg-subtle transition-colors"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  )
}
