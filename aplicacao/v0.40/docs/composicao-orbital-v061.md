# Composição do mapa planetário na v0.61

A base foi a v0.60, publicação 134, com fonte Sites em `0a70584` e aplicação GitHub em `a660755`. O mapa anterior aplicava a mesma ampliação a planetas, luas e objetos de fundo. No foco, as órbitas solares cruzavam as trilhas lunares e algumas luas chegavam perto do tamanho aparente do planeta.

## Projeção e hierarquia

O modelo físico da v0.60 ainda define as órbitas, os tipos, os materiais e os IDs. A projeção combina 36% da distância normalizada do corpo com 64% da posição na amostra ordenada para abrir espaço entre trilhas. A distribuição conserva a ordem radial. A fase vem da semente e recebe o menor deslocamento discreto que atende à folga entre silhuetas, incluindo os anéis. Se nenhuma fase atingir a folga desejada, é usada a de maior separação. Cada família de órbitas gira devagar com a mesma velocidade angular para manter a separação ao longo das voltas.

Os raios de desenho usam faixas de 50–58 unidades para a estrela, 12–23 para os planetas e 4,5–7,5 para as luas. O planeta em foco ganha até 30% de escala adicional na aproximação. A câmera mede o espaço entre o título e os controles e enquadra o grupo antes de ampliar. Ao selecionar uma lua, o enquadramento se desloca parcialmente em sua direção e mantém o planeta e a órbita local na cena. As trajetórias de chegada, aproximação, deslize e salto continuam usando as rotas anteriores.

Em foco, as trilhas solares ficam discretas e as lunares têm contraste próprio. Corpos remotos só aparecem com a silhueta inteira dentro do mapa e longe do grupo local. Os nomes usam a largura do texto medido no SVG, reservam espaço para controles e procuram uma posição que evite outros nomes e corpos. O título da cena continua identificando o destino quando um rótulo estiver oculto.

A página reutiliza a atmosfera e o horizonte da Home. Uma iluminação difusa da cor secundária abre o fundo escuro. Em modo claro, a luz difusa usa o branco da atmosfera. As texturas e cores dos corpos vêm das mesmas sementes nas duas aparências.

## Estabilidade e limites

A cena mostra até 10 planetas e 8 luas da órbita em foco. Um destino fora da amostra entra pela órbita mais próxima ao ser escolhido no índice. A mudança na amostra pode reajustar trilhas e fases próximas. Ela preserva as propriedades físicas, os identificadores, o conteúdo e a ordem radial relativa dos destinos. Catálogos densos podem ocultar nomes sem espaço. Todos os tópicos continuam disponíveis no índice.

## Validação

- Comparação do AB10 publicado com a prévia em desktop usando Safira e Violeta. Conferência em modo claro com Rubi e Cobre, incluindo a estabilidade das cores físicas.
- Seleção por teclado, foco no planeta e na lua, leitura, URL direta e histórico.
- Chromium em 390 px com 128 capítulos e 64 luas. Foram abertos o capítulo 128 e uma lua aninhada pelo índice. O grupo local ficou enquadrado e a página coube na largura disponível.
- A suíte testa separação durante a rotação em 96 sistemas, preservação da árvore, enquadramento lunar e conflitos entre rótulos, além de movimento reduzido e regressões de navegação. O teste mobile foi feito em viewport emulado.

## Retorno pela área vazia na v0.62

Na visão de foco, um clique ou toque primário que começa e termina no fundo do mapa ativa a ação **Visão do sistema**. O reconhecimento ignora corpos, controles, gestos com mais de um ponteiro, movimentos acima de oito pixels e eventos cancelados. A mesma ação protege rascunhos, atualiza a URL e o histórico e restaura o foco de teclado no título do mapa. O percurso existente da câmera recupera a vista geral e respeita movimento reduzido.

A interação foi verificada em Chromium no desktop e em uma área de 390 px. O teste automatizado cobre toque, multitoque, arraste que retorna ao ponto inicial, liberação sobre um corpo, cancelamento, histórico e movimento reduzido.
