# Personalização no celular — ajuste da v0.38

Data: 1 de novembro de 2026. A versão da aplicação permanece 0.38.

O layout anterior apresentava simultaneamente três colunas de opções no celular. Isso repetia rótulos, dificultava identificar o dispositivo e consumia quase toda a região de rolagem antes da prévia e dos controles.

## Alterações

- Até 600 px, os botões Computador, Celular e Super PNG selecionam um grupo por vez.
- As opções do grupo usam rótulos compactos, mantendo os nomes completos de acessibilidade.
- Trocar entre computador e celular conserva o tipo de área selecionada: logo, fundo do cabeçalho ou fundo compartilhado da página.
- Cabeçalho, indicadores de armazenamento e rodapé ocupam menos espaço; os três indicadores continuam alinhados.
- O corpo recebe o espaço restante do diálogo e rola independentemente, com prévia e controles acessíveis.
- As ações mantêm altura mínima de 44 px e respeitam a área segura inferior.
- A navegação completa do desktop foi preservada, assim como os arquivos, configurações, cotas e formatos de exportação.

Arquivos de implementação: `app/system-visual-editor.tsx` e `app/system-visual-editor.css`.

## Validação

- **17 testes aprovados** de personalização, limites de mídia e capa Super PNG, incluindo alternância entre grupos e preservação dos dados.
- TypeScript e `git diff --check` aprovados.
- Os testes de estado executaram no Node/JSDOM; não medem layout nativo nem teclado virtual.
- A revisão dos estilos mobile utilizou o código e a captura enviada pelo usuário. O ambiente não disponibilizou preview responsivo utilizável nem dispositivo Android/iOS; não se declara validação visual em celular físico.

Backup do código anterior: `antropologo-pre-personalizacao-mobile-0_38.zip`, além do histórico Git do projeto.
