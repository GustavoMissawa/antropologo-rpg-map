# Plataforma Orbital e Clássico (Legado) · v0.50

A implementação parte da v0.49, publicação 108, fonte Sites
`8cb033db5d854b848634a6ae5d2b5f16637f89e1`. A base GitHub é
`6365d6271a911bac42db04bd76aa7bed454f3a76`. Os 424 arquivos de aplicação dessa
base coincidem com a fonte publicada. O desenvolvimento segue na branch
`dev/v0.50-plataforma-orbital`.

## Auditoria antes da implementação

| Superfície | Componentes e dependências | Ponto de atenção |
| --- | --- | --- |
| Shell e Home | `page.tsx`, `PlatformHome`, `OrbitalHome`, `useOrbitalNavigation`, `platform-context` | A restauração do cache e o mapa liam o hash separadamente. Só a Home sem sistema ativo usava a identidade orbital. |
| Aparência | `lib/appearance.ts`, script antes da hidratação e `AppearanceControls` | O tema, as duas paletas e as nebulosas já usavam a mesma preferência local. |
| Sistemas | `RulesLibrary`, `RulesIndex`, `RuleTopicEditor`, metadados, identidade visual, ficha-modelo | O editor TipTap preserva blocos, caret e alterações pendentes. A navegação usa o guarda de rascunho. |
| Fichas | `CharacterLibrary`, `SheetMap`, diálogos e motor modular | Arraste, zoom, inspeção, abas e links entre blocos dependem das mesmas dimensões e instâncias. |
| PDFs | Catálogo, filtros e arquivos de teste em `page.tsx` | Objetos de URL locais e download dependem da sessão atual. O conteúdo deve manter a renderização do navegador. |
| Agenda e perfil | `PlayerSpaceProvider`, `RPGCalendar`, formulários de conta e sessões | Conta com validade de duas horas, estados pendentes e mutações compartilhadas. |
| Estilos | `globals.css`, `appearance.css`, navegação, leitura, mapa de ficha, agenda e médias de cada sistema | Escopo por estilo no shell. Temas de sistema e geometria de conteúdo exigem precedência sobre a decoração. |
| Serviços | IndexedDB da sessão, APIs, D1, R2, esquemas de importação e exportação | O modo visual é uma preferência local separada dos dados. Nenhuma migração é necessária. |

## Apresentação

Aparência adiciona **Estilo da interface** às preferências já salvas em
`ab10-appearance`. A migração implícita usa Orbital para valores antigos ou
inválidos. Claro ou Escuro, primária, secundária e nebulosas têm controles
independentes. A alteração é aplicada no mesmo documento. O script inicial
lê a preferência e a propagação entre abas usa o evento `storage`.

O cabeçalho Orbital aciona os quatro destinos expandidos da Home. O shell
compartilha o vocabulário cromático do mapa e dá às páginas completas um
caminho de volta ao mapa e à seção. O CSS interno usa estrelas estáticas,
nebulosidade leve e superfícies de trabalho. O disco, o dado e o fio pertencem
à Home. Clássico usa a visão geral tradicional, os catálogos e as
ferramentas de apresentação anteriores.

- **Sistemas** usa um índice pesquisável, com o AB10 e os sistemas próprios
  em grupos de catálogo, acesso a criação e importação, e leitura com índice
  e ferramentas de capítulo. A edição, personalização e ficha-modelo usam os
  componentes compartilhados.
- **Fichas** usa um índice por nome, jogador ou sistema. O espaço de edição
  reorganiza o cabeçalho, as ferramentas, as abas e o inspetor em torno do
  mapa existente. Posições e temas de blocos vêm da própria ficha.
- **PDFs** reúne busca e categorias no painel lateral, com resultados em
  linhas de documentos. O visualizador usa o PDF original e oferece download
  e abertura externa.
- **Agenda** mantém o calendário e a lista do dia lado a lado em desktop e
  empilhados em telas estreitas. Perfil, seleção de datas, filtros e
  formulários de sessão continuam ligados ao mesmo estado.
- **Componentes compartilhados** incluem Configurações, Ajuda, conta, perfil,
  diálogos, seletores, confirmações, estados de carregamento e avisos.
  O conteúdo de ajuda registra os caminhos de ambos os estilos.

## Navegação e edição

| URL | Destino |
| --- | --- |
| `#inicio` | Visão geral no estilo em uso |
| `#inicio/sistemas`, `#inicio/fichas`, `#inicio/pdfs`, `#inicio/agenda` | Painel expandido Orbital. No Clássico, abre a página completa equivalente. |
| `#regras` e `#regras/<id>` | Biblioteca e leitura ou edição do sistema, respectivamente |
| `#ficha`, `#ficha/personagem/<id>`, `#ficha/modelo/<id>` | Biblioteca, personagem na sessão e modelo de sistema |
| `#pdfs`, `#agenda` | Páginas completas em qualquer estilo |

`platform-navigation.ts` interpreta e produz os hashes. O shell usa o
histórico do navegador como fonte de navegação. A restauração da sessão dá
prioridade ao link explícito. Um sistema direto pode ser aberto quando está
no catálogo ou no cache da aba. Um personagem direto depende de estar aberto
na sessão. A ficha-modelo salva acompanha o sistema.

Na troca de estilo dentro de uma página completa, a URL e as instâncias dos
editores permanecem. Rascunhos de regras usam o guarda antes de mudar de
rota. Fichas e modelos permanecem na memória enquanto a página estiver
aberta. Trocar o modelo em edição usa a confirmação existente. O modo
Clássico mantém o contexto visual tradicional. Orbital aplica a identidade
específica somente à leitura do sistema ou à ficha vinculada, deixando o
mapa e as bibliotecas globais com a aparência da plataforma.

O código de dados, autenticação e armazenamento é compartilhado. A publicação
usa o projeto original com os bindings `DB` e `BUCKET`. O histórico e a
v0.38 Alpha continuam no repositório.

## Validação da entrega

| Verificação | Resultado |
| --- | --- |
| Navegação | O menu superior abriu o painel expandido e a página completa em cada área. No Clássico, os atalhos abriram as páginas diretamente. Voltar e Avançar restauraram o catálogo e o leitor correto. |
| Sistemas e fichas | Criação e edição exercitadas em Chromium. O texto de um capítulo em edição, a posição e o tamanho do bloco da ficha e o zoom sobreviveram à troca de estilo. Navegar para outra área com o tópico em edição foi bloqueado pelo guarda existente. |
| PDFs | O Chromium renderizou o documento sintético de uma página no visualizador Orbital. O Clássico manteve o link externo e o download do mesmo documento. O teste automatizado cobre adição e catálogo com resposta indisponível ou atrasada. |
| Agenda e perfil | Entrada e cadastro foram inspecionados sem conta real. Calendário, criação de sessão e perfil foram exercitados no Chromium com dados sintéticos na prévia isolada. As rotas reais de conta e Agenda foram testadas com SQLite local. |
| Aparência | Claro com Rubi/Ciano e escuro com Safira/Violeta. A preferência de interface e a paleta persistiram após recarregar. Desativar nebulosas conservou a cena e os demais controles. |
| Responsividade e movimento | As quatro áreas foram inspecionadas em desktop e em largura de 449 px nos dois estilos. O índice móvel do AB10 abriu como diálogo. A preferência de movimento reduzido e a interação simulada por toque passaram nos testes automatizados. |
| Verificações do código | TypeScript, build e 449 testes automatizados. |

Os dados sintéticos e as capturas temporárias da revisão ficaram fora do
código publicado.

## Publicação e conferência em produção

| Referência | Valor |
| --- | --- |
| Aplicação | **v0.50 — Plataforma Orbital** |
| Publicação Sites | **109** |
| Commit GitHub exibido em Sobre | `6c32be4b638cc3f2f5bbb21192213623f95ff0c2` |
| Commit da fonte Sites | `6ac0a6196932747f3af2d289718c0058fb546370` |
| Implantação concluída | `appgdep_6afda31eb6bc8191993e0eef597106ec` |

Os 428 arquivos da aplicação foram comparados com o commit do GitHub antes
do build e os 91 arquivos exclusivos da fonte Sites foram preservados.
As APIs, as migrações e o manifesto de hospedagem seguem o mesmo código da
publicação 108.

No [site público](https://antrobologorpg.guss04.chatgpt.site/#inicio), Sobre
exibiu **0.50** e **6c32be4b**. O menu Orbital abriu Sistemas, Fichas,
PDFs e Agenda com painel contextual seguido da respectiva página. A troca
para Clássico conservou o leitor do AB10 e seu endereço. A navegação
tradicional das cinco áreas e o retorno ao Orbital foram conferidos na
mesma sessão.
