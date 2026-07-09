---
model: opus
---

# Planejamento de Funcionalidade (Feature Planning)
 
Crie um novo plano em `.claude/sessions/*.md` para implementar a `Feature` utilizando exatamente o formato markdown `Plan Format` especificado abaixo. Siga as `Instruções` para criar o plano e use os `Arquivos Relevantes` para focar nos arquivos corretos.
 
## Instruções
 
- Você vai receber o requeriment atraves de um card do TargetProcess ou diretamente do comando do usuário via argumentos.
- Você está escrevendo um plano para implementar uma funcionalidade completamente nova que agregará valor à aplicação.
- Crie o plano no arquivo `.claude/sessions/*.md`. Dê um nome adequado com base na `Feature`.
- Use o `Plan Format` abaixo para estruturar o plano.
- Pesquise o código-fonte para entender os padrões, arquitetura e convenções existentes antes de planejar a funcionalidade.
- IMPORTANTE: Substitua todos os <placeholder> do `Plan Format` pelos valores solicitados. Adicione o máximo de detalhes necessários para implementar a funcionalidade com sucesso.
- Use seu modelo de raciocínio: PENSE COM ATENÇÃO sobre os requisitos da funcionalidade, design e abordagem de implementação.
- Siga os padrões e convenções já existentes no código. Não reinvente a roda.
- Planeje pensando em extensibilidade e facilidade de manutenção.
- Se precisar de uma nova biblioteca, use `uv add` e não deixe de relatá-la na seção `Notas` do `Plan Format`.
- Respeite os arquivos solicitados na seção `Arquivos Relevantes`.
- Comece sua pesquisa lendo o arquivo `README.md`.
 
 
## Formato do Plano
 
```md
# Funcionalidade: <nome da funcionalidade>
 
## Descrição da Funcionalidade
<descreva a funcionalidade em detalhes, incluindo seu propósito e o valor que ela traz aos usuários>
 
## História de Usuário
Como <tipo de usuário>
Eu quero <ação/objetivo>
Para que <benefício/valor>
 
## Declaração do Problema
<defina claramente o problema específico ou oportunidade que esta funcionalidade resolve>
 
## Declaração da Solução
<descreva a abordagem proposta da solução e como ela resolve o problema>
 
## Arquivos Relevantes
Use estes arquivos para implementar a funcionalidade:
 
<encontre e liste os arquivos relevantes para a funcionalidade; explique por que são relevantes em bullet points. Se forem necessários novos arquivos para implementar a funcionalidade, liste-os em uma seção h3 chamada 'Novos Arquivos'.>
 
## Plano de Implementação
### Fase 1: Fundação
<descreva o trabalho fundamental necessário antes de implementar a funcionalidade principal>
 
### Fase 2: Implementação Principal
<descreva o trabalho principal de implementação da funcionalidade>
 
### Fase 3: Integração
<descreva como a funcionalidade será integrada às funcionalidades existentes>
 
## Tarefas Passo a Passo
IMPORTANTE: Execute cada passo na ordem, de cima para baixo.
 
<liste as tarefas passo a passo usando cabeçalhos h3 + bullet points. Use quantos cabeçalhos h3 forem necessários. A ordem é importante: comece com as alterações compartilhadas/fundamentais e depois passe para a implementação específica. Inclua a criação de testes ao longo de todo o processo. O último passo deve ser executar os `Comandos de Validação` para confirmar que a funcionalidade funciona corretamente sem regressões.>
 
## Estratégia de Testes
### Testes Unitários
<descreva os testes unitários necessários para a funcionalidade>
 
### Testes de Integração
<descreva os testes de integração necessários para a funcionalidade>
 
### Casos de Borda
<liste os casos de borda que precisam ser testados>
 
## Critérios de Aceitação
<liste critérios específicos e mensuráveis que devem ser atendidos para considerar a funcionalidade concluída>
 
## Comandos de Validação
Execute todos os comandos para validar que a funcionalidade funciona corretamente sem regressões.
 
<liste os comandos que você usará para validar com 100% de confiança que a funcionalidade foi implementada corretamente e sem regressões. Todos os comandos devem executar sem erros; seja específico sobre o que deseja rodar para validar o comportamento esperado. Inclua comandos que testem a funcionalidade de ponta a ponta.>
- Exemplo:`cd app/server && uv run pytest` – Executa os testes do servidor para validar a funcionalidade sem regressões
 
## Esclarecimentos Necessários
<opcionalmente liste quaisquer dúvidas ou esclarecimentos necessários para projetar corretamente a funcionalidade. Um desenvolvedor responderá no momento adequado. Se o usuário responder suas perguntas, você deverá atualizar a documentação.>
 
## Notas
<opcionalmente liste notas adicionais, considerações futuras ou contexto relevante para a funcionalidade que será útil ao desenvolvedor>