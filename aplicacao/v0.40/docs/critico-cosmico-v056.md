# Crítico Cósmico na v0.56

## Base auditada

A publicação 129 da v0.55 já desenhava quatro arquétipos procedurais, até três nebulosas e um campo de estrelas independente. O Canvas girava as texturas do disco em 11 faixas, com velocidades diferentes por raio. O fio usava o mesmo relógio para projetar sua estrela de origem. No resultado máximo, o SVG do dado recebia dois conjuntos de traços bicolores e duas cópias do número.

## Evento e renderização

`app/use-orbital-die.ts` remove o desenho do neon e usa a comparação existente entre resultado e número de faces para iniciar o evento. O sorteio, a geometria, a apresentação do número e os cinco segundos do resultado seguem o ciclo usual. `lib/orbital-critical.ts` concentra a sequência em 4,7 segundos. O fluxo sobe progressivamente, contrai as faixas internas do disco, acende os jatos e dissipa a energia. `app/orbital-flow.ts` acrescenta o impulso ao relógio corrente e `lib/orbital-flow.ts` aplica a compressão às cinco primeiras faixas. As duas faixas com âncoras preservam a projeção.

`app/orbital-art.tsx` monta uma camada de Canvas atrás do dado e acima do disco. `lib/orbital-jet.ts` usa a semente existente para gerar uma textura de plasma com núcleo claro, gás difuso e ramificações. A mesma textura sai em dois sentidos opostos, perpendicular ao eixo maior do disco projetado. O lobo mais brilhante se estende um pouco mais. Rastros seguem o fluxo de cada lobo durante a descarga. A onda é uma faixa luminosa circular e suave que cresce na direção da câmera, em projeção de tela. [Referência visual da NASA sobre jatos de buracos negros](https://science.nasa.gov/universe/black-holes/anatomy/)

`app/orbital-home.tsx` integra a interrupção à câmera de navegação. `app/orbital-backdrop.css` ajusta a exposição das estrelas e das nebulosas durante a sobrecarga. O Canvas usa a paleta escolhida e reforça o pigmento no tema claro. As faces opacas do dado ficam sobre toda a emissão e mantêm o contraste original do resultado.

Ao dispensar o resultado ou deslocar a câmera, a intensidade corrente decai em até 180 ms. Ocultar a aba, tirar o dado da área visível ou desmontar a Home limpa a animação. Movimento reduzido mostra um halo estático durante o resultado. Cores forçadas usam o número padrão.

## Custo e validação

Os jatos usam o mesmo agendamento do disco. As texturas são rasterizadas na primeira ativação da combinação de paleta e resolução, e reutilizadas nos quadros seguintes. Os limites são 576 × 576 px e 56 rastros em desktop, 352 × 352 px e 24 rastros no modo compacto. O desenho por quadro usa os buffers em memória.

| Viewport aproximada | Intervalo dos quadros em repouso p50 / p90 | Durante o crítico p50 / p90 |
| --- | ---: | ---: |
| Desktop · 1.348 px | 50,0 / 50,1 ms | 50,0 / 50,1 ms |
| Compacta · 390 px | 50,0 / 66,6 ms | 50,0 / 66,7 ms |

Medição local em Chrome remoto, comparando janelas de aproximadamente 4,7 s na mesma composição, após aquecer o efeito. A cadência desse ambiente já era limitada em repouso. A largura móvel foi simulada no Chrome de desktop.

- **479 testes aprovados**, além da checagem TypeScript e do build. Os testes cobrem as faces máximas e comuns dos seis dados, a duração, a interrupção, movimento reduzido, a retomada da fase e a geometria das âncoras.
- No navegador, conferi os quatro arquétipos, cenas com e sem nebulosas, paletas frias e quentes, temas claro e escuro e a leitura do resultado no pico. Também exercitei uma rolagem comum, a saída para Sistemas durante a concentração e a limpeza após o ciclo completo.
