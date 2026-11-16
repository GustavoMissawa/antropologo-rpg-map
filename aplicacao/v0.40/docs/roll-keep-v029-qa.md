# Roll and Keep manual — v0.29

Escopo: simplificar a configuração e o acesso a Roll and Keep. Sem mudanças na
interpretação de faces, no parser aritmético, nos layouts ou nas animações.

## Implementação

- Regras: apenas ativar e máximo (1–100), mantendo método, símbolos e prioridades.
- Resultado: começa com zero; clique/toque/teclado alterna um dado. No máximo,
  os não escolhidos ficam desabilitados e a ajuda pede desmarcar antes de trocar.
- Indicador informativo conserva o máximo configurado, mesmo numa reserva menor.
- Ordenação por ID estável, sem sugestões automáticas e sem índice como ranking.
- Nenhum seletor de mantidos em avulsos, programação ou configuração de campos.
- `DiceSet` v5 aceita v1–v4, descartando flags `manual`/`auto` antigos.
- `Sheet` v13 aceita v1–v12 e conserva overrides antigos sem executá-los a partir
  da ficha. Um modelo oficial migra suas exceções para `resolution.actionLimits`;
  `systemActionId` liga a ação a esse catálogo do sistema. Não existe editor novo
  de habilidades ou consumo automático. Roll and Keep desativado usa todos.
- Seleção reavalia o retrato do resultado, atualiza um único registro do histórico
  e não chama RNG nem dispara outro dado decorativo.

## Checks automatizados

249 testes passaram com `node --experimental-strip-types --test tests/*.test.mjs`.
TypeScript (`node node_modules/typescript/bin/tsc --noEmit`) e `git diff --check`
passaram. Build de produção pelo helper do Sites.

Incluem: 0–4 de cinco, quinto rejeitado sem substituir os quatro; trocar escolha;
ordenação/empates/ausência de prioridades; configurações v4 inclusive somente
automáticas; overrides livres ignorados; exceções de ação vindas do catálogo;
separação entre sistemas; snapshot de símbolos/imagens/prioridades; ABBC + AA;
faces vazias; fórmulas, números zero/negativos, dados que definem quantidades;
exportação/importação JSON/Super PNG e cotas.

## Navegador — desktop

Sistema sintético anterior (`DiceSet` v4 / modelo v12) com `manual:false`,
`auto:true`, máximo 2; dado d2 com faces ABBC e AA, prioridades hipotéticas 5/10,
imagem de símbolo. Modelo contém campo/ação normal e especiais com máximo 3.
Não é um preset nem regra exclusiva de um RPG real.

1. Importou sem erro; Regras mostrou somente Ativar e Máximo.
2. Desativar ocultou o máximo; reativar e aplicar 4 conservou símbolos e exceções.
3. Criar personagem copiou modelo e configuração. Rolar 5d2 iniciou em 0/4.
4. Selecionar quatro desabilitou quinto e exibiu ajuda; desmarcar permitiu outro.
5. Menor/maior prioridade conservou IDs selecionados. Histórico manteve uma
   entrada e refletiu escolhas, descartes e categorias.
6. Nenhum dropdown de mantidos ou botão automático na ficha, nem nos formulários
   de campo ou rolagem extra. Editar/salvar fórmula preservou `systemActionId`.
7. Campo e ação especial herdados iniciaram 0/3. ABBC + AA mantidos mostraram
   Sucessos 3, Adaptações 2 e Pressões 1, sem soma de índices/prioridades.
8. JSON e Super PNG baixados pela UI para ficha e sistema: payloads comparados
   profundamente e idênticos; integridade válida. PNG do sistema reimportou
   máximo 4, modelo e ações especiais 3. PNG de ficha abriu sem importar regras.

Screenshot: `antropologo-roll-keep-v029.jpg` — leitura real dos resultados e 2/4.

## Navegador — mobile

Harness temporário com iframes de 390 e 320 px, removido antes do pacote.
Sem aparelho físico ou emulação de gestos do sistema operacional.

- Reimportou o Super PNG da ficha; recibo de integridade válida.
- Campo normal rolou cinco e começou 0/4. Clique equivalente a toque selecionou,
  desmarcou e selecionou novamente. Maior prioridade conservou os dois IDs.
- Atingir quatro bloqueou quinto, sem substituir escolhas. Histórico uma entrada,
  quatro mantidos. Dados decorativos permaneceram cinco antes/depois de seleção.
- Em 320 px: largura útil 305, scrollWidth 305; popup x=12, right=293. Alvos
  medidos com pelo menos 74 px de largura e 79 px de altura.
- Limpar histórico retirou registros e mostrou cinco elementos `is-leaving`.
- Importou também ficha tradicional e rolou 2d6+3: faces 6/1, soma 7, resultado 10,
  sem ferramentas de seleção ou overflow horizontal.

Dados de teste foram locais e não integram presets ou assets de produção.
