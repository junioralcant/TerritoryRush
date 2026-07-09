# Code Review — Tarefa 4.0: Pipeline assíncrono de ingestão (fila + worker + streams + status)

- **Branch:** `feat/task-4-ingestion-pipeline`
- **Base do diff:** tag `task-3-done` → `HEAD` (`git diff task-3-done...HEAD`, worktrees ignorados)
- **Commit da task:** `151d009 feat(activities): pipeline assíncrono de ingestão (fila + worker + status)`
- **Escopo:** `apps/api` (NestJS 11) + `supabase/migrations/`
- **Data:** 2026-07-09
- **Revisor:** revisor sênior (skill `task-review` → `executar-review`)

---

## 1. Resumo

A Tarefa 4.0 entrega o esqueleto de processamento assíncrono da ingestão: fila `ingest-activity` (BullMQ/Redis) com fallback in-memory quando não há `REDIS_URL`, worker no processo NestJS, gateway de atividade provider-agnóstico (`PROVIDER_ACTIVITY_GATEWAY`), persistência da `activity` com dedup por `UNIQUE(provider, provider_activity_id)`, máquina de estados `imported → processing → processed | rejected` e o endpoint `GET /activities?status=`.

As quatro subtarefas (4.1–4.4) foram implementadas e as duas classes de teste exigidas (unidade + integração) estão presentes. Os quatro gates de validação passaram com os números esperados: **unit 81/81**, **lint limpo**, **build OK**, **integração 20/20** (`profile + streets + strava + ingest-pipeline`). A integração é honesta: Redis e PostGIS são reais via testcontainers; a API externa da Strava é mockada **no port do gateway** (`PROVIDER_ACTIVITY_GATEWAY`), respeitando a Tech Spec (nunca bater no serviço externo).

Veredito: **`APPROVED WITH OBSERVATIONS`**. Nenhum achado bloqueante. O ponto mais relevante é que o caminho real de fetch (gateway Strava + HTTP client) ficou sem cobertura de teste, o que enfraquece a linha "refresh de token antes do fetch" marcada como concluída na task.

---

## 2. Resultado da validação de testes (execução real)

Docker de pé confirmado (`docker info` → OK). Comandos executados exatamente como especificado.

### Unit — `cd apps/api && npx jest --config jest.config.ts`

```
Test Suites: 19 passed, 19 total
Tests:       81 passed, 81 total
Snapshots:   0 total
Time:        3.963 s
```

Esperado 81 → **81 ✅**. Inclui os novos specs: `activity-ingestion.service.spec` (máquina de estados + idempotência + provider sem gateway), `activities.service.spec` e `parse-activity-status.spec` (validação do filtro).

### Lint — `cd apps/api && npx eslint "src/**/*.ts" "test/**/*.ts"`

```
ESLINT_EXIT=0
```

Saída limpa, sem warnings/erros. Confirma a convenção transversal: `@typescript-eslint/consistent-type-definitions: 'type'` global, relaxado para `'interface'` só em `**/*.port.ts`.

### Build — `cd apps/api && npx nest build`

```
BUILD_EXIT=0
```

Compilação OK.

### Integração — `cd apps/api && npx jest --config test/jest-int.config.ts --runInBand`

```
PASS test/ingest-pipeline.int-spec.ts (8.833 s)
PASS test/strava.int-spec.ts (5.3 s)
PASS test/profile.int-spec.ts (5.403 s)
PASS test/streets.int-spec.ts (5.371 s)

Test Suites: 4 passed, 4 total
Tests:       20 passed, 20 total
Time:        24.954 s
```

Esperado 20 → **20 ✅**. `ingest-pipeline.int-spec` sobe PostGIS (`postgis/postgis:16-3.4`) **e** Redis (`redis:7-alpine`) via testcontainers e exercita `POST /webhooks/strava → BullMQ → worker → DB`, o `GET /activities?status=processed`, o 400 do filtro inválido e a idempotência de webhook repetido.

**Todos os gates passaram.** Nenhum motivo de `REJECTED` por falha de teste, lint ou build.

---

## 3. Aderência ao escopo da Tarefa 4.0 e critérios de sucesso

| Subtarefa | Status | Evidência |
|-----------|--------|-----------|
| 4.1 Redis + fila BullMQ + worker `ingest-activity` | ✅ | `queue/bullmq-ingest-activity.queue.ts`, `queue/redis.ts` (`INGEST_QUEUE_NAME='ingest-activity'`), `workers/ingest-activity/ingest-activity.worker.ts`. Fallback in-memory quando `redisUrl` vazio (`activities.module.ts` `useFactory`; worker loga `warn` e não sobe). |
| 4.2 Orquestrador `ActivityIngestionService` (refresh de token, fetch de streams, backoff/retry) | ✅ (com ressalvas) | `workers/ingest-activity/activity-ingestion.service.ts`; refresh de token dentro do `StravaActivityGateway.fetchIngestData`; backoff via opções do job (`attempts: 5`, `exponential`, `delay: 2000`). Localização e cobertura discutidas em 5.1/5.2. |
| 4.3 Persistência com dedup + transições de status | ✅ | `repositories/activity.repository.ts` (`createIfAbsent` com `on conflict do nothing` + fallback select; `updateStatus`; `saveIngestedData`) + migração `0006_activity.sql` com `unique (provider, provider_activity_id)`. |
| 4.4 `GET /activities?status=` | ✅ | `activities.controller.ts` + `activities.service.ts` + `parse-activity-status.ts` (400 em status inválido) sob `SupabaseJwtGuard`. |

| Critério de sucesso | Status | Observação |
|---------------------|--------|------------|
| Job enfileirado é processado por um worker; atividade transita entre estados | ✅ | Coberto no unit ("full state machine") e na integração (`waitForStatus('555','processed')`). |
| Streams de GPS obtidos e disponíveis para as etapas seguintes | ✅ | `gps_streams jsonb`; integração confere `gps_streams.latlng` com length 2. |
| Webhook duplicado é idempotente (uma única `activity`) | ✅ | `UNIQUE` no DB + early-return por `status === 'processed'` + `jobId` na fila; integração confere `count === 1`. Timing do assert de `fetchCalls` é fraco (ver 5.4). |
| `GET /activities?status=` reflete o estado real | ✅ | Integração lê `processed` após o pipeline; cast SQL seguro para `null` quando sem filtro. |

---

## 4. Conformidade com a Tech Spec e convenções

- **Convenção de tipagem (única regra transversal):** respeitada e confirmada por lint. Os contratos novos são `interface` e vivem em `*.port.ts` — `ActivityRepository` (`ports/activity-repository.port.ts`), `ProviderActivityGateway` (`ports/provider-activity-gateway.port.ts`), `StravaActivityClient` (`ports/strava-activity-client.port.ts`); o port da fila ganhou `close()`. Todo o resto (modelos, DTOs, rows, payloads, tipos locais do HTTP client) usa `type`.
- **Fluxo de dados (ingestão):** o pipeline `webhook → enqueue → worker: refresh token → fetch atividade+streams → persiste → status` está fiel ao diagrama da Tech Spec. As etapas de anti-cheat/matching/scoring/territory ficam para as Tasks 5–7 e o orquestrador está preparado para recebê-las.
- **Modelos de dados:** `activity` implementa o schema descrito (`status` enum, métricas, `unique(provider,provider_activity_id)`), com `gps_streams jsonb` para as etapas seguintes. `IngestActivityJob` bate com o tipo da Tech Spec. Migração idempotente (guard de `pg_type` para o enum, `create table if not exists`, índice `idx_activity_user_status`).
- **Gateway provider-agnóstico:** o worker resolve por `gateway.provider === job.provider` e o gateway encapsula refresh + HTTP — bom seam para o Garmin da Task 12 sem tocar no worker.
- **Arquitetura de módulos sem ciclo:** confirmado. `activities → auth`; `strava → activities, auth`; `worker → activities, strava`. Grafo acíclico (`activities ← strava ← worker`). Ver 5.1 sobre a localização do `ActivityIngestionService`.
- **Honestidade da validação:** integração usa infra real (Redis + PostGIS) e migrações reais; o único mock é a fronteira externa da Strava, no port do gateway. Sem fake-green.

---

## 5. Achados

Nenhum achado bloqueante. Ordenados por severidade.

### 5.1 [Maior] Caminho real de fetch (gateway + HTTP client Strava) sem nenhuma cobertura — a linha "refresh de token antes do fetch" não é verificada

- **Arquivos:** `apps/api/src/modules/integrations/strava/strava-activity.gateway.ts` (todo o arquivo) + `apps/api/src/modules/integrations/strava/clients/http-strava-activity.client.ts` (todo o arquivo)
- **Impacto:** a task marca `[x] Testes de unidade — ... refresh de token antes do fetch (mock Strava)`, mas **não existe spec** que assere isso. O `StravaActivityGateway.fetchIngestData` (chama `getFreshAccessToken` e só então dispara `fetchActivity`/`fetchStreams` em `Promise.all`) e o `HttpStravaActivityClient` (parse snake_case, derivação de `avgPaceSKm`, defaults de streams vazios, erro em status não-ok) têm **zero cobertura**. Pior: na integração o `PROVIDER_ACTIVITY_GATEWAY` é **substituído por um fake**, então esse caminho também não roda ali — ele existe apenas em produção. Os HTTP clients irmãos (`http-strava-oauth.client.spec.ts`, `http-strava-subscription.client.spec.ts`) têm spec; este quebra a convenção do módulo. Uma regressão que inverta a ordem (fetch antes do refresh), erre a URL de streams (`key_by_type`/`keys=latlng,time,heartrate`), o cálculo de pace (divisão por zero quando `distance=0`) ou o mapeamento do payload passaria despercebida. O refresh em si está coberto por `strava-token.service.spec` (Task 3), mas o "**antes do fetch**" — que é o que a task pede — não.
- **Sugestão:** (a) `strava-activity.gateway.spec.ts` mockando `StravaTokenService` e `StravaActivityClient`, assertando que `getFreshAccessToken` é chamado e o token retornado é repassado a ambos os fetches (ordenação/propagação do token); (b) `http-strava-activity.client.spec.ts` mockando `global.fetch` (mesmo padrão do oauth client): mapeamento de métricas, `avgPaceSKm` com guardas de `distance` 0/null, defaults de streams ausentes e `throw` em status não-ok.

### 5.2 [Menor / Observação] `ActivityIngestionService` no módulo do worker, não em `activities` (como diz a task/Tech Spec) — desvio justificado

- **Arquivos:** `apps/api/src/workers/ingest-activity/activity-ingestion.service.ts` + `ingest-activity.module.ts`
- **Análise:** a subtarefa 4.2 e a Tech Spec ("módulo `activities`: orquestra ingestão") sugerem o orquestrador no módulo `activities`. A implementação o coloca em `workers/ingest-activity/`. **Isso é correto e proposital:** o orquestrador precisa do `PROVIDER_ACTIVITY_GATEWAY` (provido por `strava`), e `strava` já depende de `activities` (port da fila + repositório). Colocá-lo em `activities` criaria o ciclo `activities ⇄ strava`. A composição escolhida (`worker` importa `activities` + `strava`) mantém o grafo acíclico; o nome e a responsabilidade da classe são preservados e há comentário no módulo explicando a decisão. É a leitura de "composição no worker" que o próprio enunciado da review pediu para avaliar — **aceitável**. Sugestão leve: manter esse racional registrado na task/Tech Spec para não parecer desvio silencioso quando as Tasks 5–7 estenderem o orquestrador.

### 5.3 [Menor] Rate limit da Strava: header não é respeitado; o retry depende só do backoff do BullMQ

- **Arquivo:** `apps/api/src/modules/integrations/strava/clients/http-strava-activity.client.ts`
- **Impacto:** a Tech Spec pede "respeito ao header de rate limit". O client lança `Error` genérico para qualquer não-ok (inclusive `429`) sem ler `Retry-After`/`X-RateLimit-*`. O reprocessamento acontece via opções do job (`attempts: 5`, `exponential`, `delay: 2000`), o que funcionalmente cobre o MVP e mantém a atividade em `processing` para retry, mas não alinha o atraso à janela real de 15 min da Strava — sob rate limit sustentado pode gastar tentativas antes do reset.
- **Sugestão:** mapear `429` para um erro que carregue o `Retry-After` e honrá-lo no reagendamento (delay do BullMQ), ou registrar explicitamente na task que o alinhamento ao header fica deferido, mantendo o backoff exponencial como aproximação nesta entrega.

### 5.4 [Menor] `bootstrap()` sem `enableShutdownHooks()`: os `OnModuleDestroy` não disparam em SIGTERM/SIGINT em produção

- **Arquivos:** `apps/api/src/main.ts` + `IngestQueueCloser` (`activities.module.ts`) + `IngestActivityWorker.onModuleDestroy`
- **Impacto:** os teardowns de fila/worker (e o `PgPoolCloser` da Task 1) só rodam quando `app.close()` é chamado — o que acontece nos testes (por isso passam), mas **não** no encerramento por sinal em produção, já que `enableShutdownHooks()` não é chamado. No shutdown real, as conexões Redis (queue + worker) e o pool PG não são fechados graciosamente e jobs em andamento não são drenados. Padrão pré-existente, mas a Task 4 adiciona dois consumidores de `OnModuleDestroy` afetados.
- **Sugestão:** chamar `app.enableShutdownHooks()` em `bootstrap()`.

### 5.5 [Observação] Teste de idempotência de integração é fraco no timing

- **Arquivo:** `apps/api/test/ingest-pipeline.int-spec.ts` (caso "duplicate webhook does not create a second activity")
- **Análise:** após o webhook duplicado, há uma espera fixa de 1500 ms e então `expect(fetchCalls.length).toBe(before)`. Esse assert passa tanto se o job duplicado rodou e caiu no early-return quanto se **ainda não rodou** — não distingue os casos. A garantia real (UNIQUE no DB + early-return por `status==='processed'` + `jobId`) é sólida e o `count === 1` a comprova de fato; o assert de `fetchCalls` só reforça de forma frágil. Sugestão: aguardar ativamente o processamento do job duplicado (observar o estado/jobId) antes de comparar `fetchCalls`, tornando o assert determinístico.

### 5.6 [Observação] `saveIngestedData` + `updateStatus('processed')` não são transacionais — sem risco de corrupção

- **Arquivo:** `apps/api/src/workers/ingest-activity/activity-ingestion.service.ts`
- **Análise:** a sequência `updateStatus(processing) → fetch → saveIngestedData → updateStatus(processed)` faz escritas separadas. Um crash entre `saveIngestedData` e o `updateStatus(processed)` deixaria a atividade em `processing` com streams já gravados; no retry, o `fetch`+`save` são idempotentes (overwrite) e o status vira `processed`. Não há corrupção nem perda — apenas retrabalho. Aceitável para o MVP; fica a nota caso as Tasks 5/6 precisem de atomicidade entre persistência e transição (aí vale envolver em transação no repositório).

---

## 6. Completude dos testes da tarefa

| Teste exigido pela task | Status | Observação |
|-------------------------|--------|------------|
| Unidade — dedup por chave única | Coberto (parcial) | `activity-ingestion.service.spec`: early-return em `processed`. O dedup **no DB** (`on conflict`) é verificado na integração (`count===1`), não em unit. |
| Unidade — transições de status | Coberto | `activity-ingestion.service.spec`: full state machine (`processing`→`processed`), "leaves in processing for retry" no erro de fetch, "throws when no gateway handles provider". |
| Unidade — refresh de token antes do fetch (mock Strava) | **Não coberto** | Não há spec do `StravaActivityGateway` (onde o refresh precede o fetch). Refresh isolado está em `strava-token.service.spec` (Task 3), mas o "antes do fetch" não é assertado (5.1). |
| Unidade — validação do filtro de status | Coberto | `parse-activity-status.spec` (aceita 4 status, `undefined`/`''`, rejeita desconhecido) + `activities.service.spec` (repassa/rejeita). |
| Integração — `webhook → fila → worker → DB` com Redis/Postgres reais + streams de fixture | Coberto | `ingest-pipeline.int-spec`: PostGIS + Redis via testcontainers; assere métricas e `gps_streams` no DB. |
| Integração — idempotência de evento repetido | Coberto (timing fraco) | `count===1` garante; assert de `fetchCalls` é frágil (5.5). |
| Lacunas | — | `strava-activity.gateway.ts` e `http-strava-activity.client.ts` sem spec (5.1). |

Qualidade dos testes: a integração é fiel (infra real, mock só na fronteira externa), o unit do orquestrador isola bem a máquina de estados e o caminho de retry, e a validação do endpoint tem unit + integração. A lacuna concentra-se no par gateway/HTTP-client da Strava — justamente o código que materializa "refresh antes do fetch" e o consumo real da API.

---

## 7. Veredito

### `APPROVED WITH OBSERVATIONS`

Justificativa: os quatro gates passaram com os números esperados (**unit 81/81**, **lint limpo**, **build OK**, **integração 20/20**), a convenção de tipagem foi confirmada por lint (`interface` só em `*.port.ts`), e as quatro subtarefas foram entregues com arquitetura coerente e **sem ciclo de módulos** (`activities ← strava ← worker`). O núcleo com risco de bug está coberto e correto: máquina de estados `imported→processing→processed`, retry mantendo `processing` no erro de fetch, dedup durável por `UNIQUE(provider, provider_activity_id)` reforçado por early-return e `jobId`, fallback in-memory quando não há `REDIS_URL`, streams persistidos em jsonb e `GET /activities?status=` com validação (400) sob guard JWT. A integração é honesta (Redis + PostGIS reais; Strava mockada no port do gateway). O único desvio de escopo — `ActivityIngestionService` no módulo do worker em vez de `activities` — é **tecnicamente justificado** pela quebra de ciclo e está documentado no código.

Os achados não são bloqueantes: o **Maior** (5.1) é uma lacuna de cobertura no par gateway/HTTP-client da Strava que faz a linha "refresh de token antes do fetch" não estar de fato verificada — recomenda-se fechá-lo antes do merge ou como follow-up imediato (dois specs baratos, no padrão já existente do módulo). Os **Menores** (5.3 rate-limit header, 5.4 shutdown hooks) e as **Observações** (5.2, 5.5, 5.6) são endereçáveis nesta task ou nas tasks donas (5–7/12) sem retrabalho estrutural.

---

## 8. Mensagem de commit sugerida (Conventional Commits, pt-BR)

O trabalho já está commitado em `151d009` com mensagem aderente ao padrão. Caso seja necessário reescrever/consolidar:

```
feat(activities): pipeline assíncrono de ingestão (fila + worker + status)

Implementa o processamento assíncrono das atividades enfileiradas pelo
webhook: fila ingest-activity (BullMQ/Redis) com fallback in-memory
quando não há REDIS_URL, worker no processo NestJS e orquestrador
ActivityIngestionService (composição no módulo do worker para evitar
ciclo activities<->strava).

Persiste a activity com dedup por UNIQUE(provider, provider_activity_id)
e máquina de estados imported->processing->processed; falha no fetch
mantém processing para retry com backoff exponencial. Busca atividade +
streams (latlng/time/FC) via gateway provider-agnóstico
(PROVIDER_ACTIVITY_GATEWAY), com streams gravados em jsonb. Expõe
GET /activities?status= (validação do filtro, guard JWT).

Testes: unit da máquina de estados/idempotência/validação do filtro;
integração webhook->BullMQ->worker->DB com Redis + PostGIS via
testcontainers e idempotência de evento repetido.
```
