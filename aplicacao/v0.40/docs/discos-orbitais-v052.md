# Discos de acreção da Home Orbital v0.52

A Home sorteia uma das quatro formas ao ser aberta em um novo documento.

| Variante | Composição |
| --- | --- |
| Espiral clássica | Três braços de filamentos finos e arco interno quente |
| Braços gêmeos | Dois braços mais abertos em lados opostos |
| Anéis concêntricos | Três faixas de gás com intervalos escuros |
| Crescente luminoso | Um arco interno destacado e filamentos externos difusos |

O sorteio acontece no cliente. A seleção fica em memória enquanto o documento existir, inclusive ao sair da Home e voltar. O `sessionStorage` guarda o último identificador da aba para que o próximo carregamento sorteie entre as outras três formas. Se o armazenamento estiver indisponível, as quatro formas ficam elegíveis em cada carregamento.

As formas são geradas em Canvas pelo mesmo renderizador, com a cor secundária nos filamentos e as duas cores na poeira. O redesenho por mudança de tamanho ou aparência reaproveita a mesma geometria. O compositor conserva as bandas radiais, a velocidade reduzida durante a seleção e o movimento reduzido do sistema. A geração continua usando a mesma resolução e o Worker nos caminhos já previstos.

## Validação

- O navegador exibiu as quatro formas em nove carregamentos consecutivos da prévia, sem repetição imediata.
- A forma permaneceu estável ao aplicar o modo claro, trocar a secundária de Menta para Cobre, alternar entre os modos Orbital e Clássico e selecionar Sistemas.
- A checagem TypeScript, o build e os 459 testes automatizados passaram. Os testes novos cobrem o sorteio, o armazenamento indisponível e a geometria estável ao recolorir.
