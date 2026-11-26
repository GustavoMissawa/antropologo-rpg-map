# Densidade estelar e conexões orbitais na v0.53

## Diagnóstico da v0.52

A publicação 126 variava o arquétipo por recarregamento. O Canvas usava uma semente fixa para os filamentos e a poeira, com perfis predefinidos. As partículas do disco eram distribuídas por todo o raio sem consultar os braços, anéis ou focos de brilho. O ponto do fio começava perto do ângulo do destino e orbitava sempre a mesma faixa, independentemente da textura exibida. O SVG do fundo mantinha o próprio campo de estrelas distantes. [Implementação da v0.52](discos-orbitais-v052.md)

## Composição por semente

A Home gera uma semente e um arquétipo na primeira montagem do documento. A semente reproduz o perfil, o mapa, as estrelas e os pontos de ancoragem. A composição e a fase de rotação ficam em memória durante a navegação, inclusive após desmontar e montar novamente a Home. O armazenamento de sessão guarda o último arquétipo para evitar repetição imediata quando a aba é recarregada.

| Arquétipo | Característica preservada | Variações da instância |
| --- | --- | --- |
| Espiral clássica | Três braços e um arco interno quente | Abertura, largura, curvatura, alcance, brilho e posição dos aglomerados |
| Braços gêmeos | Dois braços predominantes em lados opostos | Ângulo, extensão, intensidade e curvatura próprios para cada braço |
| Anéis concêntricos | Três faixas com vales entre elas | Espaçamento, espessura e setor luminoso variáveis por anel |
| Crescente luminoso | Um arco interno dominante e uma cauda difusa | Posição, abertura, intensidade, largura radial e concentração do arco |

O mapa usa 37 amostras radiais e 80 angulares em um `Float32Array`. A densidade de 0 a 1 combina a proximidade dos eixos dos braços, dos anéis ou do arco iluminado com concentrações periódicas locais. A interpolação bilinear mantém a amostragem contínua e fecha a emenda angular.

Uma distribuição acumulada de pesos sorteia de 1.240 a 1.600 estrelas. Cada célula recebe um peso proporcional à sua área e a `0,065 + 0,935 × densidade²`. Assim, os aglomerados concentram mais estrelas e pontos luminosos, e as regiões calmas recebem algumas estrelas tênues. A mesma densidade modula os filamentos, a poeira e as áreas quentes do disco. O céu distante continua como fundo, e os pigmentos do disco derivam da paleta e do modo escolhidos.

## Estrela do fio

O Canvas também desenha 80 estrelas candidatas nas duas faixas externas usadas pela conexão. A seleção restringe o setor ao lado do destino e reserva espaço para o fio. Cada estrela elegível recebe peso contínuo `0,14 + 0,86 × densidade`. A probabilidade de uma estrela elegível permanece positiva mesmo quando a densidade local é zero.

Foco, hover e toque usam essa seleção. Confirmar um destino já em foco aproveita a mesma estrela. Na troca de destino, o fio anterior termina sua saída antes da revelação do novo. A estrela acompanha a fase e a projeção da própria faixa do Canvas. A conexão Bézier mantém a outra ponta no nó correspondente. O quadro só compõe as texturas e atualiza a geometria SVG, com as pausas e o movimento reduzido da Home.

## Validação

- Passaram TypeScript, build de Sites e 473 testes automatizados. A regressão cobre geometrias e rolagem do dado, movimento reduzido, foco, toque e navegação. Os testes do disco verificam sementes, contraste de densidade por arquétipo, peso positivo, dispersão, recoloração e correspondência entre estrela pintada e âncora.
- No Chrome, comparei a v0.52 com duas sementes de cada arquétipo em claro e escuro. Validei a origem e o fim dos fios dos quatro destinos, a estrela em movimento, o repouso com foco por teclado, a persistência ao mudar tema e paleta, a ida à biblioteca e o retorno à Home. Em largura de 390 px, confirmei a composição de 640 px e o fio de PDFs.
- Na v0.52, o clique no centro da área de retorno do disco já atingia o controle de rolagem do dado sobreposto. O retorno pelo cabeçalho foi validado no navegador e o Escape foi coberto pela regressão automatizada.

## Comparação de desempenho

Medição isolada do Canvas no mesmo Chrome, com as duas versões alternadas, 28 amostras por versão e resolução, distribuídas pelos quatro arquétipos. A primeira medida inclui geração, rasterização, preparo das faixas, composição inicial e leitura de um pixel para sincronizar o Canvas. Cada amostra de composição vem de sete atualizações do mesmo conjunto de texturas, com leitura de pixel. Os valores estão em milissegundos e representam esse cenário de laboratório.

| Texturas de entrada | Etapa | v0.52 p50 / p90 | v0.53 p50 / p90 |
| --- | --- | --- | --- |
| 640 px | Primeira renderização | 53,90 / 69,00 | 51,60 / 61,70 |
| 640 px | Composição | 11,80 / 13,27 | 11,30 / 13,00 |
| 1.024 px | Primeira renderização | 83,90 / 104,50 | 87,50 / 98,90 |
| 1.024 px | Composição | 18,66 / 21,57 | 17,79 / 21,24 |

O compositor continua usando 11 faixas no máximo de 768 px de saída. A textura usa de 1.320 a 1.680 pontos, contando as âncoras, e o trabalho por quadro reaproveita todas as faixas. A mediana inicial de 1.024 px aumentou 3,6 ms. A mediana por composição caiu nas duas resoluções.
