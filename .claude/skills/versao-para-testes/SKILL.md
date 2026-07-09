---
name: versao-para-testes
description: Monta o texto de "Versão para testes" (release candidate) preenchendo data, versões do BrowserStack (iOS/Android), links das pipelines (artefatos) Android e iOS, cards e branch, a partir dos dados das pipelines de uma branch do Azure DevOps (org golhub, projeto GOL APP Mobile). Ao final, comenta a versão nos cards ajustados no Jira e move-os para "Aguardando Teste" (Causa Raiz padrão "Problema de UX/Experiência do Usuário"). Genérica: os cards vêm do usuário; o título é fixo ("Versão para testes") e a feature flag é opcional (omitida quando não houver). Use quando o usuário pedir para montar/gerar/preencher a "versão para testes", "versão para QA" ou os dados de release de uma branch. Não use para abrir PR nem para acompanhar status de build.
---

# Versão para testes

Preenche o template em `assets/template.md` com os dados das pipelines de CI
(Android e iOS) de uma branch. A skill é **genérica**: os cards são informados
pelo usuário e a feature flag é opcional. O **título é fixo** (`Versão para
testes`) e as constantes do repositório (definitions, artefato, URLs) ficam
fixas em `references/constants.md`.

## Constantes

Ler `references/constants.md` (org/projeto/repo, ids das definitions de CI,
nome do artefato, templates de link, base do Jira).

## Entradas

Coletar do usuário (perguntar o que faltar — **não assumir defaults** para os
cards):

- **Branch** (obrigatória) — ex.: `bot/release/rc#CDQED-260`.
- **Título** — **fixo**: sempre `Versão para testes`. Não perguntar nem variar.
- **Cards** (obrigatório) — o usuário informa **quais cards estão nesta versão** (chaves ou links Jira).
- **Feature flag** — **opcional**: só entra se o usuário informar. Sem flag, **omitir a linha** (não escrever `Feature flag: N/A`).
- **Data/hora** — opcional; default = data **e hora** da geração no formato `DD/MM/AAAA HH:MM` (pegar do relógio, ex.: `date '+%d/%m/%Y %H:%M'`).
- **Build IDs** (opcional) — se o usuário indicar os builds Android/iOS, usar; senão, resolver automaticamente (passo 1).

## Procedimento

### 1. Resolver os builds da branch

Para cada plataforma, achar o **último build concluído com artefato** na branch:

`mcp__azure-devops__pipelines_get_builds` com:
- `project`: `GOL APP Mobile`
- `branchName`: `refs/heads/<branch>`
- `definitions`: `[1743]` (Android) / `[1742]` (iOS)
- `statusFilter`: `2` (Completed)
- `queryOrder`: `FinishTimeDescending`
- `top`: `5`

Escolher o mais recente com `result` 2 (Succeeded) ou 4 (PartiallySucceeded — ok,
costuma ser só o quality gate do Sonar). Ignorar builds `InProgress` (artefato
ainda não final) — usar o último **Completed**. Guardar `buildId` de cada plataforma.

### 2. Montar os links de pipeline

`Pipeline Android` / `Pipeline iOS` = template de artefatos (ver constantes) com
o `buildId` de cada plataforma.

### 3. Versões do BrowserStack (do `staging/.env` do artefato)

A versão de cada plataforma vem do **`drop/staging/.env`** do build daquela
plataforma — **sempre o de `staging`**, nunca `production`. O valor é o campo
**`VersionName`** (formato `10.0.3875`). **Não** usar o `VersionCode`.

Para cada plataforma (iOS = build do passo 1 da definition 1742; Android = 1743):

1. Baixar o artefato `drop` do build com `mcp__azure-devops__pipelines_download_artifact`
   passando **`destinationPath`** (caminho **relativo** — o tool rejeita caminho
   absoluto/`..`; ex.: `tmp-artifacts/drop-<buildId>`). O `drop` vem como um
   `drop.zip` (~100 MB) dentro dessa pasta.
2. Ler **só** o `.env` de staging, sem extrair o zip inteiro:
   `unzip -p tmp-artifacts/drop-<buildId>/drop.zip "drop/staging/.env"`
   (conferir o caminho com `unzip -l ... | grep -iE "env|stag"` se necessário).
3. Pegar o valor de `VersionName` → essa é a versão BrowserStack daquela plataforma.
4. **Apagar** a pasta baixada ao terminar (`rm -rf tmp-artifacts/drop-<buildId>`)
   — não deixar o zip no repositório.

Exemplo de `drop/staging/.env`:
```
VersionName=10.0.3875
VersionCode=3875.1
```
→ `BrowserStack iOS: 10.0.3875`.

Se o build de uma plataforma ainda não concluiu, deixar a linha dessa plataforma
como pendente e preencher quando o build terminar. Em caso de dúvida no valor,
**perguntar** ao usuário.

### 4. Montar o texto e salvar em arquivo `.md`

Copiar `assets/template.md` e substituir os placeholders (o título já vem fixo
como `Versão para testes` no template — não há placeholder para ele):
- `{{DATA}}` → data **e hora** da geração (`DD/MM/AAAA HH:MM`; pegar a hora atual, ex. via `date '+%d/%m/%Y %H:%M'`).
- `{{BS_IOS}}` / `{{BS_ANDROID}}` → versões do passo 3.
- `{{LINK_ANDROID}}` / `{{LINK_IOS}}` → links do passo 2.
- `{{CARDS}}` → um link `https://smiles.atlassian.net/browse/<CHAVE>` por linha, só os cards desta versão.
- `{{BRANCH}}` → a branch.
- `{{FEATURE_FLAG}}` → **se houver flag**, substituir por uma linha em branco seguida de `Feature flag: <flag>`; **se não houver**, remover a linha `{{FEATURE_FLAG}}` inteira (sem deixar `N/A`).

**Sempre** salvar o texto final em um arquivo `.md` (Write), nomeado a partir do
card/branch da versão (ex.: `versao-para-testes-<CHAVE>.md`) — não apenas imprimir.

### 5. Comentar a versão nos cards e mover para "Aguardando Teste"

Para **cada card da seção `Cards`** desta versão (os que foram ajustados nesta RC):

1. **Comentar a versão** no card via `mcp__claude_ai_Atlassian__addCommentToJiraIssue`
   (`cloudId` do Jira nas constantes). Para os links ficarem **clicáveis de fato**,
   enviar em **`contentFormat: adf`** com o `commentBody` sendo o JSON do documento
   ADF, e cada link como um nó `text` com `marks: [{type: "link", attrs: {href: <URL>}}]`.
   A conversão de markdown do Jira nem sempre gera o link mark (e URL crua quebra ao
   escapar o `_` de `_build`) — o ADF crava o link. Modelo:
   ```json
   {"type":"doc","version":1,"content":[
     {"type":"paragraph","content":[{"type":"text","text":"Versão para testes","marks":[{"type":"strong"}]}]},
     {"type":"paragraph","content":[
       {"type":"text","text":"BrowserStack iOS: <BS_IOS>"},{"type":"hardBreak"},
       {"type":"text","text":"BrowserStack Android: <BS_ANDROID>"}]},
     {"type":"paragraph","content":[
       {"type":"text","text":"Pipeline Android: "},
       {"type":"text","text":"Artefatos build <ID_ANDROID>","marks":[{"type":"link","attrs":{"href":"<LINK_ANDROID>"}}]}]},
     {"type":"paragraph","content":[
       {"type":"text","text":"Pipeline iOS: "},
       {"type":"text","text":"Artefatos build <ID_IOS>","marks":[{"type":"link","attrs":{"href":"<LINK_IOS>"}}]}]},
     {"type":"paragraph","content":[{"type":"text","text":"Branch: <BRANCH>"}]}
   ]}
   ```
   Conferir depois com `getJiraIssue` (`fields: ["comment"]`, `responseContentFormat: adf`)
   que o `link` mark ficou embutido no nó de texto.
2. **Resolver a transição** "Aguardando Teste" com
   `mcp__claude_ai_Atlassian__getTransitionsForJiraIssue` — achar pela `name`
   "Aguardando Teste" (o `id` varia por workflow; **não** fixar). Expandir
   `transitions.fields` (`transitionId: <id>`) para ver os campos obrigatórios da tela.
3. **Mover** com `mcp__claude_ai_Atlassian__transitionJiraIssue` passando
   `transition.id` e o campo obrigatório **Causa Raiz** (`customfield_36841`) =
   **"Problema de UX/Experiência do Usuário"** (`id` `135750`) — valor padrão da
   skill (ver constantes). Se o usuário indicar outra causa, usar a dela.

Confirmar a lista de cards antes de comentar/mover — é ação visível pelo time.
Se um card já estiver em "Aguardando Teste" ou não oferecer a transição, pular e
reportar. Comentar/mover apenas os cards **ajustados** (os da seção `Cards`), não
os de merge/atualização de main que não sejam entregas.

### 6. Reportar

Devolver o texto final pronto para colar, listar os `buildId` usados
(Android/iOS), de onde vieram as versões do BrowserStack, e quais cards foram
comentados e movidos para "Aguardando Teste".

## Regras

- Não inventar versões nem buildIds; se algo estiver ambíguo, **perguntar**.
- Título é **fixo**: sempre `Versão para testes`. Não perguntar nem variar.
- Não assumir os cards — são entrada do usuário.
- Feature flag é **opcional**: só entra se informada; sem flag, **omitir a linha** (nunca `Feature flag: N/A`).
- Versões do BrowserStack: **sempre** do `.env` de stage.
- **Sempre** salvar a saída em arquivo `.md` (não só imprimir no chat).
- No cabeçalho, a linha `Data` leva **data + hora** da geração (`DD/MM/AAAA HH:MM`).
- Ao baixar o artefato, sempre usar `destinationPath` (evitar base64 no contexto).
- No comentário do Jira, links **sempre** clicáveis via **ADF** (`contentFormat: adf` + `link` mark explícito) — markdown nem sempre vira link e URL crua quebra.
- Comentar/mover cards é ação visível pelo time: confirmar a lista de cards antes.
- Causa Raiz padrão ao mover para "Aguardando Teste": **"Problema de UX/Experiência do Usuário"** (`customfield_36841` = `135750`), salvo outra indicação do usuário.
