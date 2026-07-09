# Tarefa 6.0: Motor de pontuação + domínio territorial

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o coração do jogo: o motor de pontuação puro (exploração, nova região, consistência, defesa) e o domínio territorial (pontuação acumulada por corredor na rua, ranking da rua, transferência de posse e histórico). É o que faz cada corrida mudar o mapa.

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — cobertura total das regras de pontos e da transição de posse (motor puro, sem I/O).
- `executar-review` — revisão pré-merge.
</skills>

<requirements>
- `ScoringEngine` puro (sem I/O): exploração (+100 primeira vez / +10 conhecida), nova região (+500 bairro / +2.000 cidade), consistência (+500/7d, +2.000/30d, +10.000/90d), defesa (+100/1sem, +500/1mês, +2.000/3meses) (RF-3.2 a RF-3.5).
- Atualização de `street_score` (pontos acumulados, primeira/última visita, `defended_since`) e do ranking da rua (RF-3.6, RF-4.1).
- `TerritoryService`: define proprietário (maior pontuação), transfere posse ao ser ultrapassado, escreve `street_ownership_history` e incrementa disputas — tudo em transação (RF-4.2, RF-4.3).
- Empate de pontuação mantém o dono atual (regra explícita de borda).
</requirements>

## Subtarefas

- [x] 6.1 Módulo `scoring`: `ScoringEngine` puro cobrindo as quatro categorias de pontos.
- [x] 6.2 Persistência de `street_score` e derivação do ranking por rua.
- [x] 6.3 Módulo `territory`: `TerritoryService` com transição de posse, histórico e disputas em transação.
- [x] 6.4 Integrar scoring + território ao worker (após map-matching) e preencher `points_awarded` em `activity_street`.

## Detalhes de Implementação

Ver `techspec.md`: "Interfaces Principais" (`ScoringEngine`, `TerritoryService`), "Modelos de Dados" (`street_score`, `street`, `street_ownership_history`, `StreetAward`) e o PRD (RF-3, RF-4). Referenciar, não duplicar.

## Critérios de Sucesso

- Cada categoria de ponto é concedida corretamente segundo o histórico do corredor.
- Ao ultrapassar o dono, a rua muda de proprietário, o histórico é atualizado e as disputas incrementadas; empate mantém o dono.
- `street_score` e o ranking da rua refletem o resultado após processar a atividade.

## Testes da Tarefa

- [x] Testes de unidade — motor puro: primeira vez vs conhecida, bairro/cidade novos, streak 7/30/90, defesa 1sem/1mês/3meses, empate.
- [x] Testes de integração — atividade processada → `street_score`/ranking/posse/histórico corretos, em transação.
- [ ] Testes E2E (se aplicável) — não nesta tarefa.

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/api/src/modules/scoring/`, `apps/api/src/modules/territory/`
- `apps/api/src/workers/ingest-activity/`; `supabase/migrations/` (`street_score`, `street_ownership_history`)
