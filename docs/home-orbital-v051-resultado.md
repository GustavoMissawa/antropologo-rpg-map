# Resultado do dado da Home Orbital · v0.51

A implementação parte da v0.50, publicação 109, fonte Sites
`6ac0a6196932747f3af2d289718c0058fb546370` e base GitHub
`ce6d870eaef733f04a89cf9f606a074e4e0a5059`. Os 428 arquivos de aplicação
coincidiam nas duas fontes. A branch de desenvolvimento é
`dev/v0.51-resultado-orbital`. A versão exibida vem de `package.json`
por meio de `SITE_VERSION`.

A base publicada já tinha controle tridimensional e troca de geometria
ao selecionar destinos orbitais. A v0.51 usa o detector de movimento
existente em `lib/ambient-interaction.ts` para aplicar o limiar de dois
segundos ao dado da Home. O sorteio escolhe uma das faces da geometria ativa
com a mesma probabilidade para cada índice.

## Ciclo do resultado

| Estado | Comportamento |
| --- | --- |
| Movimento livre | O giro automático e a entrada manual usam o motor existente. Mouse, arraste e setas usam deslocamentos efetivos para qualificar a rolagem após ao menos 2 s de movimento, considerando uma parada após 250 ms de inatividade. |
| Alinhamento | O dado desacelera ao orientar a face sorteada para a câmera em cerca de 450 ms. Com movimento reduzido, a face é alinhada imediatamente. |
| Resultado visível | O texto SVG é centralizado na face projetada e seu tamanho respeita a distância às arestas. O dado permanece imóvel enquanto o resultado fica visível por 5 s. A apresentação também é anunciada por uma região de status. |
| Desaparecimento | Ao completar os 5 s, a opacidade do texto vai de 1 a 0 em 400 ms. O primeiro movimento efetivo ou uso de uma seta durante a exibição cancela a contagem e inicia a saída de 200 ms. |
| Liberação | O fim da animação remove o texto e libera a entrada. As coordenadas do ponteiro são acompanhadas durante o bloqueio para descartar os deslocamentos. Para girar manualmente, é necessário um movimento novo. |

`app/use-orbital-die.ts` mantém no máximo um temporizador pertinente à etapa
atual. A saída em curso ignora tentativas adicionais. O callback de término
confere a animação que o originou. Navegação que aciona a transformação do
dado e desmontagem do componente cancelam o temporizador, a animação e as
entradas pendentes. O disco mantém seu próprio relógio e pode continuar em
movimento enquanto o resultado está visível.

## Validação antes da publicação

| Verificação | Resultado |
| --- | --- |
| Saída automática em Chromium | O D20 mostrou uma face legível e ficou imóvel durante o período visível e a transição. A observação por estado registrou aproximadamente 5,02 s de apresentação e 0,41 s de saída. |
| Saída antecipada em Chromium | Movimentar o mouse iniciou o desaparecimento. Vários deslocamentos durante a saída preservaram a geometria. O número sumiu sem salto e um movimento novo voltou a girar o dado. O teste com relógio controlado confere os 200 ms da animação. |
| Rolagens consecutivas e navegação | Rolagens sucessivas produziram novos resultados. Ao selecionar Sistemas com um resultado visível, a transição limpou o número e transformou o D20 em D6. O D6 aceitou uma rolagem nova na seção expandida. |
| Seis modelos | Rolagens observadas no Chromium com resultado dentro da faixa de cada dado. Os testes de geometria conferiram todas as 60 faces de D4, D6, D8, D10, D12 e D20. |
| Entradas e limpeza | Testes com relógio controlado cobrem movimento insuficiente, saída automática e antecipada, eventos repetidos, continuidade do toque, cancelamento e isolamento entre rolagens. |
| Verificações do código | TypeScript, `site-version.mjs --check`, build e 454 testes automatizados passaram. |

## Publicação e conferência em produção

| Referência | Valor |
| --- | --- |
| Aplicação | **v0.51 — Plataforma Orbital** |
| Publicação Sites | **110** |
| Commit GitHub do código publicado | `b0306f5e81d0a34efcbdd9b7d3b107a4c55b11cd` |
| Commit da fonte Sites | `1fb72867eed1b4407efeb3600b306fac436d68ea` |
| Implantação concluída | `appgdep_6afdd70a4a2481919e10992d42a35665` |

Os 430 arquivos de aplicação foram comparados com o commit do GitHub antes
do build. A sincronização preservou os 91 arquivos exclusivos da fonte Sites,
as APIs, as migrações, os vínculos `DB` (D1) e `BUCKET` (R2) e a v0.38 Alpha.

No [site público](https://antrobologorpg.guss04.chatgpt.site/#inicio), Sobre
exibiu a versão **0.51** e o commit **b0306f5e**. O Chromium não exibiu
um resultado com um gesto de 1,15 s. Em gestos válidos, o D20 manteve a
orientação durante a apresentação e nas duas saídas. Um novo movimento
voltou a girá-lo. Selecionar Sistemas com o resultado visível cancelou o
resultado, transformou o D20 em D6 e permitiu voltar à Home.

## Acabamento da v0.52

A v0.52 parte da publicação 110. O alinhamento da face passa de 450 ms a
650 ms. A curva de interpolação começa com velocidade zero, ganha velocidade
no primeiro terço e desacelera progressivamente até o repouso. Com
movimento reduzido, o alinhamento continua imediato. A exibição dura 5 s,
com saída de 400 ms ou 200 ms ao tentar girar o dado.

O número usa peso 400. O traço luminoso deriva da primária e um halo curto
usa a secundária. O fundo escuro da face dá contraste nos dois modos de
exibição. O modo de cores forçadas usa as cores de sistema e dispensa o halo.

No Chromium, a prévia mostrou a mudança da geometria durante o alinhamento
e revelou o número quando a face parou. Foram conferidos o tema escuro com
Safira e Violeta, o tema claro com Rubi e Cobre e a saída antecipada com a
face imóvel. Os 454 testes automatizados, TypeScript e build passaram.

A versão foi publicada no projeto original do ChatGPT Sites na publicação
**111**, com a fonte `8af1e999463f2ade579acd545f17e3a9835b1ec0` e o código do
GitHub `8b4e7d3b9602b25af48c6c2e629919f5395a15c3`. Em produção, Sobre exibiu **0.52** e
**8b4e7d3b**. Uma rolagem no tema escuro confirmou a virada gradual
da geometria e mostrou o número fino em Safira com halo Violeta. A versão
anterior e os vínculos D1/R2 foram preservados.

## Entradas de rolagem na v0.53

O botão do dado inicia a rolagem com um clique do mouse ou com Enter ou
Espaço. A animação combina uma volta completa com o alinhamento da face
sorteada em aproximadamente 950 ms. A preferência de movimento reduzido
mostra o resultado imediatamente. Um clique com o resultado na tela o
dispensa, e o próximo clique pode iniciar outra rolagem.

Um arraste de toque qualifica a rolagem após um segundo de movimento
contínuo. O dado espera a parada antes de alinhar a face. A entrada por
movimento do mouse e pelas setas mantém o limiar de dois segundos. O
limiar de toque é restrito ao dado Orbital.

Na prévia Chromium, clique e Enter animaram o D20 e revelaram números
válidos. A validação automatizada cobre toque sem arraste, arraste de
900 ms e de 1 s, dispensa do resultado e seleção de destino.

Os 455 testes automatizados, a checagem de tipos e o build passaram.
A publicação **112** usou a fonte Sites `7d34d5d4f7b38bf66d340dd43d292f51bfac2c81`
e o commit GitHub `299cd3477db6b25f5b997ff85eefd3a968cec70c`. Em produção, Sobre exibiu **0.53** e
**299cd347**. Um clique moveu a geometria do D20 e revelou o
número 9 após o alinhamento.
