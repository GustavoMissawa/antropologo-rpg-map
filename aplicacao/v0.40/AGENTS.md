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

## Fluxo de desenvolvimento e publicação

Esta regra vale em futuras sessões que trabalharem nesta aplicação. O usuário
autoriza previamente a publicação, no projeto original do ChatGPT Sites, das
alterações normais que solicitar, inclusive quando abrirem uma nova versão.
Após implementar e validar a alteração, conclua o fluxo até a verificação em
produção sem pedir uma segunda aprovação.

Um pedido de capturas ou de prévia para validação faz parte dos testes e,
por si só, não limita a publicação. Respeite o limite quando o pedido atual
solicitar explicitamente apenas uma prévia ou proibir a publicação.

1. Implemente a alteração solicitada na branch de desenvolvimento apropriada de
   [GustavoMissawa/antropologo-rpg-map](https://github.com/GustavoMissawa/antropologo-rpg-map).
2. Execute os testes automatizados aplicáveis, o build e a checagem de tipos.
3. Valide no navegador as mudanças visuais e as interações relevantes.
4. Crie um commit com descrição clara e envie a alteração ao GitHub.
5. Atualize as capturas e a documentação visual quando mudar a interface.
   Confirme no GitHub o commit final a ser sincronizado.
6. Confira a publicação atual e compare o código aprovado com a fonte do
   projeto original, identificado em `.openai/hosting.json`. Verifique
   alterações posteriores e preserve o histórico Git, a v0.38 Alpha, as
   versões recuperáveis e os vínculos D1/R2.
7. Sincronize o código verificado e publique no projeto original,
   [antrobologorpg.guss04.chatgpt.site](https://antrobologorpg.guss04.chatgpt.site/).
   Mantenha o mesmo projeto e o mesmo endereço.
8. Abra o endereço público, confirme a versão e verifique a alteração solicitada
   em produção. Informe o número da publicação, o commit e o resultado dos testes.

A autorização permanente tem estas únicas exceções. Nesses casos, obtenha
autorização específica antes de publicar:

- Pedido atual que limita explicitamente a entrega a uma prévia ou proíbe a
  publicação.
- Alterações destrutivas.
- Migrações de dados de risco.
- Mudanças críticas de segurança.
- Conflitos importantes entre versões. Analise as alterações conflitantes
  antes de qualquer sobrescrita.

Considere o desenvolvimento concluído quando a alteração estiver disponível e
verificada no endereço público. Se o ambiente impedir a publicação ou a
validação, registre o bloqueio e indique a etapa que falta.

## Direção de arte e movimento

- Para análise visual da interface, leia `.agents/skills/impeccable/SKILL.md`.
- Para composição e uso das referências, leia `.agents/skills/design-taste-frontend/SKILL.md`.
- Para planejar e revisar movimento, leia `.agents/skills/animate/SKILL.md`,
  `.agents/skills/animation-performance/SKILL.md` e
  `.agents/skills/review-animations/SKILL.md`.
- Os commits de origem e as licenças constam em
  `docs/home-orbital-v040.md` e `.agents/skills/LICENSES/`.
