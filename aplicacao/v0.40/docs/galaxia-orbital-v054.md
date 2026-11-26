# Estruturas galácticas e nebulosas procedurais na v0.54

## Diagnóstico da v0.53

A publicação 127 já guardava o arquétipo, a semente e a fase do disco no documento. Uma grade polar ponderava estrelas e âncoras, regulava a luminosidade dos filamentos e modulava a poeira. As concentrações locais vinham de duas oscilações periódicas. Os anéis tinham um halo circular completo, e os braços apresentavam poucos desvios pela sua extensão.

O SVG do céu distante era independente do Canvas do disco. As nebulosas usavam a mesma pilha de gradientes e o mesmo filtro SVG em cinco regiões, com variações de transformações e opacidade. Essa composição mantinha a forma geral das nuvens repetitiva e colocava o céu estelar na frente da poeira. [Arquitetura da v0.53](discos-orbitais-v053.md)

## Estrutura do disco

| Arquétipo | Variações estruturais |
| --- | --- |
| Espiral clássica | Três braços com ondulações suaves, desvios de largura e ramos que partem dos braços principais. Nós mais densos e faixas de poeira interrompem o brilho localmente. |
| Braços gêmeos | Dois fluxos predominantes diferem em largura, alcance, ondulação, intensidade e extensão dos ramos. |
| Anéis concêntricos | Três faixas com raio variável, setores enfraquecidos e segmentos de vapor. O núcleo de cada anel segue as ondulações, com vales entre as faixas. |
| Crescente luminoso | O arco interno dominante tem contorno ondulado, distribuição irregular de realces e cavidades sutis. Os ramos externos são mais fracos. |

Uma grade de ruído de valores de 32 × 32, interpolada por uma curva cúbica, fornece duas escalas de variação para a densidade. Na grade polar de 37 × 80, as duas frequências modulam as concentrações em torno dos braços, ramos, anéis e arcos. O ruído de menor frequência cria aglomerados e cavidades. O de maior frequência modula os contrastes locais. A atenuação da poeira segue os braços e as faixas. Filamentos curtos, arcos irregulares e estrelas já previstas no orçamento de partículas revelam essas diferenças.

A interpolação polar produz densidade contínua. As estrelas do disco usam entre 1.240 e 1.600 amostras, com peso por área e por densidade. O fio usa as mesmas 80 estrelas candidatas desenhadas nas duas faixas externas. Cada candidata no setor do destino recebe peso `0,14 + 0,86 × densidade`. Há peso positivo nas áreas mais vazias. A câmera, o relógio e o compositor de 11 faixas projetam a estrela de origem junto com a textura da própria faixa.

## Famílias de nebulosas

O sorteio usa uma semente independente do disco, com probabilidade de 1 em 3 de céu sem nebulosa. A frequência de cada família, condicionada à presença, foi verificada em 60 mil sementes. A coluna de amostra usa somente as 39.982 gerações com nebulosa.

| Família | Probabilidade | Amostra | Formação |
| --- | ---: | ---: | --- |
| Difusa e luminosa | 35% | 34,81% | Volumes de gás sobrepostos com cavidades e poeira entre as regiões emissivas. |
| Filamentar | 25% | 25,15% | Fitas que se cruzam, se ramificam e se dissipam em diferentes pontos de uma curva comum. |
| Escura | 20% | 19,94% | Faixa irregular de poeira absorvente, com aberturas e iluminação indireta nas bordas. |
| Pilares e colunas | 20% | 20,10% | Colunas com alturas, inclinações e espessuras variadas que nascem de uma base nebulosa. |

A ausência apareceu em 33,36% da amostra total. Aproximadamente 18% das composições presentes recebem um acento secundário, com 17,76% observados. O acento acrescenta um halo difuso, uma faixa de absorção ou filamentos finos que seguem a forma principal. As sementes reproduzem tipo, acento, estrutura, posição, ângulo e escala.

O campo de volume usa deformação em escalas diferentes e gera três canais de 8 bits por pixel para emissão, extinção e mistura de cores. O gás combina a paleta ativa com tons neutros próprios do modo. A poeira em primeiro plano absorve parte da emissão e do brilho das estrelas desenhadas atrás dela. A escolha de âncoras continua usando a densidade do disco.

A nebulosa ocupa um dos cinco corredores periféricos, sob a interface. A largura do Canvas varia com a tela, há dissipação até alpha zero nas bordas e uma máscara suave na região do dado. A intensidade diminui quando um destino está aberto. Os controles de aparência alternam a visibilidade e recolorem os canais existentes. O resultado vazio e a semente ficam na memória do documento durante a navegação.

## Renderização e desempenho

O disco calcula as novas formas no preparo das texturas. O laço de animação compõe as mesmas 11 faixas que a v0.53. Um Web Worker gera o material da nebulosa de 192 × 144 ou 288 × 216 px uma vez por resolução e transfere o buffer. Há uma alternativa em tempo ocioso para navegadores sem Worker. A nebulosa é estática depois de pintada, e nenhuma rasterização é agendada se estiver desativada, se o sorteio resultar vazio ou em modo de cores forçadas.

Com as duas versões no mesmo Chrome, alternadas no teste, foram usadas 28 amostras para cada versão e resolução, distribuídas pelos quatro arquétipos. A primeira renderização inclui geração, rasterização, preparo das faixas, composição e leitura de um pixel. Cada amostra de composição é a média de sete atualizações das mesmas texturas com sincronização por leitura de pixel.

| Texturas do disco | Etapa | v0.53 p50 / p90 (ms) | v0.54 p50 / p90 (ms) |
| --- | --- | ---: | ---: |
| 640 px | Primeira renderização | 50,30 / 57,20 | 51,70 / 60,90 |
| 640 px | Composição | 10,31 / 12,03 | 10,57 / 11,57 |
| 1.024 px | Primeira renderização | 84,00 / 103,70 | 79,20 / 92,80 |
| 1.024 px | Composição | 17,54 / 19,66 | 17,41 / 18,11 |

A mediana inicial em 640 px aumentou 1,4 ms e o p90 aumentou 3,7 ms. Em 1.024 px, as duas medidas caíram. O p90 de composição caiu nas duas resoluções. A nebulosa, medida separadamente em 30 amostras por resolução, levou 4,9 / 7,7 ms e 10,7 / 16,2 ms para gerar o material. A recoloração levou 0,3 / 0,4 ms e 0,5 / 0,6 ms, respectivamente.

As medições isolam as operações do Canvas e do material. A percepção de fluidez da Home foi verificada interativamente. As larguras de tablet e celular foram simuladas em Chrome de desktop, sem medição de FPS em aparelhos físicos ou comparação com Safari e Firefox.

## Validação

- Passaram as 476 verificações automatizadas, TypeScript e o build de Sites. A suíte cobre rotas, fases de navegação, âncoras, geometrias e rolagem do dado, movimento reduzido, persistência e mudança de aparência.
- A inspeção no Chrome comparou a v0.53 com duas sementes de cada disco. As nebulosas foram avaliadas em claro e escuro com três sementes de cada família e três híbridos, usando paletas frias e quentes.
- A Home foi validada em desktop e em janelas internas de 820 e 390 px com nebulosa presente, controles legíveis e sem rolagem horizontal. Também foi validada uma geração vazia em tablet.
- Foram verificadas as conexões dos quatro destinos e a correspondência entre o início do fio e a estrela. A troca de paleta e estilo preservou sementes e posição. O modo Clássico abriu e retornou ao Orbital. O dado respondeu à rolagem por teclado.

## Referências visuais

- [M51 e as faixas de poeira nos braços](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-51/)
- [Carina e as cavidades no gás](https://science.nasa.gov/asset/webb/cosmic-cliffs-in-the-carina-nebula-nircam-image/)
- [Filamentos do Véu](https://science.nasa.gov/asset/hubble/veil-nebula-supernova-remnant/)
- [A silhueta de poeira da Cabeça de Cavalo](https://science.nasa.gov/asset/hubble/the-horsehead-nebula/)
- [Pilares da Criação e suas colunas de gás](https://science.nasa.gov/missions/hubble/new-hubble-webb-pillars-of-creation-visualization/)
