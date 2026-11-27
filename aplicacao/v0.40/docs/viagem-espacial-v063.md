# Viagem da Home Orbital ao mapa planetário

A v0.63 parte da v0.62 em produção, publicação 136. O conteúdo dos arquivos da aplicação no GitHub (`f10cecb`) coincidia com a fonte publicada pelo Sites (`d2d2022`). Os repositórios têm históricos próprios.

## Câmera e continuidade

Ao selecionar um RPG na Home Orbital, a rota do mapa é registrada pelo navegador. A Home real permanece montada nas coordenadas em que estava no clique. Os controles recuam enquanto o disco, as nebulosas e as estrelas de fundo avançam em planos com velocidades diferentes. A câmera passa pela borda luminosa do disco. As estrelas mais próximas, projetadas de um campo com profundidade, passam mais rápido e deixam rastros curtos no trecho mais veloz.

O campo em movimento converge na posição projetada da estrela do RPG escolhido. O SVG definitivo já está montado e acompanha a mesma linha do tempo. A estrela começa como um ponto, os planetas aparecem ao ganhar escala e as trilhas orbitais se tornam legíveis durante a frenagem. O último quadro usa a câmera de visão geral, com o mesmo SVG, os mesmos corpos e o mesmo relógio orbital. O índice, o título e os controles do mapa aparecem junto com a estabilização. O cabeçalho global continua disponível.

O campo estelar de trânsito usa posições pré-calculadas em Canvas 2D. O disco e as camadas da Home usam transformações e opacidade pela Web Animations API. A escala e a densidade do Canvas são limitadas, a densidade desce quando há quadros lentos sucessivos e os rastros são desligados nessa condição. A rotação pesada do disco pausa após a partida. A viagem e suas animações suspendem o relógio ao ocultar a aba. A montagem do gerador, o foco em planetas e luas e a rotação em repouso seguem o mapa existente.

A duração configurada é 4,25 s no desktop e 3,8 s em largura compacta. Movimento reduzido usa 180 ms de opacidade com o mapa já enquadrado. É possível pular pelo botão **Pular viagem** ou por **Esc**. Outra navegação cancela o percurso em andamento. A volta à Home é direta. Links para mapas, capítulos e seções e o histórico preservam suas rotas e abrem no destino.

## Validação

| Caso | Resultado no Chromium |
| --- | --- |
| Home → AB10 e sistemas próprios | AB10 Semelhante e sistemas de teste Ordenado, Antiordenado e Misto, incluindo seleção pela lista expandida da Home |
| Aparência e tela | Desktop em 1240 × 840 com Rubi/Cobre e Safira/Violeta. Viewport emulado de 390 × 844. Capturas durante a passagem pelo disco, aproximação e chegada |
| Continuidade no fim | A estrela, os IDs dos planetas e o nó do SVG permaneceram os mesmos. Nas amostras finais, a diferença de escala entre o último quadro amostrado e o mapa pronto foi de 0 a 0,0006 |
| Duração observada | Cerca de 4,3 s no desktop, 3,83 s no viewport móvel e 183 ms com a preferência de movimento reduzido emulada |
| Interrupção | Clique duplo abriu uma única viagem. O pulo abriu o mapa. Voltar no meio da viagem cancelou a transição. Avançar abriu o mapa diretamente. Trocar para Ficha removeu as camadas temporárias |
| Navegação e edição | URL direta abriu a leitura de um subtópico. A órbita da lua, o índice móvel e o retorno à visão geral continuaram operáveis. A tentativa de sair da edição com alterações preservou o rascunho |

As amostras de quadros no Chromium remoto tiveram medianas de 33 a 50 ms, com variação durante a captura. A medição serve para comparar o percurso no ambiente de teste. O ensaio móvel usou viewport emulado.

A suíte automatizada passou com 503 testes. A checagem de tipos e o build de produção também passaram. Os testes cobrem a curva de aceleração e frenagem, a progressão dos corpos, a projeção com movimento reduzido, a pausa em segundo plano e a identidade do mapa após pular. A suíte existente continua cobrindo capítulos, subseções, histórico com rascunho e as quatro arquiteturas.

As sementes, os corpos físicos, o conteúdo do AB10, os vínculos D1/R2 e os arquivos da v0.38 Alpha foram preservados.
