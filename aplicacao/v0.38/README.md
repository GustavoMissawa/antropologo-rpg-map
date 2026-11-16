# ANTROPOLOGO RPG

Plataforma de teste para diferentes sistemas de RPG, acessível pelo link: regras em árvore, biblioteca de PDFs e editor modular de fichas.

- **Regras:** biblioteca de conjuntos com AB10 fixo para consulta e cartão Suas regras sempre disponível para criar outros sistemas. Conjuntos próprios têm nome completo no destaque do card, logo opcional (PNG/JPG/WebP de até 2 MB, preparada para até 512 KB e incluída no `.regras`), descrição, capítulos, até 12 níveis de subseções, busca e reordenação de irmãos. Cada conjunto pode ser salvo em `.regras` (JSON, formato `rpg-ruleset` v1) e carregado como uma nova caixa, sem substituir as existentes. Até 300 tópicos, 5 MB por arquivo e 50 conjuntos pessoais nesta página; todos ficam na memória durante o teste. O AB10 não pode ser alterado ou removido, e arquivos importados não adquirem esse caráter fixo.
- **PDFs:** catálogo com busca e categorias, leitura e download. Adições e remoções de teste ficam na memória; registros privados anteriores em R2 não são expostos.
- **Ficha:** mapa com abas, posição livre ou encaixe em grade de 24 px para posição e largura de blocos, campos numéricos, texto, texto longo, marcador, dependentes, compostos e comparativos atual/máximo. Campos dependentes copiam um valor ou modificador e aplicam um ajuste positivo/negativo. Compostos exibem valor/modificador, manual ou automático pelo cálculo `floor((valor - 10) / 2)`.
- **Comparativos:** exibem atual/máximo em números separados. O atual é editável durante o jogo, por digitação ou botões ±1; valores negativos ou acima do máximo são preservados. O máximo pode ser fixo ou dependente de outro valor, modificador ou máximo, com ajuste. Referências e ciclos são tratados pelo mesmo resolvedor dos demais campos.
- **Modos da ficha:** Modo edição permite alterar blocos e campos e programar suas rolagens. Modo ficha mantém os dados para consulta, transforma campos programados em botões de lançamento e permite ajustar o atual dos comparativos. Rolagens de comparativos têm botão separado dos controles do atual. O botão Salvar oferece JSON ou Super PNG, sem gravar a ficha no servidor.
- **Detalhes dos campos:** texto opcional de até 10.000 caracteres, consultado no Modo ficha por hover de 700 ms, foco pelo teclado ou toque prolongado de 600 ms. O painel fica acima do mapa, pode ser fechado com Escape ou toque fora, e um toque prolongado não lança dados. Movimentos de rolagem cancelam o gesto.
- **Dados:** rolagens por campo, dados avulsos e até 50 fórmulas extras. Nos campos, `@valor` é o valor base/atual e `@modificador` é a segunda parte de um composto. Novas configurações de compostos usam `1d20 + @modificador` por padrão; o seletor distingue modificador e valor base. Fórmulas anteriores são preservadas. Nos comparativos, `@atual` equivale a `@valor` e `@maximo` resolve o máximo. Os aliases novos são reservados somente nos comparativos para preservar vínculos antigos de outros tipos. `1d20 + @valor` com valor 3 lança um d20 + 3; `(@valor)d20` lança três d20. Cada dado aparece separadamente, com animação de 600 ms (120 ms e sem movimento quando a preferência é reduzir animações). O resultado e os valores usados são fixados no clique; novos cliques ficam bloqueados durante a animação. O histórico dos 20 últimos lançamentos é temporário. A configuração valida valores conhecidos sem simular dados como 1; divisões e quantidades que dependem de um resultado aleatório são verificadas no lançamento. Avulsos também aceitam vínculos a campos. A inserção usa a posição do cursor e reaproveita vínculos da mesma origem. Prévia de fórmula em todos os editores, com suporte a ×, ÷, espaços em dados e vírgula decimal. A sintaxe continua restrita a dados, campos, números, operações e parênteses, sem executar código.
- **Arquivo de ficha:** JSON `ab10-character` v12 preserva mapa, modo de posicionamento, abas, detalhes dos campos, pares atual/máximo, vínculos e rolagens, inclusive as fórmulas de cada campo. A importação migra v1/v2/v3/v4/v5/v6/v7/v8/v9/v10 e remapeia os IDs com suas referências. Duplicar um bloco remapeia seus vínculos internos. Origens removidas ou ciclos importados aparecem como erros corrigíveis, sem impedir exportar um rascunho.

O conteúdo inicial das regras é uma estrutura de tópicos, sem mecânicas inventadas. A biblioteca começa vazia.

## Identidade e navegação

ANTROPOLOGO RPG é a plataforma; AB10 — Absolute 10 é um dos sistemas nela disponíveis e permanece fixo para consulta. A marca principal usa texto/CSS, com ANTROPO em prata escovada e LOGO na cor ativa da paleta; RPG fica abaixo, entre linhas decorativas. O AB10 conserva sua própria marca AB10 / ABSOLUTE 10 no destaque do card. O restante de cada card conserva título, descrição, contagem e ações.

A barra lateral fica compacta no desktop com mouse e expande por hover, sem botão dedicado. O foco visível pelo teclado também a expande. A expansão sobrepõe o conteúdo, mantendo a área principal imóvel; o eixo horizontal da barra é contido. Telas de toque mantêm a navegação expandida e, no celular, o menu continua sendo uma gaveta. A barra superior é sticky e os destinos de rolagem consideram sua altura.

## Personalização da ficha

As propriedades de cada bloco oferecem uma cor opcional, com seletor livre, oito sugestões e Usar cor do tema para retirar a sobrescrita local. As superfícies, bordas e detalhes respeitam claro/escuro; os demais blocos continuam no tema global.

Cada campo oferece um botão + / Ao lado no Modo edição. Ele abre o formulário existente e insere o novo campo imediatamente depois daquele escolhido, na mesma linha, sem reorganizar as demais linhas. Adicionar campo abaixo cria uma linha independente. Até quatro campos por linha; o bloco aumenta de largura quando necessário e continua responsivo ao ser redimensionado. O seletor global de colunas foi retirado. Grades antigas continuam sendo lidas, inclusive suas linhas incompletas e larguras; uma alteração converte as fronteiras das linhas para os metadados opcionais row/rowSize da ficha v8. Editar, remover, mover e duplicar campos preserva esses metadados, os cálculos e as rolagens.

O bloco Imagem usa o mesmo mapa, abas, duplicação e posicionamento Livre/Grade. Ele permite adicionar, substituir e remover PNG/JPG/WebP de até 8 MB; o navegador prepara uma cópia de até 1600 px e 768 KB para incorporar ao `.ab10`. As opções Ajustar, Preencher e Centralizar preservam a proporção. A alça redimensiona largura e altura; setas horizontais/verticais e as propriedades permitem ajuste preciso. O limite total de 5 MB do arquivo continua válido. Imagens são incluídas também em fichas-modelo e pacotes `.regras`, com cópias independentes.

Rolagens por campo, extras e avulsas emitem um evento visual independente do histórico numérico. Cada dado sorteado cria uma queda SVG com pequenas variações de posição, rotação e duração. No desktop, a camada é filha exclusiva do background global da página, com z-index negativo: atravessa o espaço global e é naturalmente coberta pelos painéis. Até 60 dados persistentes se acumulam nas faixas livres à esquerda e à direita da ficha. As dimensões reais da página e do container definem essas faixas. Uma busca leve reserva destinos antes da queda e empilha cada dado acima dos vizinhos ocupados, com variação de tamanho, rotação e posição, permitindo contato e sobreposição parcial sem repetir a mesma região. Laterais maiores comportam mais dados. Posições válidas permanecem estáveis ao rolar novamente; mudanças de largura ou redução do espaço recalculam o conjunto. A escala visual do desktop é 50% maior, sem mudar os centros, a área reservada nem a distribuição; o contato parcial permanece intencional e posições idênticas continuam impedidas. No mobile, a camada permanece em portal fixo no body, acima do conteúdo, sem interceptar toque, restrita a 13% da altura do viewport visual na base. Acumula até 54 dados, distribuídos por amostragem pseudoaleatória em toda a faixa. Cada destino é reservado durante a queda e verificado contra os demais; posições válidas ficam estáveis ao lançar novos dados. O tamanho se adapta à área disponível, e mudanças de largura ou altura recalculam os destinos. VisualViewport mantém essa faixa junto à parte visível em mudanças de teclado e orientação.

Após os limites, novas rolagens continuam criando quedas transitórias. A fila de efeitos e a quantidade de quedas simultâneas são limitadas, sem alterar resultados ou histórico de rolagens. Limpar histórico cancela a fila e anima os dados visíveis: uma pequena subida seguida de queda para fora da página/tela, em 650 ms. A preferência de reduzir movimentos acumula sem queda e limpa imediatamente. Timers e observers são cancelados ao sair da ficha. Nenhuma parte do layout, posicionamento ou cor dos blocos depende dessa cena.

## Editor inline de Regras

Lápis e Escrever conteúdo transformam o próprio artigo em editor visual. Novos capítulos e novos tópicos filhos também são criados no artigo, com título e status no cabeçalho. Salvar aplica o rascunho ao conjunto; Cancelar descarta a cópia sem alterar o tópico. A navegação interna pede uma decisão inline se houver alterações pendentes. Salvar regras continua sendo o download do conjunto completo.

O editor usa Tiptap/ProseMirror com negrito, itálico, sublinhado, riscado, destaque, cabeçalhos 2–4, listas, listas numeradas, citações, código inline, blocos de código e links. No desktop, botão direito, Shift+F10 e Ferramentas do texto abrem o menu. O menu respeita o viewport visual e mantém a seleção para as ações. Desfazer e refazer usam o histórico do documento.

No celular e em telas touch, a edição do conteúdo usa uma barra de formatação com botões de 44 px acima da borda inferior do viewport visual. Ela acompanha `VisualViewport.resize/scroll`, redimensionamento da janela, orientação e, quando disponível, a geometria de teclados sobrepostos. Não altera `overlaysContent` e não força abrir/fechar o teclado. Botões frequentes ficam em uma faixa rolável; Mais reúne blocos, cabeçalhos, links, desfazer/refazer e demais ferramentas existentes. Os mesmos comandos do editor são reutilizados. O toque nos botões preserva foco, teclado e seleção; o bookmark é capturado da seleção DOM atual e mapeado durante mudanças do documento. Há espaço reservado sob o conteúdo e o caret é mantido acima da barra.

A validação desta interface usou viewport responsivo em retrato/paisagem e teclado simulado (abertura, fechamento e pan), com geometria também coberta por testes. Seleção, formatos, links e clipboard foram exercitados no navegador. Não houve validação em aparelho Android físico.

O toque prolongado no conteúdo não abre mais um menu próprio. Toque/caneta mantêm o menu nativo, com copiar, colar, recortar e selecionar tudo; a chamada nativa de seleção não é suprimida pelo CSS. Mouse continua com o menu desktop mesmo em uma janela estreita. Título e status continuam editáveis na página.

Marcadores de sintaxe são decorações visuais calculadas exclusivamente pela seleção de texto colapsada: só o trecho com o cursor recebe os delimitadores. Eles não dependem de hover, não entram no documento ou no arquivo e somem ao sair do trecho ou do foco do editor. Leitura usa um renderer React de nós permitidos, sem inserir HTML importado.

As fronteiras visuais consultam as marcas dos dois lados do caret, inclusive links não inclusivos, sem usar essas marcas para forçar o estilo da próxima digitação. Um espaço na borda direita termina somente as formatações que acabam ali; o espaço e a continuação são inseridos fora dessas marcas. Espaços dentro do trecho mantêm sua formatação, e marcas externas que continuam depois da borda permanecem. Os widgets não herdam estilos, não capturam cliques e aceitam a posição nativa de seleção dos dois lados; a atualização das decorações não move a seleção nem recarrega o documento. Há testes de fronteiras, continuidade, marcas sobrepostas, links distintos, desfazer/refazer e composição, além da validação no navegador com espaço, clique e setas nos oito tipos de marca inline.

Cabeçalhos dentro do conteúdo criam âncoras estáveis, independentes do texto do título. O seletor de links internos busca tópicos, tópicos filhos e cabeçalhos do próprio conjunto; links abrem o tópico e focam/rolam até a âncora exata. Referências a destinos removidos continuam no arquivo e aparecem como indisponíveis para que possam ser corrigidas.

O formato `.regras` continua em v1. O campo opcional `document` guarda a árvore de formatação; `content` permanece como texto simples compatível com os arquivos anteriores. A importação remapeia referências entre tópicos e mantém as âncoras. Limites: 50.000 caracteres e 250 KB de JSON por tópico; os limites anteriores do conjunto permanecem. URLs são restritas a HTTP, HTTPS e mailto; tipos e atributos do documento são validados. A colagem remove conteúdo ativo antes de passar pelo esquema do editor.

A orientação inicial do editor aparece como placeholder cinza dentro da área de escrita vazia. Ao digitar, ela desaparece; ao apagar ou desfazer todo o conteúdo, reaparece. Não faz parte do documento salvo nem ocupa um bloco separado acima do conteúdo. As ferramentas desktop e a barra mobile continuam funcionando.

## Ficha-modelo vinculada ao sistema

Cada conjunto pessoal pode ter nenhuma ou uma ficha-modelo opcional em `sheetTemplate`. Regras oferece criar no editor existente, vincular um arquivo `.ab10`/`.json` compatível ou vincular uma cópia de um personagem desta página. Trocar ou desvincular o modelo não altera personagens existentes. O AB10 mantém a proteção de conjunto fixo para consulta; não é criada uma ficha oficial inventada para ele.

O fluxo Regras → Abrir ficha do sistema no editor mantém um rascunho de modelo separado da ficha de personagem e da lista de personagens recentes. Salvar modelo valida e copia o rascunho para o conjunto; o restante do editor é o mesmo, incluindo abas, mapa livre/grade, campos, detalhes, comparativos, dependências e rolagens. Exportar ficha oferece JSON ou Super PNG nesse contexto; Salvar modelo mantém a ação de atualizar o vínculo. Voltar às regras conserva o rascunho; descartar restaura o modelo salvo. Trocar de ficha com alterações pendentes exige salvar ou descartar, e exportar o conjunto com modelo pendente é bloqueado com uma explicação.

Criar personagem nas Regras pré-seleciona o modelo daquele conjunto. Criar ficha também permite escolher Ficha em branco ou qualquer modelo disponível. Cada personagem ganha uma cópia completa com novos IDs, remapeando as referências entre abas, campos, máximos e fórmulas; nem os valores nem os objetos do modelo são compartilhados. Edições posteriores do modelo não atualizam personagens já criados.

Salvar regras inclui automaticamente o modelo vinculado no mesmo `.regras` v1; Carregar regras restaura tudo sem uma segunda importação de ficha. Arquivos antigos sem modelo continuam válidos, e modelos de versões antigas de ficha usam a migração para a versão atual. O limite combinado do pacote permanece 5 MB, incluindo regras, logo e modelo. Um arquivo inválido ou grande demais não substitui o modelo atual. A cópia do sistema continua temporária na página de teste: é necessário baixar o `.regras` para conservar regras e modelo após recarregar.

## Dados por sistema

Editar sistema nas Regras inclui um catálogo opcional `dice`, versionado e discriminado por `kind`. Os tipos mantêm índices numéricos (`numeric`), com ID, nome e 2–1000 faces; até 24 tipos, sem ambiguidade de faces. d3, d14 e outros tamanhos podem ser adicionados e nomeados. O catálogo v4 aceita um mapa opcional de representações por face (`faces`), mantendo a leitura de catálogos v1, v2 e v3. A configuração mostra até 12 faces por página e permite saltar diretamente a qualquer índice, evitando renderizar mil formulários de uma vez. Cada face pode usar seu número original, texto de até 80 caracteres, símbolo/emoji de até 32 caracteres um dos ícones SVG disponíveis com nome acessível ou uma imagem PNG/JPG/WebP com descrição acessível. Restaurar números remove as sobrescritas. HTML não é interpretado.

As imagens de faces são enviadas individualmente, com limite de entrada de 8 MB. O navegador preserva a proporção, reduz para até 256 × 256 px e codifica em WebP, preservando transparência. Tenta qualidades decrescentes para ficar até 100 KB; rejeita o resultado se ultrapassar 150 KB. A prévia é centralizada com object-fit: contain. Cada imagem é incorporada no catálogo da face, sem URL externa, e acompanha os arquivos .regras e .ab10. O upload verifica o tamanho serializado do pacote completo antes de aceitar a imagem, incluindo a cota de 5 MB e a cópia de dados da ficha-modelo. Erros preservam a imagem anterior. Tipo, assinatura raster, tamanho e descrição também são validados na importação.

Os resultados internos e cálculos usam sempre o índice sorteado. Cada grupo de rolagem guarda uma cópia das representações correspondentes, para o histórico não mudar após editar as regras. As mesmas faces aparecem em rolagens avulsas, de campos, extras e feedback. Elas acompanham exportação/importação de regras, modelos e personagens, com cópias independentes. Dados com pesos ou resolvedores de resultados não numéricos podem receber outros tipos futuramente; mecânicas de sistemas como Assimilação não são inventadas.

Fichas v11 guardam em `system` o ID, nome e uma cópia completa do catálogo. O modelo, os personagens criados a partir dele e fichas em branco criadas para aquele sistema recebem esse contexto. Fichas existentes podem escolher um sistema no painel de lançamentos. Enquanto o conjunto está na página, apenas o contexto dos dados acompanha a configuração atual; valores, layout e campos continuam independentes. Salvar a ficha inclui o catálogo atual para funcionar sem reimportar as regras. Importar um pacote remapeia o vínculo do modelo para o novo ID do conjunto.

Atalhos, seletor de inserção de dados e presets de campos usam esse catálogo. Rolagens avulsas, de campo e extras validam todos os tipos antes de gerar qualquer resultado, com mensagem sobre dados não disponíveis e sem reescrever fórmulas existentes. Catálogo ausente preserva o comportamento e as fórmulas dos arquivos antigos. A proteção do AB10 fixo permanece.

A cor de cada bloco possui seletor nativo, campos HEX e RGB sincronizados e prévia imediata. Presets e Usar cor do tema são mantidos. Valores inválidos não alteram a última cor válida. Os SVGs reativos do d10, d12 e d20 usam arestas visíveis de um trapezoedro pentagonal, dodecaedro e icosaedro; d4, d6 e d8 preservam exatamente seus paths anteriores. A decoração reativa agora usa a cena de queda descrita acima. A barra compacta mantém todos os ícones da navegação centralizados no mesmo eixo da marca.

## Aparência

Somente a Visão geral possui uma camada decorativa estática atrás de todo o conteúdo: nove contornos de dados sem números, construídos em SVG inline com as mesmas seis geometrias usadas nos dados reativos. O d20 do hero também compartilha sua geometria. A composição assimétrica é recortada nas bordas, não intercepta cliques nem cria rolagem horizontal e não altera os painéis. O celular reorganiza e reduz os dados para sete; claro/escuro ajustam a opacidade e a cor deriva da paleta ativa. Não há imagens rasterizadas, animações, filtros ou dependências adicionais. O alto contraste do sistema omite a decoração. Os textos “INFINITAS POSSIBILIDADES”, “Seu universo em três caminhos” e “ESCOLHA POR ONDE COMEÇAR” foram retirados, mantendo os três cards e seus acessos. O rodapé institucional compartilhado também foi removido.

O botão Aparência no cabeçalho combina os modos claro e escuro com oito paletas: Floresta, Safira, Rubi, Ouro, Ametista, Âmbar, Prata e Grafite. Preferências em `ab10-appearance`, separadas das fichas. Rubi e Âmbar usam vermelho e laranja de saturação moderada, com barra lateral mais escura e superfícies suaves nos dois modos. O hero combina degradê linear com luz radial atrás da ilustração. Tokens semânticos controlam textos, superfícies, campos, bordas e botões em toda a interface.

O favicon preserva o símbolo original do dado, com oito SVGs de mesma geometria em `public/favicons`. A troca de paleta atualiza imediatamente o único link ativo `platform-favicon`, inclusive ao sincronizar preferências entre abas. Um bootstrap no `<head>` lê a preferência antes da hidratação e cria o link diretamente com a cor correta, sem pedir uma cor padrão intermediária. Preferência ausente, inválida ou storage bloqueado usa Floresta; sem JavaScript, o SVG original continua como fallback. Os modos claro/escuro conservam a mesma variação por paleta.

## Perfil e agenda

O canto superior direito abre o cadastro/login de teste com @ único e senha escolhida pelo usuário. A conta afeta somente o @ e a agenda. Contas e eventos expiram em duas horas e são apagados ao sair; fichas permanecem independentes, na memória da página.

A Agenda tem calendário mensal, filtros, busca, detalhes por dia e próximas sessões. One-shots ocorrem uma vez. Séries semanais, quinzenais ou mensais podem ter data final inclusiva; no mensal, o dia é ajustado para o último dia de meses menores. Edição e exclusão de séries afetam todas as ocorrências. Todos os horários seguem America/Sao_Paulo; sessões após a meia-noite mostram +1 dia.

Binding D1: `DB`. Migrações de esquema em `drizzle/`. Dados de teste locais não são publicados. A agenda exige sessão de teste válida e isola os dados por usuário.

## Versão e aviso de teste

O aviso grande de teste aparece somente na Visão geral. As páginas de Regras, PDFs, Ficha e Agenda conservam seus próprios conteúdos e deixam de repetir esse bloco. O aviso da home continua explicando a duração dos dados de teste.

A única versão armazenada da aplicação é `package.json#version`, com sufixo de pacote `.0`; `lib/site-version.ts` fornece a versão exibida como `0.x`. `node scripts/site-version.mjs --check` valida/exibe sem modificar. A próxima atualização publicada deve executar `node scripts/site-version.mjs` uma única vez, antes de checks/build, conforme `AGENTS.md`; novas tentativas da mesma publicação reutilizam esse valor. O incremento conserva a série `0.x`, inclusive de `0.99` para `0.100`. O lançamento `1.0` depende de instrução explícita do usuário. O contador interno das versões de hospedagem não define a versão mostrada no site.

## Desenvolvimento

Siga o workflow Sites. Manifesto em `.openai/hosting.json`, binding R2 `BUCKET`, integração de autenticação do Sites preservada.

Verificações:

```sh
node --experimental-strip-types --test tests/*.test.mjs
./node_modules/.bin/tsc --noEmit
```

O site preserva o acesso pelo link já autorizado, verifica a origem das mutações e bloqueia gravações públicas nos registros privados de regras/PDFs.

## Conexões entre blocos

O ícone de corrente junto à alça inicia a conexão. O usuário escolhe outro bloco na mesma aba; Cancelar ou Escape encerra a escolha. Conjuntos maiores se unem pela borda mais próxima, preservando os blocos intermediários. No Modo edição, as coordenadas originais permanecem intactas. No Modo ficha, apenas os blocos conectados encostam as bordas, conforme a direção e o deslocamento lateral definidos pelo mapa. Alturas reais, inclusive fracionárias, acompanham campos e textos de tamanhos diferentes. Cada bloco conserva campos, cores, imagem e configurações independentes. As propriedades listam as ligações e permitem desconectar.

A ficha v11 guarda uma árvore opcional de conexões (origem, destino, lado e deslocamento). A importação remapeia IDs, recusa ciclos, duplicatas, referências ausentes e ligações entre abas; v1–v10 continuam válidas sem exigir conexões. Mover um bloco atualiza sua relação; remover ou trocar de aba limpa apenas os vínculos envolvidos. Duplicar um bloco não copia ligações externas. Conexões acompanham modelos, personagens e pacotes, com cópias independentes.

A barra superior mantém sua posição sticky com fundo translúcido e desfoque de 28 px; as cores seguem os tokens de cada tema. Navegadores sem backdrop-filter usam um fundo opaco legível, e alto contraste usa Canvas. O antigo atalho isolado de modo claro/escuro deu lugar ao indicador PT (Português do Brasil). Os dois modos continuam disponíveis em Aparência, com as mesmas preferências salvas e o favicon por paleta.


## Super PNG (v0.27)

Salvar ficha e Salvar regras abrem o mesmo seletor de formato: JSON (`.json`)
ou Super PNG (`.png`). JSON continua sendo o backup técnico com os esquemas
existentes. Carregar mantém suporte aos arquivos legados `.ab10` e `.regras`.
A cota de dados continua sendo 5 MB por ficha ou conjunto; o contêiner PNG,
incluindo sua capa, pode ter até 16 MB.

A capa é gerada no navegador por Canvas 2D (900 × 1160), sem serviços externos:
polaroide para personagem, usando a primeira imagem da ficha ou uma silhueta;
manual para conjunto, com logo opcional ou ícone de livro. Nome completo,
sistema quando disponível e cores do conteúdo/paleta identificam o arquivo.
Imagens usam ajuste proporcional. Nomes extensos são quebrados por palavras,
reduzidos e, no limite da capa, abreviados visualmente; os dados continuam completos.

O PNG segue a especificação W3C (https://www.w3.org/TR/png/#11iTXt): um único
chunk `iTXt` UTF-8 não comprimido, após IDAT e antes de IEND, usa a palavra-chave
`ANTROPOLOGO RPG`. Envelope `antropologo-super-png` v1 com `kind`
(`character`/`ruleset`), `name`, `payload` (JSON serializado) e
`integrity: {algorithm: "CRC32", checksum: "<8 caracteres hex>"}`.
O checksum cobre exatamente o JSON UTF-8 de `{kind,name,payload}`, nessa ordem.
Todos os chunks PNG também têm seus CRCs validados. Isso detecta corrupção
acidental; não representa assinatura, autenticação ou proteção contra adulteração
intencional com recálculo dos checksums.

A importação reconhece PNG pela assinatura binária, verifica tamanho, estrutura,
CRCs, unicidade dos metadados, versão, tipo/nome e checksum. Depois usa os mesmos
validadores/migrações da importação JSON, remapeando juntos campos, conexões,
links de tópicos e vínculos do modelo. PNG comum e arquivos corrompidos recebem
mensagens distintas, sem substituir o conteúdo atual. Regras e Ficha aceitam
soltar arquivos, detectam o tipo e encaminham para a área correta. A importação
de ficha-modelo também aceita PNG. Alterações pendentes conservam as proteções
existentes antes da troca de conteúdo.

O recibo da importação mostra Super PNG, tipo, nome e integridade válida.
Compartilhe o arquivo original: screenshots e aplicativos que recodificam imagens
podem remover o chunk de dados, mantendo apenas a capa.

Validação: 207 testes (incluindo ida e volta de fichas/sistemas completos,
compatibilidade, cotas, corrupção de payload com CRC do chunk recalculado,
versões futuras, tipos inconsistentes, metadados duplicados e PNG comum),
TypeScript, build e fluxo no navegador.


## Resultados configuráveis e Roll and Keep (v0.29)

Editar sistema → Dados do sistema reúne interpretação numérica/simbólica,
ordenação, Roll and Keep e o catálogo de símbolos. Até 32 categorias por sistema,
com nome e texto, emoji, ícone ou imagem. Imagens usam o mesmo preparo existente
(até 256 px, objetivo de até 100 KB e máximo de 150 KB), com a cota combinada do
sistema e modelo verificada antes do upload ser aceito.

O catálogo `DiceSet` v5 lê v1–v4. Faces podem ser `blank`, `number` ou `symbols`,
além das representações anteriores. Uma combinação usa `symbols: [{symbolId,
count}]`, com até 100 ocorrências na face. Textos, imagens e ícones também podem
ter `outcome` explícito (`empty`, `number` ou `symbols`) e qualquer face pode ter
`priority` opcional. O índice sorteado permanece separado, em `groups[].results`
e `resolution.dice[].faceIndex`. Não há reconhecimento automático de símbolos
por texto ou pixels.

Sem configuração de interpretação, arquivos anteriores conservam a soma dos
índices e a apresentação antiga. Em interpretação simbólica, faces sem resultado
configurado não viram números. Faces vazias nunca recebem o índice como valor.
Um número próprio, incluindo zero ou negativo, tem interpretação explícita.
A prioridade não compõe a pontuação nem a contagem de categorias.

`resolution` define `method`, `order` (`original`, `best`, `worst`) e o opcional
`keep: {count}`. Nas Regras existem somente **Ativar Roll and Keep** e
**Máximo de dados mantidos** (1–100). Os flags v4 `manual`/`auto` são lidos sem
erro e descartados na normalização. Quando ativo, o jogador sempre começa sem
escolhas e marca/desmarca por clique, toque ou teclado. Não existe seleção
automática, quantidade pré-selecionada ou seletor de limite nos Lançamentos,
nas ações programadas ou nos campos.

O indicador `Dados mantidos: 2/4` apenas informa o máximo definido no sistema,
inclusive se a reserva rolada for menor. Ao atingir o máximo, outros dados ficam
desabilitados; é preciso desmarcar um antes de escolher outro. Nenhuma escolha
anterior é substituída. Ordenar por maior/menor prioridade mantém os mesmos IDs
selecionados, com desempate estável. Sem prioridade, conserva-se a ordem original;
nunca se presume classificação pelo índice da face.

A ficha v13 lê v1–v12. Os antigos `keep?: number | "all"` continuam no backup,
mas não comandam o motor a partir de uma ficha. Limites especiais já presentes
em uma **ficha-modelo oficial** são migrados para `resolution.actionLimits` no
catálogo do sistema. Campo/ação recebe `systemActionId` estável, preservado nas
cópias e na importação, que consulta exclusivamente esse catálogo. Uma ação
não registrada herda o máximo normal. Desativar Roll and Keep desativa também
esses limites de seleção. `all` legado de uma ação oficial significa capacidade
para todos os dados, ainda com escolha manual. Isso preserva a extensão para
habilidades futuras sem criar automação de recursos ou controles livres na ficha.

A rolagem guarda um retrato de cada índice, conteúdo, prioridade e representação
de categoria. Selecionar reavalia esse retrato sem nova aleatoriedade, sem
alterar rolagens anteriores e sem disparar novas quedas. A contagem considera
somente mantidos; descartados seguem visíveis. O histórico conserva a escolha,
a ordem de exibição e os totais numéricos/categóricos da rolagem, inclusive
imagens anteriores a uma edição posterior do sistema. Como antes, o histórico
é temporário e não integra o backup da ficha.

Fórmulas numéricas mantêm operadores, variáveis e quantidades calculadas.
Operações com categorias são reservas somadas com `+`; multiplicar, dividir ou
subtrair símbolos não tem semântica presumida e recebe mensagem para ajustar a
fórmula. Cálculos numéricos na quantidade continuam disponíveis. Dados numéricos
que determinam uma quantidade são identificados como controles, não consomem o
limite de mantidos e mantêm sua função original. Um erro aritmético de seleção
fica corrigível sem lançar novamente.

JSON e Super PNG levam o catálogo, símbolos, imagens, vazios, prioridades,
interpretação, modelo, referências de ações e limites definidos pelo sistema. O envelope Super PNG v1 permanece o
mesmo; apenas os esquemas do conteúdo evoluem. A importação remapeia referências
de campos e modelos sem globalizar IDs de símbolos.

Não há regras ou rolador exclusivo de Assimilação embutidos. Os testes utilizam
a tabela d12 e os exemplos fornecidos no pedido. As prioridades de exemplo são
hipotéticas. O capítulo integral do Livro Básico não estava disponível em uma
fonte oficial aberta para auditoria nesta sessão.

Validação da v0.29: testes de regressão e migração, TypeScript, build e navegador.
Inclui seleção de 0 até o máximo, bloqueio sem substituir escolhas, ordenação
estável por identidade, prioridades fora da pontuação, fórmulas tradicionais,
símbolos/imagens/vazios, regras de ações oficiais, overrides antigos inativos e
round-trip JSON/Super PNG. A verificação de interface é registrada em
`docs/roll-keep-v029-qa.md`. Mobile é validado em viewports responsivos,
sem aparelho físico.


## Editor de sistemas por categorias (v0.30)

O formulário de criação/edição usa um único estado e os componentes existentes,
organizados em Geral, Regras de Dados e Configurações de Dados. No desktop,
menu lateral flutuante e painel principal; até 980 px, navegação superior; até
790 px, editor em tela cheia. Cabeçalho, categorias e rodapé ficam fora da
rolagem do conteúdo. As abas são acessíveis por toque, clique e setas/Home/End.

A opção Personalizar dados deste sistema controla o acesso à personalização
detalhada. Recolhê-la preserva o catálogo e não desativa nem muda a interpretação
dos dados já configurados. A categoria é ocultada sem desmontar seus controles.
O catálogo, símbolos, faces, imagens, prioridades e configurações mantêm os mesmos
esquemas. A preferência visual de recolhimento é guardada somente no estado da
biblioteca de regras durante a página e não entra no JSON/Super PNG.

Salvar funciona em qualquer categoria; erros de identificação ou de dados levam
à seção correspondente. Cancelar, fechar, Escape e sair da página protegem
alterações ainda não salvas. Uploads de logo, símbolo e face continuam usando os
preparadores, limites e verificações de cota existentes.

`useSystemEditorViewport` adapta a altura e o deslocamento ao VisualViewport.
Com teclado mobile e campo focado, recolhe a navegação temporariamente e rola
somente o conteúdo, quando necessário, para manter o campo visível. As ações
inferiores respeitam safe areas. Não há implementação de teclado virtual próprio.

Validação: 255 testes, TypeScript, build e navegador. Desktop claro/escuro;
viewports 320/390/759/900 px; teclado simulado em 400/300 px, sem aparelho físico.
O motor, os modelos, os formatos e os Lançamentos não foram modificados.
Detalhes em `docs/editor-sistemas-v030-qa.md`.


## Leitura e edição dos sistemas (v0.31)

A página de capítulos mantém cabeçalho, exportação e editor inline. No desktop,
informações do conjunto e ficha-modelo compartilham uma faixa compacta; o índice
permanece à esquerda. O gerenciamento do modelo abre somente quando solicitado,
preservando criar, abrir, vincular arquivo/ficha, substituir, desvincular e criar
personagem. Descrições reais são preservadas e ficam acessíveis em Sobre o sistema
no celular.

Até 790 px, a ordem visual é nome/estado/contagem, Editar sistema | Salvar regras,
ficha-modelo, Índice | Novo capítulo e conteúdo. O índice usa uma gaveta modal
nativa com busca, hierarquia e seleção atual. A lista possui rolagem própria,
bloqueia o fundo e fecha ao selecionar, pelo X, Escape, toque fora ou gesto na
alça. Selecionar posiciona o conteúdo; rascunhos continuam protegidos pelo aviso
existente. Sistemas vazios não montam um índice vazio. AB10 conserva as permissões
e reorganiza o espaço sem controles indisponíveis.

Não foram modificados o editor geral por categorias, o editor rico, motores,
esquemas ou formatos de importação/exportação. Validação: 255 testes de regressão,
TypeScript, build e navegação no navegador em desktop e viewports responsivos
320/390/759/900 px. Detalhes em docs/regras-leitura-v031-qa.md.
