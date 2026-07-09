---
name: abrir-pr
description: Abre um Pull Request no Azure DevOps (org golhub, projeto GOL APP Mobile, repo GOL_APP_Mobile) usando o template padrão da GOL: título igual ao título do card Jira e descrição com as seções Descrição, Card da atividade (link Jira), Tipo de alteração (checkboxes) e Informações adicionais. Resolve o card pelo nome da branch, monta título e descrição, e cria o PR da branch atual para a release. Use sempre que o usuário pedir para abrir, criar ou subir um PR ou pull request. Não use para revisar PRs nem para code review.
---

# Abrir PR (padrão GOL)

Abre um Pull Request no Azure DevOps seguindo o formato padrão da GOL. O resultado final é um PR com **título igual ao título do card Jira** e **descrição preenchida a partir do template** em `assets/pr-description-template.md`.

## Constantes do projeto

Referência em `references/constants.md` (org, projeto, repo, cloudId do Jira). Ler ao montar a chamada de criação do PR.

## Procedimento

### 1. Resolver o card Jira

1. Identificar o card a partir do nome da branch atual (`git branch --show-current`) extraindo a primeira chave no formato `[A-Z]+-\d+` (ex.: `bot/issue/is#CDQED-274` → `CDQED-274`). O padrão de branch pode variar — não assumir um prefixo fixo; vale qualquer chave de card encontrada no nome.
2. Aceitar também a chave do card informada diretamente pelo usuário no pedido (tem precedência sobre a inferida pela branch).
3. Se nenhuma chave for encontrada nem informada, perguntar ao usuário qual é o card.
4. Buscar o **título exato** do card via MCP do Jira: `mcp__claude_ai_Atlassian__getJiraIssue` com `cloudId` (ver `references/constants.md`) e `issueIdOrKey` = chave do card. Usar o campo `summary` como título do PR.
5. Se o MCP do Jira não estiver disponível, pedir o título e a chave do card ao usuário.

### 2. Determinar source e target

1. **Source** = branch atual (`git branch --show-current`), salvo se o usuário indicar outra.
2. **Target** = o que o usuário indicar. Se não indicar, tentar detectar a branch de destino do ciclo (ex.: `git branch -a --list "*release*"`) e, havendo ambiguidade ou nenhuma candidata clara, **perguntar** — não assumir um target fixo.
3. Confirmar source/target com o usuário sempre que não forem inequívocos.

### 3. Garantir que o código está na origin

1. Verificar pendências: `git status --short`.
2. Se houver mudanças do escopo não commitadas, commitar **apenas os arquivos do fix** (perguntar antes se houver arquivos não relacionados, como `reactotron-config.ts` ou screenshots — esses normalmente **não** entram no PR). Mensagem de commit termina com:
   `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
3. Push da branch. Usar `git push --no-verify` para pular hooks de pré-push (padrão preferido neste projeto, evita rodar a suíte inteira).

### 4. Montar título e descrição

1. **Título** = `summary` do card (idêntico, sem prefixos extras).
2. **Descrição**: copiar `assets/pr-description-template.md` e substituir os placeholders:
   - `{{DESCRICAO}}` → resumo **descritivo** da mudança: o problema e como foi resolvido. **Não repetir o título do card** — escrever 1-3 frases explicando o contexto e o efeito da alteração.
   - `{{LINK_CARD}}` → `https://smiles.atlassian.net/browse/<CHAVE>`.
   - Marcar com `[x]` o item correto em **Tipo de alteração**, inferindo pela natureza da mudança (Bug fix / New feature / Breaking change / Requer documentação). Se ambíguo, perguntar ao usuário; não assumir um tipo fixo.
   - `{{INFO_ADICIONAIS}}` → detalhes técnicos que complementam a Descrição (arquivos tocados, decisões, pontos de atenção, testes). Não repetir o que já está em Descrição. Remover a seção se não houver nada relevante.

### 5. Criar o PR

Chamar `mcp__azure-devops__repo_create_pull_request` com:

- `repositoryId`: `GOL_APP_Mobile`
- `project`: `GOL APP Mobile`
- `sourceRefName`: `refs/heads/<source>`
- `targetRefName`: `refs/heads/<target>`
- `title`: título do card
- `description`: descrição montada
- `isDraft`: `false`

### 6. Comentar no card Jira

Adicionar um comentário no card com o link do PR e uma breve descrição do problema, via `mcp__claude_ai_Atlassian__addCommentToJiraIssue` (`cloudId` em `references/constants.md`, `issueIdOrKey` = chave do card).

- **Usar `contentFormat: "adf"`** com o link como *link mark* — **não usar markdown**. O conversor de markdown do Jira escapa o `_` da URL do Azure DevOps (`_git` vira `\_git`) e o link sai **não clicável**. Em ADF o `href` fica íntegro e o link renderiza clicável.
- Estrutura mínima do `commentBody` (ADF): parágrafos com **Problema** (1-2 frases) e **Correção** (1-2 frases), e um parágrafo `PR:` com um nó de texto marcado:

  ```json
  {"type":"doc","version":1,"content":[
    {"type":"paragraph","content":[
      {"type":"text","text":"PR: ","marks":[{"type":"strong"}]},
      {"type":"text","text":"#<ID>","marks":[{"type":"link","attrs":{"href":"https://golhub.visualstudio.com/GOL%20APP%20Mobile/_git/GOL_APP_Mobile/pullrequest/<ID>"}}]}
    ]}
  ]}
  ```

### 7. Reportar

Retornar ao usuário: número do PR, título, source→target e o link
`https://golhub.visualstudio.com/GOL%20APP%20Mobile/_git/GOL_APP_Mobile/pullrequest/<ID>`.
Oferecer (sem executar automaticamente) adicionar reviewers, vincular work item ou habilitar auto-complete.

## Regras

- Nunca alterar o título para algo diferente do `summary` do card.
- Nunca incluir `reactotron-config.ts`, screenshots ou arquivos fora do escopo do fix sem confirmação explícita.
- Não criar o PR como draft, salvo pedido explícito do usuário.
