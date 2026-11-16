# Super PNG — validação v0.27

- 207 testes passaram; TypeScript e diff check passaram.
- Downloads reais no Chromium: ficha JSON, ficha PNG, regras JSON e regras PNG.
- Os dados embutidos de cada PNG foram comparados por igualdade profunda com
  o JSON baixado da mesma origem: idênticos, incluindo IDs e referências.
- Ambos os PNGs abriram em um decodificador independente (Pillow): 900 × 1160 RGBA.
- Ficha reimportada pelo seletor: nome, imagem, valores compostos, dependência,
  comparativo, conexões e dado com imagem preservados.
- Sistema reimportado: tópicos ricos, links, dados, modelo e abertura direta no editor.
- Arquivo corrompido recusado na interface, com ficha-modelo atual preservada.
- Importação por drop exercitada em viewport estreita: ficha em Ficha e sistema
  em Ficha, com encaminhamento automático para Regras e recibo de integridade.
- Um tópico em edição com título alterado bloqueou a troca por drop; Continuar
  edição conservou o rascunho. O teste foi encerrado com Cancelar.
- Diálogo em 390 e 320 px (áreas úteis 375 e 305 px): sem overflow horizontal.
  Formatos e prévia se reorganizam para não criar colunas de texto estreitas.
- Ficheiros .ab10/.regras legados, PNG comum, corrupção no payload com CRC
  recalculado, duplicação de metadados, esquema futuro e limites cobertos por testes.
- Provas visuais: antropologo-super-png-ficha-v027.jpg,
  antropologo-super-png-regras-v027.jpg e antropologo-super-png-mobile-v027.jpg.

O teste mobile usa viewport de iframe, sem aparelho físico. O arquivo temporário
com o harness de drop foi removido antes do build e da publicação.
