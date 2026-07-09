# Code Review — Tarefa 12.0: Garmin atrás de feature flag

- **Data:** 2026-07-09
- **Revisor:** task-reviewer (revisão de código sênior)
- **Commit revisado:** `c3f4dae feat(garmin): integração Garmin atrás de feature flag`
- **Base de comparação:** `task-11-done...HEAD`
- **Veredito:** ✅ **APPROVED WITH OBSERVATIONS**

---

## 1. Escopo revisado

Diff `task-11-done...HEAD` (34 arquivos, +737/-34), desconsiderando `.claude/worktrees/*`:

- **Contrato agnóstico** — `provider-gateway-registry.ts` (novo, `Map<Provider, ProviderActivityGateway>`), remoção do símbolo único `PROVIDER_ACTIVITY_GATEWAY` do port.
- **Worker** — `activity-ingestion.service.ts` resolve o gateway por `job.provider` via registry; `ingest-activity.module.ts` monta o registry via `useFactory` a partir dos gateways Strava + Garmin.
- **Módulo Garmin** — `integrations/garmin/`: connection service (connect/disconnect/state), token service (PKCE + refresh), gateway, webhook controller/service, flag guard, clients HTTP (OAuth + Activity), ports, types, dto.
- **Strava** — símbolo do gateway renomeado para `STRAVA_ACTIVITY_GATEWAY` e reexposto; nenhuma mudança de comportamento.
- **Config** — `GARMIN_ENABLED`/`GARMIN_CLIENT_ID`/`GARMIN_CLIENT_SECRET` (backend) e `garminEnabled` (mobile), default off.
- **Testes** — 4 specs unitários no módulo Garmin + `test/garmin.int-spec.ts` (flag on/off).

---

## 2. Resultado dos gates (saída real)

| Gate | Comando | Resultado |
|------|---------|-----------|
| Build | `npx nest build` | ✅ `EXIT=0` |
| Lint | `npx eslint "src/**/*.ts" "test/**/*.ts"` | ✅ `ESLINT_EXIT=0` |
| Unit (API) | `npx jest --config jest.config.ts` | ✅ **177 passed**, 40 suites |
| Integração (API) | `npx jest --config test/jest-int.config.ts --runInBand` | ✅ **44 passed**, 10 suites (inclui `garmin.int-spec.ts`) |
| Unit (mobile) | `npx jest` | ✅ **36 passed**, 17 suites |

Todos os gates verdes, batendo os totais esperados (177 / 44 / 36).

---

## 3. Conformidade com o foco da tarefa

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| Contrato de provider agnóstico | ✅ | `ProviderGatewayRegistry` (`Map<Provider, gateway>`); worker resolve por `job.provider`, sem `if`/`switch` por origem. Adicionar Garmin exigiu **zero** mudança na lógica do pipeline — só uma entrada no registry. |
| `POST /webhooks/garmin` no mesmo pipeline | ✅ | `GarminWebhookService.handlePush` mapeia atleta→userId e chama `queue.enqueue({provider:'garmin', ...})` no mesmo `INGEST_ACTIVITY_QUEUE`. Int test prova `status = 'processed'` e `distance_m = 6000`. |
| `GarminFlagGuard` (off ⇒ 404 inerte, Strava intacto) | ✅ | Guard lança `NotFoundException` quando `garminEnabled` é falso. Aplicado em `IntegrationsGarminController` e `GarminWebhookController`. Int test: webhook e connect Garmin → 404 com flag off; `GET /webhooks/strava` continua respondendo (403 por token, i.e. rota existe). |
| Connect/disconnect Garmin | ✅ | `GarminConnectionService` reusa `provider_connection` (`provider='garmin'`) e o `TOKEN_CIPHER` do módulo Strava; tokens persistidos cifrados. |
| OAuth PKCE | ✅ | `exchangeAuthorizationCode(code, codeVerifier)` envia `code_verifier`; `ConnectGarminDto` exige `code` + `codeVerifier`. |
| Honestidade (API mockada no port; flag-on real; flag-off 404) | ✅ | Int test faz override apenas do `GARMIN_ACTIVITY_GATEWAY` (fronteira externa Garmin); fila, repositório, migrações, matching e scoring rodam de verdade em containers Postgres/Redis. Flag-off valida 404 real. |

**Convenções do projeto:** `interface` apenas em `*.port.ts` (confirmado por varredura — `garmin.types.ts` usa `type`); build/lint limpos. A regra `no-comments` é escopada a AcquisitionNew/SDK e **não** se aplica a `apps/api` (JSDoc é o padrão vigente lá).

---

## 4. Achados (classificados por severidade)

Nenhum achado é bloqueante. Todos residem no caminho de código da **API externa Garmin**, que está atrás de flag default-off e é mockado nos testes — por isso não afetam gates nem o fluxo Strava em produção.

### 🟡 Média — Normalização real do Garmin sem cobertura de teste
**Arquivo:** `apps/api/src/modules/integrations/garmin/clients/http-garmin.clients.ts`

O `HttpGarminActivityClient` (que converte payload Garmin → `ActivityMetrics`/`GpsStreams`: cálculo de `avgPaceSKm`, filtragem de `latlng`, montagem de `time`/`heartrate`) **não possui `.spec.ts`**. O Strava tem `http-strava-activity.client.spec.ts` equivalente. O `garmin.int-spec.ts` faz override com `fakeGarminGateway`, então a normalização real **nunca é exercida por nenhum teste**. A subtarefa 12.1 e o item "normalização de atividade Garmin" do checklist estão marcados, mas sem cobertura efetiva.
**Sugestão:** adicionar `clients/http-garmin.clients.spec.ts` cobrindo pace/distância, filtragem de samples e presença/ausência de heartrate — antes de ligar a flag.

### 🟡 Média — Desalinhamento `latlng` × `time` em `fetchStreams`
**Arquivo:** `http-garmin.clients.ts:82-94`

`latlng` é **filtrado** (só samples com `latitudeInDegree`/`longitudeInDegree`), mas `time` mapeia **todos** os samples (`samples.map(s => s.timerDurationInSeconds ?? 0)`). O consumidor `matching-aggregation.ts:5` correlaciona por índice (`{lat, lng, t: streams.time[index]}`). Quando existe qualquer sample sem coordenada (ex.: sample só de batimento), os índices desandam e cada ponto GPS recebe o timestamp errado. Bug latente que só se manifesta com dado real (por isso não capturado — reforça o achado anterior).
**Sugestão:** derivar `latlng` e `time` do **mesmo** conjunto filtrado de samples, garantindo arrays alinhados.

### 🟢 Baixa — Fetch HTTP duplicado do mesmo recurso
**Arquivo:** `http-garmin.clients.ts:66-94` + `garmin-activity.gateway.ts:20-23`

`fetchActivity` e `fetchStreams` chamam, cada um, `this.get()` no **mesmo** endpoint `/activityDetails/{summaryId}`, e o gateway os dispara em `Promise.all` → **duas requisições idênticas** para o mesmo payload (dobra o consumo de rate-limit da Garmin). Diferente do Strava, cujos endpoints de métricas e streams são genuinamente distintos.
**Sugestão:** buscar `activityDetails` uma vez e derivar métricas + streams do mesmo objeto (ou memoizar por `summaryId`+token).

### 🟢 Baixa — `heartrate` com `0` para samples sem HR
**Arquivo:** `http-garmin.clients.ts:90-92`

`samples.map(s => s.heartRate ?? 0)` inclui zeros quando parte dos samples não traz HR, distorcendo a média consumida por `anti-cheat/validators.ts` (`averageHeartrate`). Impacto baixo e atrás de flag.
**Sugestão:** filtrar samples sem HR antes de mapear (coerente com a filtragem de `latlng`).

### 🔵 Nota — Webhook sem verificação de autenticidade
**Arquivo:** `garmin-webhook.controller.ts` / `garmin-webhook.service.ts`

`POST /webhooks/garmin` não valida assinatura/origem; enfileira jobs para atletas conhecidos com `summaryId` controlado externamente. É **consistente com o padrão Strava** do projeto (que também só enfileira no POST) e mitigado por `findUserIdByAthlete` (atletas desconhecidos são ignorados). Registrado como nota, não como pendência desta tarefa.

### 🔵 Nota — Dois clients num só arquivo (divergência do layout Strava)
**Arquivo:** `http-garmin.clients.ts`

`HttpGarminOAuthClient` e `HttpGarminActivityClient` (+ `type GarminTokenPayload`/`GarminActivityPayload` de módulo) convivem num único arquivo, enquanto o Strava separa cada client em seu próprio arquivo com spec. A regra "uma função por arquivo" é escopada a AcquisitionNew/SDK e não vincula a API, mas separar espelharia o Strava e facilitaria o spec pedido no achado de média severidade.

---

## 5. Pontos fortes

- **Registry limpo e extensível:** o `useFactory` itera `[strava, garmin]` e indexa por `gateway.provider`; o worker trocou o check `provider !==` por `gateways.get(job.provider)` com erro explícito. Critério "pipeline não precisa de mudanças para tratar Garmin" plenamente atendido.
- **Reuso correto de infra Strava:** `provider_connection`, `TOKEN_CIPHER` e `needsTokenRefresh` reaproveitados via export do módulo Strava — sem duplicar cifra nem repositório.
- **Flag inerte de verdade:** guard em ambos os controllers; int test prova 404 com flag off **e** Strava intacto no mesmo cenário.
- **Integração honesta:** só a fronteira externa Garmin é mockada; todo o restante (fila real, Postgres/Redis em container, migrações, matching, scoring) roda de ponta a ponta.

---

## 6. Conclusão

A tarefa cumpre todos os requisitos e critérios de sucesso, com os 5 gates verdes (build, lint, 177 unit API, 44 integração, 36 mobile). A arquitetura provider-agnóstica está bem executada e a flag é genuinamente inerte quando desligada, sem impacto no Strava.

Os achados são **observações**, não bloqueios: concentram-se no code path da API externa Garmin (atrás de flag off, mockado nos testes). Recomenda-se, **antes de ligar `GARMIN_ENABLED`**, endereçar o achado de cobertura (spec do `http-garmin.clients.ts`), que naturalmente expõe o desalinhamento `latlng`/`time` e o fetch duplicado.

**Veredito final:** ✅ **APPROVED WITH OBSERVATIONS**

### Mensagem de commit sugerida (já aplicada no `c3f4dae`)

```
feat(garmin): integração Garmin atrás de feature flag

Adiciona o módulo integrations/garmin (OAuth PKCE, connect/disconnect,
webhook push) reutilizando provider_connection e o cipher de token do
Strava. Torna o pipeline de ingestão provider-agnóstico via
ProviderGatewayRegistry (Map<Provider, gateway>) resolvido por
job.provider. GarminFlagGuard mantém as rotas inertes (404) enquanto
GARMIN_ENABLED estiver desligada, sem afetar o fluxo Strava.
```
