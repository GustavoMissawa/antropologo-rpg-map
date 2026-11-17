# Home Orbital v0.45 — Bordas e composição procedural

## Base conferida

A abertura confirmou aplicação 0.44, publicação 97, fonte Sites
`9018c3496fa8f4a28a11a504dd4c0b230d99b065` e GitHub
`4324fefb99822a09e654eaed71162daa025d6cad`, branch `dev/v0.44-nebulosas`,
sem alterações locais. A atualização segue em `dev/v0.45-nebulosas-aleatorias`.
O comando de versão foi executado uma vez, conforme AGENTS.md: 0.45.0.

## Causa e correção das bordas

Os gradientes e faixas internas alcançavam os limites retangulares do material.
O filtro SVG tinha margem de apenas 15%; deslocamento e blur ainda podiam
produzir alfa junto às extremidades. Não havia dissipação final envolvendo
o resultado filtrado. O overflow/contain do cenário é mantido apenas como
limite da Home, para não produzir rolagem ou invadir outras seções.

O invólucro de cada formação agora aplica uma máscara de alfa após o filtro:
um envelope elíptico suave combinado com dissipação nos quatro lados. O
material interno tem 8% de margem e o filtro tem região de -40% a 140%.
A irregularidade continua vindo do material CSS, poeira, filamentos e ruído
SVG; a máscara externa impede que a região de renderização se torne uma
borda visível. O blur de 8 px do gás não foi aumentado. As formações podem
continuar parcialmente fora da tela, com centro protegido pela máscara já
existente. Não há imagens raster novas.

## Aleatoriedade estável por documento

`lib/nebula-composition.ts` separa o gerador puro e testável do cache de página.
Uma semente de `crypto.getRandomValues` é obtida depois da hidratação.
Servidor e primeiro render cliente começam com a mesma lista vazia. Um efeito
monta a composição e o módulo a guarda enquanto aquele documento existir.
Strict Mode, remontagens da Home e mudanças de aparência reutilizam o cache.
Um carregamento completo cria outro contexto e outra semente. Não há
sessionStorage/localStorage para as posições, RAF ou sorteio por quadro.

São sorteadas 2 a 5 formações, sem repetir corredores. Há uma formação na
região esquerda e outra na direita; as demais ocupam os corredores restantes.
Os cinco corredores se baseiam nas bordas existentes, com deslocamentos
limitados, escala de 0,82 a 1,12, rotação, alongamento do material, densidade,
intensidade e fase de luminosidade variáveis. O filtro estático é compartilhado,
sem recriação a cada troca de cores. Mobile conserva o fallback CSS e reduz
a opacidade. Os tokens de primária/secundária, luz e poeira permanecem herdados.

O controle existente Nebulosas cósmicas continua sendo o único interruptor.
`display:none` oculta o grupo e `animation:none` encerra a animação exclusiva.
Religar restaura a mesma composição. As 290 estrelas não são sorteadas de novo.
Preferência persistida, pausa fora da tela/aba oculta e movimento reduzido
conservam seu funcionamento. D20, disco, fios, navegação e bindings D1/R2
não foram modificados. A v0.38 Alpha e mídia histórica foram preservadas.

## Validação

- TypeScript sem erros; 432 testes automatizados passaram.
- Testes incluem 100 sementes distintas, limites de quantidade/posição,
  repetibilidade por semente, cache por documento, estabilidade ao mudar
  cores, interruptor e remontagem, persistência e limpeza dos observadores.
- Dez recargas reais no navegador: 10 assinaturas diferentes, quantidades
  **5, 3, 4, 4, 4, 3, 5, 5, 2, 3**.
- Inspeção visual das extremidades nas recargas: sem limites retangulares
  aparentes, nuvens nas bordas e centro/controles legíveis.
- Floresta/Dourado escuro, Rubi/Ciano claro e Ametista escuro inspecionados.
  Tema/paleta não alteraram a assinatura da composição.
- Desativação confirmou `display:none`, `animation:none` e 290 estrelas;
  preferência desligada confirmada novamente após recarregar.
- Religação e retorno à Home conservaram os parâmetros do mesmo documento;
  entrada do D20 por teclado e navegação orbital continuaram disponíveis.
- Home em iframe real de 390 × 844 px: área útil de 375 px, scrollWidth 375 px,
  fallback `blur(1px)` aplicado, sem rolagem horizontal.
- Movimento reduzido tem cobertura simulada e regra CSS que desativa os loops.
  O navegador de validação não expõe emulação dessa preferência do sistema.
  Não houve teste em celular físico ou benchmark de GPU.

Capturas foram temporárias e não integram o GitHub. O fluxo textual do
AGENTS.md foi mantido; nenhuma mídia histórica foi removida.

Comandos em `aplicacao/v0.40`:

```bash
node node_modules/typescript/bin/tsc --noEmit
node --test --test-force-exit --test-concurrency=4 tests/*.test.mjs
node /home/agent/.codex/plugins/cache/openai-curated-remote/sites/1.1.6/scripts/build-site.mjs
```

## Publicação

A conferência em produção será registrada após publicar no projeto original.
