---
model: opus
---

# Planejamento de Bug

Crie um novo plano em .claude/sessions/*.md para resolver o `Bug` usando exatamente o formato markdown `Plan Format` especificado. Siga as `Instruções` para criar o plano e utilize os `Arquivos Relevantes` para focar nos arquivos corretos.
 
## Instruções

- Você vai receber um Bug atraves de um card do TargetProcess ou diretamente do comando do usuário via argumentos. 
- Você está escrevendo um plano para resolver um bug; ele deve ser completo e preciso para que possamos corrigir a causa raiz do problema e evitar regressões.
- Crie o plano no arquivo `.claude/sessions/*.md`. Dê um nome adequado com base no `Bug`.
- Use o formato de plano abaixo para criar o plano.
- Pesquise o código-fonte para entender o bug, reproduzi-lo e montar um plano para corrigi-lo.
- IMPORTANTE: Substitua todos os <placeholder> no `Plan Format` pelo valor solicitado. Adicione o máximo de detalhes necessários para corrigir o bug.
- Use seu modelo de raciocínio: PENSE COM MUITO CUIDADO sobre o bug, sua causa raiz e os passos para corrigi-lo corretamente.
- IMPORTANTE: Seja cirúrgico na correção do bug, resolva apenas o bug em questão e não se desvie do foco.
- IMPORTANTE: Queremos o menor número possível de alterações que resolvam e abordem o bug.
- Não utilize decoradores. Mantenha simples.
- Se precisar de uma nova biblioteca, use `uv add` e não deixe de relatá-la na seção `Notes` do `Plan Format`.
- Respeite os arquivos solicitados na seção `Relevant Files`.
- Comece sua pesquisa lendo o arquivo `README.md`.
 
 
## Formato do Plano
 
```md
# Bug: <nome do bug>
 
## Descrição do Bug
<descreva o bug em detalhes, incluindo sintomas e o comportamento esperado versus o real>
 
## Declaração do Problema
<defina claramente o problema específico que precisa ser resolvido>
 
## Declaração da Solução
<descreva a abordagem proposta para corrigir o bug>
 
## Passos para Reproduzir
<liste os passos exatos para reproduzir o bug>
 
## Análise da Causa Raiz
<analise e explique a causa raiz do bug>
 
## Arquivos Relevantes
Use estes arquivos para corrigir o bug:
 
<encontre e liste os arquivos relevantes para o bug; descreva por que são relevantes em bullet points. Se forem necessários novos arquivos para corrigir o bug, liste-os em uma seção h3 chamada 'Novos Arquivos'.>
 
## Tarefas Passo a Passo
IMPORTANTE: Execute cada passo em ordem, de cima para baixo.
 
<liste as tarefas passo a passo como cabeçalhos h3 + bullet points. Use quantos cabeçalhos h3 forem necessários para corrigir o bug. A ordem importa: comece pelas alterações fundamentais/compartilhadas necessárias para corrigir o bug e depois passe para as alterações específicas. Inclua testes que validarão que o bug foi corrigido sem regressões. Seu último passo deve ser executar os `Comandos de Validação` para confirmar que o bug foi corrigido sem regressões.>
 
## Comandos de Validação
Execute todos os comandos para validar que o bug foi corrigido sem regressões.
 
<liste os comandos que você usará para validar com 100% de confiança que o bug foi corrigido sem regressões. Cada comando deve executar sem erros, portanto seja específico sobre o que deseja executar para validar a correção. Inclua comandos para reproduzir o bug antes e depois da correção.>
- Exemplo:`cd app/server && uv run pytest` - Executa os testes do servidor para validar que o bug foi corrigido sem regressões
 
## Notas
<opcionalmente liste quaisquer notas ou contexto adicionais relevantes para o bug que serão úteis ao desenvolvedor>