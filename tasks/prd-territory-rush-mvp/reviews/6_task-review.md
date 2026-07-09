# Code Review — Tarefa 6.0: Motor de pontuação + domínio territorial

- **Branch:** `feat/task-6-scoring-territory`
- **Base do diff:** tag `task-5-done` → `HEAD` (`git diff task-5-done...HEAD`, worktrees ignorados)
- **Commit da task:** `d159346 feat(scoring,territory): motor de pontuação puro + domínio territorial`
- **Escopo:** `apps/api` (NestJS 11) — módulos `scoring` e `territory`, worker `ingest-activity` + `supabase/migrations/`
- **Data:** 2026-07-09
- **Revisor:** revisor sênior (skill `task-review` → `executar-review`)

---

## 1. Resumo

A Tarefa 6.0 entrega o núcleo do jogo: o `ScoringEngine` puro e determinístico e o `TerritoryService` transacional que materializa pontuação, posse, ranking e histórico por rua.

O `scoring` está bem fatiado em peças puras e testáveis: `PureScoringEngine` (as quatro categorias), `tiers.ts` (`tierForDays` + `milestonePointsBetween`, que garante milestone concedido uma única vez ao cruzar de tier) e `streak.ts` (`computeStreak`, com mesmo-dia / dia-seguinte / gap / data fora de ordem). O `territory` combina um helper puro `decideOwnership` (transferência só em pontuação **estritamente maior**; empate mantém o dono; primeira reivindicação para o maior) com o `TerritoryService.scoreAndApply`, que faz toda a orquestração de I/O dentro de uma transação (`begin/commit/rollback`, `select ... for update` no `runner_profile`), grava `street_score` (acúmulo, primeira/última visita, `defended_since`, `defense_tier`), `street_ownership_history`, incrementa `disputes_count` e preenche `activity_street.points_awarded`. A etapa foi integrada ao worker entre o map-matching e a transição para `processed`.

As quatro subtarefas (6.1–6.4) e as duas classes de teste exigidas (unidade + integração) estão presentes. Os quatro gates de validação passaram com os números esperados: **unit 130/130**, **lint limpo**, **build OK**, **integração 25/25** (6 suites, ~36 s). A validação é honesta: o motor é testado sem I/O, e o `TerritoryService` roda contra PostGIS real via testcontainers (empate, takeover, disputas e histórico verificados no banco de verdade), sem `jest.mock` de banco.

As bordas centrais estão corretas e cobertas: empate mantém o dono (`changed: false`, sem incrementar disputa), primeira reivindicação não conta disputa (`currentOwner !== null` gateia o incremento), takeover conta disputa e reseta `defended_since`/`defense_tier` do dono antigo e do novo.

Veredito: **`APPROVED WITH OBSERVATIONS`**. Nenhum gate falhou e o escopo foi entregue. O achado mais relevante é de robustez, não de comportamento nominal: o passo de scoring **não é idempotente** contra o reprocessamento de uma atividade que ficou em `processing` (mesma atividade que o desenho de retry da task/Tech Spec prevê) — se `scoreAndApply` commitar mas o `updateStatus('processed')` seguinte falhar, uma nova tentativa do job **soma pontos em dobro**. Em segundo plano, a metade "novo bairro" da RF-3.3 não é entregue no caminho vivo (o serviço passa `newNeighborhoods: 0`) e isso não está documentado.

---

## 2. Resultado da validação de testes (execução real)

Docker de pé confirmado (`docker info` → `DOCKER_UP`). Comandos executados exatamente como especificado.

### Unit — `cd apps/api && npx jest --config jest.config.ts`

```
Test Suites: 30 passed, 30 total
Tests:       130 passed, 130 total
Snapshots:   0 total
Time:        4.264 s
```

Esperado 130 → **130 ✅**. Inclui os novos specs da task: `scoring/pure-scoring.engine.spec` (exploração, região, consistência 7/30/90, defesa 1sem/1mês/3meses, combinação total), `scoring/streak.spec`, `scoring/tiers.spec`, `territory/territory-ownership.spec` (sem scores, primeira reivindicação, takeover estrito, empate, líder que estende vantagem) e o `activity-ingestion.service.spec` ampliado para o passo de território.

### Lint — `cd apps/api && npx eslint "src/**/*.ts" "test/**/*.ts"`

```
LINT_EXIT=0
```

Saída limpa. Confirma a convenção transversal única (`@typescript-eslint/consistent-type-definitions`): o único `interface` novo é o contrato `ScoringEngine` em `scoring-engine.port.ts`; todo o resto (`scoring.types.ts`, `territory.types.ts`, `territory-ownership.ts`, tipos locais `ProfileRow`/`ScoreRow` no service) usa `type`.

### Build — `cd apps/api && npx nest build`

```
BUILD_EXIT=0
```

Compilação OK.

### Integração — `cd apps/api && npx jest --config test/jest-int.config.ts --runInBand`

```
PASS test/territory.int-spec.ts (6.899 s)
PASS test/ingest-pipeline.int-spec.ts (7.596 s)
PASS test/strava.int-spec.ts (5.446 s)
PASS test/streets.int-spec.ts (5.49 s)
PASS test/profile.int-spec.ts (5.298 s)
PASS test/matching.int-spec.ts (5.416 s)

Test Suites: 6 passed, 6 total
Tests:       25 passed, 25 total
Time:        36.195 s
```

Esperado 25 → **25 ✅**. O novo `territory.int-spec` sobe PostGIS (`postgis/postgis:16-3.4`) via testcontainers, roda as migrações reais, semeia `city_ref` + `street` + `activity` + `activity_street` e exercita o `TerritoryService` end-to-end em três cenários encadeados (primeira reivindicação com exploração + nova cidade; empate mantendo o dono; takeover com disputa e histórico), lendo o resultado direto do banco.

**Todos os gates passaram.** Nenhum motivo de `REJECTED` por falha de teste, lint ou build.

---

## 3. Aderência ao escopo da Tarefa 6.0 e critérios de sucesso

| Subtarefa | Status | Evidência |
|-----------|--------|-----------|
| 6.1 `ScoringEngine` puro cobrindo as quatro categorias | ✅ | `pure-scoring.engine.ts` (exploração +100/+10; região +500/+2000; consistência e defesa via `tiers.ts`), sem I/O, `@Injectable` atrás do token `SCORING_ENGINE`. Cobertura total em `pure-scoring.engine.spec` + `tiers.spec` + `streak.spec`. |
| 6.2 Persistência de `street_score` + ranking por rua | ✅ | Migração `0008_scoring_territory.sql` (`street_score` com `unique(street_id,user_id)`, índice `idx_street_score_ranking (street_id, points desc)`); upsert acumulando `points`, `first_visited_at` via `coalesce`, `last_visited_at`, `defense_tier`. Ranking deriva de `street_score` (o índice desc materializa a ordenação). |
| 6.3 `TerritoryService` transacional (posse, histórico, disputas) | ✅ | `territory.service.ts`: `begin/commit/rollback`, `for update` no `runner_profile`, `decideOwnership` puro, escrita de `street_ownership_history` (fecha `lost_at` do antigo, abre linha do novo), `disputes_count` incrementado só em takeover. |
| 6.4 Integrar scoring + território ao worker + `points_awarded` | ✅ | `activity-ingestion.service.ts` chama `territory.scoreAndApply(...)` após `matchActivityStreets` e antes de `updateStatus('processed')`; `activity_street.points_awarded` atualizado por rua dentro da transação. |

| Critério de sucesso | Status | Observação |
|---------------------|--------|------------|
| Cada categoria de ponto concedida conforme o histórico do corredor | ✅ (com ressalva na RF-3.3) | Exploração, cidade nova, consistência e defesa corretas e testadas. **Bairro novo não é computado no caminho vivo** (`newNeighborhoods: 0`) — ver 5.2. |
| Ultrapassar o dono → troca de proprietário + histórico + disputas; empate mantém | ✅ | `territory.int-spec` verifica no banco: takeover troca `owner_user_id`, fecha/abre histórico e `disputes_count = 1`; empate mantém `USER_A` e `disputes_count = 0`. |
| `street_score` e ranking refletem o resultado após processar | ✅ | Upsert acumula pontos; `top_score` atualizado; índice de ranking presente. Integração confere `points` de A e B. |
| Empate mantém o dono (borda explícita) | ✅ | `decideOwnership` exige `> ownerPoints`; unit + integração cobrem. |
| Milestones concedidos uma única vez | ✅ | `milestonePointsBetween(fromTier, toTier)` só soma os tiers cruzados; `newDefenseTier`/`newStreakTier` via `max`. Testes "does not re-award" cobrem defesa e consistência. |

RF-3.2 (exploração), RF-3.4 (consistência), RF-3.5 (defesa), RF-3.6 (pontuação/ranking pós-processamento), RF-4.1/4.2/4.3 (ranking, proprietário, transferência+histórico) atendidos. RF-3.3 atendido **pela metade** (cidade sim, bairro não) — ver 5.2. A notificação de troca de domínio da RF-4.3 é da Task 9 (`scoreAndApply` já retorna `TerritoryChange[]`, o gancho está pronto).

---

## 4. Conformidade com a Tech Spec e convenções

- **Convenção de tipagem (única regra transversal):** respeitada e confirmada por lint. `ScoringEngine` é `interface` em `scoring-engine.port.ts`; modelos, DTOs e rows usam `type`.
- **`ScoringEngine` puro (sem I/O):** fiel à Tech Spec — recebe contexto por rua (primeira visita, dias de posse, tier de defesa já concedido) + agregados do corredor (bairros/cidades novas, streak, tier de consistência já concedido) e devolve pontos por regra, determinístico. Boa decomposição: `tiers.ts` e `streak.ts` isolados, cada um com spec próprio.
- **`TerritoryService` concentra a transição de posse dentro de transação:** fiel. O `for update` no `runner_profile` serializa atividades **do mesmo corredor**; ver ressalva de concorrência entre corredores (5.3).
- **Fluxo de dados (ingestão):** `scoring.compute()` → `territory.apply()` foi inserido no ponto certo do worker, após o map-matching e antes de `processed`, como no diagrama.
- **Modelos de dados:** `street_score`, `street_ownership_history` implementados como descrito; `runner_profile` ganhou `total_points` e `streak_bonus_tier` (agregados de nível corredor — coerente). `street.owner_user_id`/`top_score`/`disputes_count` (migração 0004) atualizados corretamente.
- **Desvio de assinatura vs. Tech Spec (não bloqueante):** a Tech Spec esboça `interface TerritoryService { applyActivityScore(activityId, awards: StreetAward[]) }` — ou seja, scoring calculado fora e passado pronto. A implementação fundiu montagem do input + cálculo + aplicação num único `scoreAndApply(input)` **classe concreta** (sem port). É uma escolha razoável (o serviço é quem tem o histórico no banco para montar o `ScoringInput`), mas diverge do contrato documentado; registro por completude — ver 5.5.
- **Honestidade da validação:** motor testado sem I/O; território contra PostGIS real. Sem fake-green.

---

## 5. Achados

Nenhum achado bloqueante. Ordenados por severidade.

### 5.1 [Maior / Observação] Scoring não é idempotente no reprocessamento — atividade presa em `processing` que é re-tentada soma pontos em dobro

- **Arquivos:** `apps/api/src/workers/ingest-activity/activity-ingestion.service.ts:21-54` + `apps/api/src/modules/territory/territory.service.ts:110-124`
- **Impacto:** o único guarda de idempotência do worker é `if (activity.status === 'processed') return;`. O `scoreAndApply` (transação própria) e o `updateStatus('processed')` (query separada, **fora** daquela transação) não são atômicos entre si. Se o scoring commitar e o `updateStatus('processed')` seguinte falhar (ou o processo cair na janela entre os dois), a atividade permanece `processing`. O BullMQ re-tenta o **mesmo** job (`attempts: 5`, backoff exponencial — `bullmq-ingest-activity.queue.ts:22-24`); `createIfAbsent` devolve a atividade ainda `processing`, o guard não pega, e `scoreAndApply` roda de novo. Como `street_score.points` e `runner_profile.total_points` são **acumulados** (`points = points + $3`), o resultado é pontuação inflada de forma silenciosa e permanente — e, pior, uma segunda passada pode disparar uma troca de posse/disputa espúria. Note que o `jobId = (provider, providerActivityId)` **não** protege aqui: é a mesma execução sendo re-tentada, não uma nova entrega. Esse é exatamente o caminho de retry que a Tech Spec e o item 5 do escopo declaram como suporte ("falha propaga → atividade fica processing → retry"); o caso comum de retry (falha de OSRM/match) é seguro porque o scoring ainda não rodou, mas a janela pós-commit não é.
- **Sugestão:** tornar o passo determinístico contra reprocessamento — opções: (a) fazer a transição para `processed` **dentro** da mesma transação de `scoreAndApply` (mover o `update activity set status` para o `PoolClient` da transação), de modo que scoring e status commitem juntos; ou (b) guardar o scoring por um marcador idempotente (ex.: `activity.status = 'processed'` como pré-condição do `insert/update` de pontos, ou uma coluna `scored_at`), abortando a re-aplicação. Um teste de integração reprocessando a mesma atividade e assertando pontos inalterados fixaria o comportamento.

### 5.2 [Menor / Observação] Metade "novo bairro" da RF-3.3 não é entregue no caminho vivo e não está documentada

- **Arquivos:** `apps/api/src/modules/territory/territory.service.ts:93` (`newNeighborhoods: 0`) + `apps/api/src/modules/scoring/pure-scoring.engine.ts:8,35`
- **Análise:** a RF-3.3 pede "+500 por novo bairro; +2.000 por nova cidade". O `ScoringEngine` suporta e **testa** o bônus de bairro (`pure-scoring.engine.spec` "awards 500 per new neighborhood"), mas o `TerritoryService` passa `newNeighborhoods: 0` fixo, porque o modelo `geo` não tem entidade de bairro (só `city_ref`/`street`; confirmado — nenhuma tabela/coluna de bairro em `supabase/migrations/`). Ou seja, no fluxo real o bônus de bairro **nunca** é concedido. A escolha é arquiteturalmente limpa (o motor já tem o encaixe, ligar depois é trivial e sem retrabalho) e defensável para o MVP, **mas está indocumentada**: não há comentário no ponto de chamada nem nota na task/PRD sinalizando que essa metade da RF-3.3 foi diferida. Como comentários são permitidos neste repo (a regra `no-comments` do AcquisitionNew não se aplica), um leitor/PM não tem como perceber que o valor é inerte. A cobertura de teste do bairro no motor puro, sem contraparte no caminho vivo, ainda pode dar falsa sensação de "RF-3.3 pronta".
- **Sugestão:** documentar explicitamente o diferimento — um comentário curto em `territory.service.ts:93` (ex.: "bairro não modelado no geo ainda; RF-3.3 parcial") e/ou uma nota na task marcando a metade "bairro" como pendente até o `geo` ganhar a entidade de bairro.

### 5.3 [Menor / Observação] Concorrência entre corredores na mesma rua não é serializada

- **Arquivos:** `apps/api/src/modules/territory/territory.service.ts:35-49` (`for update` só no `runner_profile`) + `applyOwnership` (139-194)
- **Análise:** o `select ... for update` trava a linha do `runner_profile` do corredor — isso serializa atividades **do mesmo** corredor, mas não protege o recurso realmente disputado: a linha da `street`. Sob `READ COMMITTED` (default), duas atividades de corredores **diferentes** processando a **mesma** rua em paralelo leem os scores um do outro em estado antigo, decidem a posse de forma independente e escrevem em `public.street` — o último a commitar sobrescreve (lost update), podendo produzir `owner_user_id`/`disputes_count`/histórico inconsistentes. É um cenário de baixa probabilidade no MVP (ingestão via webhook, concorrência do worker tipicamente baixa) e o enunciado da task especifica a trava no `runner_profile`, então isso é coerente com o pedido; registro como risco a endereçar antes de escalar.
- **Sugestão:** adicionar `select ... for update` na linha da `street` no início do `applyOwnership` (ou um `pg_advisory_xact_lock` keyed por `street_id`), serializando as decisões de posse por rua sem depender do corredor.

### 5.4 [Menor / Observação] Tier de consistência (streak) nunca reseta ao quebrar a sequência

- **Arquivos:** `apps/api/src/modules/scoring/pure-scoring.engine.ts:37-38` + `territory.service.ts:100-105`
- **Análise:** `newStreakTier = max(streakBonusAwardedTier, streakTier)` e `runner_profile.streak_bonus_tier` só cresce. Consequência: quebrar a sequência reseta `streak_days` para 1 (correto em `computeStreak`), mas **não** reseta `streak_bonus_tier`. Assim, um corredor que já ganhou o marco de 90 dias nunca mais recebe bônus de consistência, mesmo quebrando e reconstruindo a sequência — e alguém que quebrou após os 7 dias não reganha o +500 ao refazer 7 dias. Isso **está alinhado** com o enunciado da task ("milestones concedidos uma única vez, tier já concedido") e é a interpretação "uma vez na vida". A ressalva é a **assimetria** com a defesa, que **reseta** o tier ao perder a posse (`defense_tier = 0`): por simetria, poderia esperar-se que a consistência resetasse ao quebrar a sequência. Não é um defeito frente ao texto da task — é uma decisão de produto a confirmar.
- **Sugestão:** confirmar a semântica com produto. Se a intenção for "por sequência", resetar `streak_bonus_tier` para o tier atual quando `computeStreak` detecta quebra (gap). Se for "uma vez na vida", nenhuma ação — talvez só um comentário fixando a decisão.

### 5.5 [Nit] `TerritoryService` sem port e com nome de método divergente da Tech Spec

- **Arquivos:** `apps/api/src/modules/territory/territory.service.ts` + `territory.module.ts`
- **Análise:** diferente de `ScoringEngine` (que tem port + token DI), `TerritoryService` é injetado como classe concreta e expõe `scoreAndApply` em vez do `applyActivityScore(activityId, awards)` esboçado na Tech Spec. É aceitável (a Tech Spec trata interfaces como ilustrativas, e a fusão scoring-input + apply num só método é coerente com o serviço ser dono do histórico), mas cria uma pequena divergência entre doc e código. Sem ação necessária; se for desejável testabilidade/substituição futura, extrair um `territory-service.port.ts`.

### 5.6 [Nit] `update activity_street ... points_awarded` é no-op silencioso se a linha não existir

- **Arquivo:** `apps/api/src/modules/territory/territory.service.ts:121-124`
- **Análise:** o `update ... where activity_id = $1 and street_id = $2` afeta 0 linhas sem erro caso o map-matching não tenha inserido a linha de `activity_street` correspondente. Na prática o `matching` (Task 5) insere essas linhas e a integração as semeia, então as duas pontas se alinham — é apenas um acoplamento implícito. Sem ação; registro para consciência (um `update` que atinge 0 linhas aqui indicaria dessincronização entre as ruas resolvidas e as persistidas).

---

## 6. Completude dos testes da tarefa

| Teste exigido pela task | Status | Observação |
|-------------------------|--------|------------|
| Unidade — primeira vez vs conhecida | Coberto | `pure-scoring.engine.spec` "exploration" (100 vs 10). |
| Unidade — bairro/cidade novos | Coberto (parcial) | `pure-scoring.engine.spec` "region" cobre bairro **e** cidade **no motor**; o caminho vivo do bairro não existe (5.2). |
| Unidade — streak 7/30/90 | Coberto | `tiers.spec` (limiares) + `streak.spec` (mesmo dia/próximo dia/gap/fora de ordem) + engine "consistency". |
| Unidade — defesa 1sem/1mês/3meses | Coberto | `pure-scoring.engine.spec` "defense" (100+500 aos 30d; nada aos 100d/tier 3; 0 sem posse). |
| Unidade — empate mantém dono | Coberto | `territory-ownership.spec` "keeps the current owner on a tie" + integração. |
| Integração — atividade → `street_score`/ranking/posse/histórico em transação | Coberto | `territory.int-spec`: primeira reivindicação (100 + 2000 cidade), empate (mantém dono, disputa 0), takeover (owner B, disputa 1, histórico fechado/aberto). |

Qualidade dos testes: alta. Peças puras (engine, tiers, streak, decideOwnership) isoladas e exaustivas; integração fiel com PostGIS real e cenários encadeados que exercitam de fato a transação e as bordas de posse. 

Lacunas de cobertura (não bloqueantes): (a) **reprocessamento/idempotência** da mesma atividade não é testado — é justamente o cenário do achado 5.1; (b) a integração não assere os valores de `defended_since`/`defense_tier` após o takeover (verifica histórico e disputa, mas não o reset do relógio de defesa no banco); (c) não há teste do `defended_since` alimentando pontos de defesa através do `TerritoryService` (a defesa é coberta só no motor puro). Vale adicionar ao menos (a) para travar o comportamento antes de escalar.

---

## 7. Veredito

### `APPROVED WITH OBSERVATIONS`

Justificativa: os quatro gates passaram com os números esperados (**unit 130/130**, **lint limpo**, **build OK**, **integração 25/25**), a convenção de tipagem foi confirmada por lint (`interface` só no `*.port.ts` do `ScoringEngine`), e as quatro subtarefas foram entregues com uma arquitetura limpa — motor puro decomposto em peças testáveis (`tiers`, `streak`, `engine`) e serviço transacional com helper de posse puro (`decideOwnership`). As bordas centrais que a task pede estão corretas e verificadas no banco: empate mantém o dono sem contar disputa, primeira reivindicação não conta disputa, takeover exige pontuação estritamente maior e conta disputa, e o `defended_since`/`defense_tier` reseta na troca. A validação é honesta (motor sem I/O; território contra PostGIS real via testcontainers, sem mock de banco).

Os achados não são bloqueantes. O **Maior** (5.1) é de robustez, não de comportamento nominal: o passo de scoring não é idempotente contra o reprocessamento de uma atividade que ficou `processing` — a mesma que o desenho de retry da task prevê — porque a transição para `processed` está fora da transação de `scoreAndApply`; recomenda-se fortemente fechar essa janela (transição de status na mesma transação ou marcador idempotente) antes que o pipeline vá a produção, já que o efeito é pontuação/posse infladas de forma silenciosa. Os **Menores/Observações** — 5.2 (bairro da RF-3.3 diferido e indocumentado), 5.3 (concorrência entre corredores na mesma rua), 5.4 (assimetria do reset de tier de consistência vs. defesa) — e os **Nits** (5.5 port/assinatura vs. Tech Spec, 5.6 update no-op) são endereçáveis nesta task ou nas seguintes sem retrabalho estrutural. Nenhum deles justifica `REJECTED`.

---

## 8. Mensagem de commit sugerida (Conventional Commits, pt-BR)

O trabalho já está commitado em `d159346` com mensagem aderente ao padrão. Caso seja necessário reescrever/consolidar:

```
feat(scoring,territory): motor de pontuação puro + domínio territorial

Implementa o ScoringEngine puro e determinístico com as quatro
categorias (exploração +100/+10; região +500 bairro/+2000 cidade;
consistência +500/+2000/+10000 em 7/30/90d; defesa +100/+500/+2000 em
1sem/1mês/3meses), com milestones concedidos uma única vez ao cruzar de
tier (tiers.ts) e streak por dias consecutivos (streak.ts).

Adiciona o TerritoryService transacional: acumula street_score
(primeira/última visita, defended_since, defense_tier), decide a posse
(decideOwnership: troca só em pontuação estritamente maior; empate
mantém o dono; primeira reivindicação sem disputa), escreve
street_ownership_history, incrementa disputes_count e preenche
activity_street.points_awarded — tudo em transação com for update no
runner_profile.

Integra scoring + território ao worker após o map-matching; falha
propaga e mantém a atividade em processing para retry. Migração
0008 (street_score, street_ownership_history, total_points e
streak_bonus_tier em runner_profile). Testes: unit (engine, tiers,
streak, decideOwnership) + integração transacional real em PostGIS.
```
