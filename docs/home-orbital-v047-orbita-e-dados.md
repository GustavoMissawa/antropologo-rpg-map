# Home Orbital v0.47 — Órbita completa e transformação dos dados

A v0.47 parte da publicação 104 da aplicação v0.46 e do commit
`6197bc71347025342be944fc53d9f5275a0d98f7` da branch
`dev/v0.46-navegacao-cosmica`. A fonte do projeto Sites estava no commit
`d91d1ea736c607c610b3ed10fbad1c8bfebcc335`. O controle central de versão foi
incrementado uma vez para `0.47.0`, exibido como **0.47** em Sobre.

## Disco e conexão

O Canvas conserva as onze faixas de filamentos e o sentido de giro. Seu relógio
integra a velocidade durante a frenagem. Ao concluir a transição para o destino,
o disco acelera até **18%** da velocidade normal. O retorno à Home eleva a
velocidade para 100% e conserva a fase do disco. O foco volta ao nó de origem e
permite seguir pelo teclado. Uma nova aproximação por mouse ou teclado volta a
mostrar a prévia.

A bolinha amostra o tempo do Canvas na faixa de índice 7, a partir de zero.
A posição usa o raio de 0,75 no disco, a compressão vertical
de 0,74 e a inclinação de 37°. O ângulo pode atravessar toda a elipse várias
vezes. A intensidade diminui gradualmente na metade traseira.

Cada conexão usa uma Bézier cúbica com variação escolhida na ativação. O
primeiro ponto coincide com o centro do marcador e o último com a âncora do
nó. O fio e o pulso atualizam a mesma curva no quadro do Canvas. Uma máscara
suave protege o núcleo quando a curva passa pelo centro. A troca de destino
preserva o ângulo corrente e migra um único fio após o fade breve.

A câmera expandida enquadra a elipse inteira à esquerda em desktop e acima
do painel em telas estreitas. As leituras de posição são convertidas para as
coordenadas da cena, que são compartilhadas por disco, dado, fio e nós.

## Geometria e transformação do dado

| Modelo | Geometria | Faces | Vértices | Arestas |
| --- | --- | ---: | ---: | ---: |
| D4 | Tetraedro | 4 triângulos | 4 | 6 |
| D6 | Cubo | 6 quadrados | 8 | 12 |
| D8 | Octaedro | 8 triângulos | 6 | 12 |
| D10 | Dual polar de antiprisma pentagonal | 10 deltoides | 12 | 20 |
| D12 | Dual polar do icosaedro | 12 pentágonos | 20 | 30 |
| D20 | Icosaedro | 20 triângulos | 12 | 30 |

As malhas convexas são normalizadas em raio e usam a mesma rotação por
quatérnios e projeção em perspectiva. A orientação dos polígonos na tela
determina as faces voltadas à câmera. O SVG recebe preenchimentos inteiramente
opacos e uma aresta por par de vértices adjacente a pelo menos uma face visível.
D4 e D10 recebem uma compensação de escala de 16% pela área projetada menor.
As arestas seguem a cor primária. A bolinha, o disco e o fio usam a secundária.

O primeiro modelo é D20. Uma seleção explícita por clique, toque ou teclado
sorteia uniformemente um dos outros cinco modelos. O pico do impulso ocorre
em 520 ms, quando a geometria é substituída. As arestas ganham brilho e a
escala varia em até 4,5%. A frenagem termina em cerca de 1,04 s e libera mouse,
toque e setas. A câmera e o conteúdo seguem seus próprios tempos. Hover,
retorno, histórico e links diretos preservam o modelo enquanto a Home estiver
montada. Seleções sucessivas preservam o impulso já em curso.

Com `prefers-reduced-motion`, a troca é imediata e a órbita fica parada. O
controle manual por gesto e setas continua respondendo. Os relógios e o
renderizador param quando o cenário sai da área visível. As atualizações por
quadro escrevem nos elementos do SVG e Canvas, sem renderização React.

## Validação antes da publicação

- Build de produção, checagem de tipos e 445 testes automatizados passaram.
- Os testes cobrem geometria e oclusão das seis malhas em 48 orientações
  cada, amostras da volta completa, velocidade, fase e continuidade das
  pontas do fio, sorteio, interrupção do impulso, foco, Escape e arraste
  de toque simulado com movimento reduzido.
- Na prévia Chromium, a fase percorrida ultrapassou 360° com Sistemas aberto.
  A bolinha variou de brilho na passagem traseira e o fio manteve o mesmo
  destino. Trocar rapidamente de Sistemas para Fichas e PDFs deixou apenas
  a conexão do último destino.
- Os quatro destinos foram acionados com mouse ou teclado. As seis
  geometrias foram verificadas em rotação. Hover preservou o modelo e o
  controle por mouse respondeu enquanto o dado estava na Home.
- Rubi em modo claro e Safira/Violeta em modo escuro foram inspecionados.
  Os viewports de 320×760, 390×810 e 920×620 foram exercitados no Chromium,
  sem rolagem horizontal. Escape restaurou a seleção de teclado e o giro.
- Toque e movimento reduzido foram verificados por teste automatizado
  simulado. A emulação no navegador estava bloqueada pelo ambiente.
- O build mantém os avisos do Vinext sobre chunks acima de 500 kB e
  classificação estática incompleta de rotas.

A mudança se limita à Home Orbital. O manifesto de hospedagem, os vínculos
D1/R2, a v0.38 Alpha e o acervo histórico seguem no projeto original.

## Publicação e conferência

A publicação **105** foi concluída em 17/11/2026 no
[endereço original](https://antrobologorpg.guss04.chatgpt.site/).

| Referência | Valor |
| --- | --- |
| Aplicação | **0.47 — Desenvolvimento — Home Orbital** |
| Branch | `dev/v0.47-orbita-e-dados` |
| Commit publicado no GitHub | `0bdc43bbc02ebad6f4f325c0688b359d92547461` |
| Commit da fonte Sites | `aa5397218f46f38611473e8becd4d3b5a545ccc3` |
| Versão salva no Sites | `appgprj_6adb8be679b48191bc7fbcf908d41024~appgver_2b960ff91e6c8191ad08e3902226fdc5` |
| Implantação concluída | `appgdep_6afcfaaa31d4819182b4036bc9dc9eb6` |

Os 424 arquivos da aplicação foram comparados com o commit enviado ao
GitHub e reconstruídos a partir da mesma fonte. A implantação retornou
`succeeded` e Sobre exibiu **0.47** com o identificador **0bdc43bb**.

Com Sistemas aberto, o disco passou da frenagem para o giro lento. A posição
da bolinha mudou entre amostras e o outro extremo do fio permaneceu no nó.
Fichas, PDFs e Agenda também exibiram seus painéis com um único fio e um
novo dado a cada seleção. Escape preservou o último dado, restaurou o foco
e devolveu a velocidade normal ao disco. O atalho de PDFs abriu a biblioteca
existente e Início retornou ao mapa.
