# Página de capítulos — v0.31

## Escopo

Reorganização da página de leitura/edição de capítulos. Índice móvel e informações
do conjunto/ficha-modelo compactos. Fonte de versão: package.json 0.31.0.

O editor geral por categorias, editor inline, motores de dados, modelos, ficheiros,
importadores e exportadores não receberam alterações. O vínculo usa os callbacks
existentes; nenhum editor de ficha foi duplicado.

## Verificação no navegador

Prévia gerenciada, Chrome. Sistemas sintéticos: Reinos de Aurora, 57 tópicos com
hierarquia, documento rico/links e modelo com dois blocos e duas abas; sistema
vazio sem modelo; AB10 fixo. Nenhum arquivo de teste ou harness é publicado.

| Caso | Resultado |
| --- | --- |
| Cabeçalho desktop | Nome, descrição real, Salvar regras e Novo capítulo preservados; uma instância de cada ação. |
| Contexto compacto | Metadados e modelo em uma faixa de aproximadamente 71 px a 1363 px; painel contextual mantém operações. |
| Índice desktop | À esquerda e conteúdo à direita, inclusive a 900 px; lista limitada à viewport e índice sticky. |
| Mobile: primeira linha | Editar à esquerda, Salvar à direita; mesma altura de 46 px em 320 e 390 px. |
| Modelo mobile | Faixa de aproximadamente 65–67 px após a primeira linha; nome e estado de vínculo visíveis. |
| Mobile: segunda linha | Índice à esquerda, Novo capítulo à direita e em destaque, antes do conteúdo. |
| Gaveta | Modal nativo inferior, 82% da altura; árvore, marcador de seleção, contagem, busca e hierarquia preservados. |
| Busca | Consulta 27 reduz a árvore ao capítulo e sua subseção; limpar recupera os tópicos. |
| Selecionar subseção | Fecha a gaveta, exibe a subseção e direciona foco/leitura ao artigo. |
| Fechar gaveta | X, Escape, toque fora e arrastar a alça para baixo fecham; foco volta ao botão e body overflow é restaurado. |
| Rolagem | Lista longa tem região própria e overscroll contido; fundo bloqueado enquanto o diálogo está aberto. |
| Edição inline | Título, estado e conteúdo editados/salvos no artigo. Nenhum modal de tópico. |
| Rascunho | Selecionar outro tópico com alterações fecha a gaveta e mostra a proteção existente, sem perder o rascunho; Continuar edição preserva o texto. |
| Criar | Novo capítulo e Adicionar subseção criam tópicos na árvore e atualizam a contagem 57 → 58 → 59. |
| Links internos | Clique e teclado abrem a subseção Aplicação detalhada, mantendo seu identificador e foco. |
| Modelo vinculado | Abre diretamente no editor de fichas com os dois blocos, cálculos e abas. |
| Vincular/desvincular | Arquivo .ab10 restaura o modelo; confirmação de desvinculação preservada; vínculo pode ser recriado. |
| Criar modelo | Sistema vazio abre o mesmo editor, salva o modelo e volta às regras com nome atualizado. |
| Criar personagem | Formulário original preseleciona o sistema/modelo. Alterar Destreza para 12 no personagem mantém 16 no modelo. Ficha criada aparece no seletor de vínculo existente. |
| Editor geral | Editar sistema abre o diálogo por categorias da v0.30, com nome/descrição e dados intactos. |
| Sistema vazio | Índice desabilitado, sem árvore/aside vazio; Novo capítulo em destaque; descrição real acessível. |
| AB10 | Sem Editar sistema/Novo capítulo/ferramentas de tópico; leitura, oito tópicos, gaveta e exportação disponíveis. Nenhum espaço reservado aos controles ausentes. |
| Exportação | JSON e Super PNG baixados pelo fluxo original; payloads iguais, 57 tópicos e modelo com dois blocos. PNG reimportado pela UI com integridade válida. |
| Responsividade | 320/390/759/900 px, sem overflow horizontal; desktop claro/Floresta e escuro/Ametista. |

## Checks

- `node --test tests/*.test.mjs`: 255/255 passaram.
- `node node_modules/typescript/bin/tsc --noEmit`: passou.
- `git diff --check`: passou.
- Build de produção realizado pelo helper oficial na etapa de publicação.
- Motores, modelos, rich text e serializadores sem diff.

Mobile validado em viewports de navegador; sem aparelho físico/teclado nativo.
O gesto foi verificado com eventos de ponteiro na alça, sem interceptar a lista.

## Evidências

- antropologo-regras-desktop-v031.jpg
- antropologo-regras-mobile-v031.jpg
- antropologo-indice-mobile-v031.jpg
