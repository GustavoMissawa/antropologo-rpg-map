# Polimento astronômico · v0.64

A implementação parte da v0.63, publicação 137, fonte Sites `515f7acbd29d04246d0d32db7129bdaed599c0a0`. Os 487 arquivos da aplicação no GitHub, no commit `39836fa0d26032e663461f513966ae7258961b32`, coincidiam com a publicação. A referência histórica é a v0.58, publicação 132, commit GitHub `6fcca78945462c090f8dd350099e754ced16577c` e fonte Sites `b468f768d296df0703c0931be6e10cb7f3e8b638`.

## Identidade dos corpos

`lib/orbital-system.ts` mantém a versão de aparência `orbital-system-1` e a função `celestialSeed`. O centro continua derivando do ID do sistema, o planeta deriva do ID do sistema e do capítulo, e a lua deriva também do ID da subseção. Renomear, reordenar, inserir ou remover outros tópicos preserva a semente e as características de um corpo existente. A distribuição visual das órbitas acompanha a quantidade de capítulos exibidos. O tipo e as cores dos corpos independem das paletas da interface.

Uma comparação com a v0.63 em 144 catálogos confirmou igualdade das propriedades de planetas e luas, da arquitetura do sistema e da semente e das estimativas físicas do centro. O perfil visual do centro usa uma derivação independente da semente existente. Os parâmetros artísticos, incluindo a temperatura do perfil, ficam separados das estimativas físicas usadas pelas órbitas e pelos planetas. A aplicação continua derivando os elementos em memória, sem migração ou gravação de novos campos.

## Objetos centrais

`lib/orbital-astronomy.ts` concentra os pesos, raios, temperaturas aproximadas, paletas, alcance e intensidade do halo. O raio varia até 4% a partir da semente. O eixo orienta detalhes como feixes e disco de acreção. Os pesos descrevem a frequência desejada no mapa e podem ser alterados no catálogo. Alterar os pesos redistribui os arquétipos para algumas sementes.

| Arquétipo | Peso | Raio em unidades do mapa | Temperatura aproximada | Aparência |
| --- | ---: | ---: | ---: | --- |
| Estrela amarela | 25% | 54 | 5.200–6.150 K | Fotosfera dourada com granulação e halo quente. É o centro de AB10. |
| Estrela branco-azulada | 14% | 57 | 9.200–21.600 K | Núcleo claro e halo frio amplo. |
| Gigante vermelha | 10% | 62 | 3.150–4.550 K | Maior disco, manchas largas e halo alaranjado. |
| Anã vermelha | 19% | 35 | 2.500–3.700 K | Disco menor e avermelhado, com uma proeminência tênue. |
| Anã marrom | 11% | 34 | 820–2.250 K | Brilho baixo e bandas acobreadas. |
| Anã branca | 10% | 24 | 9.000–34.000 K | Disco branco compacto e brilho concentrado. |
| Pulsar | 5% | 18 | 340.000–1.050.000 K | Dois feixes direcionais com modulação suave de opacidade. |
| Magnetar | 3% | 21 | 1.200.000–4.800.000 K | Núcleo compacto e arcos que sugerem o campo magnético. |
| Buraco negro | 3% | 34,5 | — | Região escura, bandas de acreção procedurais e arcos que sugerem lente gravitacional. |

A escala do mapa comprime as diferenças de tamanho para deixar espaço entre o centro e as órbitas. O disco de acreção, as linhas de campo e os feixes são representações visuais dos fenômenos. As fontes de referência são [tipos de estrelas](https://science.nasa.gov/universe/stars/types/), [pulsares](https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-pulsars/), [magnetares](https://science.nasa.gov/missions/ixpe/nasas-ixpe-may-have-proven-90-year-old-theory/) e [buracos negros](https://science.nasa.gov/universe/black-holes/anatomy/) da NASA.

## Planetas, luas e cinturões

`lib/orbital-texture.ts` gera contornos com ruído coerente e deriva cada família de marcas de uma semente secundária. Rochosos ganham relevo e crateras com borda e sombra. Desérticos ganham dunas, oceânicos ganham continentes e correntes, gelados ganham calotas e rachaduras, e vulcânicos ganham fissuras iluminadas. Gigantes gasosos e de gelo têm 11 e 8 bandas, respectivamente, com turbulência onde o perfil físico prevê tempestades. Luas rochosas usam bacias de impacto próprias, com crateras maiores e mais densas. `app/orbital-space.tsx` compõe essas marcas com iluminação, terminador, atmosfera e anéis em planos dianteiro e traseiro. O foco revela marcas adicionais sobre a mesma superfície.

Em sistemas com pelo menos dois planetas visíveis, `lib/orbital-layout.ts` sorteia 38% de chance de tentar posicionar um cinturão. O gerador escolhe a maior faixa livre entre as órbitas considerando as silhuetas, inclusive os anéis. Se houver espaço entre o centro e a órbita mais interna, essa faixa pode servir de alternativa. Sem folga suficiente, o cinturão é omitido. Até 148 candidaturas geram fragmentos com tamanhos e densidade variáveis, agrupados em três caminhos SVG. O cinturão aparece na visão geral e usa a elipse do mapa.

## Paralaxe da biblioteca

`lib/comet-parallax.ts` gera um padrão distinto para cada plano em `app/orbital-comet.tsx` e `app/orbital-space.css`. Os três planos atravessam a cena na mesma direção diagonal, em velocidades diferentes, e repetem em ambos os eixos. A camada próxima acrescenta rastros mais longos. A posição do núcleo fica estável e a cauda tem oscilação própria, acompanhada de dois fluxos de poeira.

| Plano | Estrelas no desktop | Estrelas no móvel | Período no desktop | Período no móvel |
| --- | ---: | ---: | ---: | ---: |
| Distante | 64 | 44 | 68 s | 49 s |
| Intermediário | 44 | 32 | 19 s | 14 s |
| Próximo | 20 | 11 | 6,8 s | 5,3 s |

As contagens são do padrão antes de sua repetição. Cada nível agrupa pontos e rastros em caminhos vetoriais. Na largura de até 640 px, 41 pontos extras ficam ocultos. A cena pausa fora da área visível e em abas ocultas. Com movimento reduzido, núcleo, cauda e planos permanecem em uma composição estática. A montagem da cena acompanha a rota da biblioteca e fica independente da quantidade de documentos.

## Integração e validação

O gerador do sistema e o renderizador de globos fornecem os corpos para `app/orbital-system-scene.tsx`. `app/orbital-central-body.tsx` e `app/orbital-system.css` compõem o centro. `app/use-orbital-camera.ts` usa o tamanho projetado da silhueta para posicionar rótulos e guarda o estado de animação visual do centro. As curvas de aproximação, as rotas, o leitor, a navegação da Home e as áreas de edição seguem o fluxo da v0.63. A entrega mantém o mesmo projeto Sites e suas configurações de hospedagem, preservando as referências de recuperação.

| Verificação no Chromium | Resultado |
| --- | --- |
| Sistemas pequenos e atlas de 120 capítulos e 60 luas | Perfis centrais, inclusive pulsar, gigante vermelha, magnetar e buraco negro, e um cinturão com 71 fragmentos. O atlas apresenta 10 planetas na visão geral e mantém o catálogo completo no índice. |
| Superfícies e subseções | Os sete materiais em um mesmo mapa. Abertura de planeta, seleção de lua, leitura, Voltar e Avançar. |
| Entrada e navegação | Chegada da Home da plataforma ao AB10, link direto para Atributos e leitura de subseção em Clássico. |
| Biblioteca | Paralaxe em desktop e viewport de 390 × 844, núcleo fixo e movimento da cauda. A cena permaneceu ativa com a biblioteca vazia e após adicionar dois arquivos de teste. |
| Aparência e movimento | Temas claro e escuro. Movimento reduzido emulado com transformações das estrelas estacionárias e os efeitos do magnetar pausados. |

Cada linha abaixo representa 120 intervalos de `requestAnimationFrame` em Chromium remoto durante a prévia. Os dados mostram mediana e percentil 90 em milissegundos. A v0.58 antecede as órbitas contínuas da versão usada como base. A v0.63 é a comparação direta para o custo do polimento.

| Cena | v0.58 | v0.63 | v0.64 | Elementos SVG v0.58 / v0.63 / v0.64 |
| --- | ---: | ---: | ---: | ---: |
| AB10, 1240 × 826 | 33,3 / 33,4 | 50 / 83,3 | 50 / 83,3 | 264 / 395 / 382 |
| Atlas grande, 1240 × 826 | 33,3 / 33,4 | 50 / 83,4 | 50 / 83,3 | 573 / 557 / 600 |
| Cometa, 1240 × 826 | 50 / 83,3 | 50 / 83,3 | 50 / 83,3 | 284 / 284 / 93 |
| Cometa, 390 × 844 | 50 / 83,3 | 50 / 83,3 | 50 / 83,3 | 284 / 284 / 93 |

A geração dos dados de AB10 teve mediana de 0,005 ms na v0.58 e 0,009 ms na v0.63 e na v0.64. Em um catálogo sintético de 300 tópicos, as medianas foram 0,114 ms, 0,315 ms e 0,315 ms. A comparação intercalou 1.400 amostras com a execução aquecida. A medição em navegador é sensível à cadência da sessão remota. A verificação móvel usou viewport emulado, sem medição em aparelho físico.

Os testes em `tests/orbital-astronomy.test.mjs` cobrem os pesos dos nove perfis, a identidade após edições no índice, a folga dos cinturões, a estabilidade das texturas e o orçamento dos três planos do cometa.
