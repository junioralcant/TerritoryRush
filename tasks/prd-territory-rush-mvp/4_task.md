# Tarefa 4.0: Pipeline assíncrono de ingestão (fila + worker + streams + status)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Construir o pipeline assíncrono que consome os jobs enfileirados pelo webhook: fila BullMQ/Redis + worker que busca a atividade e os streams de GPS na Strava, deduplica e faz as transições de estado da atividade. É o esqueleto de processamento onde as Tarefas 5.0–7.0 se plugam.

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — cobertura de dedup, transições de status e refresh de token no worker.
- `executar-review` — revisão pré-merge.
</skills>

<requirements>
- Fila `ingest-activity` (BullMQ/Redis) e worker no processo NestJS consumindo os jobs (RF-2.2).
- Busca da atividade e dos streams `latlng`/`time` (e FC quando disponível) via cliente Strava, respeitando rate limit (backoff, retry idempotente).
- Deduplicação por `UNIQUE(provider, provider_activity_id)` — webhook duplicado não gera atividade/pontos em dobro (RF-2.3).
- Máquina de estados da atividade: `imported → processing → processed | rejected`, consultável via `GET /activities?status=` (RF-2.4).
</requirements>

## Subtarefas

- [ ] 4.1 Configurar Redis + fila BullMQ e registrar o worker `ingest-activity`.
- [ ] 4.2 Módulo `activities`: orquestrador de ingestão (`ActivityIngestionService`) com refresh de token, fetch de streams e backoff/retry.
- [ ] 4.3 Persistência da `activity` com dedup e transições de status.
- [ ] 4.4 Endpoint `GET /activities?status=` para o corredor consultar o estado das importações.

## Detalhes de Implementação

Ver `techspec.md`: "Arquitetura → Fluxo de dados (ingestão)", "Interfaces Principais" (`ActivityIngestionService`), "Modelos de Dados" (`activity`, `IngestActivityJob`) e "Pontos de Integração → Strava" (rate limit/backoff). Referenciar, não duplicar.

## Critérios de Sucesso

- Job enfileirado é processado por um worker; a atividade transita corretamente entre estados.
- Streams de GPS são obtidos e ficam disponíveis para as etapas seguintes.
- Webhook duplicado é idempotente (uma única `activity`).
- `GET /activities?status=` reflete o estado real de cada importação.

## Testes da Tarefa

- [ ] Testes de unidade — dedup por chave única, transições de status, refresh de token antes do fetch (mock Strava).
- [ ] Testes de integração — `webhook → fila → worker → DB` com Redis/Postgres de teste e streams de fixture; idempotência de evento repetido.
- [ ] Testes E2E (se aplicável) — não nesta tarefa.

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/api/src/modules/activities/`, `apps/api/src/workers/ingest-activity/`
- Configuração de Redis/BullMQ; `supabase/migrations/` (`activity`)
