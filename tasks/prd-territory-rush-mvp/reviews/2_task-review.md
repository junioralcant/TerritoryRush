# Code Review — Tarefa 2.0: Malha viária OSM (módulo `geo`) + `GET /streets?bbox=`

- **Projeto:** Territory Rush (MVP)
- **Branch revisada:** `feat/task-2-geo-streets` (diff `task-1-done...HEAD`)
- **Commit:** `d603b40 feat(geo): malha viária OSM (street) + GET /streets?bbox=`
- **Data da review:** 2026-07-09
- **Revisor:** Code Review (skill `task-review` → `executar-review`)
- **Escopo do diff:** 20 arquivos de produção/infra/teste — `apps/api/src/modules/geo/**`, `apps/api/test/streets.int-spec.ts`, `supabase/migrations/0004_geo_streets.sql`, `infra/geo/import/**`, `apps/api/package.json` (script `geo:derive`) — mais os docs da task. Artefatos `.claude/worktrees/*` ignorados (pré-existentes, 0 conteúdo).

---

## 1. Resumo

A Tarefa 2.0 entrega a fonte de verdade geográfica do jogo com boa aderência à Tech Spec e às quatro subtarefas:

- **Migração `0004_geo_streets.sql`** — `geo.osm_road` (staging), `public.city_ref` (boundary `MultiPolygon` 4326 + GIST) e `public.street` como **rua nomeada agregada por cidade** (`geom` `MultiLineString` 4326, índice GIST, `unique(city_id, osm_name)`, FK `city_id → city_ref`, `owner_user_id` nullable).
- **Módulo `geo`** em camadas DDD/Clean: `GeoController` fino → `GeoService` (orquestra parse + query + mapeamento) → `PgStreetRepository` (SQL) atrás do port `StreetRepository` (contrato `interface` + token `Symbol`).
- **Derivação real** (`resolveCitiesForOsmRoads` + `deriveStreetsFromOsmRoads`): resolução de cidade por interseção espacial, colapso por `(city_id, nome)` via `ST_Multi(ST_Collect(geom))`, fallback determinístico `Via sem nome (<osm_id>)` e upsert idempotente `on conflict (city_id, osm_name)`. A mesma regra tem um espelho puro em `aggregateOsmRoads`/`resolveStreetName` para teste unitário isolado.
- **`GET /streets?bbox=`** autenticado, com validação robusta do bbox, consulta indexada (`&&` + `ST_Intersects` + `ST_AsGeoJSON`) e contrato de resposta com estado de posse relativo ao usuário (`unclaimed`/`mine`/`other`) — cobrindo RF-5.1.
- **Pipeline de import** documentado (`import.sh` + `staging.sql` + `README.md`) reusando a derivação do repositório como fonte única, invocada via `derive-cli.ts` / script `geo:derive`.

**Todos os 4 gates de validação passaram** (unit 32/32, lint limpo, build OK, integração 10/10). Não há achados bloqueantes; os achados são de severidade **Menor** e **Observação**, com destaque para a honestidade de escopo da subtarefa 2.1 (o import de um extrato real não é executado — a derivação, que concentra a lógica, é testada contra PostGIS de verdade).

**Veredito:** `APPROVED WITH OBSERVATIONS`.

---

## 2. Resultado da validação de testes (execução real)

Todos os comandos foram executados de fato neste ambiente (Docker de pé).

### Unit — `cd apps/api && npx jest --config jest.config.ts`

```
PASS src/modules/geo/street-response.spec.ts
PASS src/modules/geo/street-aggregation.spec.ts
PASS src/modules/profile/profile.service.spec.ts
PASS src/modules/auth/guards/supabase-jwt.guard.spec.ts
PASS src/modules/geo/parse-bbox.spec.ts
PASS src/modules/auth/verifiers/supabase-jwt.verifier.spec.ts

Test Suites: 6 passed, 6 total
Tests:       32 passed, 32 total
Time:        2.107 s
```
**Resultado: PASSOU (32/32, esperado 32 — 16 da Task 1 + 16 da Task 2).**

### Lint — `cd apps/api && npx eslint "src/**/*.ts" "test/**/*.ts"`

```
LINT_EXIT=0
```
**Resultado: LIMPO (exit 0).**

### Build — `cd apps/api && npx nest build`

```
BUILD_EXIT=0
```
**Resultado: OK (exit 0).**

### Integração — `cd apps/api && npx jest --config test/jest-int.config.ts --runInBand`

```
PASS test/streets.int-spec.ts (6.417 s)
  Streets / geo flow (integration)
    ✓ collapses same-name segments per city and keeps distinct ways separate
    ✓ rejects GET /streets without a token (401)
    ✓ rejects GET /streets with an invalid bbox (400)
    ✓ returns streets within the bbox with ownership state
    ✓ returns an empty list for a bbox with no streets
PASS test/profile.int-spec.ts (5.601 s)
    ✓ rejects GET /me/profile without a token (401)
    ✓ rejects GET /me/profile with an invalid token (401)
    ✓ creates the runner profile on first authenticated access (200)
    ✓ is idempotent: a repeated request returns the same profile without duplicating it
    ✓ creates a distinct profile per authenticated user

Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
```
**Resultado: PASSOU (10/10, esperado 10 — 5 profile da Task 1 + 5 streets da Task 2).**

| Gate | Esperado | Obtido | Status |
|------|----------|--------|--------|
| Unit | 32 | 32 | OK |
| Lint | limpo | exit 0 | OK |
| Build | OK | exit 0 | OK |
| Integração | 10 | 10 | OK |

---

## 3. Aderência ao escopo da Tarefa 2.0 e critérios de sucesso

| Subtarefa / Critério | Status | Evidência |
|----------------------|--------|-----------|
| 2.1 Script/rotina de import OSM→PostGIS + derivação das ruas agregadas | Atendido (com observação) | `infra/geo/import/{import.sh,staging.sql,README.md}` + `derive-cli.ts` + script `geo:derive`. Derivação real (`resolveCitiesForOsmRoads`/`deriveStreetsFromOsmRoads`) testada contra PostGIS. O import de extrato real não é executado — ver achado O1. |
| 2.2 Migração `street`, `city_ref`, schema `geo` + índices espaciais | Atendido | `0004_geo_streets.sql`: `city_ref` (GIST em `boundary`), `geo.osm_road` (GIST em `geom`), `street` (`MultiLineString` 4326, GIST em `geom`, índices `city`/`owner`, `unique(city_id, osm_name)`). Schema `geo` criado em `0001_init` (Task 1). |
| 2.3 Módulo `geo`: consulta por bbox (GIST/`ST_Intersects`) + resolução nome+cidade | Atendido | `PgStreetRepository.findInBbox` (`&&` + `ST_Intersects`) e `findByNameAndCity` (`city_id`+`osm_name`). Ver achado M1 sobre cobertura de `findByNameAndCity`. |
| 2.4 Endpoint `GET /streets?bbox=` com contrato para o mapa | Atendido | `GeoController` autenticado; contrato `StreetSummary` (`ownership`, `ownerUserId`, `geometry` GeoJSON `MultiLineString`). |
| CS: segmentos de mesmo nome na mesma cidade colapsam em 1 `street` | Atendido | `deriveStreetsFromOsmRoads` (`group by city_id, nome`); unit `aggregateOsmRoads` + integração `collapses same-name segments per city`. |
| CS: vias sem nome tratadas pelo fallback | Atendido | `Via sem nome (<osm_id>)`; unit `resolveStreetName`/`keeps distinct unnamed ways separate` + integração (`Via sem nome (4)`). |
| CS: `GET /streets?bbox=` retorna ruas do bbox com estado de posse | Atendido | Integração `returns streets within the bbox with ownership state` (todas `unclaimed`, `ownerUserId` null). |
| CS: `GET /streets?bbox=` em tempo hábil | Parcial | Consulta usa índice GIST; sem guarda de área máxima do bbox — ver achado M2. |
| RF-5.1 estados visuais (cinza/azul/vermelho) | Atendido no backend | `ownership` `unclaimed`/`mine`/`other` mapeia diretamente para os três estados de cor; renderização é do mobile (Task 10). |

Os quatro checkboxes de subtarefa e os dois de testes da task estão marcados de forma coerente com o entregue.

---

## 4. Conformidade com a Tech Spec e convenções

- **Convenção de tipagem (`interface` só em contratos):** correta. `grep` confirma que a única `interface` do módulo `geo` está em `ports/street-repository.port.ts` (`StreetRepository`); todos os modelos/DTOs (`Bbox`, `StreetSummary`, `OsmRoadRecord`, `AggregatedStreet`, `StreetRow`, `GeoJsonMultiLineString`, `StreetOwnership`) usam `type`. Lint (`@typescript-eslint/consistent-type-definitions`) passou limpo.
- **Regras `.claude/rules` do AcquisitionNew:** corretamente **não aplicadas** (stack distinto — NestJS/Supabase greenfield, conforme "Conformidade com Skills Padrões" da Tech Spec). O JSDoc presente nos arquivos (`street-repository.port.ts`, `street-aggregation.ts`, `derive-cli.ts`) **não é violação** aqui — a regra `no-comments` é escopada a `AcquisitionNew`/`gol-sdk`.
- **Camadas DDD/Clean:** contrato (`*.port.ts` + `Symbol` de DI) → serviço (`GeoService`, orquestra parse/query/map) → repositório (`PgStreetRepository`, SQL) → controller fino. Injeção por token (`STREET_REPOSITORY`) com `useClass`. Boa separação; consistente com o padrão da Task 1.
- **Modelo de dados:** `street` fiel à Tech Spec (rua nomeada agregada por cidade, `MULTILINESTRING` 4326, GIST, `owner_user_id`, `top_score`, `disputes_count`). Colunas `created_at`/`updated_at` adicionadas (razoável). `street_score`/`activity_street`/histórico ficam para tasks donas (6/8) — fora de escopo aqui.
- **SQL/PostGIS:** `ST_MakeEnvelope($minLng,$minLat,$maxLng,$maxLat,4326)` com ordem correta (x=lng, y=lat); `ST_Collect`+`ST_Multi` produzindo `MultiLineString` compatível com a coluna; `ST_AsGeoJSON` no read; SRID 4326 preservado em toda a cadeia. Derivação idempotente via `on conflict (city_id, osm_name) do update`.
- **Pipeline `import.sh`:** `osm2pgsql --latlong` (geometria já em 4326) + `staging.sql` com `ST_Dump(ST_Transform(way,4326))` (dump de multilinestrings em linestrings; `ST_Transform` defensivo/no-op) + `geo:derive`. `ts-node` está hoisted no `node_modules` raiz do monorepo, então `npm --prefix apps/api run geo:derive` resolve o binário via PATH.

---

## 5. Achados

Nenhum achado bloqueante. Ordenados por severidade.

### 5.1 [Menor] `findByNameAndCity` sem cobertura de teste e sem uso em produção

- **Arquivos:** `apps/api/src/modules/geo/repositories/street.repository.ts:26` + `ports/street-repository.port.ts:12`
- **Impacto:** o método de "resolução de rua por nome+cidade" (subtarefa 2.3) está declarado no port e implementado, mas **não é chamado por nenhum código de produção** nem exercido por unit/integração. É claramente um *seam* para o módulo `matching` (Task 5), porém hoje é superfície pública não verificada — um erro de SQL (nome de coluna, schema) só apareceria lá na frente.
- **Sugestão:** adicionar um caso de integração cobrindo `findByNameAndCity` (rua existente → linha; inexistente → `null`), aproveitando o mesmo container/fixtures do `streets.int-spec.ts`. Alternativamente, adiar a introdução do método para a Task 5 que o consome.

### 5.2 [Menor] `GET /streets?bbox=` sem guarda de área máxima + `order by osm_name` antes do `limit`

- **Arquivos:** `apps/api/src/modules/geo/parse-bbox.ts` + `repositories/street.repository.ts:13-24` (`STREETS_BBOX_LIMIT = 5000`)
- **Impacto:** o bbox só é validado quanto a formato/ranges/ordem; não há teto de área. Um bbox muito amplo (ex.: `-180,-90,180,90`) casaria toda a tabela e, como a consulta faz `order by s.osm_name limit 5000` e não há índice em `osm_name` isolado (só o composto `unique(city_id, osm_name)`), o Postgres tende a ordenar o conjunto inteiro antes de aplicar o `limit`. Com a cidade-piloto do MVP é irrelevante; com a malha completa carregada, vira um risco de latência/carga (o critério "em tempo hábil" fica sob condição).
- **Sugestão:** rejeitar bboxes acima de uma área máxima (graus² ou via `ST_Area`) em `parseBbox`, e/ou remover o `order by osm_name` do caminho de mapa (a ordenação alfabética não tem valor para renderização e força o sort) — deixando o `limit` como salvaguarda de payload.

### 5.3 [Menor] `resolveCitiesForOsmRoads` é não-determinístico para vias que cruzam fronteiras de cidade

- **Arquivo:** `apps/api/src/modules/geo/repositories/street.repository.ts:36-44`
- **Impacto:** o `update ... from public.city_ref c where ST_Intersects(c.boundary, r.geom)` atribui `city_id` por interseção. Quando uma via cruza a fronteira de duas cidades (interseção com múltiplos `city_ref`), o `UPDATE ... FROM` casa múltiplas linhas e o Postgres escolhe **uma arbitrária** — resultado não-determinístico entre execuções, e a via inteira é atribuída a uma única cidade. Aceitável para o MVP (a maioria das vias está dentro de uma cidade), mas é uma fonte silenciosa de instabilidade na agregação em zonas limítrofes.
- **Sugestão:** desempatar por maior sobreposição, ex.: escolher a cidade que maximiza `ST_Length(ST_Intersection(c.boundary, r.geom))` via subconsulta/`DISTINCT ON`. Registrar como melhoria pós-MVP se não for endereçar agora.

### 5.4 [Observação] Escopo da subtarefa 2.1: import de extrato real não executado e ausência de seeding de `city_ref`

- **Arquivos:** `infra/geo/import/**` + `supabase/migrations/0004_geo_streets.sql`
- **Impacto:** a decisão de não rodar `osm2pgsql` sobre um extrato regional real (extrato grande) é **razoável e honesta** — a parte com risco de bug (derivação/agregação por nome+cidade e resolução espacial) está testada contra PostGIS de verdade com fixtures. Fica, porém, uma lacuna: (a) o critério "Extrato OSM importado; ruas de uma cidade-piloto consultáveis" **não é demonstrado empiricamente ponta a ponta**; e (b) o pipeline pressupõe `public.city_ref` populado com boundaries, mas **não há tooling/seed** para carregar as cidades (o README apenas afirma "reference cities must already be in public.city_ref"). Sem os boundaries, o `resolveCitiesForOsmRoads` deixa todas as vias com `city_id null` e nenhuma `street` é derivada.
- **Sugestão:** aceitar a entrega como adequada ao *deliverable* da subtarefa (pipeline + derivação testada), mas registrar como pendência de completude: prover um seed/rotina para popular `city_ref` (ao menos a cidade-piloto) e, idealmente, uma execução manual documentada do `import.sh` contra um extrato pequeno para fechar o critério de sucesso end-to-end.

### 5.5 [Observação] `city_ref` em `public` em vez de `geo`

- **Arquivo:** `supabase/migrations/0004_geo_streets.sql:13`
- **Impacto:** a Tech Spec descreve "`city_ref` / rede viária OSM importada no schema `geo`". A implementação coloca `city_ref` em `public` (e `osm_road` em `geo`). É defensável — `public.street` tem FK para `city_ref`, e mantê-las no mesmo schema é coerente —, mas é um pequeno desvio da redação da spec. Baixa relevância.
- **Sugestão:** manter como está para o MVP; se a spec for tratada como normativa quanto ao schema, mover `city_ref` para `geo` numa migração futura.

### 5.6 [Observação] `derive-cli.ts` cria `Pool` sem listener de `'error'`

- **Arquivo:** `apps/api/src/modules/geo/derive-cli.ts:14`
- **Impacto:** mesma classe do achado 5.1 da review da Task 1 (pool `pg` sem `pool.on('error')`). Aqui o impacto é bem menor: é um CLI de vida curta que encerra o pool logo em seguida; uma queda transitória do Postgres no meio derrubaria o processo do batch, o que é aceitável para uma rotina de import re-executável.
- **Sugestão:** opcional — anexar `pool.on('error', ...)` por simetria/robustez.

### 5.7 [Observação] `&&` explícito redundante com `ST_Intersects`

- **Arquivo:** `apps/api/src/modules/geo/repositories/street.repository.ts:17-18`
- **Impacto:** `ST_Intersects` já executa internamente o filtro `&&` acelerado por índice, então o `&&` explícito é redundante. É **inofensivo** e um padrão canônico frequentemente escrito para deixar o uso do índice explícito. Sem ação necessária.

---

## 6. Completude dos testes da tarefa

| Teste exigido pela task | Status | Observação |
|-------------------------|--------|------------|
| Unidade — agregação por (nome, cidade) | Coberto | `aggregateOsmRoads`: colapso mesmo-nome na mesma cidade; mesmo nome em cidades diferentes → separadas. |
| Unidade — fallback de via sem nome | Coberto | `resolveStreetName` (null/blank → `Via sem nome (id)`); vias sem nome distintas ficam separadas; mesmo `osm_id` funde. |
| Unidade — montagem do contrato de resposta | Coberto | `toStreetSummary`: `unclaimed`/`mine`/`other` + parse do GeoJSON. |
| Unidade — validação do bbox | Coberto (extra) | `parseBbox`: válido, ausente, contagem ≠ 4, não-numérico, fora de range, ordem min<max. |
| Integração — derivação real contra PostGIS | Coberto | `collapses same-name segments per city and keeps distinct ways separate` (contagem = 4, nomes de Cidade A). |
| Integração — consulta por bbox | Coberto | `returns streets within the bbox with ownership state`, `empty list`, 401 sem token, 400 bbox inválido. |
| E2E | N/A | Explicitamente fora desta task. |

Qualidade dos testes: integração usa PostGIS real via testcontainers (sem mock de infra), migrações reais e derivação real do repositório (a mesma que roda em produção via `derive-cli`), fechando o requisito "derivação real + bbox". O unit testa o espelho puro da regra, isolando a lógica. Único ponto em aberto: `findByNameAndCity` sem teste (achado 5.1).

---

## 7. Veredito

### `APPROVED WITH OBSERVATIONS`

Justificativa: os 4 gates passaram com os números esperados (unit 32/32, lint limpo, build OK, integração 10/10), a convenção de tipagem foi confirmada por lint, e 100% das quatro subtarefas foram implementadas com arquitetura DDD/Clean coerente e SQL/PostGIS correto (agregação por nome+cidade, fallback determinístico, upsert idempotente, consulta bbox indexada, contrato de posse relativo ao usuário). Os achados são de severidade **Menor** (cobertura de `findByNameAndCity`, guarda de área do bbox, não-determinismo em vias de fronteira) e **Observação** (honestidade de escopo do import 2.1 + seeding de `city_ref`, schema de `city_ref`, hardening do CLI) — nenhum bloqueante e todos endereçáveis nas tasks donas (5/6/10) ou como hardening incremental. A decisão de não executar o import de um extrato real é aceitável, pois a lógica com risco de bug (derivação/agregação) está testada contra PostGIS de verdade; recomenda-se fechar o critério end-to-end com um seed de `city_ref` e uma execução manual documentada.

---

## 8. Mensagem de commit sugerida (Conventional Commits, pt-BR)

O trabalho já está commitado em `d603b40` com mensagem aderente ao padrão. Caso seja necessário reescrever/consolidar, segue a sugestão:

```
feat(geo): malha viária OSM (street) + GET /streets?bbox=

Modela a unidade territorial do jogo como rua nomeada agregada por
cidade: migração 0004 cria geo.osm_road (staging), public.city_ref e
public.street (MULTILINESTRING 4326, índices GIST, unique(city_id,
osm_name)).

Módulo geo em camadas port -> serviço -> repositório: derivação
geo.osm_road -> street (colapso por nome+cidade via ST_Collect/ST_Multi,
fallback de via sem nome por osm_id, resolução de cidade por interseção
espacial, upsert idempotente) e consulta por bbox indexada (&& +
ST_Intersects + ST_AsGeoJSON). GET /streets?bbox= autenticado retorna as
ruas do bbox com estado de posse relativo ao usuário. Pipeline de import
osm2pgsql documentado em infra/geo/import/.
```
