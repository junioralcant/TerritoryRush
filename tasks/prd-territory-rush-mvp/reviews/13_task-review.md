# Code Review — Tarefa 13.0: Endurecimento (E2E Playwright + observabilidade)

- **Data:** 2026-07-09
- **Revisor:** task-reviewer (revisão de código sênior)
- **Commit revisado:** `1f0d5b7 feat(observability,e2e): /metrics + Sentry + logs correlacionados + E2E`
- **Base de comparação:** `task-12-done...HEAD`
- **Veredito:** ✅ **APPROVED WITH OBSERVATIONS**

---

## 1. Escopo revisado

Diff `task-12-done...HEAD` (29 arquivos, +1425/-24), desconsiderando `.claude/worktrees/*`:

- **Observabilidade (novo módulo)** — `src/observability/`: `MetricsService` (registry `prom-client`, 6 métricas de domínio + default metrics com prefixo `territory_rush_`), `MetricsController` (`GET /metrics`), `ObservabilityModule` (`@Global`), `sentry.ts` (`initSentry` inerte sem DSN + `captureException`).
- **Instrumentação** — `activity-ingestion.service.ts` (duração da ingestão, rejeição anti-cheat, trocas de domínio + logs por `activityId`); `http-osrm.client.ts` (latência do `/match`); `http-strava-activity.client.ts` (hits de rate limit 429).
- **Bootstrap** — `main.ts` chama `initSentry(sentryDsn)`; `app.module.ts` registra `ObservabilityModule`; `configuration.ts` + `app-config.type.ts` expõem `sentryDsn`.
- **E2E** — `apps/api/e2e/journey.e2e-pw.spec.ts` (Playwright HTTP contra stack servido, skip sem `E2E_BASE_URL`) + `playwright.config.ts`; `e2e/README.md` (harness UI documentado).
- **Testes** — `test/journey.int-spec.ts` (jornada completa jest+supertest com PostGIS+Redis reais, mocks nas fronteiras Strava/OSRM), `test/observability.int-spec.ts` (smoke `/metrics`), acréscimo em `ingest-pipeline.int-spec.ts` (`/metrics` após ingestão), specs de `MetricsService` e `sentry`.
- **Config de build** — `tsconfig(.build).json` passam a incluir/excluir `e2e/`.

---

## 2. Resultado dos gates (saída real)

| Gate | Comando | Resultado |
|------|---------|-----------|
| Build | `npx nest build` | ✅ `BUILD_EXIT=0` |
| Lint | `npx eslint "src/**/*.ts" "test/**/*.ts" "e2e/**/*.ts"` | ✅ `LINT_EXIT=0` |
| Unit (API) | `npx jest --config jest.config.ts` | ✅ **186 passed**, 43 suites (5.7s) |
| Integração (API) | `npx jest --config test/jest-int.config.ts --runInBand` | ✅ **46 passed**, 12 suites (72.3s) |
| E2E | `npx playwright test --config e2e/playwright.config.ts` | ✅ **1 skipped** (sem `E2E_BASE_URL`), sem falhas |

Todos os gates verdes, batendo os totais esperados (186 / 46-12suites / 1 skipped).

---

## 3. Conformidade com o foco da tarefa

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| `/metrics` Prometheus com instrumentação real | 🟡 parcial | 5 das 7 métricas da techspec instrumentadas de verdade: duração ingestão (`activity-ingestion.service.ts:63,89`), latência OSRM (`http-osrm.client.ts:52`), rejeição anti-cheat (`:62`), rate limit Strava (`http-strava-activity.client.ts:42`), trocas de domínio (`:88`). **Ver Achado #1** (profundidade/idade da fila). |
| Logs com correlação por `activityId` | ✅ | `activity-ingestion.service.ts` loga `activity ${activity.id} processed/rejected: ...` em `INFO`; worker loga `ERROR` em job failed. Correlação por `activityId` presente. Gap menor no conteúdo — ver Achado #4. |
| Sentry condicional (inerte sem DSN) | 🟡 parcial | `initSentry` retorna `false` e é no-op sem DSN (`sentry.spec.ts` cobre); `captureException` não lança sem init. **Ver Achado #2** (não há call site que encaminhe erros da aplicação ao Sentry). |
| E2E cobrindo a jornada-chave do PRD | ✅ (com observação) | `journey.int-spec.ts` exercita connect Strava → webhook → worker BullMQ → `processed` → `/streets` (owned) → `/streets/:id` → `/me/profile` → `/rankings/city` → notificação `street_captured`, com PostGIS+Redis reais. **Ver Achado #3** (troca de domínio por segundo corredor não está na jornada E2E). |

**Convenções do projeto:** `interface` apenas em `*.port.ts` — varredura no diff não encontrou `interface` nova fora de ports (novos arquivos usam `class`/`type`/funções). Build e lint limpos. A regra `no-comments` é escopada a AcquisitionNew/SDK e **não** se aplica a `apps/api` — JSDoc/comentários são o padrão vigente (46 arquivos com comentários no `src`), então os comentários em `observability.module.ts`/`sentry.ts` são consistentes.

---

## 4. Avaliação de honestidade da entrega (E2E de UI)

A entrega **é adequada e honestamente disclosed** dada a restrição técnica:

- O E2E de UI completo (Expo web + MapLibre + OSRM real) **não roda aqui** — está corretamente documentado em `e2e/README.md` como harness manual (docker compose + OSRM com extrato + serve Expo + `playwright install`), e o comentário de topo de `journey.e2e-pw.spec.ts` explica o motivo: **o Playwright não transpila os parameter decorators do NestJS**, então a jornada in-process vive no jest.
- A jornada real (fronteiras externas OSRM/Strava mockadas nos *ports*, PostGIS+Redis reais via Testcontainers) está no `journey.int-spec.ts` — decisão correta: mockar só na fronteira externa (política `no-mocks-in-tests` respeitada; fila/repos/migrações/matching/scoring rodam de verdade).
- A suíte Playwright para stack servido (`E2E_BASE_URL`) faz smoke honesto de `/metrics` + perfil autenticado e **pula limpo** quando não há stack — não finge cobertura que não tem.

Ressalva: a parte **"frontend"** de "frontend + backend" (requisito literal do PRD/techspec) não é exercitada por teste automatizado nesta task — é harness documentado + testes de componente do `apps/mobile` contra API fake. Trade-off defensável e transparente, não bloqueante.

---

## 5. Achados

### 🟠 #1 (Média) — Métrica de fila: `queue_depth` é gauge morto e **idade da fila não existe**
`MetricsService.setQueueDepth` (`metrics.service.ts:72`) **não tem nenhum call site** em `src` (varredura confirmou). O gauge `territory_rush_ingest_queue_depth` é registrado e sempre reporta `0` — inclusive o `observability.int-spec.ts` valida sua *presença*, mas não seu valor, então a métrica passa no teste estando morta. Além disso, a techspec (linha 160) pede **"profundidade e idade da fila"** e **não há métrica de idade** alguma. A fila BullMQ tem um `Queue` disponível (`bullmq-ingest-activity.queue.ts:17`), então amostrar `getWaitingCount()`/idade do job mais antigo via um `@Interval`/`@Cron` e chamar `setQueueDepth(...)` é direto. **Sugestão:** wirar a amostragem periódica da profundidade e adicionar um gauge de idade (`territory_rush_ingest_queue_oldest_job_age_seconds`), ou remover o gauge órfão se a decisão for adiar a métrica de fila.

### 🟠 #2 (Média) — Sentry inicializa mas erros da aplicação não chegam a ele
`captureException` (`sentry.ts:16`) **não é chamado em lugar nenhum** do código produtivo. O handler `worker.on('failed', ...)` (`ingest-activity.worker.ts`) apenas loga `ERROR`, sem `captureException(error)`. Sem um `ExceptionFilter` global nem chamada explícita, apenas exceções *não capturadas* (via integrações default do `@sentry/node`) chegariam — mas erros de job/HTTP são capturados pelo NestJS/BullMQ e **não** propagariam. A techspec pede `ERROR em falha de match/token` → Sentry. **Sugestão:** chamar `captureException(error)` no handler `failed` do worker (e/ou registrar um `APP_FILTER` que capture antes de responder). Baixo custo, fecha o requisito "erros chegam ao Sentry".

### 🟡 #3 (Baixa) — Jornada E2E não cobre a troca de domínio "via segundo corredor"
O requisito do PRD cita explicitamente "notificação de troca de domínio (via seed de atividade de outro corredor)". O `journey.int-spec.ts` valida apenas a **primeira** conquista (rua virgem → `street_captured`); não semeia um segundo corredor tomando a rua (→ `street_lost`/`previousOwnerId`). O comportamento **está coberto** em outras camadas (`activity-ingestion.service.spec.ts:157` e `territory.int-spec.ts:108`), mas não no fluxo ponta a ponta. **Sugestão:** estender a jornada com um segundo `owner` semeado para exercitar `street_lost` de fato no caminho webhook→worker.

### 🟡 #4 (Baixa) — Log `INFO` não inclui pontos; rate limit sai como `ERROR`, não `WARN`
Techspec (linha 161): `INFO` por atividade processada com **(id, ruas casadas, pontos)** e `WARN` em retry/rate limit. O log atual traz `id + ruas + trocas de posse`, sem **pontos**; e o 429 da Strava vira `throw` → job failed → `ERROR` no worker (não `WARN`). Desvios pequenos de granularidade de log, não afetam a correlação. **Sugestão:** incluir pontos no log de processamento e logar `WARN` no caminho de rate limit antes de propagar.

### 🟡 #5 (Baixa) — Duração da ingestão não é observada em falha de matching/OSRM
`observeIngestionDuration` é chamado no caminho de rejeição (anti-cheat) e no sucesso, mas **não** quando `matchActivityStreets`/OSRM lança (a atividade fica em `processing`/retry). Jobs que falham no match não contribuem para o histograma de duração. **Sugestão:** envolver o corpo em `try/finally` para registrar a duração independentemente do desfecho.

### ⚪ #6 (Nit) — Artefato do Playwright commitado
`apps/api/test-results/.last-run.json` foi commitado e **não** está no `.gitignore` (só `dist/` e `coverage/` estão). É saída de execução de teste. **Sugestão:** adicionar `apps/**/test-results/` e `**/playwright-report/` ao `.gitignore` e remover o arquivo do tracking.

---

## 6. Conclusão

Todos os 5 gates verdes com os totais esperados (186 unit / 46 int em 12 suites / 1 E2E skipped). O núcleo de observabilidade (`/metrics` com 5 métricas de domínio realmente instrumentadas + default metrics, logs correlacionados por `activityId`, Sentry inerte sem DSN) e a jornada-chave ponta a ponta estão entregues, com honestidade explícita sobre o limite do E2E de UI. Os achados são **incrementos de endurecimento** (fila depth/age dead/ausente, Sentry não wirado ao caminho de erro, cobertura de troca de domínio na jornada, granularidade de log) — nenhum quebra o loop do produto nem os gates. Recomenda-se tratar #1 e #2 antes do go-live de observabilidade, pois tocam requisitos explícitos da techspec.

**Veredito: ✅ APPROVED WITH OBSERVATIONS**

### Mensagem de commit sugerida (caso os achados #1/#2 sejam endereçados nesta task)

```
fix(observability): wirar profundidade/idade da fila e encaminhar erros do worker ao Sentry

- amostra periódica de queue depth + gauge de idade do job mais antigo
- captureException no handler failed do worker
- ignora artefatos de test-results no git
```

> Como a entrega atual já está commitada em `1f0d5b7`, os achados podem alternativamente ser abertos como itens de follow-up sem bloquear o merge.
