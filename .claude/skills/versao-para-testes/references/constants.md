# Constantes — versao-para-testes

## Azure DevOps
- Organização: `golhub` (https://golhub.visualstudio.com)
- Projeto: `GOL APP Mobile` (id `6487ed76-dcee-499d-afca-ef15bb69b768`)
- Repositório: `GOL_APP_Mobile`

## Pipelines de CI (definitions)
- Android: definition id **1743** — `PSS-React-Android-CI`
- iOS: definition id **1742** — `PSS-React-iOS-CI`

> Estas são as definições padrão deste repositório. Se o usuário indicar outra
> pipeline/definition, usar a indicada.

## Artefato e versões
- Cada build publica um único artefato chamado **`drop`** (baixado como `drop.zip`, ~100 MB).
- A versão do app (usada no upload para o BrowserStack) está em **`drop/staging/.env`**,
  campo **`VersionName`** (ex.: `10.0.3875`). Usar **sempre `staging`**, nunca
  `production`; usar `VersionName`, **não** `VersionCode`.
- Ler sem extrair tudo: `unzip -p <pasta>/drop.zip "drop/staging/.env"`.

## Templates de link
- Artefatos de um build (usado em "Pipeline Android/iOS"):
  `https://golhub.visualstudio.com/GOL%20APP%20Mobile/_build/results?buildId=<ID>&view=artifacts&pathAsName=false&type=publishedArtifacts`
- Resultado de um build:
  `https://golhub.visualstudio.com/GOL%20APP%20Mobile/_build/results?buildId=<ID>`

## Jira (cards)
- Link do card: `https://smiles.atlassian.net/browse/<CHAVE>`
- `cloudId` (MCP Atlassian): `713b4d5a-0e95-4420-87ae-be0166579b03`

## Jira — comentar versão e mover card para "Aguardando Teste"
- Comentário: `mcp__claude_ai_Atlassian__addCommentToJiraIssue`. Para link clicável,
  usar **`contentFormat: adf`** com `commentBody` = JSON do documento ADF e `link` mark
  explícito (`marks: [{type: "link", attrs: {href}}]`); markdown nem sempre gera o link
  e URL crua quebra (o Jira escapa `_build`). Verificar depois com `getJiraIssue`
  (`fields: ["comment"]`, `responseContentFormat: adf`).
- Transição "Aguardando Teste": **resolver por nome** com
  `mcp__claude_ai_Atlassian__getTransitionsForJiraIssue` — o `id` varia por workflow
  (no projeto CDPOS é `41`, status destino `19377`). Não fixar o id.
- Campo obrigatório na tela da transição: **Causa Raiz** = `customfield_36841`
  (select single). Valor padrão da skill:
  - **"Problema de UX/Experiência do Usuário"** → `id` `135750`.
  - Outras opções: "Erro de desenvolvimento" `142278`, "Erro de Implementação" `135745`,
    "Erro de Validação/Teste Insuficiente" `135749`, "Problema de merge" `142284`,
    "Bug em produção" `142276`.

## Enums úteis (Azure build)
- `status`: 1 = InProgress, 2 = Completed
- `result`: 2 = Succeeded, 4 = PartiallySucceeded (ok p/ testes — costuma ser só
  o quality gate do Sonar), 8 = Failed
