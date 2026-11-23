# Revisão de desempenho — ANTROPOLOGO RPG v0.50

A revisão partiu da publicação 122 do ChatGPT Sites, na v0.49. O código dessa publicação coincide com `491530b` nos 437 arquivos compartilhados entre o repositório do Site e a aplicação no GitHub. A revisão abrangeu a entrada da aplicação, os modos Orbital e Legado, os fluxos de Sistemas, Fichas, PDFs e Agenda, o cache de sessão, os formatos de arquivo, as rotas do Worker e os recursos da Home Orbital.

## Implementação

- O mapa de fichas e o editor rico de capítulos entram no navegador ao abrir o respectivo editor. Cada módulo carregado é reutilizado. Uma falha de carregamento mantém o rascunho e a navegação disponíveis e oferece uma nova tentativa no editor.
- O leitor carrega o codec Super PNG depois de identificar a assinatura PNG. O exportador carrega o codec e prepara a capa ao selecionar Super PNG. A exportação JSON usa a serialização já preparada. A verificação CRC32, as cotas e a compatibilidade de importação continuam valendo para arquivos antigos e novos.
- O mapa de fichas reaproveita blocos por aba, rótulos e limites enquanto os dados correspondentes não mudam. A ficha vinculada ao sistema e a comparação com o rascunho inicial também são reaproveitadas entre atualizações da interface.
- A Agenda gera as datas de cada série diretamente pelo seu intervalo. O mês respeita o dia âncora e ajusta para o último dia quando necessário. A ordem de data, horário e título, os limites inclusivos, o fuso de Brasília e a janela de 400 dias seguem o comportamento anterior.

O diff de aplicação não contém alterações em CSS, dados 3D, animações, rotas, esquema de dados ou vínculos de armazenamento.

## Medição

| Medida | Publicação 122 | v0.50 |
| --- | ---: | ---: |
| JavaScript inicial minificado | 1.318 kB | 724 kB |
| JavaScript inicial com gzip | 402 kB | 223 kB |
| Ocorrências da Agenda, 180 sessões e 121 dias | 9,66 ms | 1,51 ms |
| CRC32 de 8 MiB | 90,49 ms | 19,50 ms |

O JavaScript inicial é a soma da entrada, da rota principal e das dependências estáticas transitivas do manifesto Vite, sem duplicatas. Os tempos são medianas de sete lotes aquecidos de oito execuções em Node.js 24. O comparativo conferiu a igualdade da lista de ocorrências e da soma de verificação. Os tempos medem as rotinas isoladas em dados sintéticos.

## Validação

- A suíte `node --experimental-strip-types --test --test-force-exit --test-concurrency=4 tests/*.test.mjs` passou com 461 testes. Inclui os seis dados, navegação, aparência, cache, editores, arquivos antigos, importação/exportação, cadastro temporário, isolamento de sessão, operações da Agenda e recuperação após falhas. Foi incluída uma prova de equivalência entre o cálculo da Agenda por intervalo e a consulta diária.
- A checagem TypeScript e o build de produção passaram. A análise ESLint do código do projeto ainda acusa erros e avisos preexistentes, sem diagnósticos novos nesta alteração.
- No Chromium, a prévia exibiu a Home Orbital e abriu as áreas pelas transições existentes. Foram criados uma ficha com bloco de atributos e um sistema com capítulo editado e salvo. Foram conferidos a disponibilidade de JSON, a prévia com integridade verificada do Super PNG, a biblioteca de PDFs, a entrada da Agenda e a troca entre Orbital/Legado e claro/escuro. Os fluxos de conta e as operações persistentes da Agenda foram exercitados na suíte de integração.
