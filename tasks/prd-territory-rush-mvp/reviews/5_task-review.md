# Code Review — Tarefa 5.0: Map-matching OSRM + resolução em ruas nomeadas

- **Branch:** `feat/task-5-map-matching`
- **Base do diff:** tag `task-4-done` → `HEAD` (`git diff task-4-done...HEAD`, worktrees ignorados)
- **Commit da task:** `c9b6f79 feat(matching): map-matching OSRM + resolução em ruas nomeadas`
- **Escopo:** `apps/api` (NestJS 11) + `supabase/migrations/` + `infra/osrm/`
- **Data:** 2026-07-09
- **Revisor:** revisor sênior (skill `task-review` → `executar-review`)

---

## 1. Resumo

A Tarefa 5.0 entrega o elo entre o traçado GPS e o mapa: sobe o OSRM self-hosted (documentado em `infra/osrm/`, perfil `foot`) e implementa o módulo `matching`, que casa o traçado via OSRM `/match`, converte a resposta em `MatchedEdge[]`, agrega por nome de rua (dedup de trechos), resolve as ruas nomeadas contra o `geo` (cidade por ponto + nome+cidade) e grava a rastreabilidade em `activity_street` com `is_first_visit`. A etapa foi integrada ao worker de ingestão da Task 4.

As quatro subtarefas (5.1–5.4) foram implementadas e as duas classes de teste exigidas (unidade + integração) estão presentes. Os quatro gates de validação passaram com os números esperados: **unit 107/107**, **lint limpo**, **build OK**, **integração 22/22** (`profile + streets + strava + ingest-pipeline + matching`). A validação é honesta: o OSRM é mockado **no port** (`OSRM_CLIENT`), enquanto a resolução no `geo` e as escritas em `activity_street` rodam contra PostGIS real via testcontainers; o OSRM real (que exige extrato processado) é apenas documentado, não executado — condizente com o que a task declara.

A robustez pedida está de fato coberta: timeout via `AbortController`, circuit breaker, e falha de match propagando erro que mantém a atividade em `processing` para retry (backoff exponencial do BullMQ, `attempts: 5`), sem nunca marcar `processed`. A idempotência de `activity_street` (`unique(activity_id, street_id)` + `upsert on conflict`) e o `is_first_visit` correto entre atividades do mesmo usuário estão verificados em unit e integração.

Veredito: **`APPROVED WITH OBSERVATIONS`**. Nenhum achado bloqueante. O ponto mais relevante é que a agregação é feita **só por nome de rua** e a cidade é resolvida **depois**, a partir de uma única coordenada representativa — o que diverge do enunciado ("agregação por nome+cidade") e pode misatribuir ruas homônimas em cidades distintas num mesmo traçado.

---

## 2. Resultado da validação de testes (execução real)

Docker de pé confirmado (`docker info` → `DOCKER_UP`). Comandos executados exatamente como especificado.

### Unit — `cd apps/api && npx jest --config jest.config.ts`

```
Test Suites: 26 passed, 26 total
Tests:       107 passed, 107 total
Snapshots:   0 total
Time:        4.232 s
```

Esperado 107 → **107 ✅**. Inclui os novos specs de `matching`: `circuit-breaker.spec`, `matching-aggregation.spec` (dedup + drop de via sem nome + ruas distintas), `osrm-response.spec` (parser), `matching.service.spec` (resolução + persistência + skips) e `clients/http-osrm.client.spec` (trace curto, mapeamento, código não-Ok, circuito aberto). O `activity-ingestion.service.spec` ganhou o caso "leaves the activity in processing (for retry) when matching fails".

### Lint — `cd apps/api && npx eslint "src/**/*.ts" "test/**/*.ts"`

```
ESLINT_EXIT=0
```

Saída limpa. Confirma a convenção transversal (`@typescript-eslint/consistent-type-definitions: 'type'` global, `'interface'` só em `**/*.port.ts`): os contratos novos `OsrmClient` e `ActivityStreetRepository` são `interface` e vivem em `*.port.ts`; todo o resto usa `type`.

### Build — `cd apps/api && npx nest build`

```
BUILD_OK
```

Compilação OK.

### Integração — `cd apps/api && npx jest --config test/jest-int.config.ts --runInBand`

```
PASS test/ingest-pipeline.int-spec.ts (9.128 s)
PASS test/strava.int-spec.ts (5.396 s)
PASS test/streets.int-spec.ts (5.423 s)
PASS test/profile.int-spec.ts (5.315 s)
PASS test/matching.int-spec.ts (5.374 s)

Test Suites: 5 passed, 5 total
Tests:       22 passed, 22 total
Time:        30.693 s
```

Esperado 22 → **22 ✅**. `matching.int-spec` sobe PostGIS (`postgis/postgis:16-3.4`) via testcontainers, roda migrações reais, semeia `city_ref` + `street` + `activity`, injeta um OSRM fake no port e exercita a resolução end-to-end: dedup (150 m somados), drop de via sem nome e de rua fantasma, escrita em `activity_street` e `is_first_visit` variando entre duas atividades do mesmo usuário. O `ingest-pipeline.int-spec` também passou a sobrescrever `OSRM_CLIENT` com um fake vazio.

**Todos os gates passaram.** Nenhum motivo de `REJECTED` por falha de teste, lint ou build.

---

## 3. Aderência ao escopo da Tarefa 5.0 e critérios de sucesso

| Subtarefa | Status | Evidência |
|-----------|--------|-----------|
| 5.1 Empacotar/subir o OSRM (Docker + extrato OSM, perfil `foot`) em `infra/osrm/` | ✅ | `infra/osrm/docker-compose.yml` (pipeline extract→partition→customize→routed MLD, imagem `osrm-backend:v5.27.1`) + `README.md` (build, notas de timeout/circuit breaker/retry, honestidade do mock). Extrato não commitado por design. Ressalva de expansão de variável em 5.5. |
| 5.2 Cliente OSRM (`MapMatchingService`) com timeout/circuit breaker | ✅ | `clients/http-osrm.client.ts`: `AbortController` + `setTimeout(4000)`, `CircuitBreaker(5, 30_000)`, short-circuit em circuito aberto, `record{Success,Failure}`. `circuit-breaker.ts` com `now` injetável. Ressalva de semântica half-open em 5.4. |
| 5.3 Resolver `MatchedEdge[]` → ruas nomeadas (agregação por nome+cidade) via `geo`; via sem nome | ✅ (com ressalva) | `matching-aggregation.ts` (agrega + drop de nome vazio), `matching.service.ts` (`findCityIdContaining` + `findByNameAndCity`), `geo` ganhou `findByNameAndCity`. Agregação por **nome só** (não nome+cidade) — ver 5.1 dos achados. |
| 5.4 Persistir `activity_street` + integrar ao worker | ✅ | `repositories/activity-street.repository.ts` (`upsert on conflict`, `hasUserVisitedStreet`), migração `0007_activity_street.sql`, `activity-ingestion.service.ts` chama `matchActivityStreets` entre `saveIngestedData` e `updateStatus('processed')`. |

| Critério de sucesso | Status | Observação |
|---------------------|--------|------------|
| Traçado de fixture casado e resolvido na lista correta de ruas nomeadas | ✅ | `matching.int-spec`: 4 edges → 1 rua resolvida (`Rua Maranhão`, 150 m). |
| Trechos repetidos não duplicam ruas; via sem nome segue o fallback | ✅ | `aggregateMatchedEdges` soma trechos do mesmo nome; edges de nome vazio/whitespace são descartados (unit + integração). |
| Indisponibilidade do OSRM não perde a atividade (retry) | ✅ | Erro propaga do `MapMatchingService` → `ingest()` re-lança → job BullMQ falha → `attempts: 5` + backoff exponencial; `updateStatus('processed')` nunca é alcançado. Verificado em `activity-ingestion.service.spec`. |
| `activity_street` registra a associação atividade↔rua | ✅ | Migração + `upsert`; integração confere `street_id`, `matched_length_m`, `is_first_visit`. |

RF-3.1 do PRD ("a partir do trajeto de GPS, identificar as ruas percorridas") é exatamente o entregável. RF-3.2+ (pontuação) são da Task 6 — `points_awarded` fica com `default 0`, corretamente deixado para preenchimento posterior.

---

## 4. Conformidade com a Tech Spec e convenções

- **Convenção de tipagem (única regra transversal):** respeitada e confirmada por lint. `OsrmClient` (`ports/osrm-client.port.ts`) e `ActivityStreetRepository` (`ports/activity-street-repository.port.ts`) são `interface`; `StreetRepository` do `geo` foi estendido mantendo `interface` no `.port.ts`. Modelos (`MatchedEdge`, `AggregatedMatch`, `ResolvedStreet`, rows) usam `type`.
- **Arquitetura em camadas do módulo `matching`:** boa separação por responsabilidade — port (contrato) + `HttpOsrmClient` (HTTP puro, timeout, breaker) + `osrm-response.ts` (parser puro, testável) + `matching-aggregation.ts` (agregação/dedup pura) + `MapMatchingService` (orquestração) + repositório PG. Cada peça tem seu spec.
- **Fluxo de dados (ingestão):** a etapa `matching (OSRM /match) → resolve edges → ruas nomeadas` foi inserida no ponto certo do worker, entre a persistência dos dados e a transição para `processed`, fiel ao diagrama da Tech Spec. Scoring/território ficam para a Task 6.
- **Modelos de dados:** `activity_street` implementa o schema descrito (`activity_id`, `street_id`, `points_awarded`, `is_first_visit`) com FKs `on delete cascade`, `unique(activity_id, street_id)` e índices. Adiciona `matched_length_m` (útil e coerente). **Desvio de modelagem:** o `MatchedEdge` da Tech Spec era `{osmWayId, streetName, cityId, length}`; a implementação usa `{streetName, lengthM, coordinate}` — dropou `osmWayId`/`cityId` e resolve a cidade depois via coordenada. Isso habilita o achado 5.1.
- **Ponto de integração OSRM:** "serviço HTTP interno (`/match/v1/foot`), timeout curto + circuit breaker; falha → `processing` com retry" — implementado literalmente. URL `/match/v1/foot/{coords}?steps=true&geometries=geojson&overview=false`, `OSRM_URL` no config (`osrmUrl`) e `.env.example`.
- **Honestidade da validação:** OSRM mockado só no port; `geo` + `activity_street` reais em PostGIS. Sem fake-green.

---

## 5. Achados

Nenhum achado bloqueante. Ordenados por severidade.

### 5.1 [Maior / Observação] Agregação por nome de rua apenas; cidade resolvida depois por uma única coordenada — diverge de "nome+cidade" e misatribui ruas homônimas entre cidades

- **Arquivos:** `apps/api/src/modules/matching/matching-aggregation.ts` (`aggregateMatchedEdges`) + `apps/api/src/modules/matching/matching.service.ts:21-27`
- **Impacto:** `aggregateMatchedEdges` agrupa **só por `edge.streetName`**; a cidade é resolvida no service **após** a agregação, a partir de `match.coordinate` (a coordenada do **primeiro** edge daquele nome). A subtarefa 5.3 e a Tech Spec ("agregação de edges por (`osm_name`,`city`)") pedem agregação por nome **e** cidade. Consequência concreta: um traçado que cruze duas cidades com uma rua de mesmo nome — situação comuníssima no Brasil ("Rua XV de Novembro", "Rua São João", "Rua Sete de Setembro") — colapsa os dois trechos numa única entrada, resolve a cidade pela primeira coordenada, **soma todo o comprimento na cidade errada** e **nunca registra a rua da segunda cidade**. A raiz é o `MatchedEdge` ter dropado o `cityId` do modelo da Tech Spec (5.4). Os testes não cobrem o caso de homônimos em cidades distintas, então a divergência passa silenciosa.
- **Sugestão:** resolver a cidade **por edge** (a coordenada já existe em cada `MatchedEdge`) e então agregar por chave composta `(streetName, cityId)` — exatamente o que o enunciado descreve; ou, se a simplificação "1 traçado ≈ 1 cidade" for aceita para o MVP, registrar isso explicitamente na task/Tech Spec e adicionar um teste que fixe o comportamento esperado no cruzamento de cidades homônimas.

### 5.2 [Menor / Observação] Vias sem nome derivadas em `street` pelo `geo` são inalcançáveis pelo matching

- **Arquivos:** `apps/api/src/modules/geo/repositories/street.repository.ts` (`deriveStreetsFromOsmRoads`) + `apps/api/src/modules/matching/matching-aggregation.ts`
- **Análise:** o `geo` materializa vias sem nome como ruas reais com nome sintético `'Via sem nome (<osm_id>)'`. Já o matching **descarta** edges de nome vazio que o OSRM retorna para vias sem nome. Resultado: essas ruas sintéticas existem na tabela `street` mas **nunca** podem ser casadas/pontuadas — viram território morto. O enunciado da task pede para avaliar o drop como fallback: **é uma decisão aceitável** (a unidade territorial do jogo é a rua nomeada, e a Tech Spec prevê "descarte de edges de baixa confiança"). A ressalva é a **assimetria** entre as duas camadas: o `geo` cria linhas que o `matching` jamais alcança. Sugestão leve: ou não derivar vias sem nome em `street`, ou documentar a assimetria para não gerar dúvida futura de "por que essas ruas nunca pontuam".

### 5.3 [Menor / Observação] Resolução por igualdade exata de string de `osm_name` — sensível a acento/caixa/abreviação; não exercitável aqui

- **Arquivos:** `apps/api/src/modules/matching/matching.service.ts:27` + `apps/api/src/modules/geo/repositories/street.repository.ts` (`findByNameAndCity`)
- **Análise:** a resolução depende de igualdade exata (`s.osm_name = $2`) entre o `name` que o OSRM retorna no step e o nome importado no `geo`. Ambos vêm da tag `name` do OSM, então em teoria alinham; na prática o OSRM pode devolver o nome com `ref` concatenado, variação de caixa/acentuação ou localização, e qualquer divergência faz `findByNameAndCity` retornar `null` → edge silenciosamente descartado, reduzindo a taxa de match. Isso não é verificável nesta entrega (o OSRM real não é executado; o mock devolve nomes já canônicos). Registro honesto como risco de taxa de casamento a validar quando houver extrato real. Sugestão: quando o OSRM real entrar, medir a taxa de descarte e, se necessário, normalizar nome (trim/unaccent/lower) nos dois lados antes de comparar.

### 5.4 [Menor] Circuit breaker faz reset completo após o cooldown, não um half-open de sonda única

- **Arquivo:** `apps/api/src/modules/matching/circuit-breaker.ts:16-26`
- **Impacto:** o comentário diz "half-opens to let a probe through", mas `canRequest()`, ao expirar o cooldown, zera `failures` **e** limpa `openedAt` — um reset total. Para um OSRM persistentemente fora do ar, isso permite uma **rajada de até `threshold` (5) requisições** a cada janela de cooldown (30 s) antes de reabrir, em vez de deixar passar **uma** sonda e reabrir imediatamente na falha dela. O comportamento é limitado e aceitável (não é um bug), mas não é o half-open estrito que o comentário sugere.
- **Sugestão:** para um half-open real, ao sair do cooldown liberar apenas uma sonda (sem zerar `failures`) e reabrir no primeiro `recordFailure`; ou ajustar o comentário para refletir que é um reset por cooldown.

### 5.5 [Observação] `docker-compose.yml` usa expansão POSIX `${OSRM_PBF%.osm.pbf}` — verificar suporte do Compose; não executado aqui

- **Arquivo:** `infra/osrm/docker-compose.yml`
- **Análise:** os comandos de `partition`/`customize`/`routed` referenciam `/data/${OSRM_PBF%.osm.pbf}.osrm`, usando strip de sufixo estilo shell. As versões modernas do Docker Compose (compose-go) suportam essa forma, mas ela **não é exercida** nesta entrega (o OSRM real não sobe). Como o `README` instrui `docker compose up` como caminho oficial, vale confirmar o suporte na versão-alvo do Compose antes de depender dele. Sugestão: validar num ambiente com extrato real ou, para robustez, exportar o nome-base como variável derivada.

### 5.6 [Nit] Constantes de tuning do OSRM hardcoded no client

- **Arquivo:** `apps/api/src/modules/matching/clients/http-osrm.client.ts:9-11`
- **Análise:** `OSRM_TIMEOUT_MS`, `CIRCUIT_THRESHOLD` e `CIRCUIT_COOLDOWN_MS` são constantes de módulo. Aceitável para o MVP; se no futuro precisarem variar por ambiente, migrar para `configuration.ts` (como já foi feito com `osrmUrl`). Sem ação necessária agora.

---

## 6. Completude dos testes da tarefa

| Teste exigido pela task | Status | Observação |
|-------------------------|--------|------------|
| Unidade — agregação de edges por (nome, cidade) | Coberto (parcial) | `matching-aggregation.spec` cobre agregação por nome + ruas distintas. A dimensão **cidade** não é exercitada na agregação (a cidade é resolvida no service, não na agregação) — ver 5.1. |
| Unidade — fallback de via sem nome | Coberto | `matching-aggregation.spec` ("drops unnamed edges") + `osrm-response.spec` (name default `''`) + `matching.int-spec` (edge de nome vazio descartado). |
| Unidade — dedup de trechos repetidos | Coberto | `matching-aggregation.spec` (soma 100+50=150) + `matching.service.spec` + integração. |
| Unidade — circuit breaker / parser / service / client | Coberto | `circuit-breaker.spec` (threshold, half-open por cooldown, reset em sucesso), `osrm-response.spec` (flatten, skip sem coordenada, sem matchings), `matching.service.spec` (resolve+persiste, first-visit false, skip sem cidade, skip nome desconhecido), `http-osrm.client.spec` (trace curto, mapeamento, código não-Ok, circuito aberto após 5 falhas). |
| Integração — worker + OSRM (mock no port) + traços de fixture → `activity_street` | Coberto | `matching.int-spec` com PostGIS real; `ingest-pipeline.int-spec` também injeta OSRM fake. |
| Retry mantém atividade em `processing` | Coberto | `activity-ingestion.service.spec` ("leaves the activity in processing ... when matching fails") assere que só há um `updateStatus('processing')` e o erro re-propaga. |

Qualidade dos testes: alta. Peças puras (parser, agregação, breaker) isoladas; service com mocks nos ports cobrindo todos os ramos de skip; client com `global.fetch` mockado exercitando o breaker; integração fiel com infra real e mock só na fronteira OSRM. Lacuna concentrada: nenhum teste cobre o caso de ruas homônimas em cidades distintas (5.1), que é justamente onde a agregação por nome-só falha.

---

## 7. Veredito

### `APPROVED WITH OBSERVATIONS`

Justificativa: os quatro gates passaram com os números esperados (**unit 107/107**, **lint limpo**, **build OK**, **integração 22/22**), a convenção de tipagem foi confirmada por lint (`interface` só em `*.port.ts`), e as quatro subtarefas foram entregues com uma arquitetura de camadas limpa (port + client HTTP + parser puro + agregação pura + service + repositório), cada peça com seu spec. O núcleo com risco de bug está coberto e correto: timeout com `AbortController`, circuit breaker, propagação de erro que mantém a atividade em `processing` para retry (BullMQ `attempts: 5` + backoff exponencial, `processed` só após o match), idempotência de `activity_street` por `unique(activity_id, street_id)` + `upsert on conflict`, e `is_first_visit` correto entre atividades do mesmo usuário (exclui a atividade corrente, robusto a reprocessamento). A validação é honesta: OSRM mockado no port, `geo` + `activity_street` reais em PostGIS; o OSRM real, que exige extrato processado, é documentado em `infra/osrm/` mas não executado — exatamente como a task declara.

Os achados não são bloqueantes: o **Maior** (5.1) é uma divergência de comportamento/spec — agregação por nome apenas, com cidade resolvida por uma única coordenada — que misatribui ruas homônimas entre cidades num mesmo traçado; recomenda-se resolver cidade por edge e agregar por `(nome, cidade)` antes do merge, ou assumir explicitamente a simplificação "1 traçado ≈ 1 cidade" com um teste que a fixe. Os **Menores/Observações** (5.2 vias sem nome inalcançáveis, 5.3 igualdade exata de nome, 5.4 half-open como reset, 5.5 expansão de variável no compose) e o **Nit** (5.6) são endereçáveis nesta task ou nas seguintes sem retrabalho estrutural.

---

## 8. Mensagem de commit sugerida (Conventional Commits, pt-BR)

O trabalho já está commitado em `c9b6f79` com mensagem aderente ao padrão. Caso seja necessário reescrever/consolidar:

```
feat(matching): map-matching OSRM + resolução em ruas nomeadas

Implementa o módulo matching: cliente OSRM /match (perfil foot) com
timeout via AbortController e circuit breaker, parser da resposta em
MatchedEdge[], agregação por nome com dedup de trechos e descarte de
vias sem nome, e resolução em ruas nomeadas via geo (cidade por ponto +
nome+cidade), gravando a rastreabilidade em activity_street com
is_first_visit (unique activity_id+street_id, idempotente).

Integra a etapa ao worker de ingestão entre a persistência e a
transição para processed; falha de match propaga o erro e mantém a
atividade em processing para retry (backoff exponencial do BullMQ),
nunca perdendo a atividade.

Infra: infra/osrm (docker-compose do pipeline foot + README);
OSRM_URL no config. Testes: unit (breaker, agregação, parser, service,
client) e integração real contra PostGIS (OSRM mockado no port).
```
