# Correção do disco e das conexões — v0.43

A versão foi mantida em `0.43.0` por instrução explícita do pedido. A fonte
central continua sendo `package.json`, consumida por `SITE_RELEASE` em
Configurações → Sobre. A abertura comparou os 410 arquivos da aplicação no
GitHub em `fa2ec812e52d5bf5f10ff435d2c42703ac4593a7` com o código interno do
Sites em `2a0204fdccd69c37e939c5692f7c57fb6bc4686c`, da publicação 95.
Os arquivos coincidiram. A branch de trabalho é `dev/v0.43-origem-orbital`.

## Construção e sentido do disco

A espiral é procedural. `lib/orbital-light.ts` gera filamentos e poeira em
Canvas ou OffscreenCanvas, com semente estável. Os bitmaps resultantes são
fontes geradas em execução e reaproveitadas pelo compositor radial. O desenho
principal do disco conserva sua origem em Canvas. O fallback usa gradientes
CSS. A implementação orbital não carrega um PNG para produzir seu movimento.

O enrolamento dos filamentos existentes aumenta o ângulo em função do raio.
A revisão anterior também avançava a fase angular positiva. A correção
inverte o sinal da fase, preservando as onze velocidades radiais, e foi
comparada com uma gravação real da publicação 95. A projeção permanece
inclinada em 37 graus, com fator elíptico vertical de 0,74.

## Parada independente

`advanceOrbitalFlow` integra uma velocidade interpolada entre 0 e 1, com
constante de tempo de 0,18 s e limiar final de 0,004. A fase usa a integral
da velocidade, preservando continuidade ao frear, retomar e inverter a
intenção rapidamente. O disco chega a velocidade zero em aproximadamente
um segundo. Seu RAF é encerrado nesse estado e reaberto ao sair da seleção.

O relógio mantém fase e velocidade entre mudanças de tema ou tamanho. Pausa
de documento, interseção e movimento reduzido conservam o comportamento
existente. O atributo `data-disk-motion` registra somente as transições de
estado, sem atualizações React por quadro.

O controle de seleção usa `data-disk-selected`, enquanto o D20 conserva o
hook e os quaternions existentes. Sua velocidade automática continua em
20% no foco orbital, com prioridade do controle manual. Os arquivos de
geometria e movimento do D20 foram comparados com a origem e preservados.

## Estrela e curvas

`lib/orbital-connection.ts` projeta o ponto de origem no mesmo plano elíptico
do Canvas. Uma sequência determinística varia ângulo, raio e controles da
Bézier uma vez por ativação. A variação angular fica em cerca de seis graus.
A origem fica na região externa de filamentos, com afastamento do destino.

O fio usa as mesmas coordenadas da estrela em seu primeiro ponto e termina
no centro medido do nó. Os controles ficam dentro de um corredor limitado,
com até 18 px de variação vertical e sem avançar sobre os rótulos à direita.
Na composição compacta, o corredor permanece acima dos cartões dos destinos.
Resize recalcula a projeção com a mesma variante da seleção atual.

O traçado anterior desvanece por 120 ms antes da troca. O novo fio é revelado
em 240 ms. Uma única estrutura SVG contém trilha, pulso e estrela. O núcleo
da estrela usa um ponto claro, um reflexo discreto e um halo na secundária.
A entrada pulsa por 220 ms, e a confirmação conserva os 140 ms da navegação.
Uma ativação rápida substitui timers anteriores. A confirmação só ilumina
a origem quando a conexão corresponde ao destino confirmado.

Em movimento reduzido, a conexão e a estrela assumem estado estático, com
navegação imediata. Os SVGs decorativos não recebem foco nem interceptam
toques. A área de manipulação do D20 conserva seu `touch-action` existente.

## Arquivos principais

| Arquivo | Alteração |
| --- | --- |
| `app/orbital-art.tsx` | Relógio com velocidade preservada e sinal de seleção do disco. |
| `app/orbital-flow.ts` | Desaceleração, parada real, retomada, estado e limpeza do RAF. |
| `lib/orbital-flow.ts` | Integração da velocidade e inversão da fase angular. |
| `lib/orbital-connection.ts` | Projeção da origem e geração estável da Bézier. |
| `app/orbital-home.tsx` | Medidas dos nós, troca de conexão e estrela SVG na origem. |
| `app/orbital-home.css` | Revelação do fio, halo, cintilação e alternativas de movimento reduzido. |
| `tests/orbital-flow.test.mjs` | Parada, ausência de RAF ocioso, retomada e inversões rápidas. |
| `tests/orbital-connection.test.mjs` | Origem, projeção, limites, variação e composição compacta. |
| `tests/platform-discovery.test.mjs` | Curva estável, reativação e independência do controle manual. |

## Verificações

- 427 testes passaram, incluindo a regressão completa da plataforma.
- TypeScript e build passaram. O build mantém o aviso de bundle acima de 500 kB.
- No Chromium, uma região do disco teve bytes JPEG idênticos em duas capturas
  durante a parada, enquanto o SVG do D20 mudou de orientação.
- A sequência gravada registra os estados de desaceleração, parada e retomada.
- Foram exercitados Ametista/Rosa nos dois modos, Safira/Ciano no claro e
  Floresta/Dourado no escuro, além das rotas dos quatro destinos.
- Toque, movimento reduzido e geometrias compactas foram validados na suíte
  simulada. Inspeção em aparelho físico e medição de GPU mobile estão pendentes.
- As imagens citadas no pedido não vieram anexadas. A comparação usou a
  publicação 95 e a geometria procedural existente.

Comandos reproduzíveis na raiz da aplicação:

```bash
node --experimental-strip-types --test --test-force-exit --test-concurrency=4 tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/site-version.mjs --check
node /home/agent/.codex/plugins/cache/openai-curated-remote/sites/1.1.6/scripts/build-site.mjs
```

A revisão repetiu a suíte completa: 427 testes passaram em 12,7 segundos,
sem falhas ou cancelamentos. Uma segunda gravação, de 13 segundos e 240
capturas reais, documenta o fluxo, a parada e os quatro destinos. As
temporizações reais foram preservadas na exportação. O vídeo não constitui
um benchmark de FPS ou GPU. A conferência do disco parado produziu novamente
duas imagens idênticas da região amostrada, com o D20 ainda girando.

As gravações e capturas estão na
[galeria da correção](../../../docs/home-orbital-v043/origem-dinamica/README.md).

## Preservação

O pacote, as dependências, os bindings D1/R2, as APIs e as migrações conservam
os arquivos da origem. As publicações anteriores permanecem no mesmo projeto.
A publicação 95 permite restaurar a revisão anterior da v0.43, a 94 conserva
a v0.42 e a 87 conserva a Alpha. O código histórico e a tag `v0.38-alpha`
continuam recuperáveis no GitHub.
