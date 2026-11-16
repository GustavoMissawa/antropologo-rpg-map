# ANTROPOLOGO RPG · Atlas da Plataforma

Mapa visual da versão 0.38, baseado em `Redesigner Antropologo.fig` e no inventário de cobertura da aplicação. O editor usa React Flow e funciona como site estático no GitHub Pages.

[Abrir o editor](https://gustavomissawa.github.io/antropologo-rpg-map/)

## Explorar e editar

- Navegue pelas 10 áreas. Selecione um cartão para ver os detalhes, os caminhos de entrada e saída e as capturas associadas.
- Arraste os cartões para reorganizar o mapa. Conecte os pontos laterais para criar relações. Selecione uma relação e use **Delete** para removê-la.
- Edite título, descrição e observações no painel do cartão. Arrastar, conectar, importar e salvar texto atualiza o rascunho local.
- A galeria tem 81 referências desktop, 68 mobile e uma prancha em **Extras**. São 149 arquivos JPEG originais. Alguns códigos reutilizam uma imagem.
- O mapa preserva 90 cartões e 47 ligações recuperadas do arquivo. Os detalhes incluem 37 caminhos alternativos e retornos documentados no inventário da v0.38. Os códigos M52 a M68 foram vinculados aos JPEGs existentes por comparação de hash.

## Sincronizar edições com o GitHub

A versão compartilhada está em [`public/data/edicoes.json`](public/data/edicoes.json). A página publicada carrega esse arquivo na abertura e preserva rascunhos locais com alterações.

Ao reabrir um mapa já sincronizado neste navegador, o editor consulta o GitHub se a revisão servida pelo Pages for diferente. Se a consulta falhar, a última edição sincronizada conhecida continua disponível.

1. No editor, abra **Sincronizar GitHub → Verificar versão do GitHub**. A leitura da versão pública funciona sem token. Use **Carregar versão do GitHub** para abrir a edição mais recente, mesmo antes de uma nova publicação do Pages.
2. Para salvar, crie no GitHub um [token fine-grained](https://github.com/settings/personal-access-tokens/new) com acesso apenas a `antropologo-rpg-map` e permissão **Contents: Read and write**.
3. Insira o token no editor e clique em **Salvar no GitHub**. O valor é usado em memória durante essa operação. O token não é escrito no arquivo, na exportação ou no armazenamento local.
4. O botão gera um commit em `main`, visível no histórico público. Se a versão remota mudou, o editor conserva o rascunho e bloqueia a sobrescrita. Use **Exportar mapa** para guardar a edição local antes de carregar e conciliar a versão remota.

Se outra aba salvar primeiro, o rascunho desta aba fica guardado durante sua sessão, inclusive após recarregar. Exporte essa cópia antes de fechar a aba caso ainda não tenha sincronizado.

O envio é manual. A leitura pública e o rascunho local continuam disponíveis sem token. O armazenamento no GitHub cobre os cartões existentes, posições, textos e conexões. A publicação de alterações de código continua pelo Git.

## Desenvolver

```bash
git clone https://github.com/GustavoMissawa/antropologo-rpg-map.git
cd antropologo-rpg-map
npm ci
npm test
npm run dev
```

O workflow em `.github/workflows/deploy.yml` verifica a integridade do mapa e publica o build quando `main` é atualizado. Use `npm run build` para conferir a versão de produção localmente.

```text
public/data/map.json       Referências, cartões, rotas e galeria de origem
public/data/edicoes.json   Edição compartilhada, atualizada pelo botão de sincronização
public/screens/            Imagens originais da exportação
src/App.jsx                Editor e visualização
src/GitHubSyncDialog.jsx   Interface de sincronização
```

React Flow é distribuído sob a licença MIT. As imagens e os dados de referência vieram do material de mapeamento do proprietário.
