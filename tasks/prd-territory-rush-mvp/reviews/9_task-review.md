# Code Review — Tarefa 9.0: Conquistas + notificações (Expo Push)

- **Branch:** `feat/task-9-achievements-notifications`
- **Base do diff:** tag `task-8-done` → `HEAD` (`git diff task-8-done...HEAD`, worktrees ignorados)
- **Commit da task:** `fdfc6f2 feat(achievements,notifications): conquistas + Expo Push`
- **Nota sobre o range:** o intervalo `task-8-done...HEAD` também contém `aa663a3 fix(rankings): agendar refresh das MVs e remover MV nacional morta` — um **follow-up da Tarefa 8** (fecha os achados 5.1 e 5.3 do review anterior), fora do escopo da Tarefa 9. A revisão abaixo cobre apenas o commit `fdfc6f2`.
- **Escopo:** `apps/api` (NestJS 11) — módulos `achievements` e `notifications`, wiring no worker `ingest-activity`, método `RankingsService.getUserCityRank`, migração `0011_achievements_notifications.sql`
- **Data:** 2026-07-09
- **Revisor:** revisor sênior (skill `task-review` → `executar-review`)

---

## 1. Resumo

A Tarefa 9.0 fecha o loop de engajamento: após o scoring/território, o worker desbloqueia conquistas de marcos e enfileira notificações push (Expo) para os eventos que trazem o corredor de volta.

**Achievements** — motor puro e determinístico (`evaluateAchievements`) sobre uma tabela de regras (`RULES`), recebendo `RunnerStats` + os códigos já desbloqueados e devolvendo **somente os novos** (`RULES.filter(!unlocked && isSatisfied)`). O `AchievementsService.unlockForRunner` carrega stats + códigos já desbloqueados em paralelo, avalia e persiste via `unlock` (`insert ... on conflict (user_id, achievement_code) do nothing`) — dupla proteção de idempotência (filtro no motor + `on conflict` no banco). As stats vêm de `PgAchievementRepository.loadRunnerStats`: `activityCount`/`totalDistanceKm` de `activity` já `processed`, `streetsOwned` de `street.owner_user_id`, `citiesExplored` de `street_score` distinto por cidade. `GET /me/achievements` (`AchievementsController`) faz o `left join` catálogo × desbloqueios do corredor, expondo `unlocked`/`unlockedAt`.

**Notifications** — `NotificationsService.notify` persiste a `notification` e faz **dispatch best-effort**: busca os device tokens, chama `push.send(...)` e só então `markSent`; qualquer erro do push é capturado, logado em `warn` e **não propaga**. `notifyCityOnce` deduplica o `top10_city` por cidade via `hasNotificationForCity` (consulta `payload->>'cityId'`). O device token é registrado por `POST /me/device-tokens` (`upsert on conflict (token)`), e `GET /me/notifications` lista as últimas 100. O envio real é feito pelo `HttpExpoPushClient` (POST em `exp.host`), abstraído no port `ExpoPushClient` e **mockado nos testes**.

**Pipeline** — `ActivityIngestionService.dispatchEngagement` roda **após** `updateStatus(activity.id, 'processed')`, dentro de um `try/catch` que engole qualquer falha (log `warn`): emite `street_captured` ao novo dono e `street_lost` ao dono anterior de cada `TerritoryChange` real (o `territory` só retorna mudança quando há troca de posse), `achievement_unlocked` para cada marco novo, e `top10_city` (deduplicado) quando o rank ao vivo na cidade é ≤ 10. `new_neighborhood` é **deferido** (o `geo` modela cidade, não bairro — mesma decisão já registrada em `territory.service.ts`).

Os quatro gates passaram com os números exatos esperados: **unit 164/164**, **lint limpo**, **build OK**, **integração 38/38** (9 suites, ~54 s). A validação é honesta — a suíte `achievements-notifications.int-spec.ts` sobe PostGIS + Redis reais (testcontainers), roda as migrações de verdade, dispara o webhook Strava → fila → worker e verifica no banco que a atividade processada gerou conquistas, notificações e push (Expo mockado no port, sem `jest.mock` de banco/serviços).

Veredito: **`APPROVED WITH OBSERVATIONS`**. Nenhum gate falhou, as quatro subtarefas foram entregues e não há bug de comportamento nominal. Os achados são de **completude vs. a letra do requisito** e de **cobertura de teste** — não de correção do caminho feliz: (a) o marco `first_neighborhood` (RF-8.1) e a notificação `new_neighborhood` (RF-9.1) estão deferidos por bairro (coerente, porém sem nota no lado achievements/notifications); (b) o "retry" de push citado na task/RF-8.2 não existe (só best-effort não-bloqueante); (c) faltam testes de emissão de `street_lost` (takeover) e do endpoint de device token.

---

## 2. Resultado da validação de testes (execução real)

Docker de pé confirmado (`docker info` → `DOCKER_OK`). Comandos executados exatamente como especificado.

### Unit — `cd apps/api && npx jest --config jest.config.ts`

```
Test Suites: 36 passed, 36 total
Tests:       164 passed, 164 total
Snapshots:   0 total
Time:        4.399 s
Ran all test suites.
```

Esperado 164 → **164 ✅**. Inclui os novos specs da task: `achievements/achievement-rules.spec.ts` (first_run, marcos de rua com corte no threshold, distância + cidade, e não re-desbloqueio) e `notifications/notifications.service.spec.ts` (persistir+enviar+markSent; push falho não-bloqueante mantém `markSent` não chamado; sem token não envia; `notifyCityOnce` pula quando já existe), além do `activity-ingestion.service.spec.ts` ajustado para os três novos colaboradores (achievements/notifications/rankings).

### Lint — `cd apps/api && npx eslint "src/**/*.ts" "test/**/*.ts"`

```
ESLINT_EXIT=0
```

Saída limpa. Confirma a única convenção transversal aplicável (`@typescript-eslint/consistent-type-definitions`): todos os modelos/DTOs novos (`RunnerStats`, `AchievementCatalogEntry`, `RunnerAchievementView`, `NotificationType`, `NotificationPayload`, `CreateNotificationInput`, `NotificationRecord`, `ExpoPushMessage`, `RegisterDeviceTokenInput`, além do `type` interno `AchievementRule`/`NotificationRow`) usam `type`; os únicos `interface` introduzidos são os ports `AchievementRepository`, `NotificationRepository` e `ExpoPushClient`, corretamente em arquivos `*.port.ts`.

### Build — `cd apps/api && npx nest build`

```
BUILD_EXIT=0
```

Compilação OK.

### Integração — `cd apps/api && npx jest --config test/jest-int.config.ts --runInBand`

```
PASS test/achievements-notifications.int-spec.ts (7.6 s)
PASS test/ingest-pipeline.int-spec.ts (7.466 s)
PASS test/profile.int-spec.ts (5.574 s)
PASS test/anti-cheat.int-spec.ts (6.194 s)
PASS test/read-apis.int-spec.ts (5.542 s)
PASS test/territory.int-spec.ts (5.418 s)
PASS test/streets.int-spec.ts (5.54 s)
PASS test/matching.int-spec.ts (5.39 s)
PASS test/strava.int-spec.ts (5.421 s)

Test Suites: 9 passed, 9 total
Tests:       38 passed, 38 total
Snapshots:   0 total
Time:        54.215 s, estimated 58 s
Ran all test suites.
```

Esperado 38 (9 suites, ~55 s) → **38 ✅**. O novo `achievements-notifications.int-spec.ts` sobe `postgis/postgis:16-3.4` + `redis:7-alpine`, roda as migrações reais, semeia corredor (Ana), conexão Strava, device token, cidade e rua; dispara `POST /webhooks/strava` e faz *polling* real em `runner_achievement`; então valida: conquistas `first_run`/`first_street`/`first_city` desbloqueadas; notificações `street_captured`/`achievement_unlocked` persistidas + `pushes.length > 0`; `GET /me/achievements` (marco desbloqueado vs. bloqueado); `GET /me/notifications` (lista não vazia). JWT assinado real, Expo mockado apenas no port.

**Todos os gates passaram.** Nenhum motivo de `REJECTED` por falha de teste, lint ou build.

---

## 3. Aderência ao escopo da Tarefa 9.0 e critérios de sucesso

| Subtarefa | Status | Evidência |
|-----------|--------|-----------|
| 9.1 Módulo `achievements`: catálogo + regras disparadas após processamento | ✅ (ver 5.1) | `achievement-rules.ts` (motor puro), `achievements.service.ts` (`unlockForRunner`), catálogo semeado na `0011`. Disparo em `dispatchEngagement`, após `status='processed'`. Falta apenas o marco `first_neighborhood`. |
| 9.2 Módulo `notifications`: eventos + cliente Expo Push com retry não-bloqueante | ⚠️ Parcial | Eventos + persistência + `HttpExpoPushClient` best-effort não-bloqueante entregues. **"Retry" não implementado** (ver 5.2). |
| 9.3 Registro/atualização do device token + persistência de `notification` | ✅ (ver 5.3) | `POST /me/device-tokens` (`upsert on conflict (token)`), `PgNotificationRepository.create`. Endpoint sem teste. |
| 9.4 `GET /me/achievements` e `GET /me/notifications` | ✅ | `AchievementsController`/`NotificationsController` sob `SupabaseJwtGuard`; ambos verificados por integração. |

| Critério de sucesso | Status | Observação |
|---------------------|--------|------------|
| Marcos desbloqueados uma única vez e notificados | ✅ | Idempotência dupla (filtro no motor + `on conflict do nothing`); `achievement_unlocked` por marco novo. |
| Os seis eventos do PRD geram push; falha de envio não quebra o pipeline | ⚠️ Ver 5.1/5.3 | `street_captured`, `street_lost`(=território tomado), `top10_city`, `achievement_unlocked` implementados; `new_neighborhood` deferido (bairro). Não-bloqueio comprovado por unit + integração. |
| `GET /me/achievements` e `/me/notifications` refletem o estado | ✅ | Verificado por integração. |

**Mapa dos eventos do PRD (RF-9.1):** rua conquistada → `street_captured` ✓; rua perdida / território tomado por outro corredor → `street_lost` ✓ (um tipo cobre os dois, correto); entrada no Top 10 → `top10_city` ✓ (deduplicado); nova conquista → `achievement_unlocked` ✓; **novo bairro conquistado → `new_neighborhood` ✗ (deferido, ver 5.1)**.

RF-8.1 (marcos), RF-8.2 (notificar conquista), RF-9.1 (eventos) atendidos, exceto a família **bairro** (deferida coerentemente). "activityCount conta a atividade já 'processed'" confirmado: `dispatchEngagement` roda depois de `updateStatus('processed')` e `loadRunnerStats` conta `status = 'processed'`.

---

## 4. Conformidade com a Tech Spec e convenções

- **Convenção de tipagem (única regra transversal):** respeitada e confirmada por lint — modelos/DTOs em `type`, contratos (`*Repository`, `*Client`) em `interface` dentro de `*.port.ts`. As `.claude/rules` do AcquisitionNew **não se aplicam** (a própria Tech Spec dispensa; projeto greenfield NestJS/Supabase).
- **Arquitetura em camadas + ports/adapters:** ambos os módulos seguem o padrão já consolidado no projeto (service ← port `Symbol` + `useClass` no módulo ← repositório Pg). O Expo é isolado atrás de `ExpoPushClient` e sobrescrito por `useValue` no teste de integração — exatamente o ponto de mock previsto na Tech Spec ("Mock apenas de serviços externos ... Expo").
- **Modelos de dados:** `0011` cria `achievement` (catálogo semeado), `runner_achievement` (PK `user_id`+`code`, FK ao catálogo), `device_token` (token `unique`, índice por usuário) e `notification` (`payload jsonb`, índice `user_id, created_at desc`) — alinhado à Tech Spec ("Modelos de Dados"). `device_token` não colide com nenhuma migração anterior; dependências (`activity.user_id/distance_m/status`, `street.owner_user_id/city_id`, `street_score`) já existem (0006/0008).
- **Endpoints:** `GET /me/achievements` e `GET /me/notifications` batem 1:1 com a Tech Spec. `POST /me/device-tokens` (204) é o complemento natural do "token de device registrado no login".
- **Pipeline assíncrono + Expo não-bloqueante:** fiel à Tech Spec ("Expo Push — falha de push é não-bloqueante (log + retry)"). O não-bloqueio está implementado e testado; o "retry" fica em aberto (5.2).
- **Honestidade da validação:** unit cobre a lógica pura (regras de marco) e o contrato best-effort do service; integração exercita webhook→fila→worker→DB contra Postgres+Redis reais, com Expo mockado só no port. Sem fake-green.

---

## 5. Achados

Nenhum achado bloqueante. Ordenados por severidade.

### 5.1 [Maior / Observação] Família "bairro" deferida: marco `first_neighborhood` (RF-8.1) ausente e `new_neighborhood` (RF-9.1) scaffolded sem emissão nem nota local

- **Arquivos:** `supabase/migrations/0011_achievements_notifications.sql:10-22` (catálogo), `apps/api/src/modules/achievements/achievement-rules.ts:8-20` (regras), `apps/api/src/modules/notifications/notifications.types.ts:6` + `push-message.ts:8` (tipo + mensagem `new_neighborhood`), `apps/api/src/workers/ingest-activity/activity-ingestion.service.ts:84-116` (dispatch).
- **Análise:** o PRD (RF-8.1) lista o marco **"primeiro bairro conquistado"** e a RF-9.1 lista o evento **"novo bairro conquistado"**; os requisitos da própria task repetem ("primeiro bairro"; "novo bairro"). No entregue: o catálogo tem 11 marcos e **não inclui** `first_neighborhood`; o tipo `new_neighborhood` e sua mensagem existem, mas **nenhum ponto do worker os emite**. A deferral é legítima e coerente — o `geo` modela cidade, não bairro, e `territory.service.ts:103-106` já documenta isso para o scoring (`newNeighborhoods = 0`). O problema é de **rastreabilidade**: diferente do scoring, nem o catálogo/`achievement-rules.ts` nem o `notifications.types.ts` trazem nota explicando que a família bairro está deferida, e o marco de conquista simplesmente não aparece no catálogo. Um leitor futuro pode concluir que RF-8.1/RF-9.1 estão integralmente atendidas. Observo também que o foco do próprio review lista o conjunto de marcos **sem** "primeiro bairro" — sinal de que a deferral é esperada; falta apenas registrá-la.
- **Impacto:** nenhum funcional (o dado de bairro não existe); risco de leitura equivocada do escopo entregue e de esses dois itens ficarem esquecidos quando o `geo` ganhar limites de bairro.
- **Sugestão:** (a) adicionar nota curta em `achievement-rules.ts`/`0011` e em `notifications.types.ts`/`push-message.ts` registrando que `first_neighborhood`/`new_neighborhood` estão deferidos até o `geo` ter bairros — espelhando o comentário já presente em `territory.service.ts`; e (b) anotar a deferral no `9_task.md`, como já foi feito para `newNeighborhoods` na Tarefa 6.

### 5.2 [Menor / Observação] "Retry" de push mencionado (RF-8.2 / subtarefa 9.2) não implementado — só best-effort não-bloqueante

- **Arquivos:** `apps/api/src/modules/notifications/notifications.service.ts:46-62` + `apps/api/src/workers/ingest-activity/activity-ingestion.service.ts:113-115`
- **Análise:** a subtarefa 9.2 e a RF-8.2 falam em "cliente Expo Push com **retry** não-bloqueante". O implementado cobre o **não-bloqueante** com folga (o `dispatch` captura o erro, loga `warn` e deixa a `notification` com `sent_at = null`; o `dispatchEngagement` no worker também engole tudo), mas **não há reenvio**: nenhuma rotina relê notificações não enviadas, e — como a exceção é engolida dentro do worker — o job BullMQ conclui com sucesso e também não re-tenta. Ou seja, um push que falha fica permanentemente `sent_at = null` sem nova tentativa. A persistência do registro *habilita* um retry futuro, mas ele não existe hoje. É o análogo, nesta task, do achado 5.1 da Tarefa 8 (mecanismo correto, agendador ausente) — que, aliás, já foi fechado no follow-up `aa663a3`.
- **Impacto:** notificações perdidas de forma silenciosa quando o Expo falha momentaneamente; o `sent_at` fica como único vestígio. Não quebra o pipeline (é justamente o objetivo).
- **Sugestão:** fechar o laço com uma das opções: (a) um `@Cron` (o `ScheduleModule` já está no app) varrendo `notification` com `sent_at is null` e reenviando; (b) reenfileirar um job dedicado de push com backoff (coerente com a fila já existente); ou (c) documentar explicitamente que o MVP entrega apenas best-effort e o retry fica para uma task seguinte. Acompanhar com um teste do ciclo escolhido.

### 5.3 [Menor / Observação] Lacunas de cobertura: emissão de `street_lost`, endpoint de device token e asserção do `top10_city`

- **Arquivos:** `apps/api/test/achievements-notifications.int-spec.ts` + `apps/api/src/workers/ingest-activity/activity-ingestion.service.spec.ts`
- **Análise:** três caminhos entregues não são exercitados/asseridos:
  1. **`street_lost` (takeover):** a emissão ao dono anterior (`activity-ingestion.service.ts:94-98`) só ocorre quando há troca de posse com dono prévio. Nenhum teste semeia dois corredores com uma disputa, então esse ramo — um dos eventos centrais do PRD ("território tomado por outro corredor") — tem **cobertura zero**. No unit do worker, `scoreAndApply` é mockado devolvendo `[]`, então nenhuma `notify` é asserida.
  2. **`POST /me/device-tokens` / `upsertDeviceToken`:** sem qualquer teste — o int-spec semeia o token via SQL cru. O `on conflict (token) do update` (upsert/atualização) não é verificado.
  3. **`top10_city`:** no int-spec a Ana passa a dominar a rua (rank 1 ≤ 10), então o ramo `notifyCityOnce('top10_city', ...)` **roda**, mas o teste não o **asserta** (o `arrayContaining` de tipos não o exige).
- **Impacto:** o critério de sucesso "os seis eventos do PRD geram push corretamente" está comprovado só para `street_captured`/`achievement_unlocked`; `street_lost` fica sem rede de segurança e uma regressão passaria despercebida.
- **Sugestão:** adicionar ao int-spec um segundo corredor que toma a rua da Ana (asserir `street_lost` para a Ana e `street_captured` para o novo dono, além do `disputes_count`), asserir explicitamente o `top10_city`, e um teste do `POST /me/device-tokens` cobrindo inserção e upsert.

### 5.4 [Nit] `buildPushMessage` ignora o payload → mensagens genéricas idênticas por tipo

- **Arquivo:** `apps/api/src/modules/notifications/push-message.ts:11-14`
- **Análise:** a função descarta `_payload` e devolve uma mensagem estática por tipo (ex.: "Você conquistou uma nova rua."), sem o nome da rua, o título da conquista ou o rank — dados que já trafegam no payload persistido. Funcional e aceitável para o MVP; reduz a qualidade percebida da notificação.
- **Sugestão:** enriquecer a mensagem a partir do payload (nome da rua/conquista/rank) quando houver UX definida; a assinatura já recebe o payload.

### 5.5 [Nit] `HttpExpoPushClient` não trata tickets/receipts, não faz chunking nem poda tokens inválidos

- **Arquivo:** `apps/api/src/modules/notifications/clients/http-expo-push.client.ts:9-22`
- **Análise:** o cliente envia todos os tokens num único POST e só checa o `response.ok` (status HTTP). A API Expo devolve *tickets* por mensagem (com erros como `DeviceNotRegistered`) e limita ~100 mensagens por request. O cliente atual não inspeciona tickets nem faz chunking, então tokens inválidos nunca são removidos de `device_token` e lotes grandes falhariam. Como está atrás do port e mockado nos testes, não afeta a Tarefa 9; é endurecimento de produção.
- **Sugestão:** em iteração futura, ler os tickets, chunkar em 100 e agendar a leitura de receipts para podar tokens `DeviceNotRegistered`.

### 5.6 [Nit] Possível `achievement_unlocked` duplicado sob concorrência (read-then-write)

- **Arquivos:** `apps/api/src/modules/achievements/achievements.service.ts:12-20` + `repositories/achievement.repository.ts:43-53`
- **Análise:** `unlockForRunner` lê os códigos já desbloqueados, avalia e insere. Se duas atividades do mesmo corredor forem processadas em paralelo, ambas podem ler o mesmo conjunto antes de qualquer `insert`, avaliar o mesmo marco como "novo" e ambas emitirem `achievement_unlocked` (o `insert ... on conflict do nothing` deduplica a *linha*, mas o `newlyUnlocked` devolvido — que dirige a notificação — não). Com o processamento sequencial da fila por corredor o risco é baixo.
- **Sugestão:** derivar o `newlyUnlocked` das linhas realmente inseridas (`insert ... on conflict do nothing returning achievement_code`) para tornar a emissão à prova de corrida.

### 5.7 [Nit] Dedupe de `top10_city` é permanente (não re-notifica reentrada)

- **Arquivo:** `apps/api/src/modules/notifications/notifications.service.ts:26-36` + `repositories/notification.repository.ts:69-75`
- **Análise:** `notifyCityOnce` nunca re-notifica após a primeira entrada no Top 10 de uma cidade, mesmo que o corredor caia e volte a entrar. É uma escolha anti-spam razoável e casa com o pedido "dedupe de top10 por cidade"; registro apenas para confirmar que é decisão de produto (e não "cada entrada").

---

## 6. Completude dos testes da tarefa

| Teste exigido pela task | Status | Observação |
|-------------------------|--------|------------|
| Unidade — regras de desbloqueio (idempotência) | Coberto | `achievement-rules.spec.ts`: first_run; marcos de rua com corte no threshold; distância+cidade; não re-desbloqueia já desbloqueados. |
| Unidade — despacho de push (Expo mockado, best-effort) | Coberto | `notifications.service.spec.ts`: persiste+envia+markSent; push falho não-bloqueante; sem token não envia; `notifyCityOnce` deduplica. |
| Unidade — geração de eventos (worker) | Parcial | `activity-ingestion.service.spec.ts` valida o fluxo de scoring, mas mocka colaboradores com `changes=[]`/`rank=null` — não asserta os ramos `street_captured`/`street_lost`/`top10_city` (ver 5.3). |
| Integração — atividade → conquista + notificação + push | Coberto | `achievements-notifications.int-spec.ts`: PostGIS+Redis reais, webhook→fila→worker, conquistas + `street_captured`/`achievement_unlocked` + push (mock no port) + os dois GET. |

Qualidade dos testes: **alta** no motor puro e no contrato best-effort do service; **honesta** na integração (Postgres+Redis reais, migrações reais, JWT assinado, Expo só no port, sem `jest.mock` de banco/serviços). Lacunas não bloqueantes concentradas em 5.3: `street_lost` (takeover) sem cobertura, endpoint de device token sem teste, `top10_city` executado mas não asserido.

---

## 7. Veredito

### `APPROVED WITH OBSERVATIONS`

Justificativa: os quatro gates passaram com os números exatos esperados (**unit 164/164**, **lint limpo**, **build OK**, **integração 38/38** em 9 suites, ~54 s), a convenção de tipagem foi confirmada por lint (modelos em `type`; únicos `interface` nos ports `*.port.ts`) e as quatro subtarefas foram entregues com implementação correta: motor de conquista puro e idempotente (filtro no motor + `on conflict do nothing`), stats computadas das atividades já `processed`, notificações persistidas com dispatch **best-effort não-bloqueante** (push mockado no port), dedupe de `top10_city` por cidade, e o dispatch de engajamento rodando **após** `status='processed'` dentro de `try/catch` — garantindo que a atividade fica `processed` mesmo se as notificações falharem (robustez exigida, comprovada por unit e integração). A validação é honesta: integração contra PostGIS+Redis reais, migrações reais, webhook→fila→worker de verdade, Expo isolado só no port.

Os achados não são bloqueantes e nenhum é bug de comportamento nominal. O **Maior** (5.1) é de completude vs. a letra do requisito: a família "bairro" (marco `first_neighborhood` de RF-8.1 e evento `new_neighborhood` de RF-9.1) está deferida coerentemente — o `geo` não modela bairro — mas sem nota no lado achievements/notifications; recomenda-se documentar a deferral espelhando `territory.service.ts`. As **Observações** — 5.2 ("retry" de push citado mas não implementado; só best-effort) e 5.3 (falta cobertura de `street_lost`/endpoint de device token e asserção de `top10_city`) — são endereçáveis nesta ou nas próximas tasks sem retrabalho estrutural. Os **Nits** (5.4 mensagens genéricas, 5.5 cliente Expo sem tickets/chunking, 5.6 possível `achievement_unlocked` duplicado sob concorrência, 5.7 dedupe permanente de top10) são melhorias/pontos de confirmação. Nenhum achado justifica `REJECTED`.

---

## 8. Mensagem de commit sugerida (Conventional Commits, pt-BR)

O trabalho já está commitado em `fdfc6f2` com mensagem aderente ao padrão. Caso seja necessário reescrever/consolidar:

```
feat(achievements,notifications): conquistas + Expo Push

Fecha o loop de engajamento após o scoring. O módulo achievements
desbloqueia marcos (primeira corrida/rua/cidade, 10..1000 ruas,
100..1000 km) de forma idempotente — motor puro filtra os já
desbloqueados e o insert usa on conflict do nothing. As stats saem
das atividades já processed.

O módulo notifications persiste cada evento e despacha via Expo Push
best-effort e não-bloqueante (falha loga warn e não derruba o
pipeline). Emite street_captured, street_lost, top10_city (dedup por
cidade) e achievement_unlocked no worker, após status=processed.
Adiciona POST /me/device-tokens, GET /me/achievements e
GET /me/notifications, mais a migração 0011 (achievement,
runner_achievement, device_token, notification).

new_neighborhood/first_neighborhood ficam deferidos até o geo
modelar bairros. Testes: unit das regras e do dispatch best-effort;
integração real (PostGIS+Redis) atividade -> conquista + notificação
+ push (Expo mockado no port).
```
