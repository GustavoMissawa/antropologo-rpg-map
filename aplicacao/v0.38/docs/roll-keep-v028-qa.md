# Validação v0.28

- 242 testes passaram, incluindo as 35 verificações novas e a suíte anterior.
- TypeScript e verificação de diff passaram.
- Editor: criado símbolo Eco, alterado para imagem, upload PNG otimizado em WebP,
  configurada ocorrência adicional na face e prioridade independente.
- Faces: vazio aceito; valor próprio 42 configurado sem confundir índice/prioridade.
- Campo: reserva 2d2 com keep=2 sobrescreveu o padrão keep=1 do sistema.
- Avulso: reserva 3d2 com keep=2 selecionou dois e descartou um. Manual,
  desmarcação, sugestão e mudança de ordem preservaram o resultado corretamente.
- Contagens observadas: dois ABBC mantidos geraram 2 sucessos, 4 adaptações,
  2 pressões; Eco foi contado somente quando presente nos mantidos.
- Seleções não adicionaram elementos ao fundo: contagem SVG antes/depois idêntica.
- Histórico mostrou índices nas descrições, todos os dados, seleção e totais.
- JSON e PNG reais baixados do editor foram comparados por igualdade profunda:
  conteúdo idêntico. PNG reimportado com quatro categorias, imagens,
  prioridades 12, face numérica 42, método simbólico, modelo v12 e override=2.
- Mobile: ficha JSON carregada sem o sistema aberto; seleção e desmarcação por
  controles nativos de clique, mesmo caminho de toque, sem hover. Alvos tinham
  mais de 100 px de altura; imagens carregaram. Viewports 390 e 320 sem overflow.
- Resposta mobile manteve margem de 12 px, cabeçalho visível durante a rolagem
  do painel e uma única rolagem vertical para a lista de dados.
- Ficha de faces vazias: botões sem texto numérico no miolo, zero categorias,
  resultado "Sem resultado" após manter um dado.
- Tradicional: 2d6+3 observou faces 1/1 e total 5, sem ferramentas simbólicas.
- Limpar histórico exibiu quatro elementos na animação de saída antes de zerar.
- Capturas: antropologo-roll-keep-desktop-v028.jpg e
  antropologo-roll-keep-mobile-v028.jpg.

O harness mobile temporário foi removido antes do build. Não houve teste em
aparelho físico. As regras do Livro Básico não foram obtidas integralmente;
a validação da conversão utiliza o anexo fornecido pelo usuário.
