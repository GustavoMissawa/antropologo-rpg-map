# Canvas de Fichas — ANTROPOLOGO RPG v0.51

## Auditoria da v0.50

A publicação 123 usa o commit de origem `b281e35` e corresponde a `e001f895` no GitHub. O mapa de Fichas é um editor DOM próprio e carregado sob demanda. `SheetMap` combina navegação espacial, seleção, manipulação, abas e inspector. `SheetField`, `FieldForm`, `SheetBlockFields`, `BlockVisualControls`, `SheetDice` e `SheetPortrait` implementam conteúdo e ações. `model.ts`, `sheet-engine.ts`, `sheet-field-layout.ts` e `sheet-connections.ts` mantêm posições, valores, rolagens e vínculos.

Os fluxos existentes incluem criação e importação de personagens sem conta, fichas-modelo vinculadas a sistemas, campos e cálculos configuráveis, retrato, imagens, cores, abas, arranjo livre ou em grade, agrupamento de blocos no Modo ficha, rolagens e exportação JSON ou Super PNG. O carregador normaliza fichas antigas, inclusive arquivos `.ab10`. Esses fluxos usam as mesmas operações da plataforma nos estilos Orbital e Legado.

Na interface anterior, a identificação, os modos, as abas e a barra de ferramentas antecediam a área manipulável. Em desktop essas barras já ocupavam 342 px dentro do editor. No celular, os controles empilhados empurravam o mapa para baixo e as propriedades ficavam depois do mapa. O gesto antigo capturava um único ponteiro, atualizava componentes React durante o arraste e não oferecia pinça nem histórico de edição. A largura já tinha limites e encaixe. A altura arrastável se concentrava nos blocos de imagem.

## Referências e decisão de arquitetura

| Referência | Recurso avaliado | Aplicação ao editor |
| --- | --- | --- |
| [Obsidian Canvas](https://obsidian.md/pt-BR/help/plugins/canvas) | Seleção por toque, ações contextuais, redimensionamento, encaixe e zoom para seleção | Seleção visual, alças deliberadas, enquadramento e ferramentas próximas ao mapa. A linguagem visual continua própria do ANTROPOLOGO. |
| [JSON Canvas 1.0](https://jsoncanvas.org/spec/1.0/) · [MIT](https://jsoncanvas.org/) | Posições e dimensões de nós, arestas independentes | Referência conceitual. As fichas têm atributos, fórmulas, vínculos e abas próprios, representados pelo formato atual. |
| [React Flow](https://reactflow.dev/api-reference/react-flow) · [MIT](https://github.com/xyflow/xyflow/blob/main/LICENSE) | Pan, pinça, zoom, teclado, controles de redimensionamento e arestas | Usado no mapa estático de documentação na raiz do repositório. O editor publicado usa DOM próprio. Migrar seus blocos para outra árvore duplicaria a integração com formulários, rolagens e conexões. |
| [Excalidraw](https://github.com/excalidraw/excalidraw) · MIT | Área de desenho, ferramentas flutuantes e zoom | Bom comparativo para a hierarquia da área de trabalho. As fichas precisam manter seus formulários DOM diretamente acessíveis. |

As capturas originais do Obsidian Mobile não estavam entre os anexos acessíveis desta solicitação. O desenho seguiu a descrição do pedido e a documentação pública do Obsidian. Nenhum código ou recurso visual do Obsidian foi incorporado.

## Arquitetura da mudança

O editor mantém um modelo de ficha, uma árvore de blocos e as operações existentes de cálculo, importação e exportação. Uma apresentação compacta dá prioridade ao mapa em telas pequenas e recolhe ferramentas em gavetas. O desktop conserva os controles de mouse e teclado, com histórico disponível na barra do mapa. Os gestos usam Pointer Events e o mapa atual. O histórico é local à instância aberta do editor, com snapshots que compartilham referências aos dados, sem novos campos no arquivo. Conexões continuam servindo ao agrupamento no Modo ficha e os vínculos numéricos continuam configuráveis pelos campos.

| Componentes | Responsabilidade |
| --- | --- |
| `sheet-map.tsx`, `sheet-map-chrome.tsx`, `sheet-map-inspector.tsx`, `sheet-canvas.css` | Mesmo mapa para mouse, teclado e toque. Cabeçalho e abas compactos, controles flutuantes abaixo da área navegável e ações da seleção. |
| `use-sheet-map-gestures.ts` e `sheet-map-gestures.ts` | Pan por um dedo no fundo, pinça ancorada no centro dos dedos, toque curto e arraste pela alça. Em toque, o arraste só começa após 8 px. O estado visual do movimento fica no DOM e a geometria é gravada ao soltar. |
| `use-sheet-edit-history.ts` e `sheet-edit-history.ts` | Até 40 edições por instância, agrupamento de digitação e atalhos de teclado. Trocar de aba continua sendo navegação. |
| `sheet-dialog.tsx` e `use-sheet-inline-keyboard.ts` | Gavetas com área rolável, foco e ações visíveis quando o teclado reduz o viewport, inclusive para edição de campos inline. |
| `sheet-fields.tsx`, `sheet-block-visuals.tsx`, `model.ts`, `page.tsx` e `layout.tsx` | Adoção das gavetas, prévia de tamanho durante o gesto, enquadramento de fichas extensas e integração com as rotas e o carregamento sob demanda existentes. |

O redimensionamento usa a largura e a altura da imagem, ou a altura mínima para blocos com conteúdo. A altura automática permanece disponível. O modo Grade conserva o passo de 24 px e o modo Livre mantém coordenadas individuais. Essas opções e os ajustes numéricos atendem aos casos de alinhamento sem reorganizar fichas importadas.

React (MIT) e Lucide (ISC) já integravam a aplicação. A reformulação usa os componentes existentes, CSS, Pointer Events e VisualViewport. O pacote mantém as dependências da v0.50. O editor continua sendo uma entrada dinâmica e o JavaScript inicial comprimido ficou em aproximadamente 223 kB, na mesma faixa da publicação anterior.

## Verificações automatizadas

- Suíte Node com 466 testes aprovados e zero falhas. Os cinco novos testes cobrem escala ancorada, limites e encaixe, enquadramento em tela curta e o histórico limitado e reversível.
- TypeScript e build de produção aprovados.
- ESLint no código e nos testes da aplicação. A base tinha 68 erros e 62 avisos. A revisão terminou com 62 erros e 58 avisos, todos presentes na base. Nenhuma regra de lint foi alterada.

## Navegador

Os testes de interface rodaram em Chromium 158 com o build do Worker. O teste móvel usou pontos de toque do Chromium com 390 × 844 px. A área manipulável ficou com 677 px de altura e 390 px de largura. Também foram conferidos 320 × 568 px e 844 × 390 px em orientação horizontal.

- **Gestos e histórico** — criação de blocos em gaveta, toque para seleção, toque prolongado para propriedades, limiar de arraste, deslocamento do fundo com um dedo, pinça com dois dedos, redimensionamento em dois eixos, desfazer e refazer. A pinça preservou as coordenadas do bloco.
- **Edição e arquivos** — campo numérico criado com redução simulada do viewport pelo teclado. O botão de confirmação e o campo permaneceram acessíveis. A edição inline restaurou o enquadramento. Alternância de abas, retorno à biblioteca, reabertura da ficha, download e leitura de JSON e Super PNG e importação de uma ficha `.ab10` v2 foram verificados.
- **Aparência e volume** — Orbital em Safira escuro, Legado em Rubi claro, movimento reduzido e ficha com 100 blocos e 500 campos. O enquadramento incluiu o último bloco e o pan continuou operando após ampliar.
- **Desktop** — viewport de 1440 × 1000 px com arraste pelo mouse, setas no bloco, histórico pelo teclado, encaixe em grade e zoom. A interface mantém o inspector ao lado do mapa.

A redução de espaço causada pelo teclado foi simulada via VisualViewport. A sessão não contou com aparelho físico Android ou iOS.
