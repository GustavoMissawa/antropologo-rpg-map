# Nebulosas em camadas na v0.55

A Home Orbital desenha o gás atrás do campo de estrelas, do disco e da interface. A poeira ainda modula a iluminação interna de cada nuvem. O sorteio por documento preserva um terço de céus sem nebulosa. Quando há nebulosas, as chances de uma, duas ou três são 50%, 35% e 15%, respectivamente.

As famílias são sorteadas com os pesos da [v0.54](galaxia-orbital-v054.md), sem repetição na mesma composição. As duas primeiras nebulosas ocupam lados opostos, com posições periféricas distintas para todas. Uma nebulosa solitária recebe um multiplicador de escala de 1,65 e um limite de largura maior. Com duas ou três nuvens, os multiplicadores são 0,83 e 0,68.

Um Web Worker rasteriza cada composição em lote. Os materiais ficam em memória por resolução e são recoloridos na troca de paleta ou modo. Desativar a preferência oculta o gás. Reativá-la recupera a mesma composição.

## Validação

- 476 testes aprovados, além de TypeScript e build. A amostra de 60 mil sementes confere distribuição, famílias e posições distintas, e o tamanho maior no caso solitário.
- No Chrome, conferi cenas vazias, uma nebulosa isolada e três famílias simultâneas. Na janela de 1.348 px, a nebulosa isolada chegou a 1.435 px, e as três do grupo mediram 546 a 603 px. A troca de claro para escuro e o interruptor preservaram a composição.
