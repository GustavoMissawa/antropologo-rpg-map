# Home Orbital v0.46 — Navegação expandida e câmera cósmica

## Base e escopo

A abertura confirmou a publicação 99, aplicação 0.45, no projeto original
`appgprj_6adb8be679b48191bc7fbcf908d41024`. A branch anterior
`dev/v0.45-nebulosas-aleatorias` estava limpa, no commit
`b5bb411f2fbf5b72ec3887b5299cf69c576fd250`; a fonte Sites era
`b9e7b0f1d64b2ba3367d411f0af36a836e546205`. Nova conferência antes do envio
não encontrou avanço nessa base nem publicação posterior.

A branch de trabalho é `dev/v0.46-navegacao-cosmica`. O mecanismo central
foi executado uma vez: pacote 0.46.0, exibido como 0.46 em Sobre.
Os dois textos anexados eram idênticos. As cinco imagens citadas não vieram
com os anexos desta solicitação; a implementação segue as etapas escritas
e preserva o desenho já publicado.

## Estados e histórico

O reducer puro `lib/orbital-navigation.ts` representa exploração, entrada,
destino, troca e retorno. Hover/foco continuam no estado local da cena e
não movem a câmera. A seleção fica independente do ponteiro, mantendo o
fio e a parada do disco quando o cursor sai do nó.

| Evento | Estado resultante |
| --- | --- |
| Observar nó por mouse/teclado | Prévia na exploração; câmera permanece parada |
| Selecionar na exploração | `entering`, depois `destination` |
| Selecionar outro destino | `switching`, depois `destination` |
| Retornar ou Escape | `returning`, depois `exploration` |
| Interromper retorno com outro destino | `switching` a partir da posição atual |

`app/use-orbital-navigation.ts` centraliza hash e um único temporizador de
conclusão. A troca cancela o temporizador anterior; a desmontagem remove
temporizadores e listeners. Os 120 ms de troca do fio continuam sendo
controlados separadamente pela cena, com sua própria limpeza.

Os endereços são `#inicio/sistemas`, `#inicio/fichas`, `#inicio/pdfs` e
`#inicio/agenda`. A alteração de hash cria entradas nativas no histórico;
Voltar/Avançar, links diretos e abertura dos links em outra aba funcionam.
O bootstrap de sessão preserva hashes orbitais explícitos e não os substitui
pela página anterior do cache. Voltar de um sistema para um hash orbital
restaura o contexto global, sem apagar o sistema. A proteção de tópico
com edição pendente é verificada antes de qualquer troca de contexto;
o editor e o rascunho permanecem montados quando a saída é bloqueada.

O botão **Voltar ao mapa orbital** e Escape fazem a sequência inversa.
A configuração de aparência não é alterada, e voltar à Home não sorteia
outro cenário. O header continua abrindo diretamente as áreas existentes.

## Câmera e continuidade

A cena compartilha uma única transformação para disco, D20, trilho,
estrela, fio e nós. A câmera desloca esse plano para a esquerda e o aproxima
em 1,12× no desktop. A direção vertical muda discretamente para cada destino.
A geometria de conexão continua sendo medida no sistema local da cena;
medidas de viewport são normalizadas pela escala atual, inclusive em resize.

Estrelas e nebulosas são camadas de profundidade do cenário existente.
O campo estelar aproxima em 1,6×, as nuvens em 1,28×, com deslocamentos
proporcionais e uma origem fixa para evitar saltos nas trocas. As estrelas
saem naturalmente da região recortada: não há troca de pontos, sorteio,
remoção por quadro ou animação React por RAF. Os nós SVG, coordenadas e
parâmetros das nebulosas permanecem os mesmos.

O movimento usa CSS com `transform` e `opacity`, sem dependências novas.
Entrada/troca: 660 ms; retorno: 480 ms; conteúdo: até 280 ms. Esses tempos
maiores pertencem à aproximação espacial solicitada, não às ações internas,
que continuam imediatas. As transições podem ser interrompidas e retomam
do valor visual corrente. A oscilação das nuvens e o Canvas mantêm suas
pausas por visibilidade já existentes.

## Painéis e dados reais

O painel é uma região da Home, não uma janela modal nem outra implementação
das áreas internas. Os atalhos usam as funções e dados já mantidos por App.

| Destino | Conteúdo e ações |
| --- | --- |
| Sistemas | Todos os rulebooks da sessão, contagem de tópicos, abrir sistema, criar e ver biblioteca |
| Fichas | Personagens realmente disponíveis em `recent`, abrir ficha existente, criar e ver todas |
| PDFs | Catálogo carregado, estados de carregamento/erro/vazio, links reais, adicionar e abrir biblioteca |
| Agenda | Resumo das funções existentes e acesso à Agenda completa; sem sessões fictícias |

A lista de PDFs é recebida do estado existente; nenhuma consulta ou API
paralela foi criada. Criar personagem e adicionar PDF abrem os formulários
originais. Dados de teste usados no navegador ficaram somente na prévia.
Não foram criados registros de demonstração na versão pública.

## Acessibilidade e composição responsiva

Os nós não selecionados ficam invisíveis, sem ponteiro e fora da ordem de
foco. O workspace usa `inert` durante o modo expandido. O conteúdo só entra
na árvore acessível e aceita interação quando seu destino está pronto.
Durante o retorno, todo o painel fica inert, incluindo seus controles.

O título recebe foco ao concluir a aproximação, e o retorno restaura foco
no nó de origem. Essa transferência respeita uma janela de configuração
aberta e o controle manual do D20: a câmera não toma seu foco. Escape não
intercepta o fechamento de dialogs existentes. Links de troca têm endereço
real e preservam cliques modificados e abertura em outra aba.

No celular, a cena recua acima da região contextual e o conteúdo ocupa a
largura disponível. Um acionamento seleciona o destino. Em movimento reduzido,
o estado se conclui imediatamente e as transformações mudam sem animação,
com um fade breve do conteúdo. Mudança da preferência ou aba oculta conclui
uma transição pendente. O usuário não depende de `transitionend`.

## Preservação

Não foram alterados a geometria do D20, seu controle por mouse/toque,
a inércia, o compositor Canvas, a matemática da conexão, as paletas,
a persistência da aparência nem a geração das nebulosas por documento.
Não houve alteração de schema, API, dependência ou vínculos D1/R2.
A v0.38 Alpha, histórico e mídia anteriores foram preservados.
Nenhuma captura ou gravação demonstrativa foi adicionada ao GitHub.

## Validação anterior à publicação

- **439 testes passaram**, sem falhas ou testes ignorados; TypeScript passou.
- Build de produção passou; mantém os avisos existentes de chunks maiores
  que 500 kB e classificação estática incompleta de rotas do Vinext.
- Novos testes cobrem reducer, idempotência, reversão e seleção rápida,
  identidades DOM, coordenadas persistentes, inert/foco, Escape, histórico,
  links diretos/remontagem, PDFs carregados e formulários originais.
- Cobertura simulada de toque, movimento reduzido, aba oculta e preservação
  do D20 durante seleção continua passando.
- Testes reais no navegador confirmaram quatro destinos, isolamento,
  troca, retorno, Escape, Voltar, sistema AB10 e ficha temporária existente.
- No zoom para Agenda, **277 estrelas visíveis passaram a 94**; o diâmetro
  medido passou de 3,218 px para 5,149 px (1,6×), sem alterar coordenadas.
- Os mesmos parâmetros de nebulosas e os mesmos nós do cenário foram
  preservados durante seleção, troca, preferência e retorno.
- Rubi/Dourado claro e Ametista/Violeta escuro foram inspecionados.
- Viewports de 320, 390 e 1794 px foram exercitados por iframes reais.
  No menor, a área útil e scrollWidth foram ambos 305 px, sem rolagem
  horizontal; o painel e a estrela selecionada permaneceram acessíveis.
- A revisão mecânica dos novos componentes não apontou problemas.

Limites: não houve teste em celular físico, leitor de tela real ou benchmark
de GPU. Toque e movimento reduzido têm cobertura simulada; o navegador usado
não oferece emulação da preferência do sistema. As imagens de referência
citadas no texto não estavam nos anexos recebidos. A revisão do movimento
foi concluída por inspeção de código e navegador na sessão principal.

Comandos em `aplicacao/v0.40`:

```bash
node node_modules/typescript/bin/tsc --noEmit
node --test --test-force-exit --test-concurrency=4 tests/*.test.mjs
node /home/agent/.codex/plugins/cache/openai-curated-remote/sites/1.1.6/scripts/build-site.mjs
```

## Publicação

Publicação **100**, concluída em **17/11/2026**, no projeto e endereço originais:
[ANTROPOLOGO RPG](https://antrobologorpg.guss04.chatgpt.site/).

| Referência | Valor |
| --- | --- |
| Aplicação | **0.46 — Desenvolvimento — Home Orbital** |
| Branch | `dev/v0.46-navegacao-cosmica` |
| Implementação | `bd2fce94836332857b271e0c1f3ad596bf30b386` |
| Correção de proteção do editor e código publicado | `11f1491de99d7cc89896e7d954a688cc5587cb70` |
| Fonte Sites sincronizada | `21545fc5482094cdd8f000128554165ff1898822` |
| Versão salva | `appgprj_6adb8be679b48191bc7fbcf908d41024~appgver_edb01f491320819197ebaeb4972f1a5d` |
| Implantação concluída | `appgdep_6afcc676577c819189f74485e0e44ef6` |

Os **422 arquivos** da aplicação foram comparados entre o GitHub e a fonte
sincronizada, sem diferenças. O pacote final foi reconstruído com o commit
11f1491d; a checagem de tipos e os 439 testes passaram. Não houve alteração
de público, armazenamento, bindings ou histórico recuperável. A publicação 99
permanece disponível para restauração.

No endereço público, Sobre exibiu **0.46** e **11f1491d**. Safira/Escuro foi
selecionado pela configuração existente. O teclado percorreu Sistemas,
Fichas, PDFs e Agenda: em cada prévia havia um nó ativo e a câmera continuava
em exploração, com `expanded=false`. Enter em Agenda abriu
`#inicio/agenda`, isolou o nó e exibiu sua região contextual e acesso à Agenda.

A conferência seguinte iniciou a abertura das quatro áreas internas pelos
painéis e o retorno pelo histórico. O transporte do navegador foi desconectado
durante essa sequência, sem devolver o resultado. A tentativa de recuperação
não respondeu; por isso **essa última sequência não foi registrada como
concluída em produção**, nem foi exportada uma captura pública final.
A publicação nativa retornou `succeeded`. As quatro áreas e o histórico já
haviam passado nos testes automatizados e na prévia real, conforme a seção
anterior, mas essa evidência não substitui a etapa pública interrompida.

Pendência de validação: concluir a abertura dos itens dos quatro painéis,
retorno e captura final no endereço público quando o navegador de teste
estiver disponível. Os limites de celular físico, leitor de tela e preferência
de movimento reduzido real continuam declarados acima. Nenhuma mídia foi
adicionada ao GitHub.
