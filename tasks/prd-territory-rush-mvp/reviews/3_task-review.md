# Code Review — Tarefa 3.0: Integração Strava (OAuth + conexão/desconexão + webhook)

- **Projeto:** Territory Rush (MVP)
- **Branch revisada:** `feat/task-3-strava` (diff `task-2-done...HEAD`)
- **Commit:** `cb43247 feat(strava): OAuth + conexão/desconexão + webhook de ingestão`
- **Data da review:** 2026-07-09
- **Revisor:** Code Review (skill `task-review` → `executar-review`)
- **Escopo do diff:** 38 arquivos (+1209/−13). Produção/infra em `apps/api/src/modules/integrations/strava/**`, `apps/api/src/modules/activities/**` (port + fila in-memory), `apps/api/src/config/**` (5 novas chaves), `apps/api/.env.example`, `supabase/migrations/0005_provider_connection_athlete_idx.sql`; testes em `apps/api/test/strava.int-spec.ts` + 7 specs unitários; mais os docs da task. Artefatos `.claude/worktrees/*` ignorados (pré-existentes, sem conteúdo).

---

## 1. Resumo

A Tarefa 3.0 entrega a porta de entrada das atividades reais com forte aderência à Tech Spec, às quatro subtarefas e às decisões de fronteira combinadas:

- **Ciclo OAuth** (`StravaConnectionService` + `HttpStravaOAuthClient`): troca de `authorization_code` por tokens, persistência de `provider_connection` com `provider_athlete_id` + `scopes` em claro e **access/refresh cifrados**, e `deauthorize` best-effort no disconnect (try/catch → `logger.warn` → remove a conexão de qualquer forma).
- **Refresh proativo** (`StravaTokenService` + `needsTokenRefresh`): token com validade ~6h é renovado quando faltam ≤10 min para expirar; o refresh **preserva `athleteId`/`scopes`** quando a resposta do Strava não os retorna (`refreshed.athleteId || connection.athleteId`; `refreshed.scopes.length ? ... : connection.scopes`) — comportamento verificado por unit test.
- **Cifra AES-256-GCM autenticada** (`AesTokenCipher`): IV aleatório de 12 bytes, tag de 16 bytes, layout `iv|tag|ciphertext` em base64, validação da chave (64 hex) e round-trip; testes cobrem round-trip, IV aleatório, rejeição de ciphertext adulterado e chave inválida.
- **Webhook GET** (`resolveWebhookChallenge`): valida `hub.mode=subscribe` + `hub.verify_token` contra o token configurado (inclusive rejeição quando o token esperado não está configurado) e ecoa `hub.challenge`.
- **Webhook POST** (`StravaWebhookController` + `StravaWebhookService`): responde **200 imediato**, filtra por `objectType=activity` + `aspectType=create`, resolve `ownerId` → `userId` e **enfileira sem processar inline**; dedup por `(provider, providerActivityId)` na fila.
- **Split de fronteira honesto**: `IngestActivityQueue` (port) + `InMemoryIngestActivityQueue` (impl process-local com dedup), documentando que BullMQ/Redis é da Tarefa 4.

**Todos os 4 gates de validação passaram** (unit 58/58, lint limpo, build OK, integração 16/16). Não há achados bloqueantes; os achados são de severidade **Menor** (gestão da assinatura de webhook dormente e sem cobertura; branches de serviço só exercitados no caminho feliz) e **Observação** (stand-in de Vault, split de fila, seams para a Task 4, autenticidade do POST).

**Veredito:** `APPROVED WITH OBSERVATIONS`.

---

## 2. Resultado da validação de testes (execução real)

Todos os comandos foram executados de fato neste ambiente (Docker de pé).

### Unit — `cd apps/api && npx jest --config jest.config.ts`

```
PASS src/modules/integrations/strava/token-refresh.spec.ts
PASS src/modules/integrations/strava/strava-event.spec.ts
PASS src/modules/geo/street-aggregation.spec.ts
PASS src/modules/geo/parse-bbox.spec.ts
PASS src/modules/geo/street-response.spec.ts
PASS src/modules/integrations/strava/webhook-challenge.spec.ts
PASS src/modules/integrations/strava/strava-token.service.spec.ts
PASS src/modules/auth/guards/supabase-jwt.guard.spec.ts
PASS src/modules/profile/profile.service.spec.ts
PASS src/modules/activities/queue/in-memory-ingest-activity.queue.spec.ts
PASS src/modules/integrations/strava/clients/http-strava-oauth.client.spec.ts
PASS src/modules/auth/verifiers/supabase-jwt.verifier.spec.ts
PASS src/modules/integrations/strava/cipher/aes-token-cipher.spec.ts

Test Suites: 13 passed, 13 total
Tests:       58 passed, 58 total
Time:        4.334 s
```
**Resultado: PASSOU (58/58, esperado 58 — 32 herdados das Tasks 1/2 + 26 da Task 3).**

### Lint — `cd apps/api && npx eslint "src/**/*.ts" "test/**/*.ts"`

```
ESLINT_EXIT=0
```
**Resultado: LIMPO (exit 0).** A regra `@typescript-eslint/consistent-type-definitions` (única convenção transversal) passou.

### Build — `cd apps/api && npx nest build`

```
BUILD_EXIT=0
```
**Resultado: OK (exit 0).**

### Integração — `cd apps/api && npx jest --config test/jest-int.config.ts --runInBand`

```
PASS test/strava.int-spec.ts (6.959 s)
PASS test/streets.int-spec.ts (5.365 s)
PASS test/profile.int-spec.ts (5.365 s)

Test Suites: 3 passed, 3 total
Tests:       16 passed, 16 total
Time:        17.737 s
```
**Resultado: PASSOU (16/16, esperado 16 — 5 profile + 5 streets + 6 strava).**

| Gate | Esperado | Obtido | Status |
|------|----------|--------|--------|
| Unit | 58 | 58 | OK |
| Lint | limpo | exit 0 | OK |
| Build | OK | exit 0 | OK |
| Integração | 16 | 16 | OK |

---

## 3. Aderência ao escopo da Tarefa 3.0 e critérios de sucesso

| Subtarefa / Critério | Status | Evidência |
|----------------------|--------|-----------|
| 3.1 Cliente OAuth (troca + refresh) + armazenamento seguro de tokens | Atendido | `HttpStravaOAuthClient` (exchange/refresh/deauthorize), `StravaTokenService.getFreshAccessToken` (refresh proativo + persistência cifrada), `AesTokenCipher`. |
| 3.2 `POST /integrations/strava/connect` + `DELETE /integrations/strava/disconnect` | Atendido | `IntegrationsStravaController` autenticado (`SupabaseJwtGuard`); connect → `upsert` cifrado (201), disconnect → deauthorize best-effort + `delete` (204). Também há `GET /integrations/strava` (estado da conexão). |
| 3.3 Gestão da assinatura de webhook + `GET /webhooks/strava` | Atendido (com observação) | `GET` valida verify_token e ecoa `hub.challenge` (implementado + testado). A **criação/validação da assinatura** existe (`ensureSubscription` + `HttpStravaSubscriptionClient`) mas está dormente e sem cobertura — ver achado M1. |
| 3.4 `POST /webhooks/strava`: validar, deduplicar, enfileirar (200 imediato) | Atendido | `StravaWebhookController` `@HttpCode(200)`; filtro `activity/create`; resolução athlete→user; `queue.enqueue` com dedup; sem processamento inline. |
| CS: conecta/desconecta; `provider_connection` reflete estado com tokens cifrados | Atendido | Integração `connects Strava and stores encrypted tokens` (decifra a coluna no DB e confere ≠ plaintext) + `disconnects Strava and removes the connection` (rowCount 0). |
| CS: token expirado renovado proativamente antes do uso | Atendido | `StravaTokenService` + `needsTokenRefresh` (limiar 600s); unit `refreshes and persists when the token is expired`. Consumido pelo worker da Task 4 (seam). |
| CS: `GET /webhooks/strava` valida; `POST` responde 200 e enfileira exatamente 1 job por atividade (dedup) | Atendido | Integração `validates the webhook challenge and rejects a bad verify token` + `enqueues exactly one ingest job per new activity (idempotent)` + `acknowledges but does not enqueue non-create or unknown-athlete events`. |
| RF-1.2 / RF-2.1 (OAuth + refresh + cifra) | Atendido | Ver 3.1. |

Os quatro checkboxes de subtarefa e os dois de testes da task estão marcados de forma coerente com o entregue (E2E corretamente deixado para a Task 10).

---

## 4. Conformidade com a Tech Spec e convenções

- **Convenção de tipagem (`interface` só em contratos / `*.port.ts`):** correta. `grep` confirma que **todas** as `interface` novas (`StravaOAuthClient`, `StravaSubscriptionClient`, `TokenCipher`, `ProviderConnectionRepository`, `IngestActivityQueue`) vivem em arquivos `*.port.ts`; modelos/DTOs/payloads (`StravaTokenResponse`, `ProviderConnection`, `StravaWebhookEvent`, `IngestActivityJob`, etc.) usam `type`; DTOs de request são `class` (class-validator), não `interface`. Lint limpo.
- **Regras `.claude/rules` do AcquisitionNew:** corretamente **não aplicadas** (stack distinto — NestJS/Supabase greenfield, conforme "Conformidade com Skills Padrões" da Tech Spec). O JSDoc presente nos ports/utils **não é violação** aqui — a regra `no-comments` é escopada a `AcquisitionNew`/`gol-sdk`.
- **Camadas DDD/Clean:** contrato (`*.port.ts` + token `Symbol`) → serviço (`StravaConnectionService`, `StravaTokenService`, `StravaWebhookService`) → adaptadores de saída (`HttpStravaOAuthClient`, `HttpStravaSubscriptionClient`, `PgProviderConnectionRepository`, `AesTokenCipher`) → controllers finos. Injeção por token (`useClass`), lógica pura isolada em arquivos próprios (`token-refresh.ts`, `strava-event.ts`, `webhook-challenge.ts`) com specs dedicados. Consistente com o padrão das Tasks 1/2.
- **Modelo de dados:** `provider_connection` (migração 0003, Task 1) tem as colunas exigidas (`access_token`/`refresh_token` cifrados, `expires_at`, `provider_athlete_id`, `scopes text[]`, `unique(user_id, provider)`). A migração 0005 adiciona `idx_provider_connection_athlete (provider, provider_athlete_id)` — exatamente a chave de lookup do webhook (`findUserIdByAthlete`). Boa decisão de performance.
- **Cifra vs Supabase Vault:** a Tech Spec pede tokens "cifrados / Supabase Vault"; a implementação usa **AES-256-GCM no app como stand-in documentado** (`TokenCipher` explicita "local stand-in for Supabase Vault" e exige ciphertext autenticado). Decisão aceitável e honesta para ambiente local — ver O1.
- **Split BullMQ/Redis → Task 4:** o port `IngestActivityQueue` + impl in-memory, com comentários no port e no módulo declarando que a Task 4 troca a implementação por BullMQ/Redis + worker + persistência. Split adequado — ver O2.
- **Não bate na API real do Strava nos testes:** confirmado. Unit mocka `global.fetch` (OAuth client) ou os ports; a integração faz `overrideProvider(STRAVA_OAUTH_CLIENT)` com um fake. Nenhuma chamada real, como manda a Tech Spec.
- **`ValidationPipe` global (`whitelist: true, transform: true`):** o `POST` usa `StravaWebhookEventDto` (class-validator, snake_case → camelCase via `toWebhookEvent`); campos extras do payload real do Strava (ex.: `updates`) são descartados sem erro. O `GET` recebe `Record<string,string>` (sem metadados de classe), então o pipe não interfere no handshake.

---

## 5. Achados

Nenhum achado bloqueante. Ordenados por severidade.

### 5.1 [Menor] Gestão da assinatura de webhook implementada, porém dormente e sem cobertura

- **Arquivos:** `apps/api/src/modules/integrations/strava/strava-webhook.service.ts:45` (`ensureSubscription`) + `apps/api/src/modules/integrations/strava/clients/http-strava-subscription.client.ts` (todo o arquivo)
- **Impacto:** a subtarefa 3.3 pede "gestão da assinatura única de webhook (criação/validação)". A validação do handshake (`GET`) está completa e testada, mas a **criação/registro** da assinatura (`ensureSubscription` → `listSubscriptions`/`createSubscription`) **não é chamada por nenhum código de produção** (nem bootstrap, nem CLI, nem endpoint admin) e **não tem nenhum teste** — `HttpStravaSubscriptionClient` (list/create/delete) é a única classe de fronteira externa do módulo sem spec. Um erro na URL/parâmetros/parse do client só apareceria quando alguém finalmente ligar isso.
- **Sugestão:** (a) adicionar um unit spec ao `HttpStravaSubscriptionClient` mockando `global.fetch` (mesmo padrão do `http-strava-oauth.client.spec.ts`) e ao `ensureSubscription` (reusa a existente vs cria a nova); e (b) prover um gatilho real — hook de bootstrap idempotente ou comando CLI — ou registrar explicitamente na task que o **registro** da assinatura fica adiado, mantendo apenas a validação do handshake nesta entrega.

### 5.2 [Menor] Serviços de conexão e webhook exercitados só no caminho feliz (branches sem cobertura)

- **Arquivos:** `apps/api/src/modules/integrations/strava/strava-connection.service.ts:42` (disconnect) + `apps/api/src/modules/integrations/strava/strava-webhook.service.ts:30`
- **Impacto:** `StravaConnectionService` e `StravaWebhookService` não têm unit specs; são cobertos apenas pelos caminhos felizes da integração. Em particular, a **garantia "deauthorize best-effort"** (o `catch` que loga `warn` e mesmo assim remove a conexão) **não é verificada** — o fake da integração faz `deauthorize` retornar `undefined` (sucesso). Uma regressão que deixasse a exceção do deauthorize propagar (impedindo o `delete`) passaria despercebida.
- **Sugestão:** adicionar unit tests focados: disconnect com `deauthorize` lançando → ainda chama `connections.delete`; `handleEvent` para evento não-ingestível e para athlete desconhecido (ambos sem `enqueue`); `ensureSubscription` reutilizando assinatura existente vs criando.

### 5.3 [Observação] Cifra AES-256-GCM no app como stand-in de Supabase Vault — apropriado, com follow-up de gestão de chave

- **Arquivos:** `apps/api/src/modules/integrations/strava/cipher/aes-token-cipher.ts` + `ports/token-cipher.port.ts`
- **Análise:** decisão correta e honesta para o ambiente local (Vault não existe offline). A cifra é **autenticada** (GCM + `getAuthTag`/`setAuthTag`), usa IV aleatório por operação e valida a chave (64 hex); o teste de adulteração garante a propriedade de integridade. Fica como pendência pós-MVP: migrar para Supabase Vault/KMS em produção e endereçar **gestão de chave** (rotação, ausência de chave em texto puro no ambiente). O default vazio de `TOKEN_ENCRYPTION_KEY` falha de forma segura (lança erro), sem introduzir chave fraca silenciosa — bom.

### 5.4 [Observação] Split de fila (port + in-memory) para a Task 4 — adequado

- **Arquivos:** `apps/api/src/modules/activities/ports/ingest-activity-queue.port.ts` + `queue/in-memory-ingest-activity.queue.ts`
- **Análise:** split limpo e bem documentado. O contrato (`enqueue` idempotente por `(provider, providerActivityId)` retornando `boolean`) é estável e sobrevive à troca por BullMQ/Redis na Task 4; o dedup vive na implementação e migrará para `jobId` do BullMQ. A impl é registrada como singleton no DI, então o dedup persiste entre requests no processo (confirmado pela integração de idempotência). Endosso o split.

### 5.5 [Observação] `POST /webhooks/strava` não verifica autenticidade do evento (limitação conhecida do Strava)

- **Arquivo:** `apps/api/src/modules/integrations/strava/strava-webhook.service.ts:30`
- **Análise:** eventos POST do Strava não são assinados (o `verify_token` só protege o handshake `GET`), então confiar no payload é o padrão da plataforma e está **fora do escopo de segurança declarado da task** (que pede validação do verify_token — feita). Ainda assim, o handler resolve `ownerId` → `userId` e enfileira qualquer payload bem-formado; quem descobrisse a callback URL poderia injetar jobs de ingestão para um athlete conhecido. O dano é contido (a Task 4 revalida a atividade contra a API real do Strava e deduplica), mas fica a nota de endurecimento: validar `subscription_id` contra a assinatura conhecida do app (naturalmente casável com o wiring do achado 5.1).

### 5.6 [Observação] Seams para a Task 4/mobile sem consumo/cobertura nesta entrega

- **Arquivos:** `strava-token.service.ts` (`getFreshAccessToken`, exportado no módulo) + `GET /integrations/strava`
- **Análise:** `StravaTokenService` não é consumido em produção na Task 3 (é o seam do refresh proativo do worker da Task 4) — porém está **bem coberto por unit** (fresh/expired/sem conexão). O `GET /integrations/strava` (estado da conexão para o app) é trivial e não tem teste; baixo risco. Mesma classe de observação da Task 2 (`findByNameAndCity`): superfície pública introduzida antes do consumidor. Aceitável; verificar quando as Tasks 4/10 as consumirem.

---

## 6. Completude dos testes da tarefa

| Teste exigido pela task | Status | Observação |
|-------------------------|--------|------------|
| Unidade — troca de token (mapeamento OAuth) | Coberto | `http-strava-oauth.client.spec`: mapeia payload, defaults seguros de scope/athlete, erro em status não-ok. |
| Unidade — refresh de token | Coberto | `strava-token.service.spec`: fresh retorna atual; expirado renova+persiste **preservando athlete/scopes**; sem conexão → `NotFoundException`. `token-refresh.spec`: limiar/bordas. |
| Unidade — validação `hub.challenge` | Coberto | `webhook-challenge.spec`: eco válido; rejeita mode≠subscribe, challenge ausente, verify_token divergente e verify_token não configurado. |
| Unidade — filtro de evento | Coberto | `strava-event.spec`: aceita `activity/create`; rejeita update/delete e objeto não-activity. |
| Unidade — cifra | Coberto | `aes-token-cipher.spec`: round-trip, IV aleatório, ciphertext adulterado, chave inválida. |
| Unidade — dedup da fila | Coberto | `in-memory-ingest-activity.queue.spec`: enfileira, dedup por `(provider, activityId)`, id distinto = novo job. |
| Integração — connect/disconnect → estado de `provider_connection` (cifra verificada no DB) | Coberto | `connects Strava and stores encrypted tokens` (decifra a coluna e confere ≠ plaintext) + `disconnects Strava and removes the connection`. |
| Integração — webhook enqueue/dedup/eventos ignorados | Coberto | `enqueues exactly one ingest job per new activity (idempotent)` + `acknowledges but does not enqueue non-create or unknown-athlete events` + `validates the webhook challenge`. |
| Lacunas | — | Sem spec para `HttpStravaSubscriptionClient`/`ensureSubscription` (5.1) e para os branches de `StravaConnectionService`/`StravaWebhookService`, incl. o `catch` do deauthorize (5.2). |

Qualidade dos testes: integração usa Postgres/PostGIS real via testcontainers e migrações reais; a API do Strava é mockada **no port** (fake `StravaOAuthClient`), respeitando a Tech Spec de nunca bater no serviço externo; a cifra é verificada de ponta a ponta lendo a coluna do DB e decifrando com o `TokenCipher` real. Unit isola cada regra pura. Cobertura sólida no núcleo com risco de bug (OAuth/refresh/cifra/dedup/challenge); lacunas restritas à superfície de assinatura e a branches de erro dos serviços.

---

## 7. Veredito

### `APPROVED WITH OBSERVATIONS`

Justificativa: os 4 gates passaram com os números esperados (unit 58/58, lint limpo, build OK, integração 16/16), a convenção de tipagem foi confirmada por lint (`interface` só em `*.port.ts`), e 100% das quatro subtarefas foram entregues com arquitetura DDD/Clean coerente. Os pontos de segurança e corretude do foco da task estão atendidos: cifra AES-256-GCM **autenticada** com IV aleatório, validação do `verify_token` no handshake `GET`, deauthorize **best-effort** no disconnect, refresh que **preserva athlete/scopes**, mapeamento snake_case do payload e dedup no enqueue — todos com teste. As decisões de fronteira (port de fila + in-memory para a Task 4; cifra como stand-in de Vault; API Strava mockada no port) são apropriadas e honestamente documentadas. Os achados são **Menor** (gestão da assinatura de webhook dormente e sem cobertura — 5.1; branches de serviço sem unit test, incl. o catch do deauthorize — 5.2) e **Observação** (5.3–5.6), nenhum bloqueante e todos endereçáveis nesta task (adicionar specs + wiring da assinatura) ou nas tasks donas (4/10). Recomenda-se, antes do merge ou como follow-up imediato, fechar 5.1 e 5.2 — cobrir o `HttpStravaSubscriptionClient` e os branches de erro dos serviços é barato e remove a única superfície de fronteira externa sem verificação.

---

## 8. Mensagem de commit sugerida (Conventional Commits, pt-BR)

O trabalho já está commitado em `cb43247` com mensagem aderente ao padrão. Caso seja necessário reescrever/consolidar, segue a sugestão:

```
feat(strava): OAuth + conexão/desconexão + webhook de ingestão

Implementa a integração Strava como porta de entrada das atividades:
troca de authorization_code por tokens, refresh proativo (~10 min antes
da expiracao) preservando athlete/scopes, e persistencia de
provider_connection com tokens cifrados (AES-256-GCM autenticado, IV
aleatorio) como stand-in local do Supabase Vault.

Endpoints POST /integrations/strava/connect e DELETE .../disconnect
(deauthorize best-effort) autenticados por JWT. Webhook GET valida o
verify_token e ecoa hub.challenge; POST responde 200 imediato, filtra
activity/create, resolve athlete->user e enfileira ingest-activity sem
processar inline. Fila introduzida como port IngestActivityQueue +
implementacao in-memory com dedup por (provider, providerActivityId);
BullMQ/Redis fica para a Task 4. Migracao 0005 indexa (provider,
provider_athlete_id) para o lookup do webhook.
```
