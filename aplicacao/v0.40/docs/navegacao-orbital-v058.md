# Navegação Orbital 2.0 · v0.58

## Base verificada

A publicação 131 do ChatGPT Sites usava `b31b6c721fd60b44d4fcc3239f6ce71dca04340f`. No GitHub, a branch de desenvolvimento correspondente apontava para `a3025807aa4a18917dd49d4854ba4f6588db34af`. Os 464 arquivos da aplicação em comum tinham o mesmo conteúdo e modo de arquivo. O checkout do Sites também continha as ferramentas de design de `.agents`.

## Rotas e edição

| Destino | URL |
| --- | --- |
| Biblioteca de sistemas | `#regras` |
| Mapa de um sistema | `#regras/<sistema>` |
| Capítulo ou subseção | `#regras/<sistema>/topico/<tópico>` |
| Cabeçalho em um tópico | `#regras/<sistema>/topico/<tópico>/secao/<cabeçalho>` |
| Biblioteca e editor de personagens | `#ficha` e `#ficha/personagem/<id>` |
| PDFs e Agenda | `#pdfs` e `#agenda` |

`lib/platform-navigation.ts` compartilha a interpretação dos endereços entre Orbital e Clássico. `app/page.tsx` atualiza a URL e entrega o destino à biblioteca. O leitor resolve IDs depois de carregar a sessão, mantém o índice original e leva o foco à âncora quando ela existe. Um tópico removido é sinalizado e a leitura disponível continua acessível. Os endereços de prévias da Home continuam aceitos para links existentes. Os atalhos atuais da Agenda abrem o calendário diretamente.

O editor mantém a confirmação ao navegar por dentro de Sistemas com rascunho. Para Voltar e Avançar entre entradas do mesmo documento, o roteador retorna à entrada em edição e preserva a entrada anterior. A proteção nativa ao sair da página também cobre rascunhos de tópicos. Trocar o estilo da interface continua usando a mesma instância do editor e a mesma URL de leitura.

## Sistema planetário

`lib/orbital-system.ts` deriva uma semente versionada dos IDs já salvos do sistema e de cada tópico. Cada capítulo cria um planeta com órbita própria. Qualquer descendente cria uma lua na órbita do capítulo raiz, incluindo subseções com vários níveis. A ordem e a hierarquia do documento continuam sendo controladas pela biblioteca de regras. O AB10 tem cinco planetas e três luas no capítulo de criação de personagem.

Raios, ângulos, cores, anéis, crateras, bandas e fraturas dependem dessas sementes. Renomear, reordenar, inserir ou remover capítulos preserva a posição dos outros. A aparência global afeta os controles e o leitor. A estrela e os corpos celestes mantêm suas cores quando a aparência global muda. Importar um conjunto como nova cópia segue a regra existente de gerar novos IDs, o que dá à cópia um sistema astronômico próprio.

O mapa usa SVG procedural e oferece alvos no céu da visão geral, links na faixa de destinos e o índice hierárquico. Para sistemas grandes, cada panorama desenha até 16 corpos orbitantes de cada vez, preservando o corpo selecionado. Os links e o índice atendem todos os tópicos. A vista de leitura usa um panorama mais baixo e mantém o conteúdo e o editor fora da camada animada.

## Deslocamento e outros ambientes

| Relação espacial | Movimento |
| --- | --- |
| Duas luas do mesmo planeta | Arco orbital com interpolação de ângulo e raio |
| Pontos próximos do mesmo sistema | Deslocamento lateral |
| Pontos distantes ou ambientes distintos | Afastamento, passagem de estrelas e aproximação |

`OrbitalSpace` recebe um plano de movimento a partir das posições dos destinos. A URL e o conteúdo se atualizam na seleção. A animação só manipula transformação e opacidade de camadas decorativas e pode ser cancelada quando o destino muda, a aba perde visibilidade ou o movimento reduzido é ativado. O plano aceita novos ambientes por identificador, permitindo que o Workshop use a mesma infraestrutura quando ganhar sua própria rota.

O cometa dos PDFs preserva o núcleo no centro e move dois trechos contínuos de estrelas ao fundo. A deriva pausa fora da área visível ou com movimento reduzido. Busca, categorias, visualizador e arquivos da biblioteca usam os fluxos existentes.

O catálogo de fichas mostra retrato ou silhueta, nome e sistema vinculado. A abertura encaminha diretamente ao editor existente, por clique ou teclado. A Agenda usa a rota direta nos atalhos atuais. A ambientação e a rolagem da Home continuam com seu renderizador procedural.

## Verificação

- Suíte de regressão com cobertura de IDs estáveis, profundidade documental, URLs, três deslocamentos, retomada do histórico, rascunhos, movimento reduzido, fichas, PDFs e Agenda.
- Chromium em desktop e em viewport de 390 px. Verificados o mapa clicável, passeio lunar, deslocamento lateral, salto, Voltar e Avançar, foco em leitura, índice móvel e ausência de rolagem horizontal. Tema claro e Clássico preservaram o tópico atual. A astronomia manteve exatamente a mesma geometria na troca de tema.
- Medição isolada de geração e planejamento, com 800 amostras após aquecimento em Node. AB10 obteve mediana de 0,013 ms e P90 de 0,086 ms. O cenário de 300 tópicos obteve mediana de 0,110 ms e P90 de 0,281 ms. O teste mede o cálculo inicial em CPU. A inspeção no Chromium verificou o comportamento das transições e do cometa.
