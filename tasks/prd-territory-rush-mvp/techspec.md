# Tech Spec — Territory Rush (MVP Versão 1)

## Resumo Executivo

Territory Rush é um app mobile (Expo/React Native + TypeScript) apoiado em um **monólito modular NestJS** (DDD + Clean Architecture) e no **Supabase** como plataforma de dados (Postgres + PostGIS, Auth, Storage, Realtime). O coração do produto é um **pipeline assíncrono de ingestão**: um webhook da Strava dispara um job em fila; um worker busca o traçado GPS, valida a atividade (anti-cheat básico), faz **map-matching via OSRM self-hosted** para associar o traçado às vias do OpenStreetMap, agrega os trechos em **ruas nomeadas por cidade**, calcula pontuação (motor puro e determinístico), atualiza domínio/ranking territorial e enfileira notificações via **Expo Push**.

Decisões-âncora: (1) webhook + fila para absorver picos e respeitar os limites de rate da Strava; (2) OSRM `/match` por ser um motor HMM maduro e rápido, mantendo o monólito simples; (3) **Strava-first**, com o módulo Garmin implementado atrás de feature flag (programa de desenvolvedor Garmin suspenso para novos cadastros); (4) motor de pontuação isolado como domínio puro, testável sem I/O.

## Arquitetura do Sistema

### Visão Geral dos Componentes

**Mobile (Expo/React Native)** — camada de apresentação consumindo a API REST:
- `AuthFlow` — Supabase Auth (Google, Apple) + OAuth Strava.
- `MapScreen` — mapa OSM (MapLibre GL Native) renderizando polilinhas de ruas coloridas por posse (cinza/azul/vermelho) e o drawer de detalhe da rua.
- `ProfileScreen`, `RankingScreen`, `AchievementsScreen`, `NotificationsCenter`, `ConnectionsScreen` (conectar/desconectar provedores).

**Backend NestJS — módulos de domínio (novos):**
- `auth` — valida JWT do Supabase, resolve o `runner` da requisição.
- `profile` — perfil do corredor, agregados (distância total, streak, cidade).
- `integrations/strava` — OAuth (troca/refresh de token), gestão da assinatura de webhook, receiver de eventos, cliente de Activity/Streams.
- `integrations/garmin` — **atrás de feature flag**; receiver push-based; mesmo contrato interno do Strava.
- `activities` — orquestra ingestão, deduplicação (`provider` + `provider_activity_id`), estado da atividade.
- `matching` — cliente OSRM `/match`; converte os `edges` casados em ruas nomeadas (consulta ao `geo`).
- `geo` — dados de referência do OSM em PostGIS (rede viária importada), consultas espaciais (bbox, snap).
- `scoring` — **motor de pontuação puro** (exploração, região, consistência, defesa).
- `territory` — posse da rua, ranking por rua, transferência de domínio e histórico.
- `rankings` — leaderboards (cidade/estado/país/exploradores) via materialized views.
- `achievements` — regras de desbloqueio de marcos.
- `notifications` — despacho Expo Push + registro de notificações.
- `anti-cheat` — validadores de velocidade/ritmo, coerência e origem.

**Worker** — mesmo processo NestJS (ou processo irmão) consumindo a fila **BullMQ/Redis**.

**Infra externa (nova):** Supabase (Postgres+PostGIS, Auth, Storage); **OSRM** self-hosted com extrato regional do OSM (perfil `foot`); **Redis** (fila); **Expo Push** (APNs/FCM); pipeline de carga do OSM (`osm2pgsql`) para o `geo`.

### Fluxo de dados (ingestão)

`Strava webhook (activity=create)` → `POST /webhooks/strava` responde 200 e enfileira `ingest-activity` → **worker**: refresh de token se expirado → busca atividade + streams `latlng`/`time` → `anti-cheat.validate()` → `matching` (OSRM `/match`) → resolve edges → ruas nomeadas → `scoring.compute()` → `territory.apply()` (pontos, ranking, posse, histórico) → detecta troca de dono + conquistas → enfileira notificações → Expo Push. O `MapScreen` lê o estado por `GET /streets?bbox=`.

## Design de Implementação

### Interfaces Principais

**Convenção de tipagem (app e backend):** `interface` é reservada a **contratos** — fronteiras de serviço / ports que classes implementam (`*Service`, `*Repository`, `*Client`, `*Gateway`). Toda **tipagem comum** — modelos de domínio, DTOs, request/response, payloads de job, unions e enums de string — é declarada com `type`. Contratos ficam abertos à implementação; tipagens de dado são fechadas e componíveis.

```ts
interface MapMatchingService {
  match(trace: GpsPoint[]): Promise<MatchedEdge[]>;
}

interface ScoringEngine {
  compute(input: ScoringInput): ScoringResult;
}

interface TerritoryService {
  applyActivityScore(activityId: string, awards: StreetAward[]): Promise<TerritoryChange[]>;
}

interface ActivityIngestionService {
  ingest(job: IngestActivityJob): Promise<void>;
}
```

`ScoringEngine` é puro (sem I/O): recebe ruas casadas + histórico do corredor (primeira visita, streak, posse) e devolve pontos por regra. `TerritoryService` concentra a transição de posse e a escrita do histórico dentro de transação.

### Modelos de Dados

Entidades PostGIS/Postgres essenciais (Supabase):

- `runner_profile` — `user_id` (FK auth.users), `name`, `city`, `photo_url`, `total_distance_m`, `streak_days`, `last_active_on`.
- `provider_connection` — `user_id`, `provider` enum(`strava`,`garmin`), tokens (armazenados cifrados / Supabase Vault), `expires_at`, `provider_athlete_id`, `scopes`.
- `activity` — `provider`, `provider_activity_id`, `status` enum(`imported`,`processing`,`processed`,`rejected`), `distance_m`, `moving_time_s`, `avg_pace_s_km`, `started_at`, `rejection_reason`; **UNIQUE(`provider`,`provider_activity_id`)** para dedup.
- `street` — unidade territorial (**rua nomeada agregada por cidade**): `osm_name`, `city_id`, `geom` (MULTILINESTRING, SRID 4326, índice GIST), `owner_user_id`, `top_score`, `disputes_count`.
- `street_score` — `street_id`, `user_id`, `points`, `first_visited_at`, `last_visited_at`, `defended_since`; **UNIQUE(`street_id`,`user_id`)**; ranking da rua deriva daqui.
- `activity_street` — rastreabilidade: `activity_id`, `street_id`, `points_awarded`, `is_first_visit`.
- `street_ownership_history` — `street_id`, `user_id`, `acquired_at`, `lost_at`.
- `achievement` (catálogo) + `runner_achievement` (`user_id`,`achievement_id`,`unlocked_at`).
- `notification` — `user_id`, `type`, `payload` jsonb, `sent_at`, `read_at`.
- `city_ref` / rede viária OSM importada no schema `geo` (ways + nomes) para resolver edges → ruas.

Tipagens comuns (sempre `type`, nunca `interface`) — modelos, DTOs e payloads consumidos pelos contratos acima:

```ts
type Provider = 'strava' | 'garmin';
type ActivityStatus = 'imported' | 'processing' | 'processed' | 'rejected';
type GpsPoint = {lat: number; lng: number; t: number};
type MatchedEdge = {osmWayId: number; streetName: string; cityId: string; length: number};
type StreetAward = {streetId: string; points: number; isFirstVisit: boolean};
type IngestActivityJob = {userId: string; provider: Provider; providerActivityId: string};
```

### Endpoints de API

- `GET /webhooks/strava` — validação da assinatura (echo `hub.challenge`).
- `POST /webhooks/strava` — recepção de eventos (responde 200 rápido, enfileira).
- `POST /webhooks/garmin` — recepção push (**atrás de flag**).
- `POST /integrations/strava/connect` · `DELETE /integrations/strava/disconnect`.
- `GET /activities?status=` — status de importação (RF-2.4).
- `GET /me/profile` — perfil e agregados.
- `GET /streets?bbox=` — ruas + estado de posse para o mapa.
- `GET /streets/:id` — dono, ranking, histórico, tempo de posse, disputas.
- `GET /rankings/city/:cityId` · `GET /rankings/explorers`.
- `GET /me/achievements` · `GET /me/notifications`.

## Pontos de Integração

- **Strava** — OAuth 2.0 (token expira em ~6h, refresh proativo antes de cada job); **uma** assinatura de webhook por app cobrindo todos os atletas; streams (`latlng`,`time`) exigem chamadas adicionais → orçar contra o rate limit (~200/15min, ~2.000/dia). Tratamento de erro: backoff exponencial, respeito ao header de rate limit, e enfileiramento com retry idempotente (dedup por `provider_activity_id`).
- **Garmin** — push-based, exige aprovação no programa parceiro; módulo isolado atrás de flag para ligar sem redeploy quando o acesso sair.
- **OSRM** — serviço HTTP interno (`/match/v1/foot`), timeout curto + circuit breaker; falha de match → atividade fica `processing` com retry, nunca perde a atividade.
- **Expo Push** — token de device registrado no login; falha de push é não-bloqueante (log + retry).
- **Supabase** — Auth (verificação de JWT), Storage (foto de perfil), Postgres (conexão via pool do NestJS).

## Abordagem de Testes

### Testes Unidade

- `ScoringEngine` — cobertura total das regras e bordas: primeira visita vs conhecida; bônus de bairro/cidade; streak 7/30/90; defesa 1sem/1mês/3meses; empate de pontuação (mantém dono atual).
- `anti-cheat` — ritmo/velocidade acima do limite → rejeição; coerência distância×tempo×ritmo; sinal de FC quando presente; origem inválida.
- `matching` — agregação de edges por (`osm_name`,`city`); via sem nome (fallback); dedup de trechos repetidos na mesma atividade.
- `territory` — transição de posse ao ultrapassar o dono; escrita de histórico; incremento de disputas.
- Mock **apenas** de serviços externos (OSRM, Strava, Expo).

### Testes de Integração

- Fluxo `webhook → fila → worker → DB` com PostGIS de teste e traços GPS de fixture, contra um OSRM apontando para um extrato pequeno.
- Idempotência: webhook duplicado não gera atividade/pontos em dobro.
- Refresh de token expirado antes do fetch de streams.

### Testes de E2E

- **Playwright** exercitando frontend + backend nos fluxos: conectar Strava, ver ruas conquistadas no mapa, abrir detalhe da rua, conferir perfil e ranking municipal, receber notificação de troca de domínio (via seed de atividade de outro corredor).

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Fundações** — projeto Supabase, PostGIS, importação do OSM no `geo`, Auth (Google/Apple). Base de tudo.
2. **Strava OAuth + webhook + ingestão** — conexão, assinatura, receiver, dedup, estados (RF-1, RF-2).
3. **Fila + worker + OSRM + resolução de ruas** — pipeline assíncrono e map-matching (RF-3.1).
4. **Scoring + território** — motor de pontuação e posse/ranking/histórico (RF-3, RF-4).
5. **APIs de leitura** — mapa por bbox, detalhe de rua, perfil, rankings (RF-5, RF-6, RF-7).
6. **Conquistas + notificações** — desbloqueios e Expo Push (RF-8, RF-9).
7. **Anti-cheat básico** — validadores no pipeline (RF-10).
8. **Mobile** — telas ligadas às APIs; Garmin atrás de flag.
9. **Integração + E2E** — endurecimento e Playwright.

### Dependências Técnicas

- Supabase provisionado (Postgres+PostGIS, Auth, Storage).
- Extrato regional do OSM + build do OSRM (perfil `foot`).
- Redis para a fila; endpoint HTTPS público para o webhook Strava.
- Credenciais Expo Push (APNs/FCM).
- Aprovação do programa parceiro Garmin — bloqueante **apenas** para ligar a flag Garmin.

## Monitoramento e Observabilidade

Infra de observabilidade é **nova** (não há Grafana existente neste greenfield); proposta: logs estruturados (pino/Nest Logger), erros no **Sentry**, e endpoint `/metrics` Prometheus (opcionalmente ligado a um Grafana gerenciado).

- **Métricas (Prometheus):** duração do job de ingestão, latência do OSRM `/match`, taxa de rejeição anti-cheat, hits de rate limit Strava, profundidade e idade da fila, trocas de domínio/min.
- **Logs:** `INFO` por atividade processada (id, ruas casadas, pontos); `WARN` em retry/rate limit; `ERROR` em falha de match/token; correlação por `activityId`.
- **Supabase logs** para DB/Auth; dashboards derivados das métricas acima.

## Considerações Técnicas

### Decisões Principais

- **OSRM self-hosted (vs pgRouting in-DB / Valhalla):** motor HMM maduro e rápido, isola o custo de map-matching fora do Postgres do Supabase e mantém o monólito enxuto. Trade-off: um serviço de infra a mais.
- **Rua nomeada agregada (vs segmento entre interseções / way):** exibição e ranking simples ("Rua Maranhão" como unidade única). Trade-off aceito: ruas muito longas viram uma unidade grande — mitigável no futuro migrando para segmentos sem quebrar a API.
- **Pipeline assíncrono (fila) + Expo Push (vs síncrono / Realtime):** resiliência a picos e aos limites da Strava; webhook responde em ms. Realtime fica para evolução (in-app live).
- **Strava-first, Garmin atrás de flag:** destrava o MVP sem depender da aprovação Garmin; contrato interno único (`ProviderActivity`) evita retrabalho.
- **Supabase como BaaS:** acelera Auth/Storage/DB; o NestJS foca no domínio.
- **`interface` só em contratos, `type` no resto (app e backend):** `interface` fica reservada a fronteiras de serviço/ports que classes implementam (`*Service`, `*Repository`, `*Client`); modelos, DTOs, request/response, payloads de job, unions e enums de string usam `type`. Padroniza a base de código entre mobile e API, favorece composição/união de tipos e deixa claro, pela palavra-chave, o que é contrato versus dado. Regra de lint (`@typescript-eslint/consistent-type-definitions`) fixa a convenção.

### Riscos Conhecidos

- **Garmin suspenso** — sem acesso parceiro, a flag fica desligada; mitigação: contrato de provider agnóstico + possibilidade de agregador (Terra/Spike/Rook) como plano B.
- **Qualidade do map-matching** (corridas em parques/pistas fora da malha de ruas) — mitigação: perfil `foot`, descarte de edges de baixa confiança, `activity_street` para auditoria.
- **Rate limit Strava em escala** — mitigação: webhook (evita polling), batelada de chamadas de stream, backoff e orçamento diário.
- **Cobertura/atualização do OSM** — rotina de reimport periódica do `geo`.
- **Segurança de tokens e privacidade de GPS (LGPD)** — tokens cifrados/Vault, consentimento explícito na conexão, política de retenção de traços.

### Conformidade com Skills Padrões

Skills relevantes em `.claude/skills`: **create-tests** e **unit-tests** (cobertura dos motores puros), **criar-task/executar-task** (quebra e execução das etapas), **executar-review** (revisão pré-merge). As skills e as `.claude/rules` de `AcquisitionNew` (GOL App Mobile) **não se aplicam**: são específicas de outro codebase/stack (React Native GOL, Zustand, gol-sdk). Este projeto é greenfield NestJS+Supabase e segue DDD/Clean Architecture do `tech.md`.

### Arquivos relevantes e dependentes

Projeto novo — estrutura planejada:
- `apps/mobile/` (Expo): `src/screens/{Map,Profile,Ranking,Achievements,Connections}`, `src/services/api`, `src/auth`.
- `apps/api/` (NestJS): `src/modules/{auth,profile,integrations/strava,integrations/garmin,activities,matching,geo,scoring,territory,rankings,achievements,notifications,anti-cheat}`, `src/workers/ingest-activity`.
- `infra/`: `osrm/` (Dockerfile + extrato OSM), `supabase/migrations/` (schema + PostGIS), `geo/import/` (osm2pgsql).
- Fonte de requisitos: `tasks/prd-territory-rush-mvp/prd.md`; stack: `tech.md`.
