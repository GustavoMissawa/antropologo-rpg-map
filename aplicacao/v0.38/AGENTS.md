# ANTROPOLOGO RPG: publicações e escopo

- Preserve o Site existente, o público autorizado e funcionalidades fora do pedido.
- A única fonte da versão da aplicação é `package.json`, no formato `0.<número>.0`.
  Use `SITE_VERSION` de `lib/site-version.ts` para exibi-la como `0.<número>`.
- A atualização que introduz a barra de formatação mobile mantém a versão
  já definida pelo usuário. Ela é o ponto de partida deste controle.
- Em cada atualização posterior que será publicada, execute
  `node scripts/site-version.mjs` uma única vez antes dos checks/build e inclua
  a alteração na mesma versão do código. Não incremente em tentativas repetidas
  de build, correções da mesma publicação ou novas tentativas de implantação.
  Se a implementação já tiver uma alteração de versão pendente em relação à
  versão publicada, reutilize-a. Confirme isso pelo diff/commit de abertura.
- Não promova automaticamente para `1.0`, nem mesmo após `0.99`.
  O comando continua em `0.100`, `0.101` e assim por diante. Somente uma
  instrução explícita do usuário autorizando o lançamento oficial pode
  alterar essa série para `1.0`.
- `node scripts/site-version.mjs --check` apenas verifica/exibe a versão.
  O número de versão interno da hospedagem Sites é independente da versão
  da aplicação e não deve ser usado na interface.
- O aviso grande de teste fica exclusivamente na Visão geral. Não o
  recoloque nas páginas internas.
