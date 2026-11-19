# Primeiros Passos na Home Orbital v0.49

A mudança parte da publicação 119. A versão da aplicação segue em 0.49.

| Momento | Condição | Resposta da interface |
| --- | --- | --- |
| Sinal de Entrada | Visitante anônimo e 30 s de inatividade na Home | O avatar de Entrar recebe dois pulsos suaves e um brilho discreto. |
| Configurações | O cadastro Orbital retorna com a conta autenticada | O diálogo existente substitui o formulário de cadastro. |
| Sistemas | Configurações fechadas, destino ainda desconhecido e 30 s de inatividade na Home | O nó Sistemas brilha. Os demais destinos continuam disponíveis. |
| Disco | Sistemas expandido, disco ainda desconhecido e 10 s de inatividade | O disco ganha brilho e chega gradualmente a duas vezes a velocidade do estado expandido. |
| Retorno | Clique no disco ou ativação pelo teclado | A navegação existente retorna à Home e registra a descoberta. |

Os destaques somem com atividade significativa, mudança de contexto ou perda
de foco. Cliques, rolagem, digitação, entrada em nós orbitais e movimento
intencional sobre o controle do dado encerram ou reiniciam a espera enquanto
uma etapa estiver pendente. A aba precisa estar visível e em foco. Abrir outro
painel ou sair do destino cancela a espera corrente e preserva o progresso.
A contagem volta a partir de uma nova janela de inatividade quando elegível.

O botão de retorno tem a área elíptica do disco e fica atrás do controle do
dado na ordem de pintura. O clique externo e Escape continuam disponíveis no
modo expandido. A aceleração usa o relógio do fluxo orbital com o mesmo
amortecimento da navegação. A preferência de movimento reduzido mantém os
destaques estáticos e o compositor pausado.

## Persistência

- `antropologo-orbital-entry-seen` guarda apenas a dispensa ou apresentação do
  Sinal de Entrada no navegador.
- A migração aditiva `0002_first_steps.sql` cria `demo_first_steps`. O cadastro
  grava a linha na mesma transação que cria a conta e a sessão. Contas criadas
  antes da migração seguem sem integração.
- Os estágios ficam pendentes, apresentados, concluídos ou descobertos
  espontaneamente. Visitar Sistemas ou usar o disco conta mesmo antes do
  respectivo destaque. Descobertas anônimas vivem na memória da aba e só são
  transferidas no cadastro iniciado ali.
- `/api/auth/first-steps` resolve a conta pelo cookie da sessão. Atualizações
  condicionais impedem que duas abas reservem o mesmo destaque. Reabrir a
  página ou entrar com outra sessão da mesma conta recupera o progresso.
- A conta de teste continua expirada em duas horas ou excluída ao acionar
  Sair. A exclusão remove o progresso em cascata. Um novo cadastro com o mesmo
  @ recebe outra identidade e começa com o próprio progresso.

## Validação

- A prévia com o Worker e D1 locais exibiu o Sinal de Entrada após a espera.
  Abrir o perfil apagou o sinal e Fichas continuou acessível como visitante.
- Uma conta descartável criada pelo formulário real abriu as Configurações
  automaticamente. O diálogo permitiu escolher modo claro, Rubi e Ciano.
  As preferências persistiram após recarregar. O destaque de Sistemas apareceu
  em cerca de 30 s e foi encerrado ao escolher Fichas.
- Em Sistemas, rolar o dado manteve o destino expandido. O destaque do disco
  apareceu em cerca de 10 s e um clique direto na área luminosa retornou à Home.
  A aba autenticada recarregou sem reabrir Configurações ou repetir as pistas.
  O D1 local registrou os três estágios como concluídos.
- A suíte verifica a ordem e a descoberta espontânea das etapas, a aceleração
  progressiva do disco, o controle de origem, a concorrência entre sessões,
  contas antigas, novo login na mesma conta e a exclusão do progresso no logout.
  O fluxo de cadastro no navegador usou a base de teste local.
