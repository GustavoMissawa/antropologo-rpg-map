# Recursos e identidade contextual — v0.34

Base: v0.33, commit `509db011be2798e62780ff4f051d12a3c2e83ee7`.

## Pacotes

1. `Sheet.portrait` é um campo opcional, independente dos blocos. O mesmo upload otimizado alimenta a identificação e a Polaroid do Super PNG. O importador valida a imagem e conserva fichas anteriores sem retrato.
2. `lib/content-limits.ts` centraliza as cotas. Sistemas: 10 MiB; fichas avulsas: 5 MiB. Super PNG: contêiner de até 32 MiB para imagem + metadados, mantendo o limite do conteúdo por tipo. O envelope JSON pode duplicar escapes; o teste de borda exercita esse caso. Limites de capítulos, imagens e símbolos permanecem independentes.
3. Silhuetas fechadas e opacas ocultam as arestas anteriores. Recorte das laterais impede desenho no centro da ficha. A pilha cheia renova os objetos, e o mobile lança o objeto atingido para cima e depois para fora da tela. d100 decorativo utiliza um par de d10; motor, fórmulas e resultados não foram alterados.
4. O catálogo `SYSTEM_THEME_DEFINITIONS` autoriza identidades por capacidade `themeKey` de origem confiável. Importar JSON nunca concede essa capacidade. O AB10 é a identidade inicial; parceiros futuros precisam ser cadastrados no catálogo confiável, sem comparar nomes. Preferências de logo, fundo estático/GIF e detalhe de destaque ficam neste navegador e não alteram o logo dos cards. GIF exige até 1 MiB, 1024 × 1024 e alternativa estática. A navegação mantém seus controles e textos.
5. Ajuda por área acessível por abas com teclado e por botão contextual no cabeçalho; ajustes de foco, espaçamento e quebra de textos. Aparência mantém modo e oito paletas no mesmo menu. Nenhuma reconstrução da Home, Ficha mobile ou Ficha Rápida.

## Verificação antes da publicação

- 316 testes automatizados passaram (`node --experimental-strip-types --test tests/*.test.mjs`).
- TypeScript sem erros (`tsc --noEmit`).
- Build de produção concluído pelo helper oficial de Sites. Há aviso de chunk acima de 500 kB, sem erro de build; não foi feita divisão invasiva do aplicativo.
- Os testes cobrem importações anteriores, referências, retrato, cotas UTF-8, PNG com muitos escapes, integridade, limites de imagem, capacidade de tema, cenas de dados e regressão do editor.
- A prévia gerenciada iniciou após retirar um lock ignorado de processo inexistente. A rota retornada recusou conexão no navegador remoto. Isso limita a validação visual anterior à publicação; não equivale a aprovação de dispositivos móveis.
- Android/iOS reais, Safari/Firefox e medições nativas de FPS, memória e teclado virtual não foram executados nesta etapa.

O relatório entregue ao usuário registra o estado da publicação e os testes de interface efetivamente possíveis depois dela.

## Validação publicada e ajuste localizado

No Chrome publicado foram executados upload, troca, remoção e reimportação de retrato em JSON/Super PNG; a imagem se manteve idêntica e o checksum do PNG foi validado. A importação de sistema a 128 bytes da cota foi aceita e a de um byte acima foi recusada sem trocar os conjuntos. Logo e GIF contextual funcionaram, e um JSON comum declarando `themeKey` não ganhou autorização. A navegação por setas e Escape da ajuda também foi exercitada.

O teste da barra lateral encontrou deslocamento vertical dos itens durante expansão por hover: um clique destinado a Ficha atingiu PDFs. O espaço vertical da identidade foi fixado nos dois estados, preservando a altura dos itens durante a expansão. A repetição do fluxo e seus resultados constam no relatório final entregue ao usuário.
