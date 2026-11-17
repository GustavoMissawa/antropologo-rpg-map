# Home Orbital v0.43

O disco reutiliza os filamentos procedurais e a poeira da Home em onze faixas
radiais com velocidades próprias. A região interna circula mais rapidamente,
enquanto a externa avança lentamente. A projeção elíptica e o centro do D20
seguem fixos. O núcleo permanece escuro nos dois modos de exibição.

Os quatro destinos recebem halo no hover ou foco. A ativação produz um anel,
uma cintilação e um pulso no único fio ativo, seguido da navegação em 140 ms.
Em movimento reduzido, a navegação é imediata e o disco fica estático.

## Demonstração

[Assistir ao vídeo do disco e das estrelas](disco-estrelas.mp4)

Vídeo de 12,7 segundos composto de capturas reais da prévia no Chromium,
preservando os intervalos de captura. Mostra fluxo automático, foco em
Fichas, PDFs e Agenda, troca rápida de destino, rotação direta do D20
pelo teclado e confirmação de Fichas com navegação. A exportação usa
20 quadros por segundo com repetição de quadros capturados.

## Modo escuro

![Ametista e Rosa](escuro-ametista-rosa.jpg)

![Floresta e Dourado](escuro-floresta-dourado.jpg)

## Modo claro

![Ametista e Rosa](claro-ametista-rosa.jpg)

![Safira e Ciano](claro-safira-ciano.jpg)

## Estrelas

![Sistemas em interação com uma conexão](estrela-sistemas-hover.jpg)

![Quadro da confirmação de Fichas antes da navegação](estrela-fichas-confirmacao.jpg)

As capturas são da aplicação executada em prévia. A validação incluiu os
quatro destinos reais, foco por teclado, rotação manual do D20 por mouse
e teclado, temas e paletas. TypeScript, build e 423 testes passaram.

Toque, movimento reduzido, pausa e cancelamento foram exercitados em
testes automatizados com DOM e relógio simulados. A ferramenta de navegador
disponível nesta execução não expôs emulação mobile ou de movimento
reduzido. A janela nativa auxiliar apresentou falha de captura gráfica.
A validação em aparelho físico e a medição de desempenho mobile ficam
pendentes.
