# Home Orbital v0.44 — Nebulosas e aparência

## Origem e escopo

A abertura conferiu a publicação 96, da v0.43, no projeto original
`appgprj_6adb8be679b48191bc7fbcf908d41024`. A branch anterior era
`dev/v0.43-origem-orbital`, no commit
`5b65c6cf82c5abe411207e26fb54a815b0a0f062`, sem alterações locais.
A fonte publicada do Sites era `fca85fbbdb40bda86292d79fe294a529f12f91e8`.

O trabalho continua em `dev/v0.44-nebulosas`. O comando de versão foi
executado uma vez: `package.json` passou de `0.43.0` para `0.44.0`.
O protótipo anterior `nebula_css_antropologo.html` orientou a distribuição
assimétrica nas extremidades, sem substituir o disco ou o dado existentes.

## Construção do cenário

`app/orbital-backdrop.tsx` adiciona um cenário decorativo atrás de todos os
controles. São quatro formações no desktop, posicionadas no alto à esquerda,
na borda direita e nas duas regiões inferiores. A máscara central reduz
a presença de gás junto ao D20 e ao disco. Nenhuma camada intercepta eventos
ou entra na ordem de foco.

As nebulosas são construídas principalmente em CSS: gradientes sobrepostos,
faixas de poeira, filamentos, máscaras, transparência e blur estático.
Um filtro SVG inline complementa a irregularidade com `feTurbulence`,
modulação de alfa e deslocamento de 24 px. Esse ruído é estático; as cores
continuam vindo das variáveis CSS. O primeiro desenho só com recortes CSS
produziu bordas geométricas perceptíveis e foi substituído por esse material
contínuo. Não há PNG, JPG, WebP, vídeo ou dependência nova para gerar nuvens.

O material filtrado fica num elemento interno estático. A oscilação de
luminosidade anima apenas a opacidade do invólucro externo, com amplitude
de 16% ao longo de 26 segundos. As nuvens não atravessam a tela.

Em telas de até 900 px, são usadas três formações, com menor opacidade e
fallback em CSS sem o filtro de ruído. O layout dos controles permanece
o existente.

## Cores

Os pigmentos usam `--orbit-ambient-base` (primária),
`--orbit-ambient-light` (secundária) e os tokens de superfície e contraste
já presentes. As variáveis são herdadas: trocar a paleta recolore as nuvens
na mesma atualização, sem recarregar ou recriar o cenário.

| Papel | Escuro | Claro |
| --- | --- | --- |
| Gás primário | Primária com 65% de opacidade | Primária com 51% de opacidade |
| Gás secundário | Secundária com 59% de opacidade | Secundária com 53% de opacidade |
| Luz | 60% secundária + 40% branco azulado | 22% secundária + 78% branco |
| Poeira | 91% fundo orbital + 9% preto profundo | Tom de contraste da paleta com 26% de opacidade |

O modo claro usa pigmento suave sobre a atmosfera clara existente; não usa
inversão nem o mesmo tratamento de mistura do modo escuro.

## Estrelas

`lib/orbital-sky.ts` gera 290 estrelas com semente estável. A distribuição
combina pontos livres e duas concentrações irregulares. Há três estrelas
maiores e poucas médias; o restante é pequeno. O centro tem brilho reduzido.
Sete pontos apresentam cintilação lenta. O campo é um único SVG com círculos,
sem desenho por quadro, imagens externas ou amostragem aleatória em renders.

Desligar nebulosas mantém exatamente o mesmo campo estelar. As estrelas
discretas da atmosfera anterior também permanecem.

## Preferência

O controle **Configurações → Aparência → Nebulosas cósmicas** é um input
nativo com papel `switch`, rótulo e descrição acessíveis. Também funciona
por teclado. Sua área de rótulo é clicável e o foco permanece visível.

O booleano `nebulae` faz parte de `ab10-appearance`, junto aos modos e
paletas. Preferências antigas sem o campo, ou com um valor inválido, usam
`true`. Um `false` válido é preservado independentemente das cores.
A aplicação inicial ocorre no bootstrap antes da pintura, evitando mostrar
nuvens momentaneamente para quem as desligou. Há sincronização entre abas
pelo mecanismo de aparência existente.

A troca da primária continua redefinindo somente a secundária recomendada.
O estado das nebulosas é preservado ao mudar primária, secundária ou modo.
Restaurar a aparência padrão também restaura nebulosas ativadas.

Ao desligar, `display:none` retira o grupo de nebulosas e `animation:none`
interrompe seu movimento. O cenário não possui RAF ou worker novo. Seu
observador compartilhado com as estrelas pausa a ambientação em aba oculta
ou fora da tela e é removido ao sair da Home. `prefers-reduced-motion`
desativa os loops de opacidade e cintilação; cores e controle continuam ativos.

## Preservação

Os arquivos da geometria, rotação, entrada e inércia do D20 e do compositor
Canvas do disco não foram modificados. A Home apenas monta o novo fundo.
Estrela de seleção, fios, curvas, desaceleração e navegação conservam a
implementação anterior. Não houve alteração em APIs, banco, migrações,
bindings D1/R2 ou dependências. Histórico e mídia das versões anteriores
permanecem recuperáveis.

`aplicacao/v0.40/AGENTS.md` agora determina documentação técnica e relatórios
textuais como registro normal. Prints e vídeos demonstrativos podem ser
temporários e não são obrigatórios no GitHub. Recursos reais e mídia de
valor técnico indispensável continuam permitidos. Nenhuma captura histórica
foi removida, e nenhuma imagem ou gravação demonstrativa foi adicionada
nesta atualização.

## Validação anterior à publicação

- **431 testes passaram**, sem falhas, cancelamentos ou testes ignorados.
- TypeScript, build e verificação da versão `0.44` passaram.
- O build mantém o aviso preexistente de bundle acima de 500 kB.
- O navegador confirmou nebulosas ativadas e desligadas, campo estelar
  preservado e interrupção da animação exclusiva das nuvens.
- O estado desligado persistiu após mudanças de paleta, modo e recarga.
- Foram inspecionados Safira/Ciano e Floresta/Dourado no escuro e
  Ametista/Rosa no claro. Nuvens, estrelas e controles conservaram legibilidade.
- O interruptor foi ativado pelo teclado com a barra de espaço. As oito
  primárias foram alternadas com o efeito desligado, sem perder a preferência;
  as oito secundárias também foram acionadas no navegador.
- A seleção orbital continuou mostrando `diskMotion=stopped`, com
  `motion=running` no D20 e uma conexão ativa.
- Testes cobrem migração de preferências, bootstrap, sincronização entre
  abas, restauração, estabilidade das estrelas, manutenção dos mesmos nós
  do dado/disco e limpeza de observadores.
- Toque e movimento reduzido têm cobertura simulada e alternativas CSS.
  Não foi realizado benchmark de GPU ou teste em celular físico.

Comandos na raiz de `aplicacao/v0.40`:

```bash
node --experimental-strip-types --test --test-force-exit --test-concurrency=4 tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/site-version.mjs --check
node /home/agent/.codex/plugins/cache/openai-curated-remote/sites/1.1.6/scripts/build-site.mjs
```

## Publicação e conferência em produção

Publicação **97**, concluída em **17/11/2026**, no endereço original:
[ANTROPOLOGO RPG](https://antrobologorpg.guss04.chatgpt.site/).

| Referência | Identificador |
| --- | --- |
| Versão da aplicação | **0.44 — Desenvolvimento — Home Orbital** |
| Branch | `dev/v0.44-nebulosas` |
| Commit da implementação | `5ffc102aacdb2c866df806ee1cf5c44988034ddd` |
| Fonte sincronizada do Sites | `9018c3496fa8f4a28a11a504dd4c0b230d99b065` |
| Versão salva | `appgprj_6adb8be679b48191bc7fbcf908d41024~appgver_2d29df0b9624819198de49ec1625a8d5` |
| Implantação concluída | `appgdep_6afc98f3a4a481918f2031690f629536` |

Os 417 arquivos da aplicação foram comparados entre o commit do GitHub e
a cópia sincronizada, sem diferenças. O pacote foi construído com a
identificação desse commit e enviado com o histórico original do Sites.

No endereço público, o painel Sobre exibiu `0.44` e commit `5ffc102a`.
Preferências antigas ativaram o novo efeito por padrão. A desativação
permaneceu após trocar o modo para claro, selecionar Ametista e recarregar.
Nesse estado, foram observados `display:none` no grupo de nuvens,
`animation:none` nas formações e as mesmas 290 estrelas, com o disco ativo.

Após reativar, o modo escuro Floresta/Dourado exibiu quatro nebulosas,
as estrelas, a origem luminosa e o fio de seleção. Durante o foco em Fichas,
o disco apresentou `diskMotion=stopped`, enquanto o D20 manteve
`motion=running` e seu traçado mudou entre observações.

Os quatro destinos foram ativados na navegação orbital publicada:
Sistemas abriu `#regras`, Fichas `#ficha`, PDFs `#pdfs` e Agenda `#agenda`.
O retorno à Home preservou o efeito habilitado. Não foram criados ou
alterados sistemas, fichas, PDFs ou eventos durante essa verificação.

A captura de conferência foi temporária e não integra o repositório.
A publicação 96 permanece disponível para restauração. Persistem os
limites declarados acima para celular físico e medições de GPU.
