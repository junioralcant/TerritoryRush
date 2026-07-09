# Tarefa 3.0: Integração Strava (OAuth + conexão/desconexão + webhook)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Conectar a conta Strava do corredor via OAuth 2.0, gerenciar tokens (com refresh proativo) e registrar/receber a assinatura de webhook da Strava. O receiver de webhook apenas valida e enfileira — o processamento pesado é da Tarefa 4.0. É a porta de entrada das atividades reais.

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — cobertura de troca/refresh de token, validação de assinatura e enfileiramento idempotente.
- `executar-review` — revisão pré-merge.
</skills>

<requirements>
- Fluxo OAuth 2.0 Strava: troca de código por tokens, armazenamento cifrado (Supabase Vault) e refresh proativo antes da expiração (~6h) (RF-1.2, RF-2.1).
- Conectar e desconectar a conta Strava; persistir `provider_connection` com `provider_athlete_id` e escopos.
- Gestão da assinatura única de webhook da Strava (criação/validação) e endpoint `GET /webhooks/strava` que ecoa `hub.challenge`.
- Endpoint `POST /webhooks/strava` que responde 200 rápido e enfileira `ingest-activity`, sem processar inline.
</requirements>

## Subtarefas

- [x] 3.1 Módulo `integrations/strava`: cliente OAuth (troca + refresh) e armazenamento seguro de tokens.
- [x] 3.2 Endpoints `POST /integrations/strava/connect` e `DELETE /integrations/strava/disconnect`.
- [x] 3.3 Gestão da assinatura de webhook + `GET /webhooks/strava` (validação `hub.challenge`).
- [x] 3.4 `POST /webhooks/strava`: validar evento, deduplicar e enfileirar `IngestActivityJob` (resposta 200 imediata).

## Detalhes de Implementação

Ver `techspec.md`: "Pontos de Integração → Strava" (tokens, assinatura única, rate limit), "Endpoints de API" (`/integrations/strava/*`, `/webhooks/strava`) e "Modelos de Dados" (`provider_connection`, `IngestActivityJob`). Referenciar, não duplicar.

## Critérios de Sucesso

- Corredor conecta e desconecta o Strava; `provider_connection` reflete o estado com tokens cifrados.
- Token expirado é renovado proativamente antes do uso.
- `GET /webhooks/strava` valida a assinatura; `POST /webhooks/strava` responde 200 e enfileira exatamente um job por atividade nova (dedup).

## Testes da Tarefa

- [x] Testes de unidade — troca/refresh de token, validação `hub.challenge`, dedup de evento repetido.
- [x] Testes de integração — connect/disconnect → estado de `provider_connection`; webhook → job na fila (mock da API Strava).
- [ ] Testes E2E (se aplicável) — não nesta tarefa (fluxo mobile de conexão coberto na 10.0).

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/api/src/modules/integrations/strava/`
- `supabase/migrations/` (uso de `provider_connection`)
