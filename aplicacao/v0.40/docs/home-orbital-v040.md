# Home orbital do ANTROPOLOGO RPG v0.40

## Base de desenvolvimento

A branch local `dev/v0.40-home-orbital` parte de `183accc`. Na abertura, a árvore
`209a953f5c3e13941b5c8f41d5c9d9922acaf07b` era comum à Alpha e à cópia de
desenvolvimento. A v0.38 continua ancorada pela tag `v0.38-alpha`, commit
`0373f11`. A intervenção visual é restrita à Home sem sistema ativo.

O relatório da instalação anterior registra `dev/skills-v038` e `fbdd266`.
Essas referências não estavam nos clones disponíveis nem no GitHub. A branch
de trabalho recupera as dez entradas de instruções e suas licenças a partir
dos commits oficiais registrados no relatório.

| Instruções | Commit de origem | Aplicação |
| --- | --- | --- |
| Impeccable 4.9.1 | [c5dd5fc](https://github.com/pbakaus/impeccable/tree/c5dd5fc267b486d991229c4d4647e67ba955f39d) | Composição, contraste, estados e auditoria. |
| Emil Kowalski | [0f2e23b](https://github.com/emilkowalski/skills/tree/0f2e23b32bb1265e84cff8d3e75785fec953fb1b) | Controle de duração, interrupção, foco, redução de movimento e custo de renderização. |
| Taste Skill V2 | [73adb37](https://github.com/Leonxlnx/taste-skill/tree/73adb37611dbaf84d996d01131ab90f711947383) | Identidade, hierarquia, composição por largura e verificação do resultado. |

## Referências e composição

O painel galáctico e o painel Sci-Fi definem o fundo azul-petróleo, a área
lateral com os dados da sessão e o arco de navegação à direita. O vídeo
`gemini_generated_video_1a325c4f(1).mp4` define o giro do disco e do dado.
O traçado de interação aparece apenas no destino ativo e usa uma única
curva entre o disco e o nó. No celular e no tablet, cena, navegação e
atalhos têm zonas próprias.

## Implementação

| Arquivos | Comportamento entregue |
| --- | --- |
| `app/page.tsx`, `app/platform-home.tsx` | Seleção do layout orbital na Home global. O contexto por sistema continua usando a Home existente. Marca, controles, conteúdo e ações reutilizam o estado da aplicação. O aviso completo da versão de teste fica abaixo da composição na Home global. |
| `app/orbital-home.tsx`, `app/orbital-home.css` | Painéis laterais com itens reais da sessão. Quatro botões acionam as áreas existentes. O arco organiza os nós no desktop e uma faixa de botões acomoda celular e tablet. A interação mais recente por mouse ou teclado escolhe o único fio SVG. O toque abre a área no primeiro acionamento. |
| `app/orbital-art.tsx`, `app/orbital-light.worker.ts`, `lib/orbital-light.ts` | Em telas compactas, o Worker prepara dois planos procedurais de filamentos e partículas. Quando o navegador oferece `bitmaprenderer`, os bitmaps são transferidos diretamente para os canvases de apresentação. Transformações CSS giram as camadas em velocidades distintas. O SVG do D20 usa a projeção da geometria existente, com 12 vértices e 30 arestas, sem renderizações React por quadro. |
| `public/orbital-nebula.webp` | Textura estática de aproximadamente 12 KB gerada para o fundo. O prompt original está em `public/orbital-nebula.webp.json`. A espiral, o dado e os controles são elementos renderizados separadamente. |

A cena pausa com a aba oculta ou fora do campo de visão. A preferência por
movimento reduzido apresenta o D20, o disco e o traçado estáticos. A Home
global mantém a composição azul-petróleo nos dois modos. A preferência de
aparência continua governando o restante da interface, inclusive os diálogos.
Não há dependências novas em tempo de execução.

## Validação

| Verificação | Resultado |
| --- | --- |
| Regressão Node e React com DOM simulado | 401 testes passaram. A suíte cobre regras, fichas, rolagens, temas, JSON, Super PNG, agenda e persistência. Os casos da Home verificam rotas, contexto AB10, criação, troca de fio entre mouse e teclado, primeiro toque simulado e pausa do D20. |
| Chrome local, desktop | As quatro rotas abriram as telas esperadas. AB10 manteve o contexto ao voltar a Início, e a marca retornou ao modo global. Os formulários de criação, o controle de aparência e a abertura do diálogo de conta responderam. Duas observações confirmaram o giro dos filamentos e do D20. O fio estava ausente em repouso e apareceu sozinho ao navegar com Tab. |
| Chrome local, largura de celular e tablet | Capturas a 390 × 844 e 768 × 844. A navegação abriu a Agenda e retornou à Home na largura de celular. |
| Build, TypeScript e lint dirigido | `pnpm run build`, `tsc --noEmit`, `pnpm run version:check` e ESLint nos novos arquivos TypeScript e nos testes orbitais passaram. |
| Integridade do código | A branch mantém as mudanças em `aplicacao/v0.40`. A Alpha tem a árvore original e a `main` remota continua em `183accc`. |

A revisão visual independente conferiu quatro capturas e verificou as correções
do crescente dourado, do fundo e da troca de foco entre mouse e teclado.

Na prévia, a base D1 local foi inicializada com o esquema existente para
verificar a sessão de visitante. O teste manual de conta se limitou à abertura
do diálogo e à consulta de sessão. A primeira rodada incluiu simulação de
toque, aba oculta, pausa fora de visão e redução de movimento no Chrome.

## Compatibilidade e desempenho

O desenho procedural inicial ocupava a thread principal ao abrir ou retornar
à Home. A segunda rodada usa um Worker e texturas de 640 × 640 px até 740 px de
largura. No desktop, o desenho direto de 1024 × 1024 px teve o melhor resultado.
Ao cruzar esse limite, a cena atualiza suas texturas. A geração no Canvas local
continua disponível se o Worker falhar. A espiral em CSS preserva a composição
se o navegador não conseguir apresentar as texturas em Canvas.

Os três motores passaram nos quatro cenários do front-end compilado, com
sessão de visitante e catálogo simulados.

| Motor | Desktop | Celular emulado | Alternativas de renderização |
| --- | --- | --- | --- |
| Chromium 153 | Quatro destinos, mouse e teclado, movimento reduzido, pausa fora da tela e AB10 após recarregar | Toque, retorno à Home, redimensionamento e alvos de toque em 390 px. Sem rolagem horizontal a 390 px e 320 px | Renderização local com o arquivo do Worker bloqueado na abertura ou no redimensionamento. Espiral CSS com Canvas indisponível |
| Firefox 153 | Passou nos mesmos cenários | Passou nos mesmos cenários | Passou nos mesmos cenários |
| WebKit 26.5 em Linux | Passou nos mesmos cenários | Passou nos mesmos cenários | Passou nos mesmos cenários |

O teste de movimento reduzido registra a geometria inicial com a animação
pausada, para que o resultado independa da velocidade do relógio durante a
montagem da página.

### Medição em largura de celular

Medianas de três cargas por configuração em Chromium 153 headless, com
viewport de 390 × 844, DPR 2, CPU limitada em 4× e composição em software.

| Indicador | `f7181f6` | Worker com transferência direta |
| --- | ---: | ---: |
| Intervalo na thread principal da abertura do contexto Canvas até `data-painted` | 64,5 ms | 10,6 ms |
| Tamanho nominal dos dois buffers RGBA de apresentação | 8,00 MiB | 3,13 MiB |
| Callbacks de animação na janela de 2,8 s após a preparação | 79 | 169 |
| Tempo até o marcador `data-painted` | 647 ms | 3.013 ms |

A etapa na thread principal variou entre 5,4 e 204,6 ms com transferência
direta. O marcador ficou mais tarde na configuração com Worker. A espiral
CSS é exibida enquanto ele prepara a textura final. Na versão inicial, o
marcador pode anteceder a rasterização efetiva dos comandos de Canvas.
O tamanho dos buffers é calculado pelas dimensões e quatro bytes por pixel.
Os callbacks observados correspondem ao relógio do navegador nessa bancada.
Safari instalado, aparelhos físicos e medições em GPU física seguem pendentes.

## Informações da versão nas configurações

A engrenagem no cabeçalho da Home Orbital abre **Configurações**. A aba
**Aparência** reúne as preferências existentes. A aba **Sobre** apresenta
versão, estágio, identificação da edição e commit quando disponível. O
histórico de atualizações tem um espaço reservado para as notas futuras.

`package.json` concentra a versão e os metadados da edição. O mesmo número
alimenta a seção Sobre e os indicadores da plataforma. O Vite incorpora
o commit abreviado de `GITHUB_SHA`, `CF_PAGES_COMMIT_SHA` ou do Git local,
nessa ordem. Com todos indisponíveis, o painel exibe os demais metadados.

| Verificação | Resultado |
| --- | --- |
| Build e análise de tipos | `pnpm run build`, `pnpm run version:check` e `tsc --noEmit` passaram. |
| Regressão automatizada | 404 testes passaram, incluindo a centralização dos metadados, o build sem Git, a troca de abas e a persistência de aparência. |
| Chromium desktop | Acesso pela Home Orbital, seleção por teclado e retorno do foco à engrenagem ao pressionar Escape. |
| Chromium emulado | Navegação por toque a 390 × 844 e 320 × 600, alvos de 44 px, leitura do painel e persistência da aparência. A cena respondeu à preferência de movimento reduzido. Em telas baixas, o rodapé continua acessível pela rolagem interna. |
| ESLint dirigido | A única ocorrência é anterior à alteração e fica na leitura inicial da preferência de aparência (`react-hooks/set-state-in-effect`). |

Aparelhos físicos e refinamentos avançados da experiência mobile ficam para
uma etapa posterior.

## Paletas da Home Orbital

A branch `dev/v0.40-paletas-orbitais` recupera a árvore de produção da
publicação 88 a partir do commit `b3d11925` do Sites. Essa árvore corresponde
ao código de `543085a6`. A base importada é `71162a0` na branch local.
A publicação 87 e a tag `v0.38-alpha` mantêm a edição anterior recuperável.

As oito paletas primárias em `lib/appearance.ts` orientam a marca, os
controles, os painéis e o D20. As oito paletas secundárias orientam a
espiral, seus filamentos e a navegação orbital. A nebulosa recebe influência
das duas cores. O padrão é **Claro · Floresta · Dourado**, com os acentos
originais `#9FEFAF` e `#F2C780`.

| Paleta primária | Secundária recomendada |
| --- | --- |
| Floresta | Dourado |
| Safira | Violeta |
| Rubi | Dourado |
| Ouro | Cobre |
| Ametista | Rosa |
| Âmbar | Menta |
| Prata | Ciano |
| Grafite | Pérola |

| Ação em Aparência | Efeito |
| --- | --- |
| Selecionar outra primária | Aplica a primária e a secundária recomendada. |
| Selecionar uma secundária | Atualiza o segundo acento e mantém modo e primária. |
| Alternar Claro e Escuro | Atualiza a cena orbital e as superfícies da plataforma. As escolhas de cor continuam ativas. |
| Restaurar aparência padrão | Retorna a Claro, Floresta e Dourado. |

O estado continua na chave `ab10-appearance` do navegador. A leitura de
preferências antigas conserva o modo e a paleta principal. Uma secundária
legada válida é aproximada à amostra predefinida mais próxima por distância
ponderada em RGB. Um valor inválido recebe a recomendação da primária.
A inicialização e a atualização ao vivo usam o mesmo parser.

O CSS varia superfícies, texto, bordas, gradientes e contrastes com o modo.
A espiral do modo escuro mantém a composição aditiva. No modo claro, o
Canvas desenha filamentos pigmentados sobre a nebulosa clara. A repintura
usa o Worker com alternativa local e ocorre quando o modo, a cor ou o
tamanho da textura mudam. A rotação CSS e o giro do D20 mantêm seus estados.
A escolha secundária atua na Home global. As preferências próprias dos
sistemas seguem nas configurações existentes.

Na prévia em Chromium, foram verificados os oito pares recomendados, a
seleção independente, o recálculo da recomendação, a recarga, a restauração,
o movimento e o foco orbital. A navegação chegou a Sistemas, Fichas, PDFs e
Agenda. A largura emulada de 390 × 844 manteve os cartões e a navegação
utilizáveis. A avaliação em aparelhos físicos segue pendente.

Para executar a suíte completa, use
`node --experimental-strip-types --test --test-force-exit --test-concurrency=4 tests/*.test.mjs`.
A opção `--test-force-exit` encerra o processo após as asserções mesmo
quando o ambiente de DOM mantém recursos abertos.

## Executar localmente

Na branch `dev/v0.40-paletas-orbitais`, acesse a pasta de desenvolvimento.

```sh
cd aplicacao/v0.40
pnpm install --frozen-lockfile
pnpm dev
```

O endereço local aparece na saída do comando. A prévia usa as rotas e os
bindings de desenvolvimento da aplicação.
