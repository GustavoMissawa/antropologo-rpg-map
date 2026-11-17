# Home Orbital v0.43

Base recuperável da v0.42 no commit
`7348fab8cfff6452e9730fdca8d458f8ec3a003d`, correspondente à publicação 94.
A abertura do trabalho comparou os 406 arquivos da aplicação no GitHub com
a fonte do projeto original do Sites. O checkout interno também conservava
as instruções locais de desenvolvimento em `.agents/skills/`.

O desenvolvimento fica em `dev/v0.43-disco-estrelas`. A pasta histórica
`aplicacao/v0.40/` continua sendo a raiz da aplicação de desenvolvimento.
`package.json` centraliza `0.43.0`, exibido como `0.43` por `SITE_RELEASE`
em **Configurações → Sobre**. O estágio segue Desenvolvimento e a
identificação segue Home Orbital.

## Fluxo diferencial

| Arquivo | Responsabilidade |
| --- | --- |
| `lib/orbital-light.ts` | Geração procedural existente em Worker/Canvas. Realce moderado da concentração intermediária de energia. |
| `lib/orbital-flow.ts` | Recorte e máscara radial de onze faixas, com bordas suavizadas, composição centralizada e velocidades dependentes do raio. |
| `app/orbital-flow.ts` | Relógio acumulado, RAF limitado e integração com pausa, visibilidade e limpeza. |
| `app/orbital-art.tsx` | Fontes de filamentos/poeira, Canvas de saída e atualização das texturas quando tema ou largura mudam. |
| `app/orbital-home.css` | Perspectiva original, fallback estático, halos, anel, cintilação e pulso de confirmação. |
| `app/orbital-home.tsx` | Prioridade de seleção, fio único e navegação interrompível após confirmação. |

Cada faixa usa `0.62 × (0.3 / raio)^1.35` radianos por segundo. O raio está
normalizado ao disco procedural. As velocidades vão aproximadamente de
0,68 rad/s na faixa interna a 0,12 rad/s na externa. A intensidade varia
entre 92% e 100%, com fases diferentes. Filamentos e poeira da mesma faixa
compartilham trajetória e velocidade. A inclinação é aplicada ao plano
inteiro depois da composição, preservando sua elipse.

As fontes são geradas uma vez por tema/tamanho. Onze texturas recortadas são
preparadas nessa atualização e reutilizadas em cada quadro. O Canvas de
saída tem até 768 px. O relógio continua entre mudanças de paleta, conserva
a fase durante pausas e limita o delta de retomada. A cadência máxima é de
aproximadamente 60 quadros/s no desktop e 30 em largura compacta.

A pausa acompanha `data-motion` do mecanismo existente do D20, que observa
visibilidade, preferência de movimento reduzido e interseção com a tela.
O compositor também observa a visibilidade do documento. A desmontagem
cancela RAF, desconecta observadores e libera as texturas. Uma falha parcial
ao obter contexto 2D libera as faixas já criadas e mantém as fontes estáticas
como alternativa visual.

## Seleção de estrelas

Hover e foco destacam nó, ícone e rótulo. A conexão continua sendo um SVG
único com trilha e pulso. A confirmação usa 140 ms para anel expansivo,+cintilação discreta e pulso que percorre o fio antes de executar o callback
existente de navegação. Uma nova ativação substitui a pendente, e cliques
repetidos no mesmo destino são agrupados. A desmontagem cancela a navegação
pendente. Ao ocultar a página ou ativar movimento reduzido durante a
confirmação, o destino é aberto imediatamente.

O destino confirmado fica destacado enquanto a Home permanece visível.
Os quatro callbacks atuais saem da Home, encerrando esse estado. As outras
áreas conservam sua própria indicação de navegação ativa.

O movimento por quaternions e a geometria do D20 foram preservados nos
arquivos `app/use-orbital-d20.ts` e `lib/orbital-rotation.ts`. O controle
manual continua prioritário, com inércia e retorno automático. Hover/foco
orbital mantém a redução automática a 20%. O fluxo do disco usa um relógio
independente da orientação e da velocidade do dado.

## Validação

| Verificação | Resultado |
| --- | --- |
| Regressão automatizada | 423 testes passaram, cobrindo regras, fichas, persistência, importação/exportação, temas, agenda e animação. |
| Fluxo radial | Velocidades ordenadas, onze fases distintas, centro comum, máscaras, reuso por quadro e liberação após falha parcial. |
| Ciclo de animação | Pausa/retomada sem salto, visibilidade e remoção de RAF/observadores em teste com relógio simulado. |
| Seleção | Destinos existentes, troca rápida sem múltiplos fios, substituição da confirmação e cancelamento ao sair da Home. |
| Acessibilidade | Foco e ativação por teclado no Chromium. Toque e movimento reduzido nos testes com DOM simulado. |
| D20 | Mouse e teclado no Chromium, centro fixo, faces opacas e arestas traseiras ocultas. Testes existentes de toque, inércia e quaternions passaram. |
| Aparência | Chromium desktop com Ametista/Rosa e Floresta/Dourado no escuro, Ametista/Rosa e Safira/Ciano no claro. |
| Compilação | TypeScript e build passaram. O build mantém aviso de bundle acima de 500 kB. |

Comandos utilizados na raiz da aplicação.

```bash
node --experimental-strip-types --test --test-force-exit --test-concurrency=4 tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/site-version.mjs --check
node /home/agent/.codex/plugins/cache/openai-curated-remote/sites/1.1.6/scripts/build-site.mjs
```

A [galeria da v0.43](../../../docs/home-orbital-v043/README.md) contém as
capturas reais e o vídeo. O vídeo usa foco e teclado para mostrar destinos
e controle do D20. O hover também foi exercitado nas quatro estrelas.

## Pendências de validação

A ferramenta de navegador desta execução não disponibilizou emulação de
viewport mobile ou de movimento reduzido. A janela nativa auxiliar apresentou
falha gráfica de captura. Toque, cancelamento e movimento reduzido foram
cobertos pela suíte automatizada. Testes em celular físico, inspeção visual
mobile nesta revisão e medições de CPU/GPU mobile permanecem pendentes.

## Preservação e restauração

A alteração se limita à Home, ao compositor, ao identificador central e aos
testes/documentação correspondentes. Configuração de hospedagem, bindings
D1/R2, migrações, APIs, autenticação e lockfile conservam os arquivos de
origem. A pasta da Alpha, sua tag e a branch v0.42 permanecem recuperáveis.
O arquivo compilado para publicação conserva `.openai/hosting.json` e as
migrações existentes. Para retornar à v0.42, use a versão salva 94 do mesmo
projeto Sites pelo fluxo de implantação de uma versão existente.
