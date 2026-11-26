# Navegação Orbital 3.0 · v0.59

## Base da reformulação

A publicação ativa na abertura foi a 132, fonte Sites `b468f768d296df0703c0931be6e10cb7f3e8b638`. Os 473 arquivos da aplicação correspondiam ao commit GitHub `6fcca78945462c090f8dd350099e754ced16577c`, branch `dev/v0.58-navegacao-orbital-2`. O checkout Sites também inclui as ferramentas em `.agents`. O trabalho usa a branch `dev/v0.59-navegacao-orbital-3`. A v0.38 Alpha mantém sua referência de recuperação.

A captura de referência orientou a proporção entre índice e conteúdo. O vídeo `1001038414.mp4` orientou a aproximação, a escala dos corpos e a integração da interface ao cenário. Os corpos são renderizados pela aplicação a partir das sementes existentes.

## Estados e links

| Estado | Rota | Apresentação |
| --- | --- | --- |
| Exploração | `#regras/<sistema>` | A mesma cena apresenta estrela e planetas navegáveis. |
| Foco | `#regras/<sistema>/topico/<id>/orbita` | A câmera acompanha o corpo escolhido. A escolha aparece no índice. |
| Leitura | `#regras/<sistema>/topico/<id>` | O cenário se recolhe e o artigo ocupa a área principal. |
| Cabeçalho | `#regras/<sistema>/topico/<id>/secao/<id>` | Abre leitura e leva o foco ao cabeçalho. |

O índice mantém busca e hierarquia documental. Em exploração ou foco, a seleção no índice enquadra o corpo. Em leitura, a seleção no índice abre a leitura seguinte. **Voltar à órbita** retorna ao mesmo capítulo ou subseção. Os links de leitura já compartilhados continuam válidos. No modo Clássico, ambas as formas de link de tópico abrem o leitor tradicional. Salvar, cancelar e a proteção de rascunhos reutilizam os fluxos anteriores.

## Renderização e chegada

`lib/orbital-camera.ts` calcula projeções de órbitas e trajetórias. `app/use-orbital-camera.ts` atualiza a câmera e os alvos de SVG, preservando a instância da cena ao selecionar destinos de um sistema. A posição atual é o ponto de partida de um redirecionamento. Entre luas do mesmo planeta, a câmera percorre um arco. Entre pontos próximos, desliza. Entre pontos distantes, recua, atravessa o mesmo cenário e volta a se aproximar. O enquadramento de uma lua amplia sua superfície e pode manter o planeta de origem na borda.

`app/use-system-approach.ts` mantém a Home original em uma camada temporária durante a entrada. O avanço da Home, o deslocamento de estrelas em camadas e a chegada do sistema se sobrepõem. A Home e o sistema têm geometrias procedurais próprias. A continuidade entre elas é construída pela composição das duas cenas. A URL e os controles do sistema ficam disponíveis desde o início.

As sementes, a relação entre capítulos e planetas e a relação entre subseções e luas seguem a estrutura da v0.58. A apresentação calcula posições e enriquecimento de superfície a partir dos mesmos identificadores. Em um sistema grande, a cena desenha até 16 planetas e até 12 luas do planeta em foco, incluindo sempre o corpo selecionado. O índice continua abrangendo todos os tópicos.

O movimento usa camadas e transformações sem mudanças na estrutura React por quadro. A cena reduz a frequência de desenho em tela estreita, pausa fora da área visível e adormece em abas ocultas e durante a leitura. A preferência de movimento reduzido abre os destinos diretamente.

## Verificação

| Tipo | Cobertura |
| --- | --- |
| Chromium desktop | Chegada com o cenário da Home preservado, índice ao lado da cena, seleção direta no mapa, proximidade, saltos e arcos lunares, redirecionamento, leitura, Voltar e Avançar, modo Clássico e modos claro e escuro. |
| Chromium em viewport de 390 px | Exploração e link direto para leitura, gaveta do índice, busca, seleção por teclado, alternância de estado e ausência de rolagem horizontal. |
| Automatizado | Rotas novas e anteriores, estados do mesmo tópico, instância persistente do SVG, trajetórias e interrupções, preferência de movimento reduzido, suspensão da animação, foco, proteção de rascunhos e regressões de plataforma. |
| Estático | TypeScript, verificação de diff, build e comparação dos arquivos de hospedagem e dos dados de recuperação. |
| Limites da verificação | A verificação mobile usou Chromium com largura reduzida. O comportamento de movimento reduzido foi reproduzido em teste automatizado. O desempenho em hardware móvel físico ficou sem medição. |

Os arquivos do conteúdo AB10, as mecânicas, as demais áreas da plataforma, as migrações e os vínculos D1/R2 continuam com a configuração da versão anterior.
