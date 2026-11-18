# ANTROPOLOGO RPG · Atlas da Plataforma

Mapa visual e histórico do código-fonte da aplicação. O editor usa React Flow e funciona como site estático no GitHub Pages.

[Abrir o editor](https://gustavomissawa.github.io/antropologo-rpg-map/)

## Versões da aplicação

| Versão | Código-fonte | Mapa compartilhado |
| --- | --- | --- |
| v0.38 — Alpha | `aplicacao/v0.38/`, arquivada na tag `v0.38-alpha` | `public/data/map.json` e `public/data/edicoes.json` |
| v0.40 — Desenvolvimento | [Publicação 92 e branch de referência](https://github.com/GustavoMissawa/antropologo-rpg-map/tree/dev/v0.40-atmosfera-procedural/aplicacao/v0.40) | `public/data/v0.40/map.json` e `public/data/v0.40/edicoes.json` |
| v0.41 — Home Orbital · Desenvolvimento | `aplicacao/v0.40/` na branch `dev/v0.41-d20-orbital` | O atlas segue com os mapas da v0.38 e da v0.40. |
| v0.42 — Home Orbital · Desenvolvimento | `aplicacao/v0.40/` na branch `dev/v0.42-d20-interativo` | O atlas segue com os mapas da v0.38 e da v0.40. |
| v0.43 — Home Orbital · Desenvolvimento | `aplicacao/v0.40/` na branch `dev/v0.43-origem-orbital` | O atlas segue com os mapas da v0.38 e da v0.40. |
| v0.47 — Home Orbital · Desenvolvimento | `aplicacao/v0.40/` na branch `dev/v0.47-orbita-e-dados` | Órbita completa da origem do fio e transformação do dado central. |
| v0.46 — Navegação cósmica · Desenvolvimento | `aplicacao/v0.40/` na branch `dev/v0.46-navegacao-cosmica` | Destinos expandidos, listas contextuais e câmera cósmica. |
| v0.45 — Nebulosas aleatórias · Desenvolvimento | `aplicacao/v0.40/` na branch `dev/v0.45-nebulosas-aleatorias` | Dissipação das bordas e composição por carregamento. |
| v0.44 — Nebulosas procedurais · Desenvolvimento | `aplicacao/v0.40/` na branch `dev/v0.44-nebulosas` | Controle independente das nuvens em Aparência; mapas históricos preservados. |

O seletor abre v0.40 por padrão. As duas versões começaram com os mesmos arquivos de aplicação e a mesma referência visual. Cada mapa tem seu próprio rascunho, JSON e destino de sincronização. O rascunho do editor anterior pertence à Alpha e pode ser aberto pelo seletor.

O código veio da pasta `projeto/` de `ANTROPOLOGO_RPG_v0.38_backup_completo.zip`, correspondente à árvore Git `209a953f5c3e13941b5c8f41d5c9d9922acaf07b` do commit de origem `17d76ebfdb9fdb83514df05cc107a1837c86419b`. A cópia de desenvolvimento conserva inclusive a versão interna do pacote na origem para manter a igualdade inicial. O identificador de desenvolvimento já aparece no seletor do atlas.

## Aparência da Home Orbital

A [v0.48](docs/home-orbital-v048-hover.md) também transforma o dado ao passar o mouse sobre um nó orbital.

A [documentação da v0.47](docs/home-orbital-v047-orbita-e-dados.md) descreve o relógio compartilhado da órbita, o fio dinâmico e a transformação entre as seis geometrias do dado central.

A [documentação da v0.46](docs/home-orbital-v046-navegacao.md) registra destinos expandidos, transições, listas reais e zoom do mesmo cenário. A [correção da v0.45](docs/home-orbital-v045-nebulosas.md) registra bordas dissipadas e aleatoriedade por documento. A [documentação da v0.44](docs/home-orbital-v044-nebulosas.md) registra nebulosas procedurais, cores, controle persistente e validação textual. Prints e vídeos demonstrativos deixam de ser obrigatórios no GitHub; o histórico existente foi preservado. A [revisão da v0.43](docs/home-orbital-v043/origem-dinamica/README.md) mostra a parada do disco e as conexões. A [galeria inicial da v0.43](docs/home-orbital-v043/README.md) e as galerias da [v0.42](docs/home-orbital-v042/README.md), [v0.41](docs/home-orbital-v041/README.md) e [v0.40](docs/home-orbital-v040/README.md) registram as revisões anteriores.

## Desenvolver a aplicação

Trabalhe em `aplicacao/v0.40/` e consulte o README dessa pasta para os comandos de build e execução. A instalação da aplicação usa seu próprio `pnpm-lock.yaml`. As migrações do D1 e a declaração dos bindings do Worker estão no código. Os registros do D1, os objetos do R2, as credenciais e os dados das sessões do navegador são externos. Para executar a aplicação localmente, use os bindings e um banco de desenvolvimento descritos no README da aplicação.

O workflow do atlas compara a pasta Alpha com a tag e publica somente o `dist/` gerado pelo editor. Para reorganizar o mapa de desenvolvimento, selecione v0.40 antes de editar. As capturas iniciais registram a v0.38, conforme o inventário de cobertura.

## Explorar e editar

- Navegue pelas 10 áreas. Selecione um cartão para ver os detalhes, os caminhos de entrada e saída e as capturas associadas.
- Arraste os cartões para reorganizar o mapa. Conecte os pontos laterais para criar relações. Selecione uma relação e use **Delete** para removê-la.
- Edite título, descrição e observações no painel do cartão. Arrastar, conectar, importar e salvar texto atualiza o rascunho local.
- A galeria tem 81 referências desktop, 68 mobile e uma prancha em **Extras**. São 149 arquivos JPEG originais. Alguns códigos reutilizam uma imagem.
- O mapa preserva 90 cartões e 47 ligações recuperadas do arquivo. Os detalhes incluem 37 caminhos alternativos e retornos documentados no inventário da v0.38. Os códigos M52 a M68 foram vinculados aos JPEGs existentes por comparação de hash.

## Sincronizar edições com o GitHub

A versão compartilhada fica no arquivo de edições da versão selecionada. A página publicada carrega esse arquivo na abertura e preserva rascunhos locais com alterações.

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
