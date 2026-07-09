---
name: iniciar-card
description: Prepara o ambiente para começar a implementar um card. Recebe a chave/número do card (ex.: CDQED-274), busca os detalhes no Jira via MCP (título, descrição, critérios de aceite, status), roda git fetch --prune para atualizar as refs e faz checkout na branch correspondente ao card. Use quando o usuário informar um número de card e quiser iniciar o trabalho/implementação. Não use para abrir PR (use abrir-pr), criar cards no Jira ou fazer code review.
---

# Iniciar Card

Prepara o repositório para começar a implementar um card: traz o contexto do Jira, atualiza as refs e posiciona o usuário na branch certa.

## Constantes

Referência em `references/constants.md` (cloudId do Jira, base do Jira, padrões de branch). Ler ao buscar o card e ao localizar a branch.

## Procedimento

### 1. Resolver a chave do card
1. Usar a chave informada pelo usuário (ex.: `CDQED-274`).
2. Se vier só o número (ex.: `274`), inferir o prefixo do projeto a partir das branches existentes (`git branch -a`) ou da branch atual; havendo dúvida, **perguntar** o prefixo ao usuário.
3. Validar que a chave tem o formato `[A-Z]+-\d+` antes de seguir.

### 2. Buscar o card no Jira
1. Determinar o `cloudId`: usar o de `references/constants.md` como padrão. Se a chamada falhar ou o valor for desconhecido, resolver dinamicamente via `mcp__claude_ai_Atlassian__getAccessibleAtlassianResources` (não assumir um cloudId fixo cegamente).
2. Chamar `mcp__claude_ai_Atlassian__getJiraIssue` com:
   - `cloudId` resolvido acima
   - `issueIdOrKey` = chave do card
   - `responseContentFormat`: `markdown`
   - `fields`: `["summary","description","status","issuetype","priority","assignee","labels"]` (incluir `comment` se o usuário quiser os comentários).
3. Apresentar ao usuário um resumo legível: título (`summary`), tipo, status, responsável e a **descrição completa** do card, exatamente como vier — sem assumir uma estrutura/template específico. Destacar critérios de aceite se existirem.
4. Se o MCP do Jira não estiver disponível, avisar e seguir apenas com o passo de git (pedindo confirmação).

### 3. Atualizar as refs
1. `git fetch --prune` para atualizar branches remotas e remover as que não existem mais.

### 4. Checkout na branch do card
1. Localizar a branch do card por correspondência da chave no nome: `git branch -a --list "*<CHAVE>*"`.
2. Resolver o alvo:
   - **Existe local** → `git checkout <branch>`.
   - **Existe só remota** (`origin/...`) → `git checkout <branch>` (cria tracking local) e em seguida `git pull --ff-only` para alinhar com a origin.
   - **Mais de uma candidata** → listar e **perguntar** qual usar.
   - **Nenhuma** → informar e perguntar se deve criar a branch (e a partir de qual base) ou abortar. Não criar branch sem confirmação.
3. **Working tree sujo**: antes do checkout, rodar `git status --short`. Se houver mudanças não commitadas que possam bloquear a troca, **avisar e perguntar** como proceder (stash dos arquivos específicos ou abortar). Nunca descartar mudanças do usuário.

### 5. Reportar
Confirmar ao usuário: chave do card, título, branch em que está agora e estado (atualizada com a origin?). Sinalizar que o ambiente está pronto para iniciar a implementação. Não começar a implementar sem o usuário pedir.

## Regras
- Não criar nem deletar branches sem confirmação explícita.
- Não descartar/sobrescrever mudanças locais não commitadas.
- Esta skill apenas **prepara** o ambiente; a implementação em si só começa quando o usuário pedir.
