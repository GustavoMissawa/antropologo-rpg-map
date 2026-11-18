# Home Orbital v0.49

A prévia por ponteiro usa a mesma velocidade de 18% do destino aberto.
O ponto percorre a elipse junto à espiral e o fio acompanha sua origem
com a ponta fixa no nó. Abrir o destino durante a prévia preserva a
posição do ponto. Ao tirar o mouse, a espiral retoma o giro normal.

O Chromium confirmou a troca de velocidade, o ponto em movimento,
a ponta fixa e a retomada ao sair do nó. Os 438 testes automatizados
passaram, incluindo o traçado móvel da prévia.

A transformação do dado é acionada pela seleção do destino. Passar
o mouse mantém a prévia da espiral, do ponto e do fio.

## Revalidação em produção · 18/11/2026

| Referência | Valor |
| --- | --- |
| Aplicação | **v0.49** |
| Branch | `dev/v0.49-previa-orbital` |
| Código publicado no GitHub | `c58b125f38f1b84cd79ad4c19e868fca719d0f55` |
| Fonte da publicação Sites | `8cb033db5d854b848634a6ae5d2b5f16637f89e1` |
| Publicação | [108](https://antrobologorpg.guss04.chatgpt.site/#inicio/sistemas) |

Os 424 arquivos da aplicação no GitHub coincidem byte a byte com a fonte da
publicação. O registro desta revisão é documental. Os vínculos D1/R2 e o
histórico da v0.38 Alpha foram conferidos.

- Em Sistemas, a rotação desacelerou na entrada e estabilizou em 18%. A
  bolinha avançou cerca de 382° pela elipse inclinada. Sua intensidade
  diminuiu na passagem traseira. A origem do fio acompanhou a bolinha e a
  outra ponta permaneceu no mesmo nó. O fio e o pulso compartilharam a mesma
  curva ao longo da amostragem.
- Sistemas, Fichas, PDFs e Agenda mostraram seus painéis. Em trocas rápidas,
  uma única conexão acompanhou o destino ativo. O atalho de PDFs abriu a
  biblioteca. Escape retornou à Home com o mesmo dado e o disco retomou a
  velocidade normal. A prévia por mouse exibiu o giro lento e o fio com
  origem móvel, mantendo o modelo do dado.
- Os seis modelos apareceram na abertura e ao longo de 24 trocas entre
  painéis, sem repetição imediata. Cada modelo foi inspecionado em duas
  orientações no Chromium. As faces eram opacas e as arestas correspondiam às faces
  voltadas à câmera. O controle por mouse e pelas setas respondeu. A troca
  usa o pico do impulso para substituir a geometria no relógio de 1,04 s.
  O painel pode ficar disponível durante o impulso.
- A inspeção visual incluiu Safira/Violeta no escuro e Rubi/Dourado no claro.
  Rubi/Ciano em modo claro persistiu após recarregar. A cor primária apareceu
  nas arestas e a secundária no fio. Em viewport de 545 px, Agenda abriu por
  teclado e a página manteve a largura do conteúdo dentro da área visível.
- O build de produção, a checagem de tipos, a checagem da versão e os **445
  testes automatizados** passaram. Os testes incluem projeção em 48
  orientações por dado, sorteio, cinemática do impulso, continuidade da
  conexão, arraste por toque simulado e `prefers-reduced-motion` simulado.
  Toque físico e a preferência nativa de movimento reduzido ficam pendentes
  de inspeção no navegador.

A [documentação da v0.47](home-orbital-v047-orbita-e-dados.md) detalha a
construção das seis malhas e a projeção usada para a trajetória orbital.
