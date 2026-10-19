#!/usr/bin/env python3
"""
Codemod do design system (PROGRESSO-VISUAL.md, fase 4): troca classes de cor
soltas do Tailwind pelos tokens de src/app/globals.css, sem mudar o que as
telas fazem. Mecânico e reproduzível:

  python3 scripts/codemod-cores.py src            # aplica
  python3 scripts/codemod-cores.py src --contar   # só conta o que sobraria

Regras (por família e tom):
- cinzas (slate, gray, neutral, stone) -> zinc no mesmo tom (uma família só);
- azuis/roxos (blue, indigo, violet, purple, sky, cyan, fuchsia, pink) -> destaque
  (accent / accent-subtle / accent-fg / on-accent);
- verdes -> success, amarelos/laranja -> warning, vermelhos -> danger
  (fundo claro -> *-subtle, sólido -> cor, texto -> *-fg, borda -> *-line);
- degradês viram cor sólida; sombras coloridas somem; sombras grandes ->
  shadow-card (ou shadow-overlay em camadas flutuantes);
- rounded-2xl -> rounded-lg, rounded-3xl e rounded-[Nrem] -> rounded-xl;
- font-black / font-extrabold -> font-semibold.
"""
import re
import sys
from pathlib import Path

NEUTRAS = {'slate', 'gray', 'neutral', 'stone'}
DESTAQUE = {'blue', 'indigo', 'violet', 'purple', 'sky', 'cyan', 'fuchsia', 'pink'}
SEMANTICAS = {
    **{c: 'success' for c in ('green', 'emerald', 'teal', 'lime')},
    **{c: 'warning' for c in ('amber', 'yellow', 'orange')},
    **{c: 'danger' for c in ('red', 'rose')},
}
CORES = NEUTRAS | DESTAQUE | set(SEMANTICAS) | {'zinc'}
UTIL = r'(bg|text|border(?:-[trblxy])?|ring|ring-offset|from|to|via|shadow|divide|outline|fill|stroke|accent|placeholder|decoration|caret)'
CLASSE = re.compile(r'(?<![\w/-])((?:[a-z0-9\[\]&_-]+:)*)' + UTIL + r'-(' + '|'.join(sorted(CORES)) + r')-(\d{2,3})(/\d{1,3})?(?![\w-])')
GRADIENTE = re.compile(r'(?<![\w-])((?:[a-z0-9-]+:)*)bg-gradient-to-(?:r|l|t|b|tr|tl|br|bl)(?![\w-])')
TEXTO_DEGRADE = re.compile(r'(?<![\w-])(?:text-transparent|bg-clip-text)(?![\w-])')


def destaque(util, tom, op):
    if util == 'bg' or util == 'from':
        return 'bg-accent-subtle' if tom <= 300 else 'bg-accent' + op
    if util in ('to', 'via'):
        return ''
    if util == 'text' or util == 'placeholder' or util == 'caret':
        base = 'text' if util == 'text' else util
        if tom <= 300:
            return f'{base}-on-accent/80'
        return f'{base}-accent' if tom == 400 else f'{base}-accent-fg'
    if util.startswith('border') or util == 'divide' or util == 'outline':
        return f'{util}-accent/25' if tom <= 300 else f'{util}-accent'
    if util == 'ring':
        return 'ring-ring'
    if util == 'ring-offset':
        return 'ring-offset-surface'
    if util == 'shadow':
        return ''
    if util in ('fill', 'stroke', 'decoration'):
        return f'{util}-accent'
    if util == 'accent':
        return 'accent-[var(--accent)]'
    return None


def semantica(s, util, tom, op):
    if util == 'bg' or util == 'from':
        return f'bg-{s}-subtle' if tom <= 200 else f'bg-{s}' + op
    if util in ('to', 'via'):
        return ''
    if util in ('text', 'placeholder', 'caret'):
        base = 'text' if util == 'text' else util
        if tom <= 200:
            return f'{base}-white/85'
        return f'{base}-{s}' if tom <= 400 else f'{base}-{s}-fg'
    if util.startswith('border') or util == 'divide' or util == 'outline':
        return f'{util}-{s}-line' if tom <= 300 else f'{util}-{s}'
    if util == 'ring':
        return f'ring-{s}/30'
    if util == 'ring-offset':
        return 'ring-offset-surface'
    if util == 'shadow':
        return ''
    if util in ('fill', 'stroke', 'decoration'):
        return f'{util}-{s}'
    if util == 'accent':
        return f'accent-[var(--{s})]'
    return None


def trocar(m):
    prefixo, util, cor, tom, op = m.group(1), m.group(2), m.group(3), int(m.group(4)), m.group(5) or ''
    if cor == 'zinc' and util != 'text':
        return m.group(0)
    if cor in NEUTRAS or (cor == 'zinc' and util == 'text'):
        if util == 'shadow':
            return ''
        # texto cinza: tokens com contraste AA sobre branco (zinc-400 = 2,6:1 não passa)
        if util == 'text' and not op and 400 <= tom:
            return f'{prefixo}text-' + ('fg-subtle' if tom <= 500 else 'fg-muted' if tom <= 700 else 'fg')
        if cor == 'zinc':
            return m.group(0)
        return f'{prefixo}{util}-zinc-{tom}{op}' if util not in ('from',) else f'{prefixo}bg-zinc-{tom}{op}'
    novo = destaque(util, tom, op) if cor in DESTAQUE else semantica(SEMANTICAS[cor], util, tom, op)
    if novo is None:
        return m.group(0)
    return f'{prefixo}{novo}' if novo else ''


DINAMICA = re.compile(r'(?<![\w-])((?:[a-z0-9-]+:)*)(bg|text|border)-\$\{[^}]+\}-(\d{2,3})(?![\w-])')


def dinamica(m):
    # bg-${cor}-50 etc.: ícones decorativos (o Tailwind nem gera essas classes) -> neutro
    prefixo, util, tom = m.group(1), m.group(2), int(m.group(3))
    if 'hover' in prefixo:
        return ''
    if util == 'bg':
        return f'{prefixo}bg-subtle'
    if util == 'text':
        return f'{prefixo}text-fg-muted'
    return f'{prefixo}border-line'


ANIMACAO = re.compile(r'(?<![\w-])animate-in(?:\s+(?:fade-in|zoom-in-\d+|zoom-in-\[[^\]]+\]|slide-in-from-[a-z]+(?:-\d+)?|duration-\d+))*(?![\w-])')


def animacao(m):
    # tailwindcss-animate não está no projeto: animate-in nunca funcionou -> animações de 150ms do design system
    s = m.group(0)
    return 'animate-pop-in' if 'zoom-in' in s else 'animate-slide-up' if 'slide-in' in s else 'animate-fade-in'


TRACKING = r'tracking-(?:wide|wider|widest|tight(?:er)?|\[[0-9.]+em\])'


def tipografia(cls):
    """Rótulos 'gritados' (MAIÚSCULAS + espaçamento largo em 9-10px) -> texto
    normal em 12px; mínimo de 12px para legibilidade."""
    if re.search(r'(?<![\w:-])uppercase(?![\w-])', cls) and re.search(r'(?<![\w:-])' + TRACKING + r'(?![\w-])', cls):
        cls = re.sub(r'\s*(?<![\w:-])uppercase(?![\w-])', '', cls)
        cls = re.sub(r'\s*(?<![\w:-])' + TRACKING + r'(?![\w-])', '', cls)
    cls = re.sub(r'(?<![\w-])((?:[a-z0-9-]+:)*)text-\[(?:8|9|10|11)px\](?![\w-])', r'\1text-xs', cls)
    return cls


def acabamento(texto):
    """Ajustes por className: texto sobre o destaque legível com qualquer cor
    de escola; degradês órfãos (to-/via- sem bg-gradient)."""
    def ajustar(m):
        cls = m.group(0)
        if re.search(r'(?<![\w:/-])bg-accent(?![\w-])', cls):
            cls = re.sub(r'(?<![\w/-])text-white(?![\w/-])', 'text-on-accent', cls)
        # hover de botão sólido no destaque: tom mais escuro (bg-blue-600 + hover:bg-blue-700)
        cls = re.sub(r'(?<![\w-])((?:[a-z0-9-]+:)*hover:)bg-accent(?![\w/-])', r'\1bg-accent-hover', cls)
        cls = re.sub(r'\s*(?<![\w-])(?:[a-z0-9-]+:)*(?:to|via)-zinc-\d{2,3}(?:/\d+)?(?![\w-])', '', cls)
        cls = re.sub(r'(?<![\w-])((?:[a-z0-9-]+:)*)from-zinc-(\d{2,3})(?![\w-])', r'\1bg-zinc-\2', cls)
        return tipografia(cls)
    texto = re.sub(r'className=(?:"[^"]*"|\{`[^`]*`\})', ajustar, texto)
    # painel de modal: logo depois do fundo "fixed inset-0", sombra de camada flutuante
    return re.sub(r'(fixed inset-0[^"]*">\s*<div className="[^"]*?)shadow-card', r'\1shadow-overlay', texto)


def migrar(texto):
    texto = ANIMACAO.sub(animacao, texto)
    texto = DINAMICA.sub(dinamica, texto)
    texto = GRADIENTE.sub('', texto)
    texto = TEXTO_DEGRADE.sub('', texto)
    texto = CLASSE.sub(trocar, texto)
    # raios fora da escala
    texto = re.sub(r'(?<![\w-])((?:[a-z0-9-]+:)*)rounded-2xl(?![\w-])', r'\1rounded-lg', texto)
    texto = re.sub(r'(?<![\w-])((?:[a-z0-9-]+:)*)rounded-(?:3xl|\[[0-9.]+rem\])(?![\w-])', r'\1rounded-xl', texto)
    # pesos fora da escala
    texto = re.sub(r'(?<![\w-])font-(?:black|extrabold)(?![\w-])', 'font-semibold', texto)
    return texto


def sombras(texto):
    """shadow-lg/xl/2xl: overlay em camadas flutuantes, card no resto (por className)."""
    def por_classe(m):
        cls = m.group(0)
        flutuante = re.search(r'(?<![\w-])(fixed|absolute|z-50|z-\[\d+\])(?![\w-])', cls)
        return re.sub(r'(?<![\w-])((?:[a-z0-9-]+:)*)shadow-(?:md|lg|xl|2xl|inner)(?![\w/-])', lambda s: s.group(1) + ('shadow-overlay' if flutuante else 'shadow-card'), cls)
    return re.sub(r'className=(?:"[^"]*"|\{`[^`]*`\})', por_classe, texto)


def limpar_espacos(texto):
    # espaços duplos/sobrando deixados pelas remoções, só dentro de className
    def ajustar(m):
        s = m.group(0)
        # ícone decorativo neutralizado: não pode ficar branco no hover sobre fundo claro
        if 'bg-subtle text-fg-muted' in s:
            s = re.sub(r'\s*group-hover:text-white(?![\w-])', '', s)
        if s.startswith('className="'):
            corpo = re.sub(r'  +', ' ', s[len('className="'):-1]).strip()
            return f'className="{corpo}"'
        return re.sub(r'(?<=[^\s{])  +(?=[^\s}])', ' ', s)
    return re.sub(r'className=(?:"[^"]*"|\{`[^`]*`\})', ajustar, texto)


def casca(texto, caminho):
    """Telas dentro do layout do dashboard (que já tem barra superior fixa e
    espaçamento): cabeçalho de página deixa de ser sticky com margem negativa
    (feito para o layout antigo) e a página não força min-h-screen."""
    if '/app/dashboard/' not in caminho.replace('\\', '/'):
        return texto
    def cabecalho(m):
        cls = m.group(1)
        if 'sticky' not in cls or 'top-0' not in cls:
            return m.group(0)
        extra = ''.join(f' {c}' for c in ('no-print', 'print:hidden') if c in cls.split())
        return f'<header className="mb-6 border-b border-line pb-4{extra}"'
    texto = re.sub(r'<header className="([^"]*)"', cabecalho, texto)
    return re.sub(r'(className=(?:"|\{`))((?:[^"`]*\s)?)min-h-screen(?=[\s"`])', lambda m: m.group(1) + m.group(2).rstrip() + ('' if m.group(2).strip() else ''), texto)


ALVO = re.compile(r'(?<![\w/-])(?:[a-z0-9\[\]&_-]+:)*(?:bg|text|border|ring|from|to|via|shadow|divide|outline|fill|stroke|accent|placeholder|decoration)-(?:blue|indigo|emerald|rose|amber|orange|purple|green|red|yellow|pink|violet|cyan|teal|sky|lime|fuchsia)-\d{2,3}')


def arquivos(raiz):
    for p in Path(raiz).rglob('*'):
        if p.suffix in ('.tsx', '.ts') and '.test.' not in p.name and 'components/ui' not in str(p):
            yield p


if __name__ == '__main__':
    raiz = sys.argv[1] if len(sys.argv) > 1 else 'src'
    contar = '--contar' in sys.argv
    total = 0
    mudados = 0
    for p in arquivos(raiz):
        texto = p.read_text()
        if contar:
            total += len(ALVO.findall(texto))
            continue
        novo = limpar_espacos(acabamento(sombras(casca(migrar(texto), str(p)))))
        if novo != texto:
            p.write_text(novo)
            mudados += 1
    print(f'restantes: {total}' if contar else f'arquivos alterados: {mudados}')
