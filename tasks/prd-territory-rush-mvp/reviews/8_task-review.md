# Code Review — Tarefa 8.0: APIs de leitura (detalhe da rua + perfil + rankings)

- **Branch:** `feat/task-8-read-apis`
- **Base do diff:** tag `task-7-done` → `HEAD` (`git diff task-7-done...HEAD`, worktrees ignorados)
- **Commit da task:** `546714d feat(read-apis): detalhe da rua + perfil enriquecido + rankings`
- **Escopo:** `apps/api` (NestJS 11) — módulos `territory`, `profile`, `rankings` + migração `0010_rankings_mv.sql`
- **Data:** 2026-07-09
- **Revisor:** revisor sênior (skill `task-review` → `executar-review`)

---

## 1. Resumo

A Tarefa 8.0 expõe as três APIs de leitura que o app consome para tornar visível o resultado do pipeline: **`GET /streets/:id`** (detalhe completo da rua), **`GET /me/profile`** enriquecido com agregados do corredor e **`GET /rankings/city/:cityId` + `GET /rankings/explorers`** servidos por materialized views.

O detalhe da rua (`StreetDetailService`) monta em três queries: (1) a rua + nome do dono + `defended_since` do dono; (2) o ranking por rua via `rank() over (order by ss.points desc)` sobre `street_score`; (3) o histórico de posse ordenado por `acquired_at`. O tempo de posse é derivado por uma função pura testável (`computeTenureDays`) a partir do `defended_since` do dono atual — que a Task 6 mantém coerente (setado ao assumir a posse, zerado ao perder). Rua inexistente → `404`; `:id` não-UUID → `400` via `ParseUUIDPipe`.

O perfil (`PgProfileRepository.loadAggregates`) compõe os agregados em cinco queries paralelas + uma condicional: `streetsOwned` (ruas com `owner_user_id = me`), `streetsExplored` (ruas distintas em `street_score`), `totalPoints` (de `runner_profile`), `nationalRank` **ao vivo** (`1 + count` de perfis com mais pontos) e `cityRank` **ao vivo** na cidade onde o corredor mais domina ruas. O `ProfileService.getProfileDetail` garante o perfil (`ensureProfileForUser`) e faz o merge com os agregados no tipo `RunnerProfileDetail`.

Os rankings (`RankingsService`) leem as MVs `mv_city_ranking` (ruas dominadas por cidade) e `mv_explorer_ranking` (ruas únicas visitadas), com `left join` em `runner_profile` para resolver o nome e `limit` validado por `parseRankingLimit` (default 50, teto 200, rejeita não-inteiro/≤0 com `400`). A migração cria as três MVs (city, explorer, national) `with data` e, crucialmente, um **índice único** em cada uma — pré-requisito do `REFRESH MATERIALIZED VIEW CONCURRENTLY` executado por `RankingsService.refresh()`. A estratégia de refresh está documentada no `rankings.module.ts`: refresh **agendado**, nunca por atividade (para não onerar o caminho quente de ingestão).

Os quatro gates de validação passaram com os números esperados: **unit 156/156**, **lint limpo**, **build OK**, **integração 34/34** (8 suites, ~48 s). A validação é honesta — a suíte `read-apis.int-spec.ts` sobe PostGIS real via testcontainers, roda as migrações de verdade, semeia dados, chama `refresh()` e exercita os quatro endpoints (detalhe, perfil, ambos os rankings) além dos caminhos `404` e `400`, tudo com JWT assinado real e sem `jest.mock` de banco.

Veredito: **`APPROVED WITH OBSERVATIONS`**. Nenhum gate falhou e as quatro subtarefas foram entregues. Os achados são de **completude da estratégia de refresh** e de **coerência de fontes**, não de comportamento nominal: (a) `refresh()` existe, é correto e está documentado, mas **não há agendador (`@Cron`/`ScheduleModule`) que o invoque** — em produção as MVs ficariam congeladas após a criação; (b) `cityRank`/`nationalRank` do perfil são calculados ao vivo enquanto o leaderboard lê MV potencialmente defasada, o que pode divergir; (c) `mv_national_ranking` é criada e refreshada, mas nenhuma query a lê; (d) `streetsExplored` é o proxy aceito para "bairros explorados" (RF-6.2), lacuna deferida coerentemente por o `geo` só modelar cidade.

---

## 2. Resultado da validação de testes (execução real)

Docker de pé confirmado (`docker info` → `DOCKER_OK`). Comandos executados exatamente como especificado.

### Unit — `cd apps/api && npx jest --config jest.config.ts`

```
Test Suites: 34 passed, 34 total
Tests:       156 passed, 156 total
Snapshots:   0 total
Time:        4.188 s
```

Esperado 156 → **156 ✅**. Inclui os novos specs da task: `rankings/parse-ranking-limit.spec.ts` (default/vazio, positivo, cap no máximo, rejeição de `0`/`-5`/`abc`) e `territory/tenure.spec.ts` (null sem dono, dias inteiros de posse, clamp de intervalo negativo a zero), além do `profile.service.spec.ts` ajustado para o novo `loadAggregates` no mock do repositório.

### Lint — `cd apps/api && npx eslint "src/**/*.ts" "test/**/*.ts"`

```
ESLINT_EXIT=0
```

Saída limpa. Confirma a convenção transversal única (`@typescript-eslint/consistent-type-definitions`): todos os tipos novos (`RunnerProfileAggregates`, `RunnerProfileDetail`, `CityRankingEntry`, `ExplorerRankingEntry`, `StreetDetail`, `StreetRankingEntry`, `OwnershipHistoryEntry`, `StreetOwnerSummary`) usam `type`; o único `interface` introduzido/tocado é `ProfileRepository`, corretamente em `ports/profile-repository.port.ts` (grep nos 18 arquivos `.ts` da task → um só `interface`, no `.port.ts`).

### Build — `cd apps/api && npx nest build`

```
BUILD_EXIT=0
```

Compilação OK.

### Integração — `cd apps/api && npx jest --config test/jest-int.config.ts --runInBand`

```
PASS test/read-apis.int-spec.ts (7.015 s)
PASS test/ingest-pipeline.int-spec.ts (7.673 s)
PASS test/anti-cheat.int-spec.ts (6.27 s)
PASS test/streets.int-spec.ts (5.469 s)
PASS test/territory.int-spec.ts (5.416 s)
PASS test/profile.int-spec.ts (5.47 s)
PASS test/strava.int-spec.ts (5.368 s)
PASS test/matching.int-spec.ts (5.377 s)

Test Suites: 8 passed, 8 total
Tests:       34 passed, 34 total
Time:        48.117 s, estimated 52 s
```

Esperado 34 (8 suites, ~50 s) → **34 ✅**. O novo `read-apis.int-spec.ts` sobe `postgis/postgis:16-3.4`, roda as migrações reais, semeia dois corredores (Ana 3000 pts / Bruno 1000 pts), uma cidade, duas ruas de Ana, três `street_score` e um registro de histórico; chama `RankingsService.refresh()` e valida: detalhe da `STREET_1` (dono Ana, `disputesCount` 2, `ranking` [Ana rank 1/200, Bruno rank 2/100], histórico len 1, `tenureDays ≥ 0`); `404` para rua desconhecida; perfil de Ana (`totalPoints` 3000, `streetsOwned` 2, `streetsExplored` 2, `cityRank` 1, `nationalRank` 1); ranking de cidade ([Ana rank 1, 2 ruas]); ranking de exploradores ([Ana 2, Bruno 1]); e `400` para `?limit=abc`.

**Todos os gates passaram.** Nenhum motivo de `REJECTED` por falha de teste, lint ou build.

---

## 3. Aderência ao escopo da Tarefa 8.0 e critérios de sucesso

| Subtarefa | Status | Evidência |
|-----------|--------|-----------|
| 8.1 `GET /streets/:id` com detalhe completo | ✅ | `StreetDetailService.getStreetDetail`: dono (+ nome), ranking `rank() over (points desc)`, histórico por `acquired_at asc`, `tenureDays` via `computeTenureDays`, `disputesCount`. `TerritoryController` protegido por `SupabaseJwtGuard`, `ParseUUIDPipe`, `404` em rua inexistente. |
| 8.2 Enriquecer `GET /me/profile` | ✅ | `loadAggregates` → `streetsOwned`, `streetsExplored`, `totalPoints`, `cityRank` (local, ao vivo), `nationalRank` (ao vivo). `getProfileDetail` funde perfil base + agregados em `RunnerProfileDetail`. |
| 8.3 Módulo `rankings`: MVs + endpoints | ✅ | `0010_rankings_mv.sql` cria `mv_city_ranking`/`mv_explorer_ranking`/`mv_national_ranking` com índice único; `RankingsService.getCityRanking`/`getExplorerRanking`; `RankingsController` com `city/:cityId` + `explorers` + `parseRankingLimit`. |
| 8.4 Estratégia de refresh das MVs | ⚠️ Parcial | `refresh()` usa `REFRESH ... CONCURRENTLY` (viável pelos índices únicos), fora de transação, e há decisão documentada de não refrescar por atividade. **Falta o wiring do agendador** (ver 5.1). |

| Critério de sucesso | Status | Observação |
|---------------------|--------|------------|
| `/streets/:id` retorna dono, ranking ordenado, histórico, tempo de posse e disputas | ✅ | Verificado por integração; ordenação `points desc` com `rank()` (empate = mesmo rank); tenure derivado do `defended_since` do dono. |
| `/me/profile` traz todos os agregados exigidos pelo PRD | ⚠️ Ver 5.4 | Todos presentes exceto "bairros explorados" — substituído por `streetsExplored` (ruas), lacuna deferida por ausência de bairro no `geo` (coerente com RF-6.2 e com o `newNeighborhoods=0` já deferido na Task 6). |
| Rankings municipal e de exploradores com ordenação correta e em tempo hábil | ✅ | MVs pré-agregam e ordenam por `rank()`; leitura O(limit). "Tempo hábil" garantido pela leitura de MV — desde que o refresh seja agendado (5.1). |

RF-5.2 (detalhe da rua) e RF-7.1/RF-7.2 (rankings municipal + exploradores) atendidos. RF-6.3 (ranking local + nacional no perfil) atendido ao vivo. RF-6.2 atendido **parcialmente** (bairros → ruas, ver 5.4). RF-7.3 (estado/país) fora do escopo desta task e sem endpoint (ver 5.3).

---

## 4. Conformidade com a Tech Spec e convenções

- **Convenção de tipagem (única regra transversal aplicável):** respeitada e confirmada por lint. Todos os DTOs/modelos novos são `type`; o único `interface` é o port `ProfileRepository` em `*.port.ts`. As `.claude/rules` do AcquisitionNew não se aplicam (projeto greenfield NestJS/Supabase) — confirmado pela própria Tech Spec.
- **Endpoints:** batem 1:1 com a Tech Spec ("Endpoints de API"): `GET /streets/:id`, `GET /me/profile`, `GET /rankings/city/:cityId`, `GET /rankings/explorers`.
- **Leaderboards via materialized views:** fiel à decisão da Tech Spec ("`rankings` — leaderboards ... via materialized views") e ao requisito da task. O uso de `CONCURRENTLY` + índice único é o padrão correto para não travar leitura durante o refresh.
- **Modelos de dados:** consome `street`/`street_score`/`street_ownership_history`/`runner_profile` como definidos nas migrações 0004/0008 sem alterar schema existente; adiciona apenas as MVs. `total_points` e `defended_since` existem (migração 0008).
- **Convivência de dois `@Controller('streets')`:** `GeoController` (`@Get()` bbox, Task 7) e `TerritoryController` (`@Get(':id')`) coabitam sem conflito — rotas distintas (`/streets` vs `/streets/:uuid`). O `streets.int-spec.ts` (bbox) e o `read-apis.int-spec.ts` (`:id`) passam juntos, confirmando ausência de colisão de roteamento.
- **Autenticação:** ambos os controllers protegidos por `SupabaseJwtGuard`; `AuthModule` importado em `territory.module` e `rankings.module`. Coerente com os demais endpoints autenticados.
- **Honestidade da validação:** unidade cobre a lógica pura (tenure, parse do limit) sem I/O; integração exercita os endpoints contra Postgres real com refresh de MV de verdade. Sem fake-green.

---

## 5. Achados

Nenhum achado bloqueante. Ordenados por severidade.

### 5.1 [Maior / Observação] `RankingsService.refresh()` não está conectado a nenhum agendador — MVs congelam em produção

- **Arquivos:** `apps/api/src/modules/rankings/rankings.service.ts:51-55` + `apps/api/src/modules/rankings/rankings.module.ts:6-8`
- **Análise:** o método `refresh()` está correto (itera as três MVs com `REFRESH MATERIALIZED VIEW CONCURRENTLY`, fora de transação, viabilizado pelos índices únicos da migração) e o `rankings.module.ts` documenta a decisão de projeto: *"RankingsService.refresh() must be wired to a scheduled job (cron/worker) ... it is not refreshed per-activity"*. Porém **não existe no código quem chame `refresh()` periodicamente**: não há `ScheduleModule.forRoot()`/`@Cron`, `@nestjs/schedule` não é usado, e nenhum worker/BullMQ repeatable job invoca o método (grep por `Cron`/`ScheduleModule`/`refresh()` só acha o próprio método e o comentário). Como as MVs são criadas `with data`, elas nascem povoadas e **nunca mais são atualizadas** até alguém chamar `refresh()` manualmente — no teste de integração isso é feito à mão. Em produção, os rankings de cidade e exploradores refletiriam apenas o estado do momento da migração; qualquer conquista posterior de rua não apareceria no leaderboard.
- **Impacto:** a subtarefa 8.4 ("Estratégia de atualização/refresh das materialized views") está entregue como **mecanismo + estratégia documentada**, mas não como comportamento efetivo. Rankings servidos ao usuário ficariam permanentemente stale. É o achado de maior peso, embora não quebre nenhum gate (o teste força o refresh) nem seja um bug de lógica.
- **Sugestão:** fechar o laço com uma das opções: (a) `ScheduleModule.forRoot()` no app + um provider com `@Cron('*/N * * * *')` chamando `rankingsService.refresh()`; (b) um repeatable job BullMQ no processo worker (coerente com a fila já existente); ou (c) `pg_cron`/agendador de infra chamando um endpoint/procedimento — nesse caso, documentar explicitamente na task/techspec que o agendamento é responsabilidade de ops e o backend só expõe o método. Qualquer que seja, vale um teste que confirme que o refresh roda de fato no ciclo escolhido.

### 5.2 [Menor / Observação] Fonte assimétrica: `cityRank`/`nationalRank` do perfil ao vivo vs. leaderboard via MV defasada

- **Arquivos:** `apps/api/src/modules/profile/repositories/profile.repository.ts:58-104` + `apps/api/src/modules/rankings/rankings.service.ts:16-38`
- **Análise:** o perfil calcula `cityRank` e `nationalRank` **ao vivo** (queries diretas em `street`/`runner_profile`), enquanto `GET /rankings/city/:cityId` lê `mv_city_ranking` (potencialmente stale — ver 5.1). As duas superfícies medem a mesma grandeza (ruas dominadas por cidade), mas por fontes distintas com defasagem temporal diferente. Consequência: a posição que o usuário vê no próprio perfil (fresca) pode não bater com a posição dele no leaderboard da cidade (defasada até o próximo refresh). A definição de rank também coincide numericamente (`mv_city_ranking` usa `rank() over (partition by city_id order by count desc)`; o perfil usa `1 + count(owners com mais ruas)`), então em estado consistente os números concordam — a divergência é só de frescor.
- **Impacto:** inconsistência percebida entre telas (perfil vs. ranking) enquanto a MV estiver defasada. Enquanto 5.1 não for resolvido, a divergência é permanente.
- **Sugestão:** documentar a decisão (perfil ao vivo por consistência imediata do próprio usuário; leaderboard via MV por performance de leitura em escala) e/ou, uma vez agendado o refresh (5.1), definir o intervalo de refresh de modo que a defasagem seja aceitável do ponto de vista de produto. Alternativamente, servir o `cityRank`/`nationalRank` do perfil também a partir das MVs para uma única fonte de verdade.

### 5.3 [Menor / Observação] `mv_national_ranking` é criada e refreshada, mas nenhuma query a lê

- **Arquivos:** `supabase/migrations/0010_rankings_mv.sql:28-36` + `apps/api/src/modules/rankings/rankings.service.ts:5-9`
- **Análise:** a MV `mv_national_ranking` entra na lista `RANKING_VIEWS` e é refreshada por `refresh()`, mas **nenhum endpoint ou consulta a lê**: o ranking nacional do perfil é computado ao vivo em `loadAggregates` (não via MV) e não há endpoint de ranking nacional/estado. Ou seja, a MV paga custo de criação e (quando 5.1 for resolvido) de refresh sem consumidor. RF-7.3 (estado/país "quando houver dado") não tem endpoint nesta task — o que é aceitável, já que o PRD trata estado/país como recurso secundário.
- **Impacto:** código morto por ora; custo de manutenção/refresh sem retorno.
- **Sugestão:** ou expor um `GET /rankings/national` (e migrar o `nationalRank` do perfil para consumir a MV, resolvendo também 5.2), ou remover `mv_national_ranking` (e tirá-la de `RANKING_VIEWS`) até haver consumidor. Decisão de escopo/produto.

### 5.4 [Menor / Observação] `streetsExplored` é o proxy de "bairros explorados" (RF-6.2) — lacuna deferida sem nota no lado do perfil

- **Arquivos:** `apps/api/src/modules/profile/repositories/profile.repository.ts:63-66` + `profile.types.ts:19-25`
- **Análise:** o PRD (RF-6.2) pede "bairros explorados"; o perfil expõe `streetsExplored` (ruas únicas em `street_score`). A lacuna é legítima e coerente — o `geo` modela cidade, não bairro, e a Task 6 já deferiu bônus de bairro (`newNeighborhoods=0`, com comentário explicando). O problema é só de rastreabilidade: diferente da Task 6, o lado do profile **não documenta** que `streetsExplored` substitui "bairros explorados" temporariamente, então um leitor futuro pode achar que RF-6.2 está integralmente atendida. Além disso, `streetsExplored` coincide conceitualmente com a métrica do ranking de exploradores (`streets_visited`), o que reforça que a semântica exposta é "ruas", não "bairros".
- **Impacto:** nenhum funcional; risco de leitura equivocada do escopo entregue.
- **Sugestão:** adicionar uma nota curta (comentário no `loadAggregates`/`profile.types.ts` ou no `8_task.md`) registrando que "bairros explorados" está aproximado por ruas exploradas até o `geo` ganhar limites de bairro — espelhando a nota já existente na Task 6.

### 5.5 [Nit] Desempate não-determinístico da cidade primária no `cityRank`

- **Arquivo:** `apps/api/src/modules/profile/repositories/profile.repository.ts:76-80`
- **Análise:** a "cidade primária" para o `cityRank` é escolhida por `group by city_id order by count desc limit 1`. Quando o corredor domina o mesmo número de ruas em duas ou mais cidades, o `order by` sem tie-breaker escolhe uma cidade arbitrária (a ordem de empate não é garantida pelo Postgres), tornando o `cityRank` potencialmente não-determinístico entre execuções idênticas.
- **Impacto:** cosmético e raro; afeta só o empate exato de contagem entre cidades.
- **Sugestão:** adicionar um tie-breaker determinístico (ex.: `order by count desc, city_id asc`) para estabilizar a escolha.

---

## 6. Completude dos testes da tarefa

| Teste exigido pela task | Status | Observação |
|-------------------------|--------|------------|
| Unidade — cálculo de tempo de posse (tenure) | Coberto | `tenure.spec.ts`: null sem dono; 8 dias inteiros; clamp de intervalo negativo a 0. |
| Unidade — parse do limit de ranking | Coberto | `parse-ranking-limit.spec.ts`: default (undefined/''); inteiro positivo; cap no máximo; rejeição de `0`/`-5`/`abc` com `BadRequestException`. |
| Integração — detalhe da rua | Coberto | `read-apis.int-spec`: dono/ranking/histórico/tenure/disputas; ordenação e ranks conferidos contra dados semeados. |
| Integração — perfil enriquecido | Coberto | `read-apis.int-spec`: `totalPoints`/`streetsOwned`/`streetsExplored`/`cityRank`/`nationalRank`. |
| Integração — rankings via MV | Coberto | `read-apis.int-spec`: `refresh()` chamado antes; cidade e exploradores com ordenação por `rank()`. |
| Integração — bordas `404`/`400` | Coberto | Rua desconhecida → `404`; `?limit=abc` → `400`. |

Qualidade dos testes: alta. A lógica pura (tenure, parse) é isolada e exaustiva nas bordas; a integração é fiel (Postgres real, migrações reais, refresh de MV real, JWT assinado, sem mock de banco) e cobre os quatro endpoints mais os caminhos de erro.

Lacunas de cobertura (não bloqueantes): (a) **não há teste que confirme o agendamento do refresh** — coerente com 5.1, já que o wiring não existe; (b) não se testa `:id` não-UUID → `400` pelo `ParseUUIDPipe` (só o `404` de UUID válido inexistente e o `400` do limit); (c) não se testa `cityRank = null` (corredor sem ruas dominadas) nem o empate de cidade primária (5.5); (d) `getExplorerRanking`/`getCityRanking` não têm spec unitário (cobertos só via integração — aceitável, pois a lógica vive no SQL). Nenhuma bloqueia.

---

## 7. Veredito

### `APPROVED WITH OBSERVATIONS`

Justificativa: os quatro gates passaram com os números exatos esperados (**unit 156/156**, **lint limpo**, **build OK**, **integração 34/34** em 8 suites, ~48 s), a convenção de tipagem foi confirmada por lint (todos os DTOs como `type`; único `interface` no `*.port.ts`) e as quatro subtarefas foram entregues com SQL correto: detalhe da rua com ranking `rank() over (points desc)`, histórico ordenado, tenure derivado do `defended_since` do dono e disputas; perfil com todos os agregados (rank local e nacional ao vivo); rankings de cidade e exploradores via MVs com índice único e leitura O(limit); `limit` e `:id` validados com `400`/`404`. A validação é honesta — integração contra PostGIS real, migrações e refresh de MV de verdade, JWT assinado, sem mock de banco.

Os achados não são bloqueantes. O **Maior** (5.1) é de completude, não de comportamento nominal: `refresh()` está correto e a estratégia (concurrent, não-por-atividade) está documentada, mas nenhum agendador o invoca — em produção as MVs congelariam após a criação; recomenda-se fechar o laço com `@Cron`/repeatable job (ou documentar que o agendamento é de ops). As **Observações** — 5.2 (perfil ao vivo vs. leaderboard via MV podem divergir enquanto a MV estiver defasada), 5.3 (`mv_national_ranking` sem leitor), 5.4 (`streetsExplored` como proxy de "bairros" de RF-6.2, lacuna deferida sem nota no perfil) — e o **Nit** 5.5 (desempate não-determinístico da cidade primária) são endereçáveis nesta task ou nas seguintes sem retrabalho estrutural. Avaliação dos pontos pedidos: a estratégia de refresh (concurrent + índice único + fora do caminho quente) é a correta, mas o risco de **staleness é hoje total** por falta de agendador (5.1); a lacuna de "bairro" no perfil é aceitável e coerente com a modelagem, faltando apenas documentá-la (5.4); o SQL de ordenação/rank/tenure/joins de nome está correto e verificado por integração. Nenhum achado justifica `REJECTED`.

---

## 8. Mensagem de commit sugerida (Conventional Commits, pt-BR)

O trabalho já está commitado em `546714d` com mensagem aderente ao padrão. Caso seja necessário reescrever/consolidar:

```
feat(read-apis): detalhe da rua + perfil enriquecido + rankings

Expõe as APIs de leitura do estado do jogo. GET /streets/:id
devolve dono, ranking por pontos, histórico de posse, tempo de
posse (tenure puro/testável) e disputas. GET /me/profile passa a
enriquecer o perfil com ruas dominadas, ruas exploradas, pontos
totais e ranking local/nacional calculados ao vivo. GET
/rankings/city/:cityId e /rankings/explorers leem materialized
views (índice único p/ REFRESH CONCURRENTLY), com limit validado.

Adiciona a migração 0010 com as MVs de ranking e o método
RankingsService.refresh() (concurrent, fora do caminho de
ingestão) — a ser conectado a um agendador.

Testes: unit de tenure e parse de limit; integração real (PostGIS)
cobrindo detalhe, perfil, ambos os rankings via MV e as bordas
404/400.
```
