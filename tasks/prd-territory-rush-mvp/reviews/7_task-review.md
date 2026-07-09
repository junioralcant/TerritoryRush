# Code Review — Tarefa 7.0: Anti-cheat básico (guarda no worker)

- **Branch:** `feat/task-7-anti-cheat`
- **Base do diff:** tag `task-6-done` → `HEAD` (`git diff task-6-done...HEAD`, worktrees ignorados)
- **Commit da task:** `de512b0 feat(anti-cheat): guarda de validação básica no worker`
- **Escopo:** `apps/api` (NestJS 11) — módulo `anti-cheat` + worker `ingest-activity`
- **Data:** 2026-07-09
- **Revisor:** revisor sênior (skill `task-review` → `executar-review`)

---

## 1. Resumo

A Tarefa 7.0 entrega a guarda anti-cheat básica do pipeline: um módulo `anti-cheat` com quatro validadores puros (origem, velocidade, coerência distância×tempo×ritmo e frequência cardíaca), um `AntiCheatService` que os compõe num veredito, e o gancho no worker `ingest-activity` que roda a validação **antes** do map-matching e do scoring. Atividade reprovada é marcada `rejected` com `rejection_reason` e **não** segue para matching/território; atividade válida passa e o fluxo continua.

A arquitetura está limpa e bem fatiada. Os validadores em `validators.ts` são funções puras que devolvem `string | null` (motivo ou aprovação), e o `AntiCheatService.evaluate` percorre um array de validadores com short-circuit no primeiro que falha — `origem` primeiro (curto-circuita antes das demais checagens), depois velocidade, coerência e FC. O veredito é um union discriminado (`{approved: true} | {approved: false; reason}`), tipado como `type` conforme a convenção transversal. O worker computa a FC média a partir do stream (`averageHeartrate`) e monta o input a partir das métricas já buscadas do provider, chamando `evaluate` logo após `saveIngestedData` e antes de `matchActivityStreets`. A rejeição reusa `updateStatus(id, 'rejected', reason)` — que já persistia `rejection_reason` na coluna criada na migração `0006_activity.sql` — e a transparência ao usuário é atendida sem código novo: `GET /activities` devolve `ActivityRecord[]`, que inclui `rejectionReason`, e aceita `?status=rejected` como filtro.

As três subtarefas (7.1–7.3) e as duas classes de teste exigidas (unidade + integração real) estão presentes. Os quatro gates de validação passaram com os números esperados: **unit 148/148**, **lint limpo**, **build OK**, **integração 28/28** (7 suites, ~42 s). A validação é honesta: os validadores são testados sem I/O, e a guarda é exercitada end-to-end contra PostGIS + Redis reais via testcontainers, disparando o webhook Strava de verdade e lendo o `status`/`rejection_reason` do banco — sem `jest.mock` de banco, fila ou gateway (o gateway/OSRM são substituídos por `overrideProvider`, padrão já adotado nas integrações anteriores).

Veredito: **`APPROVED WITH OBSERVATIONS`**. Nenhum gate falhou e o escopo foi entregue. O achado mais relevante é de **eficácia**, não de comportamento nominal: o validador de coerência (RF-10.2) é **inerte no caminho de produção** — `avgPaceSKm` é derivado a montante (`http-strava-activity.client.ts`) exatamente como `movingTimeS / (distanceM/1000)`, a mesma fórmula que `validateCoherence` recomputa e compara, então o desvio é sempre ~0 e a checagem nunca reprova dado real de Strava (só entradas fabricadas à mão, como no unit test). Em segundo plano, o limiar de FC (`< 40`) é seguro mas quase nunca dispara para o cenário que visa (veículo), e a rejeição por dado faltante compartilha o canal de `rejection_reason` com a fraude.

---

## 2. Resultado da validação de testes (execução real)

Docker de pé confirmado (`docker ps` → `DOCKER_OK`). Comandos executados exatamente como especificado.

### Unit — `cd apps/api && npx jest --config jest.config.ts`

```
Test Suites: 32 passed, 32 total
Tests:       148 passed, 148 total
Snapshots:   0 total
Time:        4.135 s
```

Esperado 148 → **148 ✅**. Inclui os novos specs da task: `anti-cheat/validators.spec.ts` (cada validador + `averageHeartrate`) e `anti-cheat/anti-cheat.service.spec.ts` (composição do veredito), além do `activity-ingestion.service.spec.ts` ampliado com o caso "rejects a fraudulent activity before matching or scoring".

### Lint — `cd apps/api && npx eslint "src/**/*.ts" "test/**/*.ts"`

```
LINT_EXIT=0
```

Saída limpa. Confirma a convenção transversal única (`@typescript-eslint/consistent-type-definitions`): os novos tipos (`AntiCheatInput`, `AntiCheatVerdict`) usam `type`; nenhum `interface` foi introduzido fora de `*.port.ts` (grep em `src/modules/anti-cheat/` → nenhum `interface`).

### Build — `cd apps/api && npx nest build`

```
BUILD_EXIT=0
```

Compilação OK.

### Integração — `cd apps/api && npx jest --config test/jest-int.config.ts --runInBand`

```
PASS test/anti-cheat.int-spec.ts (7.638 s)
PASS test/ingest-pipeline.int-spec.ts (7.517 s)
PASS test/streets.int-spec.ts (5.382 s)
PASS test/profile.int-spec.ts (5.337 s)
PASS test/matching.int-spec.ts (5.315 s)
PASS test/territory.int-spec.ts (5.385 s)
PASS test/strava.int-spec.ts (5.346 s)

Test Suites: 7 passed, 7 total
Tests:       28 passed, 28 total
Time:        41.978 s
```

Esperado 28 → **28 ✅**. O novo `anti-cheat.int-spec.ts` sobe PostGIS (`postgis/postgis:16-3.4`) e Redis (`redis:7-alpine`) via testcontainers, roda as migrações reais, semeia `provider_connection`, dispara `POST /webhooks/strava` (evento `activity/create`) e faz polling do `status` no banco: o `object_id: 701` (distância 40 km em 1500 s → 96 km/h) termina `rejected` com `rejection_reason = 'Velocidade média incompatível com corrida'`; o `object_id: 702` (5 km em 1500 s → 12 km/h) termina `processed` com `rejection_reason` nulo.

**Todos os gates passaram.** Nenhum motivo de `REJECTED` por falha de teste, lint ou build.

---

## 3. Aderência ao escopo da Tarefa 7.0 e critérios de sucesso

| Subtarefa | Status | Evidência |
|-----------|--------|-----------|
| 7.1 Módulo `anti-cheat`: validadores puros + composição do veredito | ✅ | `validators.ts` (origem/velocidade/coerência/FC, puros, `string \| null`); `anti-cheat.service.ts` compõe via array `[validateOrigin, validateSpeed, validateCoherence, validateHeartrate]` com short-circuit; veredito union discriminado em `anti-cheat.types.ts`. Cobertos por `validators.spec` + `anti-cheat.service.spec`. |
| 7.2 Plugar a guarda no worker antes de matching/scoring | ✅ | `activity-ingestion.service.ts:37-47`: `evaluate(...)` roda após `saveIngestedData` e **antes** de `matchActivityStreets`/`scoreAndApply`; `if (!verdict.approved) { updateStatus('rejected', reason); return; }`. Unit assere `matching`/`territory` não chamados na rejeição; `AntiCheatModule` importado no `ingest-activity.module.ts`. |
| 7.3 Persistir `rejection_reason` e expor no status | ✅ | `updateStatus(id, 'rejected', reason)` grava `rejection_reason` (coluna da migração 0006); `GET /activities` (`ActivitiesController`) devolve `ActivityRecord.rejectionReason` e aceita `?status=rejected` (via `parseActivityStatus`). Integração confirma o motivo persistido. |

| Critério de sucesso | Status | Observação |
|---------------------|--------|------------|
| Velocidade/ritmo incompatível → rejeitada com motivo e sem pontos | ✅ | `validateSpeed` (> 25 km/h) rejeita; integração 701 → `rejected` sem passar por scoring; unit confirma `scoreAndApply` não chamado. |
| Incoerência distância×tempo×ritmo detectada; FC como sinal quando presente | ⚠️ Parcial | Validadores existem e são testados **em isolamento**, mas `validateCoherence` é inerte contra dado real (ver 5.1) e `validateHeartrate` só reprova FC `< 40`, cenário que quase nunca ocorre (ver 5.2). |
| Atividade válida passa sem falso-positivo e segue para matching/scoring | ✅ | Integração 702 → `processed`, `rejection_reason` nulo; unit "approves a plausible running activity". |

RF-10.1 (velocidade/ritmo) e RF-10.3 (origem + informar rejeição ao usuário) atendidos. RF-10.2 atendido **na estrutura** (validador + FC como sinal) porém com eficácia real reduzida — ver seção 5.

---

## 4. Conformidade com a Tech Spec e convenções

- **Convenção de tipagem (única regra transversal):** respeitada e confirmada por lint. `AntiCheatInput`/`AntiCheatVerdict` são `type` (o veredito é union discriminado, exatamente o caso que a Tech Spec reserva a `type`); nenhum `interface` novo fora de `*.port.ts`.
- **Posição do anti-cheat no fluxo de dados:** fiel ao diagrama da Tech Spec ("busca atividade + streams → `anti-cheat.validate()` → `matching` → `scoring` → `territory`"). A guarda está no ponto certo, entre `saveIngestedData` e o map-matching.
- **`anti-cheat` como validadores puros:** fiel à Abordagem de Testes da Tech Spec ("ritmo/velocidade acima do limite → rejeição; coerência distância×tempo×ritmo; sinal de FC quando presente; origem inválida"). Cada um desses casos tem teste unitário dedicado.
- **Modelos de dados:** reusa `activity.status`/`rejection_reason` da migração 0006 sem alterar schema (correto — a task diz "uso de `activity.rejection_reason`", não criação).
- **Divergência de nomenclatura vs. Tech Spec (nit):** a Tech Spec grafa `anti-cheat.validate()`; a implementação expõe `evaluate()`. Sem impacto funcional; registro por completude (ver 5.5).
- **Honestidade da validação:** validadores testados sem I/O; guarda testada end-to-end contra PostGIS + Redis reais, disparando o webhook de verdade. Sem `jest.mock` de banco/fila/gateway interno; o gateway Strava e o OSRM são substituídos por `overrideProvider` (dependências externas), coerente com as integrações anteriores. Sem fake-green.

---

## 5. Achados

Nenhum achado bloqueante. Ordenados por severidade.

### 5.1 [Maior / Observação] `validateCoherence` (RF-10.2) é inerte no caminho de produção — o ritmo é derivado da mesma distância/tempo que ele confere

- **Arquivos:** `apps/api/src/modules/anti-cheat/validators.ts:31-42` + `apps/api/src/modules/integrations/strava/clients/http-strava-activity.client.ts:44-45`
- **Análise:** o cliente Strava computa
  `avgPaceSKm = movingTimeS / (distanceM / 1000)` (quando `distanceM` e `movingTimeS` são válidos).
  O validador recomputa exatamente a mesma quantidade — `computedPace = input.movingTimeS / (input.distanceM / 1000)` — e reprova se `|avgPaceSKm - computedPace| / computedPace > 0.1`. Como `avgPaceSKm` **é** `computedPace` (mesma fórmula, mesmos operandos), o desvio é sempre ~0 e a checagem **nunca** reprova uma atividade real de Strava. Ela só falha para entradas fabricadas em que `avgPaceSKm` é injetado inconsistente com distância/tempo — que é justamente o que o unit test faz (`avgPaceSKm: 600` com 5 km/1500 s). Ou seja, a RF-10.2 ("coerência entre distância, tempo e ritmo") está implementada e testada em isolamento, mas **não oferece proteção real** no fluxo vivo: o vetor que ela deveria pegar (dado inconsistente vindo do provider/spoof) não existe porque o ritmo não é um dado independente — é derivado localmente dos outros dois. O `fraudData` do teste de integração é pego por `validateSpeed` (96 km/h), não por coerência, então a integração também não exercita coerência de fato.
- **Impacto:** um dos três validadores exigidos pela task fica efetivamente sem função no MVP. A detecção real de fraude repousa inteira sobre `validateSpeed` (velocidade) — que, felizmente, é o vetor principal (veículo) e está sólido.
- **Sugestão:** alimentar a coerência com um ritmo **de fonte independente** para que as duas grandezas possam divergir de verdade — ex.: usar o `average_speed` reportado pela Strava (campo distinto do par distância/tempo), ou derivar distância/tempo do próprio stream `latlng`/`time` e confrontar com as métricas agregadas. Alternativamente, se a intenção é só blindar contra corrupção de dado a montante, documentar isso explicitamente (o validador vira um guard de sanidade de dados, não de fraude). Um teste que exercite coerência com `avgPaceSKm` vindo de fonte diferente fixaria o comportamento.

### 5.2 [Menor / Observação] Limiar de FC `< 40` quase nunca dispara para o cenário que visa

- **Arquivo:** `apps/api/src/modules/anti-cheat/validators.ts:45-51`
- **Análise:** `validateHeartrate` reprova apenas FC média `< 40 bpm`. O cenário-alvo do anti-cheat (deslocamento em carro/moto disfarçado de corrida) tem a pessoa em repouso sentada, com FC tipicamente ~60-80 bpm — **acima** do limiar, logo não é pego. Uma FC média `< 40` durante uma "corrida" indica quase sempre ausência/erro de sensor, não fraude. O limiar é **seguro** (não gera falso-positivo, pois atletas em repouso raramente ficam abaixo de 40), o que atende ao pedido de "FC como sinal adicional quando presente", mas seu valor prático como detector é próximo de nulo. Além disso, só o lado **baixo** é limitado — uma FC média implausivelmente alta não é sinalizada (defensável no MVP, mas assimétrico).
- **Sugestão:** confirmar com produto se o objetivo é apenas descartar leituras claramente inválidas (então 40 está ok e é conservador por design) ou usar a FC como sinal efetivo de "sem esforço" — nesse caso um limiar maior (ex.: reprovar quando a FC média for baixa **e** a velocidade sugerir esforço, combinando sinais) capturaria melhor o caso veículo sem penalizar atletas de FC baixa. Como está, vale ao menos deixar claro (comentário/nota) que o `< 40` é intencionalmente conservador.

### 5.3 [Menor / Observação] Dado faltante e fraude compartilham o canal de `rejection_reason`

- **Arquivo:** `apps/api/src/modules/anti-cheat/validators.ts:20-30`
- **Análise:** `validateSpeed` reprova com `'Atividade sem distância ou tempo válidos'` quando `distanceM`/`movingTimeS` são nulos ou ≤ 0. Esse motivo é gravado em `rejection_reason` e exibido ao usuário via `GET /activities` exatamente como uma rejeição anti-cheat. Uma atividade legítima com métricas ausentes (falha parcial de importação, GPS ruim) é assim marcada `rejected` de forma permanente e apresentada como reprovada por trapaça, quando o problema é qualidade/completude de dado. O PRD (caso de borda) sugere que "apenas os trechos válidos sejam considerados" — isso é escopo de map-matching, não desta task, mas o rótulo aqui pode confundir o usuário e conflita levemente com a promessa de "explicar por que não pontuou".
- **Sugestão:** separar semanticamente "dado insuficiente para validar" de "reprovada por indício de fraude" — seja com um motivo mais neutro (ex.: "Atividade sem dados suficientes para validação"), seja mantendo essa atividade num estado distinto de `rejected` por anti-cheat. Não bloqueante; decisão de UX/produto.

### 5.4 [Nit] Worker importa `averageHeartrate` diretamente do arquivo interno de validadores

- **Arquivo:** `apps/api/src/workers/ingest-activity/activity-ingestion.service.ts:9,42`
- **Análise:** o worker importa `averageHeartrate` de `../../modules/anti-cheat/validators` (arquivo interno do módulo) em vez de acessá-lo pela superfície do `AntiCheatService`. Funciona (é função pura), mas vaza um detalhe de implementação do módulo `anti-cheat` para o worker: a redução stream→escalar de FC é conceitualmente responsabilidade do anti-cheat. Se amanhã o `evaluate` passar a receber o stream bruto (ou expor um helper dedicado), o ponto de acoplamento some.
- **Sugestão:** ou o `AntiCheatService` recebe `GpsStreams` e faz a média internamente, ou expõe `averageHeartrate` como parte explícita do contrato do módulo. Cosmético.

### 5.5 [Nit] `AntiCheatService` sem port e método `evaluate` vs. `validate` da Tech Spec

- **Arquivos:** `apps/api/src/modules/anti-cheat/anti-cheat.service.ts` + `anti-cheat.module.ts`
- **Análise:** diferente do `ScoringEngine` (Task 6, que ganhou port + token DI), o `AntiCheatService` é injetado como classe concreta e expõe `evaluate` onde a Tech Spec grafa `anti-cheat.validate()`. É aceitável — o serviço é puro, sem I/O e sem necessidade de substituição — e a divergência de nome não tem impacto. Registro só por consistência com a decisão de port adotada no motor de scoring.
- **Sugestão:** nenhuma ação necessária; se quiser uniformidade com `scoring`, extrair um `anti-cheat.port.ts`. Cosmético.

---

## 6. Completude dos testes da tarefa

| Teste exigido pela task | Status | Observação |
|-------------------------|--------|------------|
| Unidade — validador de ritmo/velocidade | Coberto | `validators.spec` "validateSpeed" (aceita 12 km/h; reprova 96 km/h; reprova sem distância/tempo). |
| Unidade — validador de coerência | Coberto (isolado) | `validators.spec` "validateCoherence" (aceita triple coerente; reprova pace 600; pula quando ausente). Ressalva de eficácia em 5.1. |
| Unidade — validador de FC | Coberto | `validators.spec` "validateHeartrate" (no-op sem FC; aceita 150; reprova 20) + `averageHeartrate` (média do stream; nulo sem stream). |
| Unidade — validador de origem | Coberto | `validators.spec` "validateOrigin" (aceita strava/garmin; reprova polar). |
| Unidade — composição do veredito | Coberto | `anti-cheat.service.spec` (aprova plausível; reprova velocidade com motivo; reprova incoerente; reprova origem **antes** das demais checagens). |
| Integração — worker rejeita fraude sem pontuar, com motivo persistido | Coberto | `anti-cheat.int-spec` 701 → `rejected` + `rejection_reason` persistido; unit complementar assere `matching`/`territory` não chamados. |
| Integração — worker aprova atividade válida | Coberto | `anti-cheat.int-spec` 702 → `processed`, `rejection_reason` nulo. |

Qualidade dos testes: alta. Validadores puros isolados e exaustivos; composição cobre a ordem (origem primeiro) e o short-circuit; a integração é fiel, com webhook real, fila Redis real e leitura direta do banco.

Lacunas de cobertura (não bloqueantes): (a) a **coerência não é exercitada de ponta a ponta** com dado realista — a integração de fraude é pega por velocidade, e o único caso de coerência é um input unitário fabricado (relacionado a 5.1); (b) não há teste da guarda com **FC presente** no stream chegando ao veredito pelo worker (o `averageHeartrate` é testado, mas o caminho worker→`evaluate` com FC real não); (c) não há teste do caso "dado faltante" pelo pipeline (5.3). Nenhuma delas bloqueia, mas (a) é a que mais interessa fixar caso a eficácia da coerência seja endereçada.

---

## 7. Veredito

### `APPROVED WITH OBSERVATIONS`

Justificativa: os quatro gates passaram com os números esperados (**unit 148/148**, **lint limpo**, **build OK**, **integração 28/28**), a convenção de tipagem foi confirmada por lint (nenhum `interface` fora de `*.port.ts`; veredito como union `type`) e as três subtarefas foram entregues com arquitetura limpa — validadores puros compostos por um serviço com short-circuit, guarda posicionada corretamente no worker (antes de matching/scoring), rejeição persistida via a coluna existente e transparência ao usuário garantida por `GET /activities` (incluindo filtro `?status=rejected`). A validação é honesta: validadores sem I/O e guarda exercitada end-to-end contra PostGIS + Redis reais, com o webhook Strava disparado de verdade e o resultado lido do banco. Os critérios centrais estão verificados: velocidade incompatível → `rejected` com motivo e sem pontuar; atividade válida → `processed` sem falso-positivo, seguindo para matching/scoring.

Os achados não são bloqueantes. O **Maior** (5.1) é de eficácia, não de comportamento nominal: o validador de coerência não reprova dado real porque o ritmo é derivado localmente da mesma distância/tempo que ele confere — recomenda-se alimentá-lo com um ritmo de fonte independente (ou documentar que é um guard de sanidade de dados) para que a RF-10.2 tenha função no fluxo vivo. Os **Menores/Observações** — 5.2 (limiar de FC `< 40` quase nunca dispara), 5.3 (dado faltante compartilhando o canal de rejeição com fraude) — e os **Nits** (5.4 import de helper interno; 5.5 ausência de port / `evaluate` vs `validate`) são endereçáveis nesta task ou nas seguintes sem retrabalho estrutural. A avaliação dos thresholds pedida pela task: **25 km/h** é razoável (maratonista de elite sustenta ~20-21 km/h; a folga cobre ruído de GPS e picos curtos, e um veículo excede com folga); **tolerância de 10%** seria razoável, mas é discutível enquanto a coerência estiver inerte (5.1); **FC `< 40`** é conservador e seguro, porém pouco efetivo como detector (5.2). A composição do veredito (origem primeiro, short-circuit no primeiro motivo) está correta. Nenhum achado justifica `REJECTED`.

---

## 8. Mensagem de commit sugerida (Conventional Commits, pt-BR)

O trabalho já está commitado em `de512b0` com mensagem aderente ao padrão. Caso seja necessário reescrever/consolidar:

```
feat(anti-cheat): guarda de validação básica no worker

Adiciona o módulo anti-cheat com validadores puros — origem
(provider suportado), velocidade média (> 25 km/h indica veículo),
coerência distância×tempo×ritmo (tolerância 10%) e frequência
cardíaca como sinal adicional (FC < 40) — compostos pelo
AntiCheatService num veredito com short-circuit no primeiro motivo.

Pluga a guarda no worker de ingestão antes do map-matching e do
scoring: atividade reprovada é marcada rejected com rejection_reason
e não pontua; válida segue para matching/território. O motivo é
exposto ao usuário via GET /activities (reusa a coluna
activity.rejection_reason).

Testes: unit de cada validador + composição do veredito; integração
real (PostGIS + Redis) exercitando o webhook — fraude por velocidade
rejeitada com motivo persistido e corrida válida processada.
```
