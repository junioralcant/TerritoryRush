---
name: task-review
description: Revisa tasks concluídas usando o fluxo padrão de code review do projeto, com foco em qualidade de código, aderência ao Tech Spec, cobertura de testes e geração de artefato de review em Português (Brasil). Use quando uma task implementada via executar-task precisar de validação final. Não use para implementar código, QA exploratório ou correção de bugs.
---

# Task Review

## Instrução Principal

Siga integralmente o workflow definido na skill `executar-review`.

## Procedimento

1. Leia `../executar-review/SKILL.md` e execute todas as etapas obrigatórias.
2. Trate a revisão como validação de uma task recém-concluída, considerando:
   - aderência ao escopo da task;
   - conformidade com o PRD e Tech Spec;
   - qualidade do código, testes e riscos de regressão.
3. Gere o artefato final de review em Português (Brasil).
4. Mantenha exemplos de código, comandos e identificadores técnicos em inglês quando fizer sentido.

## Critérios de Saída

- A review deve classificar o resultado como `APPROVED`, `APPROVED WITH OBSERVATIONS` ou `REJECTED`.
- Toda crítica deve ser objetiva e incluir impacto e sugestão de correção.
- Se testes ou typecheck falharem, a review deve ser `REJECTED`.

## Geração de Mensagem de Commit (obrigatório quando APPROVED ou APPROVED WITH OBSERVATIONS)

Ao finalizar a review com resultado `APPROVED` ou `APPROVED WITH OBSERVATIONS`, execute obrigatoriamente os passos abaixo para gerar a mensagem de commit da task.

### Passo 1 — Coletar contexto

Execute em paralelo:
- `git diff --stat HEAD` para listar os arquivos alterados e o volume de mudanças.
- `git status --short` para identificar arquivos novos não rastreados.
- `git log --oneline -5` para entender o padrão de mensagens de commit do projeto.

### Passo 2 — Montar a mensagem

Com base nos arquivos alterados e no escopo da task, gere uma mensagem de commit seguindo o padrão do projeto (Conventional Commits):

```
<tipo>(<escopo>): <resumo em português, imperativo, até 72 chars>

<corpo opcional: o que mudou e por quê, sem descrever o óbvio>
```

Regras:
- `tipo`: `feat`, `fix`, `refactor`, `test`, `chore` conforme a natureza da mudança.
- `escopo`: módulo ou área afetada (ex.: `sdk`, `acquisition`, `passengers`, `store`).
- Resumo em português, voz imperativa, sem ponto final.
- Corpo apenas quando necessário para contextualizar decisões não óbvias.
- Não mencionar nomes de arquivos individualmente no resumo.
- Não incluir `Co-Authored-By` — isso é responsabilidade do comando de commit.

### Passo 3 — Apresentar ao usuário

Exiba a mensagem de commit formatada em um bloco de código para que o usuário possa copiá-la ou aprová-la antes de commitar.
