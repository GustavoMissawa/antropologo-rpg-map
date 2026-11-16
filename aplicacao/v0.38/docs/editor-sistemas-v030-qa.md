# Editor de sistemas por categorias — v0.30

Atualização restrita à interface de criação/edição de sistemas.

## Escopo e preservação

- Geral: nome, descrição e logo, com o preparador de imagem anterior intacto.
- Regras de Dados: tipos disponíveis, método, ordem, ativação e máximo de Roll
  and Keep, além da opção de personalização detalhada.
- Configurações: símbolos, nomes, dados próprios, faces, combinações, imagens,
  resultados próprios e prioridades, usando os componentes anteriores.
- Um único formulário/estado. Painéis ocultos continuam montados; paginação,
  detalhes abertos, rascunhos e callbacks de upload sobrevivem às abas.
- Recolher a personalização esconde a terceira aba, sem apagar o catálogo ou
  alterar como ele é usado. Preferência visual apenas no estado da página;
  nenhum campo ou versão de esquema foi adicionado ao formato de dados.
- `lib/dice.ts`, `lib/dice-set.ts`, `lib/model.ts`, `app/sheet-dice.tsx` e
  `app/sheet-rolls.tsx` não possuem alterações em relação à v0.29.

## Verificações automatizadas

255 testes passaram. Incluem todas as regressões do motor, modelos, imagens,
Roll and Keep, fórmulas, migrações, JSON e Super PNG; seis casos novos verificam
somente geometria do editor (breakpoints, teclado, pan, zoom e fallback).
TypeScript e `git diff --check` passaram. Build pelo helper do Sites.

## Desktop real no navegador

Viewport de 1363 px, editor de 1080 px. Menu lateral flutuante 218 px, à esquerda;
painel de 838 px à direita, sem overflow horizontal. Categoria Geral inicial.

1. Nova criação mostra duas abas; ativar personalização mostra três.
2. Salvar na terceira categoria sem nome trouxe Geral e aviso para preencher.
3. Nome/descrição, Roll and Keep máximo 4, nome de d6 Destino, face 1 vazia com
   prioridade 9, face 2 com três ocorrências do símbolo Eco, e face 3 com imagem
   PNG otimizada para WebP foram editados entre abas, sem perdas.
4. Upload de logo também produziu WebP. Alternar categorias durante o preparo
   da imagem da face preservou o callback e a imagem resultante.
5. Recolher/reativar personalização manteve símbolo, ocorrências, imagens,
   prioridade e face vazia. Criar o conjunto a partir de Configurações funcionou.
6. Recolher, salvar em Regras de Dados e reabrir manteve a terceira aba oculta;
   reativar restaurou todos os dados. Máximo continuou 4.
7. Exportação JSON real foi inspecionada e validada: catálogo v5 sem novos campos
   de UI, logo, limite, nome do dado, símbolo, repetição, vazio, prioridade, imagem.
8. Alterar nome e pressionar Escape manteve o editor aberto com confirmação.
   Continuar editando preservou o rascunho. Descartar retornou sem aplicar.
9. Setas navegaram entre as três categorias. Navegação sozinha não causou
   confirmação falsa ao cancelar. Save permanece acessível no rodapé.
10. Tema claro e escuro conferidos. A interpretação numérica e o limite 4 foram
    mantidos; o editor não acrescenta controles nos Lançamentos.
11. Sistema antigo v0.28 importou pelo fluxo existente. Editor abriu em Geral;
    método simbólico e limite 1, três símbolos com imagens, face 1 vazia e face 11
    combinada continuaram acessíveis, sem alteração de regras.

Screenshot: `antropologo-editor-sistemas-v030.jpg`.

## Mobile e janelas estreitas

Harness temporário, removido antes do pacote, com viewport de iframe real.
Não houve teste em aparelho físico ou no teclado de Android/iOS.

- 390 px: dialog ocupa x=0,y=0,width=390,height=780; abas Geral/Dados/Configurações,
  alvos de 116×46 px; rodapé até y=780. Conteúdo rola separadamente.
- 320 px: dialog e scrollWidth 320, sem overflow. Abas condicionais funcionam.
  No conteúdo longo, scrollTop 2864 manteve menu e ações nas mesmas posições.
- Paginação do d100 foi até a face 98 e permaneceu nessa página após alternar
  categorias. Cadastrar d14 Órbita funcionou junto do catálogo já preenchido.
- Teclado simulado por redução da viewport para 400 px, foco na descrição:
  editor 400 px, cabeçalho 0–60, conteúdo 60–339, campo 226–327, rodapé 339–400.
  Menu temporariamente oculto; foco e texto preservados, sem sobreposição.
- Em 300 px com foco no nome: conteúdo 60–239, campo 175–225, nome atualizado;
  o campo continuou acima das ações, sem ser coberto.
- 900 px: editor centralizado 740×702, menu superior, sem overflow.
- 759 px: tela cheia. Salvar em Geral preservou nome Órbita mobile, descrição
  editada e o d14 cadastrado em Configurações. Reabertura confirmou todos.
- JSON exportado do desktop importou no mobile com imagens e configurações.

Screenshot: `antropologo-editor-sistemas-mobile-v030.jpg`.

Os sistemas/imagens usados na QA são sintéticos e não viram presets de produção.
