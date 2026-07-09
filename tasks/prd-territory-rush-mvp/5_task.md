# Tarefa 5.0: Map-matching OSRM + resolução em ruas nomeadas

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Transformar o traçado GPS bruto nas ruas realmente percorridas: subir o serviço OSRM self-hosted (`/match`, perfil `foot`) e o módulo `matching`, que casa o traçado às vias e resolve os edges em **ruas nomeadas por cidade** (consultando o `geo`), gravando a rastreabilidade em `activity_street`. É o elo entre a corrida e o mapa.

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — cobertura da agregação de edges, fallback de via sem nome e dedup de trechos.
- `executar-review` — revisão pré-merge.
</skills>

<requirements>
- Serviço OSRM self-hosted com extrato do OSM e perfil `foot`, exposto como HTTP interno com timeout curto + circuit breaker.
- Módulo `matching` (`MapMatchingService`) chamando OSRM `/match` e convertendo `MatchedEdge[]` em ruas nomeadas via `geo` (RF-3.1).
- Gravação de `activity_street` (rua, `points_awarded` a ser preenchido pela 6.0, `is_first_visit`) para auditoria.
- Robustez: falha de match mantém a atividade em `processing` com retry (nunca perde a atividade).
</requirements>

## Subtarefas

- [ ] 5.1 Empacotar/subir o OSRM (Docker + extrato OSM, perfil `foot`) em `infra/osrm/`.
- [ ] 5.2 Módulo `matching`: cliente OSRM (`MapMatchingService`) com timeout/circuit breaker.
- [ ] 5.3 Resolver `MatchedEdge[]` → ruas nomeadas (agregação por nome+cidade) usando o `geo`; tratar via sem nome.
- [ ] 5.4 Persistir `activity_street` e integrar a etapa ao worker de ingestão.

## Detalhes de Implementação

Ver `techspec.md`: "Interfaces Principais" (`MapMatchingService`), "Pontos de Integração → OSRM", "Modelos de Dados" (`MatchedEdge`, `activity_street`) e "Decisões Principais" (OSRM; rua nomeada agregada). Referenciar, não duplicar.

## Critérios de Sucesso

- Um traçado GPS de fixture é casado e resolvido na lista correta de ruas nomeadas.
- Trechos repetidos na mesma atividade não duplicam ruas; vias sem nome seguem o fallback.
- Indisponibilidade do OSRM não perde a atividade (retry).
- `activity_street` registra a associação atividade↔rua.

## Testes da Tarefa

- [ ] Testes de unidade — agregação de edges por (nome, cidade), fallback de via sem nome, dedup de trechos (OSRM mockado).
- [ ] Testes de integração — worker + OSRM apontando para um extrato pequeno, com traços GPS de fixture → `activity_street`.
- [ ] Testes E2E (se aplicável) — não nesta tarefa.

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/api/src/modules/matching/`, `apps/api/src/workers/ingest-activity/`
- `infra/osrm/`; `supabase/migrations/` (`activity_street`)
