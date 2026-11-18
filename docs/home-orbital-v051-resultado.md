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
