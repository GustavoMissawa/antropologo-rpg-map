# Logo no cabeçalho — v0.38

Data: 1 de novembro de 2026. Versão mantida: 0.38.

Quando há uma imagem de logo configurada para o cabeçalho ativo, o nome do sistema deixa de aparecer ao lado dela. O cabeçalho mantém ANTROPOLOGO RPG, o separador × e a logo. Sem imagem, o nome continua visível.

- A regra considera as imagens específicas de computador/celular e a logo padrão do sistema.
- O nome continua na descrição acessível e na dica do botão de troca de sistema.
- Se a imagem falhar ao carregar, o nome reaparece e o botão permanece utilizável.
- A prévia da personalização segue o mesmo comportamento.
- O título da página, nome cadastrado, imagens, temas, navegação e dados exportados não são alterados.

Validação: 13 testes aprovados de cabeçalho, contexto, imagens e personalização no Node/JSDOM, incluindo falha de imagem e preservação dos dados; TypeScript e `git diff --check` aprovados. Os estados de computador/celular foram simulados; não representam teste em telefone físico.

A imagem gerada na conversa é uma ilustração da alteração, não uma captura de teste do navegador nem um novo recurso gráfico do site.
