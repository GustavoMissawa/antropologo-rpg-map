# Arquiteturas planetárias da v0.60

A publicação 133 serviu de base para a atualização. Ela corresponde à v0.59 e à fonte do Sites em `81da93b`. A árvore da aplicação foi conferida contra `705e1e0` no GitHub. Os arquivos de trabalho apresentaram os mesmos blobs e modos, com diferenças restritas ao material interno de `.agents/`.

## Composição e identidade

Na v0.59, a distância e o ângulo já vinham do ID do corpo. A superfície dos planetas era sorteada entre rocha, gás e gelo de forma independente. A nova geração conserva as órbitas e liga a massa e a composição à posição. O sistema continua com uma estrela, um planeta por capítulo e uma lua por subseção. As luas de todos os níveis orbitam o planeta do capítulo raiz e o índice mantém a hierarquia documental.

`lib/planetary-architecture.ts` define a arquitetura a partir de uma chave do ID persistido do sistema. As quatro classes têm peso inicial igual. A massa depende da distância do corpo e de uma perturbação da sua própria semente. A árvore completa é montada em `lib/orbital-system.ts` e memorizada por conjunto na cena. Mudanças no título, no texto, na ordem, na quantidade de capítulos e na paleta conservam a identidade dos demais corpos. Mover uma subseção para outro capítulo muda seu planeta anfitrião e as estimativas relativas a ele.

| Classe | Composição | Faixa e verificação |
| --- | --- | --- |
| Ordenado | A massa tende a crescer para fora. | Crescimento de 3,20 a 3,67 ordens de grandeza ao longo da faixa orbital. Perturbação individual de ±0,32 em log₁₀ permite inversões locais. |
| Antiordenado | A massa tende a diminuir para fora. | Mesma faixa e tolerância com sentido invertido. Permite gigantes quentes perto da estrela. |
| Misto | Regiões mais e menos massivas se alternam. | Duas ou três ondulações em log₁₀, com fase de sinal sorteada e perturbação de ±0,48. A correlação média entre log da massa e log da distância foi −0,005. |
| Semelhante | Os planetas compartilham uma massa típica do sistema. | Perturbação de ±0,083 em log₁₀. A razão máxima entre as massas fica abaixo de 1,48. A densidade e a composição de cada corpo continuam individuais. |

A amostra determinística de 320 sistemas com 128 planetas continha 73 ordenados, 80 antiordenados, 93 mistos e 74 semelhantes. Nos sistemas ordenados e antiordenados a correlação na direção esperada ficou acima de 0,90. Todos os 93 mistos da amostra ficaram com correlação em módulo inferior a 0,23. Em catálogos pequenos, a amostragem de órbitas pode tornar uma tendência pouco visível. A classe descreve o perfil gerador. Para um único planeta, ela será observável à medida que o catálogo crescer.

## Estimativas físicas e apresentação

- A massa estelar fica aproximadamente entre 0,49 e 1,68 massas solares. Uma aproximação para a sequência principal usa luminosidade em unidades solares de `massa^3,6` e temperatura de `5.772 × massa^0,53` K. A faixa térmica orienta o tom da estrela.
- A distância da órbita vai de 0,12 a 22 UA em escala logarítmica, mantendo a ordem e as coordenadas do mapa. A temperatura de equilíbrio usa `278,3 × [luminosidade × (1 − albedo)]^0,25 / √distância`, com redistribuição térmica uniforme. O modelo deixa fora efeito estufa, aquecimento interno e dinâmica orbital de longo prazo.
- Irradiação, massa e fatores de voláteis e geologia determinam superfícies rochosas, desérticas, oceânicas, vulcânicas, geladas, gigantes gasosos e gigantes de gelo. Atmosferas, crateras, tempestades e anéis seguem faixas de compatibilidade. O raio em unidades terrestres é `∛(massa × 5,514 / densidade)`. O raio desenhado é comprimido para acomodar corpos pequenos e grandes. As estimativas e os nomes descrevem o cenário procedural, sem inferência de habitabilidade.
- Luas recebem massa limitada pela massa do planeta, albedo, densidade, inclinação, relevo e cor próprios. A posição de exibição segue a órbita lunar anterior, com distância estimada em múltiplos do raio planetário. A temperatura usa a irradiação na órbita do hospedeiro.
- `app/orbital-space.tsx` reaproveita o SVG, com detalhes adicionais no corpo selecionado. A geografia e as tempestades mantêm as mesmas sementes entre o mapa e o foco. Os gradientes de atmosfera e horizonte da Home são reutilizados no mapa e na chegada. Índice, botões, órbitas, rótulos e estrelas decorativas herdam as cores da interface. A cor e a textura dos corpos vêm da composição física.

O mapa amostra até 16 planetas e, quando há foco, até 12 luas. Os corpos são distribuídos pela faixa de órbitas. O destino ativo ocupa o lugar da órbita amostrada mais próxima quando necessário. Todos os tópicos continuam no índice, inclusive os fora da amostra. O gerador opera na montagem ou em edições do conjunto. O relógio da câmera continua atualizando transformações sem reconstruir superfícies a cada quadro.

## Validação

| Verificação | Resultado |
| --- | --- |
| Testes | 495 passaram. Foram verificados as quatro tendências, a reprodutibilidade, adições e remoções, propriedades físicas, sete superfícies, três faixas estelares, tipos de anéis, escalas de 1 a 128 planetas e árvores aninhadas. |
| TypeScript e build | Concluídos. |
| Chromium desktop | AB10 e dois sistemas de cada classe. Chegada pela Home, capítulos e luas, foco por teclado, leitura, Voltar e Avançar, modo Clássico e edição com proteção de rascunho. |
| Aparência | Oito paletas em claro e escuro, com 16 fundos distintos e os mesmos gradientes nos planetas a cada troca. A Home e o AB10 compartilharam o mesmo horizonte em Safira/Menta e Rubi/Cobre. |
| Chromium em 390 px | Índice, foco lunar e leitura no AB10. Em um conjunto com 128 planetas e 105 luas, acesso ao último capítulo e a uma lua aninhada, com seleção preservada e sem rolagem horizontal. |
| Movimento reduzido | A preferência foi simulada em prévia temporária. As projeções orbitais permaneceram estáticas entre amostras e a câmera chegou diretamente a Atributos e Perícias. A instrumentação foi removida antes do build. |

### Tempo de preparação

Benchmark isolado em Node, após aquecimento, com 1.280 medições de cada versão para cada tamanho. A execução alternou entre versões no mesmo processo e usou os mesmos conjuntos. Os tempos incluem geração da árvore e seleção de corpos em milissegundos.

| Planetas e luas | v0.59 mediana / p90 | v0.60 mediana / p90 |
| --- | --- | --- |
| 1 + 3 | 0,002 / 0,022 | 0,004 / 0,034 |
| 8 + 24 | 0,011 / 0,013 | 0,029 / 0,032 |
| 20 + 60 | 0,037 / 0,050 | 0,074 / 0,094 |
| 128 + 105 | 0,083 / 0,101 | 0,192 / 0,224 |

A geração ficou mais cara com as propriedades físicas. Para 128 planetas e 105 luas, o aumento mediano foi de 0,109 ms no ambiente de teste. O modelo mantém somente a amostra gráfica na cena. As medições cobrem a preparação em CPU. A taxa de quadros em celulares físicos ficou sem medição. As posições e trajetórias da v0.59 ainda são projeções estilizadas. Órbitas próximas podem se sobrepor em algumas perspectivas e o destino continua disponível pelo índice.

## Referências

- Mishra et al., *A framework for the architecture of exoplanetary systems. I. Four classes of planetary system architecture*, A&A 670, A68 (2023). [Artigo](https://doi.org/10.1051/0004-6361/202243751).
- A referência visual fornecida com o pedido ilustra os quatro perfis de massa. No mapa do aplicativo, o tamanho aparente também depende da densidade, da escala visual e do zoom.
